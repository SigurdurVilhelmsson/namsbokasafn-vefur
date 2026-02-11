/**
 * Offline Store - Manages book download state for offline reading
 */

import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem } from '$lib/utils/localStorage';
import type { TableOfContents } from '$lib/types/content';
import { getChapterFolder } from '$lib/utils/contentLoader';

// Types
export interface BookDownloadState {
	downloaded: boolean;
	downloadedAt: string | null;
	version: string | null;
	sizeBytes: number;
}

export interface DownloadProgress {
	bookSlug: string;
	status: 'idle' | 'estimating' | 'downloading' | 'complete' | 'error';
	totalFiles: number;
	downloadedFiles: number;
	totalBytes: number;
	downloadedBytes: number;
	error: string | null;
}

interface OfflineState {
	books: Record<string, BookDownloadState>;
	currentDownload: DownloadProgress | null;
}

const STORAGE_KEY = 'namsbokasafn:offline';
const CONTENT_CACHE = 'book-content';
const IMAGES_CACHE = 'book-images';

const defaultState: OfflineState = {
	books: {},
	currentDownload: null
};

function loadState(): OfflineState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultState, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.warn('Failed to load offline state:', e);
	}
	return defaultState;
}

function createOfflineStore() {
	const { subscribe, set, update } = writable<OfflineState>(loadState());

	// Persist to localStorage (only book download state, not progress)
	if (browser) {
		subscribe((state) => {
			const persistState = {
				books: state.books
			};
			safeSetItem(STORAGE_KEY, JSON.stringify(persistState));
		});
	}

	return {
		subscribe,

		/**
		 * Check if a book is downloaded for offline use
		 */
		isDownloaded: (bookSlug: string): boolean => {
			let state: OfflineState = defaultState;
			subscribe((s) => (state = s))();
			return state.books[bookSlug]?.downloaded ?? false;
		},

		/**
		 * Get download state for a specific book
		 */
		getBookState: (bookSlug: string): BookDownloadState | null => {
			let state: OfflineState = defaultState;
			subscribe((s) => (state = s))();
			return state.books[bookSlug] ?? null;
		},

		/**
		 * Start download progress tracking
		 */
		startDownload: (bookSlug: string, totalFiles: number) =>
			update((s) => ({
				...s,
				currentDownload: {
					bookSlug,
					status: 'downloading',
					totalFiles,
					downloadedFiles: 0,
					totalBytes: 0,
					downloadedBytes: 0,
					error: null
				}
			})),

		/**
		 * Update download progress
		 */
		updateProgress: (downloadedFiles: number, downloadedBytes: number, totalBytes?: number) =>
			update((s) => {
				if (!s.currentDownload) return s;
				return {
					...s,
					currentDownload: {
						...s.currentDownload,
						downloadedFiles,
						downloadedBytes,
						totalBytes: totalBytes ?? s.currentDownload.totalBytes
					}
				};
			}),

		/**
		 * Mark download as complete
		 */
		completeDownload: (bookSlug: string, sizeBytes: number) =>
			update((s) => ({
				...s,
				books: {
					...s.books,
					[bookSlug]: {
						downloaded: true,
						downloadedAt: new Date().toISOString(),
						version: '1.0',
						sizeBytes
					}
				},
				currentDownload: {
					...s.currentDownload!,
					status: 'complete'
				}
			})),

		/**
		 * Set download error
		 */
		setError: (error: string) =>
			update((s) => ({
				...s,
				currentDownload: s.currentDownload
					? {
							...s.currentDownload,
							status: 'error',
							error
						}
					: null
			})),

		/**
		 * Clear current download progress
		 */
		clearProgress: () =>
			update((s) => ({
				...s,
				currentDownload: null
			})),

		/**
		 * Remove a downloaded book
		 */
		removeBook: async (bookSlug: string) => {
			if (!browser) return;

			try {
				// Clear from caches
				const contentCache = await caches.open(CONTENT_CACHE);
				const imagesCache = await caches.open(IMAGES_CACHE);

				const contentKeys = await contentCache.keys();
				const imageKeys = await imagesCache.keys();

				const bookPattern = `/content/${bookSlug}/`;

				await Promise.all([
					...contentKeys
						.filter((req) => req.url.includes(bookPattern))
						.map((req) => contentCache.delete(req)),
					...imageKeys
						.filter((req) => req.url.includes(bookPattern))
						.map((req) => imagesCache.delete(req))
				]);

				// Update state
				update((s) => {
					const newBooks = { ...s.books };
					delete newBooks[bookSlug];
					return { ...s, books: newBooks };
				});
			} catch (e) {
				console.error('Failed to remove book from cache:', e);
			}
		},

		/**
		 * Reset store
		 */
		reset: () => set(defaultState)
	};
}

export const offline = createOfflineStore();

// Derived stores
export const currentDownload = derived(offline, ($offline) => $offline.currentDownload);
export const downloadedBooks = derived(offline, ($offline) => $offline.books);

/**
 * Get all content URLs for a book based on its TOC
 */
export function getBookContentUrls(bookSlug: string, toc: TableOfContents): string[] {
	const urls: string[] = [];
	const basePath = `/content/${bookSlug}`;

	// TOC and glossary
	urls.push(`${basePath}/toc.json`);
	urls.push(`${basePath}/glossary.json`);

	// All section content files
	for (const chapter of toc.chapters) {
		for (const section of chapter.sections) {
			urls.push(`${basePath}/chapters/${getChapterFolder(chapter)}/${section.file}`);
		}
	}

	return urls;
}

/**
 * Extract image URLs from content (supports both markdown and HTML)
 */
export function extractImageUrls(content: string, basePath: string): string[] {
	const urls: string[] = [];
	let match;

	// Markdown image syntax: ![alt](url)
	const mdImageRegex = /!\[.*?\]\((.*?)\)/g;
	while ((match = mdImageRegex.exec(content)) !== null) {
		urls.push(match[1]);
	}

	// HTML image syntax: <img src="url">
	const htmlImageRegex = /<img[^>]+src=["']([^"']+)["']/g;
	while ((match = htmlImageRegex.exec(content)) !== null) {
		urls.push(match[1]);
	}

	// Normalize paths
	return urls.map((url) => {
		if (url.startsWith('./') || url.startsWith('../') || !url.startsWith('/')) {
			url = url.replace(/^\.\//, '');
			url = `${basePath}/${url}`;
		}
		return url.replace(/\/+/g, '/');
	});
}

/**
 * Download a book for offline use
 */
export async function downloadBook(
	bookSlug: string,
	onProgress?: (downloaded: number, total: number) => void
): Promise<{ success: boolean; error?: string; sizeBytes: number }> {
	if (!browser) {
		return { success: false, error: 'Not in browser', sizeBytes: 0 };
	}

	try {
		// Load TOC first
		const tocResponse = await fetch(`/content/${bookSlug}/toc.json`);
		if (!tocResponse.ok) {
			throw new Error('Gat ekki hlaðið efnisyfirliti');
		}
		const toc: TableOfContents = await tocResponse.json();

		// Get all content URLs
		const contentUrls = getBookContentUrls(bookSlug, toc);

		// Open caches
		const contentCache = await caches.open(CONTENT_CACHE);
		const imagesCache = await caches.open(IMAGES_CACHE);

		let downloadedFiles = 0;
		let totalBytes = 0;
		const allImageUrls = new Set<string>();

		// Start tracking
		offline.startDownload(bookSlug, contentUrls.length);

		// Download all content files
		for (const url of contentUrls) {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					console.warn(`Failed to fetch ${url}`);
					continue;
				}

				const contentType = response.headers.get('content-type') || '';
				const content = await response.clone().text();
				totalBytes += content.length;

				// Cache the response
				await contentCache.put(url, response);

				// Extract images from content files
				if (url.endsWith('.md') || url.endsWith('.html')) {
					const basePath = url.substring(0, url.lastIndexOf('/'));
					const images = extractImageUrls(content, basePath);
					images.forEach((img) => allImageUrls.add(img));
				}

				downloadedFiles++;
				offline.updateProgress(downloadedFiles, totalBytes);
				onProgress?.(downloadedFiles, contentUrls.length + allImageUrls.size);
			} catch (e) {
				console.warn(`Error fetching ${url}:`, e);
			}
		}

		// Download all images
		const imageUrls = Array.from(allImageUrls);
		const totalFiles = contentUrls.length + imageUrls.length;

		for (const url of imageUrls) {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					console.warn(`Failed to fetch image ${url}`);
					continue;
				}

				const blob = await response.clone().blob();
				totalBytes += blob.size;

				await imagesCache.put(url, response);

				downloadedFiles++;
				offline.updateProgress(downloadedFiles, totalBytes, totalBytes);
				onProgress?.(downloadedFiles, totalFiles);
			} catch (e) {
				console.warn(`Error fetching image ${url}:`, e);
			}
		}

		// Mark as complete
		offline.completeDownload(bookSlug, totalBytes);

		return { success: true, sizeBytes: totalBytes };
	} catch (e) {
		const error = e instanceof Error ? e.message : 'Villa við niðurhal';
		offline.setError(error);
		return { success: false, error, sizeBytes: 0 };
	}
}

/**
 * Estimate download size for a book
 */
export async function estimateBookSize(bookSlug: string): Promise<number> {
	if (!browser) return 0;

	try {
		const tocResponse = await fetch(`/content/${bookSlug}/toc.json`);
		if (!tocResponse.ok) return 0;

		const toc: TableOfContents = await tocResponse.json();
		const contentUrls = getBookContentUrls(bookSlug, toc);

		// Estimate ~10KB per content file + ~50KB per image
		// This is a rough estimate - actual size fetched during download
		const estimatedContentSize =
			contentUrls.filter((u) => u.endsWith('.md') || u.endsWith('.html')).length * 10000;
		const estimatedImageCount = toc.chapters.reduce((acc, ch) => acc + ch.sections.length * 2, 0);
		const estimatedImageSize = estimatedImageCount * 50000;

		return estimatedContentSize + estimatedImageSize;
	} catch {
		return 0;
	}
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
