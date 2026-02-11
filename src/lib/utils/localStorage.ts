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

// Typical browser localStorage limit
const QUOTA_LIMIT = 5 * 1024 * 1024; // 5 MB
const WARN_THRESHOLD = 0.8; // 80%

/**
 * Safe wrapper around localStorage.setItem().
 * Catches QuotaExceededError and updates the storageWarning store.
 * Returns true if the write succeeded, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
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
