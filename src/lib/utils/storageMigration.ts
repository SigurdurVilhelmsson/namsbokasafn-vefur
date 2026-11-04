/**
 * Storage key migration utility
 * Migrates localStorage from old hyphenated keys to new colon-separated namespace
 */

import { browser } from '$app/environment';
import { BROWSE_IMAGE_CACHE, CONTENT_CACHE, OFFLINE_CACHE_PREFIX } from '$lib/sw/runtimeCaching';
import { suspendWritesUntilReload } from '$lib/utils/localStorage';

// Map of old keys to new keys
const KEY_MIGRATIONS: Record<string, string> = {
	'namsbokasafn-settings': 'namsbokasafn:settings',
	'namsbokasafn-reading': 'namsbokasafn:reader',
	'namsbokasafn-flashcards': 'namsbokasafn:flashcards',
	'namsbokasafn-annotations': 'namsbokasafn:annotations',
	'namsbokasafn-quiz': 'namsbokasafn:quiz',
	'namsbokasafn-analytics': 'namsbokasafn:analytics',
	'namsbokasafn-objectives': 'namsbokasafn:objectives',
	'namsbokasafn-search-history': 'namsbokasafn:search-history'
};

const MIGRATION_FLAG = 'namsbokasafn:migrated-v1';

/**
 * Migrate all localStorage keys to new namespace format
 * Safe to call multiple times - uses a flag to track completion
 */
export function migrateStorageKeys(): void {
	if (!browser) return;

	// Check if already migrated
	if (localStorage.getItem(MIGRATION_FLAG)) {
		return;
	}

	let migratedCount = 0;

	for (const [oldKey, newKey] of Object.entries(KEY_MIGRATIONS)) {
		const oldData = localStorage.getItem(oldKey);

		if (oldData !== null) {
			// Only migrate if new key doesn't exist (avoid overwriting)
			if (localStorage.getItem(newKey) === null) {
				localStorage.setItem(newKey, oldData);
				migratedCount++;
			}
			// Remove old key
			localStorage.removeItem(oldKey);
		}
	}

	// Mark migration complete
	localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());

	if (migratedCount > 0) {
		console.debug(`Migrated ${migratedCount} storage keys to new namespace format`);
	}
}

/**
 * Get all namsbokasafn keys from localStorage
 */
export function getAllStorageKeys(): string[] {
	if (!browser) return [];

	const keys: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('namsbokasafn')) {
			keys.push(key);
		}
	}
	return keys.sort();
}

/**
 * Get total size of all namsbokasafn data in localStorage
 */
export function getStorageSize(): number {
	if (!browser) return 0;

	let totalSize = 0;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('namsbokasafn')) {
			const value = localStorage.getItem(key);
			if (value) {
				// Approximate size in bytes (key + value, UTF-16)
				totalSize += (key.length + value.length) * 2;
			}
		}
	}
	return totalSize;
}

/**
 * workbox-expiration's database, written by the service worker's ExpirationPlugin: the URL
 * and time of every page and figure in the browsing caches (up to 500 and 100), so a list of
 * what was read (node_modules/workbox-expiration/models/CacheTimestampsModel.js).
 */
export const EXPIRATION_DB = 'workbox-expiration';
const EXPIRATION_STORE = 'cache-entries';
/** The erase waits at most this long for that database, then goes on. */
export const EXPIRATION_CLEAR_TIMEOUT_MS = 2000;

export type ExpirationClearResult = 'cleared' | 'absent' | 'failed' | 'timed-out';

/**
 * Empty the service worker's expiry records, the list above (worklist row
 * bl-erase-workbox-expiration). /greining's erase runs it before deleteLocalCaches().
 *
 * It empties the database's one store through a connection of its own and leaves the empty
 * database, because deleting it cannot finish while the worker runs: workbox opens the
 * database once per cache, keeps that connection, and never closes it on a versionchange (it
 * gives idb's openDB no `blocking` callback, and idb listens for versionchange only then).
 * Measured in Chromium on 2026-11-04: a deleteDatabase from the page fired `blocked` at once
 * and was still pending 3 s later, an open queued behind it stayed pending as long (so would
 * the worker's first open for a cache it had not written yet), and it ran only when the worker
 * stopped, after the page had reloaded. Opening at the current version fires no versionchange,
 * so the clear is never blocked, and the worker's own connections stay valid: its next cache
 * write adds a record as before (e2e/data-erase.spec.ts).
 *
 * 🔴 Opening a database that does not exist creates it, empty, at version 1; workbox's own
 * open(name, 1) would then run no upgrade and never make its store, and every later write of
 * the worker would fail. So the upgrade is aborted, which creates nothing.
 *
 * Like deleteLocalCaches it never throws (a failure is logged), and it waits at most
 * `timeoutMs`: the erase must still clear localStorage and reload.
 */
export async function clearExpirationRecords(
	timeoutMs = EXPIRATION_CLEAR_TIMEOUT_MS
): Promise<ExpirationClearResult> {
	if (!browser) return 'absent';
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<'timed-out'>((resolve) => {
		timer = setTimeout(() => resolve('timed-out'), timeoutMs);
	});
	const result = await Promise.race([emptyExpirationStore(), timedOut]);
	clearTimeout(timer);
	if (result === 'timed-out') {
		console.error(`The service worker's expiry records did not answer within ${timeoutMs} ms`);
	}
	return result;
}

function emptyExpirationStore(): Promise<Exclude<ExpirationClearResult, 'timed-out'>> {
	return new Promise((resolve) => {
		const fail = (e: unknown) => {
			console.error("Could not clear the service worker's expiry records:", e);
			resolve('failed');
		};
		let request: IDBOpenDBRequest;
		try {
			// Reading `indexedDB` throws where storage is blocked (Firefox with cookies off).
			if (typeof indexedDB === 'undefined') return resolve('absent');
			request = indexedDB.open(EXPIRATION_DB);
		} catch (e) {
			return fail(e);
		}
		let creating = false;
		request.onupgradeneeded = () => {
			// No version was asked for, so this fires only when the database does not exist.
			creating = true;
			request.transaction?.abort();
		};
		request.onerror = (event) => {
			event.preventDefault();
			if (creating) resolve('absent');
			else fail(request.error);
		};
		request.onsuccess = () => {
			const db = request.result;
			// Never be the connection that blocks someone else's upgrade or delete.
			db.onversionchange = () => db.close();
			if (!db.objectStoreNames.contains(EXPIRATION_STORE)) {
				db.close();
				return resolve('absent');
			}
			try {
				const tx = db.transaction(EXPIRATION_STORE, 'readwrite');
				tx.objectStore(EXPIRATION_STORE).clear();
				tx.oncomplete = () => {
					db.close();
					resolve('cleared');
				};
				tx.onabort = () => {
					db.close();
					fail(tx.error);
				};
			} catch (e) {
				db.close();
				fail(e);
			}
		};
	});
}

/**
 * Runtime caches that earlier service workers on this origin made and no current worker uses
 * or deletes, so a browser that ran one may still hold them. Exact names, from each worker's
 * runtimeCaching config in git history:
 * - the SvelteKit worker until 921132b (2026-03-01): 'google-fonts-cache' and
 *   'gstatic-fonts-cache', Google Fonts' stylesheets and font files (edcb7b0, 435b62a);
 * - the React reader's worker (96feef2, 2025-12-31, the last config on archive/react-v1):
 *   'content-json' (tables of contents, glossaries), 'content-markdown' (sections),
 *   'content-images' (figures) and 'book-covers'.
 * Every rule in those configs named its cache, so none fell back to workbox's default
 * `workbox-runtime-…` name. Never a prefix here: the current precache is
 * `workbox-precache-v2-<scope>` and must stay.
 */
export const LEGACY_CACHES: readonly string[] = [
	'google-fonts-cache',
	'gstatic-fonts-cache',
	'content-json',
	'content-markdown',
	'content-images',
	'book-covers'
];

/**
 * Delete what this site keeps for the reader in Cache Storage (plan step S3.2, PED-14):
 * every downloaded book (`offline-book:<slug>`), the browsing caches of pages and figures,
 * which also show what was read, and the runtime caches earlier workers left behind
 * (LEGACY_CACHES; the React reader's held sections and figures too). The service worker's
 * precache (the app itself) stays; its expiry records go with clearExpirationRecords(). Run
 * it before clearAllStorage(): with the record of downloads gone but the caches kept, a book
 * shows as 'Sótt (0 B)' while its files stay on the device.
 *
 * It never throws: where Cache Storage fails (it has rejected in private windows), the erase
 * must still clear localStorage, so a failure is logged and the deletions that worked stand.
 * @returns the names of the caches deleted
 */
export async function deleteLocalCaches(): Promise<string[]> {
	if (!browser || typeof caches === 'undefined') return [];
	let names: string[];
	try {
		names = (await caches.keys()).filter(
			(name) =>
				name.startsWith(OFFLINE_CACHE_PREFIX) ||
				name === CONTENT_CACHE ||
				name === BROWSE_IMAGE_CACHE ||
				LEGACY_CACHES.includes(name)
		);
	} catch (e) {
		console.error('Could not list the caches to delete:', e);
		return [];
	}
	const results = await Promise.allSettled(names.map((name) => caches.delete(name)));
	results.forEach((r, i) => {
		if (r.status === 'rejected') console.error(`Could not delete the cache ${names[i]}:`, r.reason);
	});
	return names.filter((_, i) => results[i].status === 'fulfilled');
}

/**
 * Clear all namsbokasafn data from localStorage. Every store would write its in-memory state
 * back on its next change, so this stops all store writes until the page reloads, and the
 * caller must reload straight after (see /greining's erase). Other tabs reset their stores
 * when they see the removals (onStorageChange).
 */
export function clearAllStorage(): void {
	if (!browser) return;
	suspendWritesUntilReload();

	const keys = getAllStorageKeys();
	keys.forEach((key) => localStorage.removeItem(key));
}
