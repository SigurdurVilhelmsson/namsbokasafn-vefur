/**
 * The erase behind /greining's 'Eyða öllum gögnum á þessu tæki' (plan step S3.2, PED-14):
 * deleteLocalCaches() then clearAllStorage(). e2e/data-erase.spec.ts runs it end to end.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAllStorage, deleteLocalCaches } from './storageMigration';

afterEach(() => {
	vi.unstubAllGlobals();
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
