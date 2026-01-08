/**
 * Network status utilities for offline detection and error handling
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Reactive store for online/offline status
 */
function createNetworkStore() {
	const { subscribe, set } = writable(browser ? navigator.onLine : true);

	if (browser) {
		window.addEventListener('online', () => set(true));
		window.addEventListener('offline', () => set(false));
	}

	return { subscribe };
}

export const isOnline = createNetworkStore();

/**
 * Check if an error is likely due to being offline
 */
export function isOfflineError(error: unknown): boolean {
	if (!browser) return false;

	// Check navigator status
	if (!navigator.onLine) return true;

	// Check error type
	if (error instanceof TypeError) {
		const message = error.message.toLowerCase();
		if (
			message.includes('failed to fetch') ||
			message.includes('network request failed') ||
			message.includes('networkerror') ||
			message.includes('load failed')
		) {
			return true;
		}
	}

	// Check error message string
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (
			message.includes('offline') ||
			message.includes('network') ||
			message.includes('fetch')
		) {
			return true;
		}
	}

	return false;
}

/**
 * Custom error class for offline content failures
 */
export class OfflineContentError extends Error {
	readonly bookSlug: string;
	readonly isBookDownloaded: boolean;

	constructor(message: string, bookSlug: string, isBookDownloaded: boolean) {
		super(message);
		this.name = 'OfflineContentError';
		this.bookSlug = bookSlug;
		this.isBookDownloaded = isBookDownloaded;
	}
}

/**
 * Wrapper for fetch that provides better offline error handling
 */
export async function fetchWithOfflineCheck(
	url: string,
	bookSlug: string,
	isBookDownloaded: boolean,
	fetchFn: typeof fetch = fetch
): Promise<Response> {
	try {
		const response = await fetchFn(url);
		return response;
	} catch (error) {
		if (isOfflineError(error)) {
			throw new OfflineContentError(
				isBookDownloaded
					? 'Gat ekki hlaðið efni úr skyndiminni. Reyndu að sækja bókina aftur.'
					: 'Þú ert án nettengingar og bókin hefur ekki verið sótt fyrir ónettengdan lestur.',
				bookSlug,
				isBookDownloaded
			);
		}
		throw error;
	}
}
