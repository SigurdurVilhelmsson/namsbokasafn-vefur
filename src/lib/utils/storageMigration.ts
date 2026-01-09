/**
 * Storage key migration utility
 * Migrates localStorage from old hyphenated keys to new colon-separated namespace
 */

import { browser } from '$app/environment';

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
		console.log(`Migrated ${migratedCount} storage keys to new namespace format`);
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
 * Clear all namsbokasafn data from localStorage
 */
export function clearAllStorage(): void {
	if (!browser) return;

	const keys = getAllStorageKeys();
	keys.forEach((key) => localStorage.removeItem(key));
}
