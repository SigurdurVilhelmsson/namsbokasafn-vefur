/**
 * Storage key migration utility
 * Migrates localStorage from old hyphenated keys to new colon-separated namespace
 */

import { browser } from '$app/environment';
import { BROWSE_IMAGE_CACHE, CONTENT_CACHE, OFFLINE_CACHE_PREFIX } from '$lib/sw/runtimeCaching';

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
 * Delete what this site keeps for the reader in Cache Storage (plan step S3.2, PED-14):
 * every downloaded book (`offline-book:<slug>`) and the browsing caches of pages and
 * figures, which also show what was read. The service worker's precache (the app itself)
 * stays. Run it before clearAllStorage(): with the record of downloads gone but the caches
 * kept, a book shows as 'Sótt (0 B)' while its files stay on the device.
 * @returns the names of the caches deleted
 */
export async function deleteLocalCaches(): Promise<string[]> {
	if (!browser || typeof caches === 'undefined') return [];
	const names = (await caches.keys()).filter(
		(name) => name.startsWith(OFFLINE_CACHE_PREFIX) || name === CONTENT_CACHE || name === BROWSE_IMAGE_CACHE
	);
	await Promise.all(names.map((name) => caches.delete(name)));
	return names;
}

/**
 * Clear all namsbokasafn data from localStorage. Every store writes its in-memory state back
 * on its next change, so reload the page straight after (see /greining's erase).
 */
export function clearAllStorage(): void {
	if (!browser) return;

	const keys = getAllStorageKeys();
	keys.forEach((key) => localStorage.removeItem(key));
}
