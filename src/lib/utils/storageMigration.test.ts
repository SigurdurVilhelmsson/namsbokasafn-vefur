/**
 * The erase behind /greining's 'Eyða öllum gögnum á þessu tæki' (plan step S3.2, PED-14):
 * clearExpirationRecords(), deleteLocalCaches(), then clearAllStorage().
 * e2e/data-erase.spec.ts runs it end to end, with a real service worker for the first.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	clearAllStorage,
	clearExpirationRecords,
	deleteLocalCaches,
	EXPIRATION_CLEAR_TIMEOUT_MS,
	EXPIRATION_DB
} from './storageMigration';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

type FakeDb = { version: number; stores: Map<string, Map<string, unknown>> };

/**
 * Just enough of IndexedDB for clearExpirationRecords (jsdom has none): open() without a
 * version, which creates a missing database at version 1 unless its upgrade is aborted, as
 * the spec says; a readwrite transaction whose clear() empties a store. Events fire on
 * microtasks. `connections` counts the connections still open.
 */
function fakeIndexedDB(
	options: { neverAnswer?: boolean; failClear?: boolean; throwOnOpen?: boolean; holdClear?: boolean } = {}
) {
	const dbs = new Map<string, FakeDb>();
	// `live` holds every connection handed out, so a test can fire its onversionchange.
	const state = { connections: 0, opens: 0, live: [] as Array<{ onversionchange: null | (() => void) }> };
	const connect = (db: FakeDb) => {
		state.connections++;
		let closed = false;
		const connection = {
			version: db.version,
			onversionchange: null as null | (() => void),
			objectStoreNames: { contains: (name: string) => db.stores.has(name) },
			close: () => {
				if (!closed) state.connections--;
				closed = true;
			},
			transaction(storeName: string, mode: string) {
				if (closed) throw new DOMException('The database connection is closing.', 'InvalidStateError');
				if (!db.stores.has(storeName)) throw new DOMException('No such store', 'NotFoundError');
				const tx = {
					error: null as DOMException | null,
					oncomplete: null as null | (() => void),
					onabort: null as null | (() => void),
					objectStore: () => ({
						clear: () => {
							if (mode !== 'readwrite') throw new DOMException('Read only', 'ReadOnlyError');
							if (options.holdClear) return; // stays in flight
							queueMicrotask(() => {
								if (options.failClear) {
									tx.error = new DOMException('Disk I/O error', 'UnknownError');
									tx.onabort?.();
									return;
								}
								db.stores.get(storeName)!.clear();
								tx.oncomplete?.();
							});
						}
					})
				};
				return tx;
			}
		};
		state.live.push(connection);
		return connection;
	};
	const factory = {
		open(name: string, version?: number) {
			if (options.throwOnOpen) throw new DOMException('The operation is insecure.', 'SecurityError');
			state.opens++;
			const request = {
				result: null as unknown,
				error: null as DOMException | null,
				transaction: null as null | { abort: () => void },
				onupgradeneeded: null as null | (() => void),
				onsuccess: null as null | (() => void),
				onerror: null as null | ((e: { preventDefault: () => void }) => void)
			};
			if (options.neverAnswer) return request;
			queueMicrotask(() => {
				const existing = dbs.get(name);
				const target = version ?? existing?.version ?? 1;
				if (!existing || target > existing.version) {
					const db: FakeDb = existing ?? { version: 0, stores: new Map() };
					let aborted = false;
					request.transaction = { abort: () => (aborted = true) };
					const connection = connect({ ...db, version: target });
					request.result = connection;
					request.onupgradeneeded?.();
					request.transaction = null;
					if (aborted) {
						connection.close();
						request.result = undefined;
						request.error = new DOMException('Version change transaction was aborted.', 'AbortError');
						request.onerror?.({ preventDefault: () => {} });
						return;
					}
					db.version = target;
					dbs.set(name, db);
					connection.close();
					request.result = connect(db);
				} else {
					request.result = connect(existing);
				}
				request.onsuccess?.();
			});
			return request;
		}
	};
	return { factory, dbs, state };
}

/** The database as workbox-expiration leaves it: version 1, one store with records. */
function workboxDatabase(dbs: Map<string, FakeDb>, records: Record<string, unknown>) {
	dbs.set(EXPIRATION_DB, { version: 1, stores: new Map([['cache-entries', new Map(Object.entries(records))]]) });
}

describe('clearExpirationRecords', () => {
	it("empties the service worker's records and keeps its database, so the worker's connection stays valid", async () => {
		const { factory, dbs, state } = fakeIndexedDB();
		workboxDatabase(dbs, {
			'book-content|https://namsbokasafn.is/content/efnafraedi-2e/chapters/01/1-2-x.html': { timestamp: 1 },
			'book-images|https://namsbokasafn.is/content/efnafraedi-2e/chapters/01/images/media/a.svg': { timestamp: 2 }
		});
		vi.stubGlobal('indexedDB', factory);
		expect(await clearExpirationRecords()).toBe('cleared');
		expect(dbs.get(EXPIRATION_DB)?.version).toBe(1);
		expect(dbs.get(EXPIRATION_DB)?.stores.get('cache-entries')?.size).toBe(0);
		// Its own connection is closed, so it blocks no later upgrade or delete.
		expect(state.connections).toBe(0);
	});

	it('creates no database when there is none: an empty version-1 one would keep workbox from making its store', async () => {
		const { factory, dbs, state } = fakeIndexedDB();
		vi.stubGlobal('indexedDB', factory);
		expect(await clearExpirationRecords()).toBe('absent');
		expect(dbs.has(EXPIRATION_DB)).toBe(false);
		expect(state.connections).toBe(0);
	});

	it('never throws when IndexedDB is blocked, so the erase still clears localStorage', async () => {
		const { factory } = fakeIndexedDB({ throwOnOpen: true });
		vi.stubGlobal('indexedDB', factory);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(clearExpirationRecords()).resolves.toBe('failed');
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it('logs a clear that fails and closes its connection', async () => {
		const { factory, dbs, state } = fakeIndexedDB({ failClear: true });
		workboxDatabase(dbs, { a: { timestamp: 1 } });
		vi.stubGlobal('indexedDB', factory);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(clearExpirationRecords()).resolves.toBe('failed');
		expect(error).toHaveBeenCalled();
		expect(state.connections).toBe(0);
		error.mockRestore();
	});

	it('gives up after its bound when the database never answers, so the erase cannot hang', async () => {
		vi.useFakeTimers();
		const { factory, state } = fakeIndexedDB({ neverAnswer: true });
		vi.stubGlobal('indexedDB', factory);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		let result: string | undefined;
		void clearExpirationRecords().then((r) => (result = r));
		await vi.advanceTimersByTimeAsync(EXPIRATION_CLEAR_TIMEOUT_MS - 1);
		expect(state.opens).toBe(1);
		expect(result).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		expect(result).toBe('timed-out');
		expect(EXPIRATION_CLEAR_TIMEOUT_MS).toBeLessThanOrEqual(2000);
		error.mockRestore();
	});

	it("lets go of its connection when someone else's upgrade or delete asks, even mid-clear", async () => {
		vi.useFakeTimers();
		const { factory, dbs, state } = fakeIndexedDB({ holdClear: true });
		workboxDatabase(dbs, { a: { timestamp: 1 } });
		vi.stubGlobal('indexedDB', factory);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = clearExpirationRecords();
		await vi.advanceTimersByTimeAsync(0);
		expect(state.connections).toBe(1);
		// A versionchange (another tab's upgrade, or a deleteDatabase) reaches the open connection.
		state.live.at(-1)?.onversionchange?.();
		expect(state.connections).toBe(0);
		await vi.advanceTimersByTimeAsync(EXPIRATION_CLEAR_TIMEOUT_MS);
		await expect(result).resolves.toBe('timed-out');
		error.mockRestore();
	});

	it("reads a database without workbox's store as absent, and logs nothing", async () => {
		const { factory, dbs, state } = fakeIndexedDB();
		dbs.set(EXPIRATION_DB, { version: 1, stores: new Map() });
		vi.stubGlobal('indexedDB', factory);
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await clearExpirationRecords()).toBe('absent');
		expect(error).not.toHaveBeenCalled();
		expect(state.connections).toBe(0);
		error.mockRestore();
	});

	it('does nothing where IndexedDB does not exist', async () => {
		vi.stubGlobal('indexedDB', undefined);
		expect(await clearExpirationRecords()).toBe('absent');
	});
});

describe('deleteLocalCaches', () => {
	it("deletes the downloaded books and the browsing caches, and keeps the service worker's precache", async () => {
		const names = [
			'offline-book:efnafraedi-2e',
			'offline-book:edlisfraedi-2e',
			'book-content',
			'book-images',
			'workbox-precache-v2-https://namsbokasafn.is/',
			'some-other-cache'
		];
		const deleted: string[] = [];
		vi.stubGlobal('caches', {
			keys: vi.fn(async () => names),
			delete: vi.fn(async (name: string) => {
				deleted.push(name);
				return true;
			})
		});
		const result = await deleteLocalCaches();
		const expected = ['offline-book:efnafraedi-2e', 'offline-book:edlisfraedi-2e', 'book-content', 'book-images'];
		expect(result).toEqual(expected);
		expect(deleted.sort()).toEqual([...expected].sort());
	});

	it('never throws when Cache Storage fails, so the erase still clears localStorage', async () => {
		vi.stubGlobal('caches', { keys: vi.fn(async () => Promise.reject(new DOMException('The operation is insecure.', 'SecurityError'))) });
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(deleteLocalCaches()).resolves.toEqual([]);
		error.mockRestore();
	});

	it('deletes the other caches when one deletion fails, and reports only those deleted', async () => {
		const deleted: string[] = [];
		vi.stubGlobal('caches', {
			keys: vi.fn(async () => ['offline-book:a', 'book-content', 'book-images']),
			delete: vi.fn(async (name: string) => {
				if (name === 'book-content') throw new Error('I/O error');
				deleted.push(name);
				return true;
			})
		});
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		expect(await deleteLocalCaches()).toEqual(['offline-book:a', 'book-images']);
		expect(deleted.sort()).toEqual(['book-images', 'offline-book:a']);
		error.mockRestore();
	});

	it('does nothing where Cache Storage does not exist (an insecure context)', async () => {
		vi.stubGlobal('caches', undefined);
		expect(await deleteLocalCaches()).toEqual([]);
	});
});

describe('clearAllStorage', () => {
	it("removes every namsbokasafn key, old hyphenated ones included, and nothing else", () => {
		localStorage.setItem('namsbokasafn:reader', '{}');
		localStorage.setItem('namsbokasafn:quiz', '{}');
		localStorage.setItem('namsbokasafn-settings', '{}');
		localStorage.setItem('namsbokasafn:migrated-v1', '1');
		localStorage.setItem('another-site', 'keep');
		clearAllStorage();
		const left = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
		expect(left).toEqual(['another-site']);
	});
});

describe('clearAllStorage stops store writes until the reload', () => {
	it('a store saving after the erase writes nothing (no in-memory state comes back)', async () => {
		// The flag is module state: load fresh copies so the other tests are not affected.
		vi.resetModules();
		const { clearAllStorage: clear } = await import('./storageMigration');
		const { safeSetItem } = await import('./localStorage');
		expect(safeSetItem('namsbokasafn:reader', '{"before":1}')).toBe(true);
		clear();
		expect(safeSetItem('namsbokasafn:reader', '{"seeded":1}')).toBe(false);
		expect(localStorage.getItem('namsbokasafn:reader')).toBeNull();
	});
});
