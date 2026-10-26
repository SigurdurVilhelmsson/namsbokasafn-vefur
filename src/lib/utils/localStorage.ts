/**
 * Safe localStorage wrapper with quota monitoring.
 *
 * All stores should use safeSetItem() instead of bare localStorage.setItem()
 * to gracefully handle QuotaExceededError and warn users before data loss.
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface StorageWarningState {
	visible: boolean;
	quotaExceeded: boolean;
}

const defaultWarning: StorageWarningState = { visible: false, quotaExceeded: false };

export const storageWarning = writable<StorageWarningState>(defaultWarning);

/**
 * Estimate total localStorage usage in bytes.
 */
export function getStorageUsageBytes(): number {
	if (!browser) return 0;
	let total = 0;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key) {
			// Each char is 2 bytes in JS strings (UTF-16)
			total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
		}
	}
	return total;
}

/** Set by the erase (clearAllStorage): no store saves again before the page reloads. */
let writesSuspended = false;

/**
 * Stop every store from saving until the page reloads. clearAllStorage() calls it before it
 * removes the keys, so no store writes its in-memory state back in the moment before the
 * reload (plan step S3.2). There is no way to resume: the reload starts a fresh page.
 */
export function suspendWritesUntilReload(): void {
	writesSuspended = true;
}

// Typical browser localStorage limit
const QUOTA_LIMIT = 5 * 1024 * 1024; // 5 MB
const WARN_THRESHOLD = 0.8; // 80%

/**
 * Safe wrapper around localStorage.setItem().
 * Catches QuotaExceededError and updates the storageWarning store.
 * Returns true if the write succeeded, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
	if (writesSuspended) return false;
	try {
		localStorage.setItem(key, value);

		// Check if usage is approaching the limit
		const usage = getStorageUsageBytes();
		if (usage > QUOTA_LIMIT * WARN_THRESHOLD) {
			storageWarning.set({ visible: true, quotaExceeded: false });
		}

		return true;
	} catch (e) {
		if (e instanceof DOMException && e.name === 'QuotaExceededError') {
			storageWarning.set({ visible: true, quotaExceeded: true });
			console.warn(`localStorage quota exceeded when writing key "${key}"`);
			return false;
		}
		throw e;
	}
}

/**
 * Dismiss the storage warning banner.
 */
export function dismissStorageWarning(): void {
	storageWarning.set({ visible: false, quotaExceeded: false });
}

/**
 * Set up cross-tab synchronization for a localStorage-backed store.
 *
 * The 'storage' event fires only in OTHER tabs when localStorage changes,
 * so there is no circular update risk.
 *
 * A removal (another tab's erase, or localStorage.clear(), which reports key null) is passed
 * on as 'null': every store parses it to null, which validateStoreData replaces with the
 * defaults, so this tab drops the erased data instead of writing it back on its next change.
 *
 * @param key - The localStorage key to watch
 * @param onExternalChange - Callback with the raw new value ('null' when the key was removed)
 * @returns Cleanup function to remove the listener
 */
export function onStorageChange(key: string, onExternalChange: (newValue: string) => void): () => void {
	const handler = (e: StorageEvent) => {
		if (e.key === key) {
			onExternalChange(e.newValue ?? 'null');
		} else if (e.key === null) {
			onExternalChange('null');
		}
	};

	window.addEventListener('storage', handler);
	return () => window.removeEventListener('storage', handler);
}
