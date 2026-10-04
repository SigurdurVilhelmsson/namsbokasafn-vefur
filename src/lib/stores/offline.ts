/**
 * Offline Store - Manages book download state for offline reading
 *
 * A downloaded book lives in its own Cache Storage cache, `offline-book:<slug>`,
 * which nothing expires; the service worker serves from it when its browsing caches
 * miss (src/lib/sw/runtimeCaching.ts). The download fetches with a query that no
 * service-worker route matches, so it never passes through the capped browsing
 * caches — the old download went through them and kept 200 of chemistry's 1,147
 * figures while saying "Sótt".
 *
 * What to fetch comes from the book's build-time `offline-manifest.json` (real sizes
 * and hashes, so the estimate is real and an update fetches only changed files). A
 * book whose served toc.json has no `offline` summary (the frozen books on the
 * server) falls back to a list built from its toc and the pages' <img> tags.
 *
 * Design: docs/plans/2026-10-04-sw-cache-and-offline-download.md.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isObject } from '$lib/utils/storeValidation';
import type { TableOfContents } from '$lib/types/content';
import { getChapterFolder } from '$lib/utils/contentLoader';
import {
	BROWSE_IMAGE_CACHE,
	CONTENT_CACHE,
	OFFLINE_BYPASS_QUERY,
	OFFLINE_CAPS_MESSAGE,
	offlineCacheName
} from '$lib/sw/runtimeCaching';
import {
	planSync,
	deriveStatus,
	heldStateKey,
	type HeldState,
	type ManifestFile,
	type OfflineManifest,
	type OfflineStatus
} from '$lib/utils/offlineSync';

// Types
export interface BookDownloadState {
	/** Every file is stored (an outdated book still counts: it reads offline in full). */
	downloaded: boolean;
	downloadedAt: string | null;
	/** Manifest version stored; null for a list built in the browser. */
	version: string | null;
	sizeBytes: number;
	/** Files the last download or check found missing. */
	missing?: number;
	/** Written by the pre-2026-10 download, which kept only 200 figures. */
	legacyIncomplete?: boolean;
}

export interface DownloadProgress {
	bookSlug: string;
	status: 'idle' | 'estimating' | 'downloading' | 'complete' | 'error';
	totalFiles: number;
	downloadedFiles: number;
	failedFiles: number;
	totalBytes: number;
	downloadedBytes: number;
	error: string | null;
}

interface OfflineState {
	books: Record<string, BookDownloadState>;
	currentDownload: DownloadProgress | null;
}

const STORAGE_KEY = 'namsbokasafn:offline';
/** The version string every pre-2026-10 download recorded. */
const LEGACY_VERSION = '1.0';
/** Concurrent fetches during a download. */
const DOWNLOAD_CONCURRENCY = 4;
/** Write the held-state record every this many files, so a resume skips them. */
const FLUSH_EVERY = 50;

const defaultState: OfflineState = {
	books: {},
	currentDownload: null
};

const offlineValidators = {
	books: isObject
};

/**
 * Never report a pre-2026-10 download as complete: it lost all but 200 figures to
 * the old cache limit. Idempotent.
 */
export function migrateLegacyBooks(
	books: Record<string, BookDownloadState>
): Record<string, BookDownloadState> {
	let changed = false;
	const next = Object.fromEntries(
		Object.entries(books).map(([slug, book]) => {
			if (book?.version !== LEGACY_VERSION) return [slug, book];
			changed = true;
			return [slug, { ...book, downloaded: false, version: null, legacyIncomplete: true }];
		})
	);
	return changed ? next : books;
}

function loadState(): OfflineState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const state = validateStoreData(JSON.parse(stored), defaultState, offlineValidators);
			return { ...state, books: migrateLegacyBooks(state.books) };
		}
	} catch (e) {
		console.warn('Failed to load offline state:', e);
	}
	return defaultState;
}

function createOfflineStore() {
	const { subscribe, set, update } = writable<OfflineState>(loadState());

	// Persist to localStorage (only book download state, not progress)
	let _externalUpdate = false;
	if (browser) {
		subscribe((state) => {
			if (!_externalUpdate) {
				const persistState = {
					books: state.books
				};
				safeSetItem(STORAGE_KEY, JSON.stringify(persistState));
			}
		});

		// Cross-tab synchronization
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				const state = validateStoreData(JSON.parse(newValue), defaultState, offlineValidators);
				// Only `books` is shared: this tab's download progress is never persisted,
				// so another tab's write must not reset it.
				update((s) => ({ ...s, books: migrateLegacyBooks(state.books) }));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	return {
		subscribe,

		/**
		 * Check if a book is downloaded for offline use
		 */
		isDownloaded: (bookSlug: string): boolean => {
			const state = get({ subscribe });
			return state.books[bookSlug]?.downloaded ?? false;
		},

		/**
		 * Get download state for a specific book
		 */
		getBookState: (bookSlug: string): BookDownloadState | null => {
			const state = get({ subscribe });
			return state.books[bookSlug] ?? null;
		},

		/**
		 * Record a book's download state
		 */
		setBook: (bookSlug: string, book: BookDownloadState) =>
			update((s) => ({ ...s, books: { ...s.books, [bookSlug]: book } })),

		/**
		 * Forget a book's download state
		 */
		forgetBook: (bookSlug: string) =>
			update((s) => {
				const books = { ...s.books };
				delete books[bookSlug];
				return { ...s, books };
			}),

		/**
		 * Mark a download as starting (before its file list is known)
		 */
		beginDownload: (bookSlug: string) =>
			update((s) => ({
				...s,
				currentDownload: {
					bookSlug,
					status: 'estimating',
					totalFiles: 0,
					downloadedFiles: 0,
					failedFiles: 0,
					totalBytes: 0,
					downloadedBytes: 0,
					error: null
				}
			})),

		/**
		 * Start download progress tracking
		 */
		startDownload: (bookSlug: string, totalFiles: number, totalBytes = 0) =>
			update((s) => ({
				...s,
				currentDownload: {
					bookSlug,
					status: 'downloading',
					totalFiles,
					downloadedFiles: 0,
					failedFiles: 0,
					totalBytes,
					downloadedBytes: 0,
					error: null
				}
			})),

		/**
		 * Update download progress
		 */
		updateProgress: (
			bookSlug: string,
			downloadedFiles: number,
			downloadedBytes: number,
			failedFiles?: number
		) =>
			update((s) => {
				if (s.currentDownload?.bookSlug !== bookSlug) return s;
				return {
					...s,
					currentDownload: {
						...s.currentDownload,
						downloadedFiles,
						downloadedBytes,
						failedFiles: failedFiles ?? s.currentDownload.failedFiles
					}
				};
			}),

		/**
		 * Mark a book's download as finished
		 */
		finishDownload: (bookSlug: string) =>
			update((s) =>
				s.currentDownload?.bookSlug === bookSlug
					? { ...s, currentDownload: { ...s.currentDownload, status: 'complete' as const } }
					: s
			),

		/**
		 * Report a book's download as failed. Replaces another book's finished
		 * progress, never another book's running download.
		 */
		setError: (bookSlug: string, error: string) =>
			update((s) => {
				const current = s.currentDownload;
				const busy = current?.status === 'downloading' || current?.status === 'estimating';
				if (current && current.bookSlug !== bookSlug && busy) return s;
				return {
					...s,
					currentDownload: {
						bookSlug,
						totalFiles: 0,
						downloadedFiles: 0,
						failedFiles: 0,
						totalBytes: 0,
						downloadedBytes: 0,
						...(current?.bookSlug === bookSlug ? current : {}),
						status: 'error',
						error
					}
				};
			}),

		/**
		 * Clear current download progress
		 */
		clearProgress: () =>
			update((s) => ({
				...s,
				currentDownload: null
			})),

		/**
		 * Remove a downloaded book: its offline cache, its entries in the browsing
		 * caches (so "Eyða" frees the space it says it does), and its record.
		 */
		removeBook: async (bookSlug: string) => {
			if (!browser) return;

			try {
				await caches.delete(offlineCacheName(bookSlug));
				const bookPattern = `/content/${bookSlug}/`;
				for (const name of [CONTENT_CACHE, BROWSE_IMAGE_CACHE]) {
					const cache = await caches.open(name);
					const keys = await cache.keys();
					await Promise.all(
						keys.filter((req) => req.url.includes(bookPattern)).map((req) => cache.delete(req))
					);
				}
				offline.forgetBook(bookSlug);
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
 * Every page URL of a book, from its TOC: chapter sections, front matter, appendices
 * and answer keys, plus toc.json and the glossary/index when the book has them.
 */
export function getBookContentUrls(bookSlug: string, toc: TableOfContents): string[] {
	const urls: string[] = [];
	const basePath = `/content/${bookSlug}`;

	urls.push(`${basePath}/toc.json`);
	if (toc.glossary) urls.push(`${basePath}/glossary.json`);
	if (toc.index) urls.push(`${basePath}/index.json`);

	for (const section of toc.frontMatter ?? []) {
		urls.push(`${basePath}/chapters/00/${section.file}`);
	}
	for (const chapter of toc.chapters) {
		for (const section of chapter.sections) {
			urls.push(`${basePath}/chapters/${getChapterFolder(chapter)}/${section.file}`);
		}
	}
	for (const appendix of toc.appendices ?? []) {
		if (!appendix.isInteractive) urls.push(`${basePath}/chapters/${appendix.file}`);
	}
	for (const entry of toc.answerKey ?? []) {
		urls.push(`${basePath}/chapters/${entry.file}`);
	}

	return urls;
}

/**
 * Extract image URLs from HTML content
 */
export function extractImageUrls(content: string, basePath: string): string[] {
	const urls: string[] = [];
	let match;

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

/** Fetch past the service worker's routes and the HTTP cache. */
function fetchDirect(path: string): Promise<Response> {
	return fetch(`${path}?${OFFLINE_BYPASS_QUERY}`, { cache: 'no-store' });
}

/** A cache key's path, as the manifest writes it. */
const keyPath = (req: Request): string => decodeURI(new URL(req.url).pathname);

/** A same-origin URL path, with `..` and `.` resolved. */
const normalizePath = (path: string): string =>
	decodeURI(new URL(path, 'http://localhost').pathname);

async function readHeld(cache: Cache, bookSlug: string): Promise<HeldState | null> {
	try {
		const res = await cache.match(heldStateKey(bookSlug));
		return res ? ((await res.json()) as HeldState) : null;
	} catch {
		return null;
	}
}

async function cachedPaths(cache: Cache): Promise<Set<string>> {
	return new Set((await cache.keys()).map(keyPath));
}

/**
 * The book's file list: its build-time manifest, or — when the served toc.json
 * has none (a frozen book) — one built from the TOC and the pages' <img> tags,
 * with sizes and hashes unknown.
 */
async function loadManifest(bookSlug: string, toc: TableOfContents): Promise<OfflineManifest> {
	if (toc.offline) {
		const res = await fetchDirect(`/content/${bookSlug}/offline-manifest.json`);
		if (!res.ok) throw new Error('Gat ekki hlaðið skráalista bókarinnar');
		return (await res.json()) as OfflineManifest;
	}

	const pages = getBookContentUrls(bookSlug, toc).filter((u) => !u.endsWith('/toc.json'));
	const images = new Set<string>();
	for (const page of pages.filter((u) => u.endsWith('.html'))) {
		const res = await fetchDirect(page);
		if (!res.ok) continue;
		const dir = page.substring(0, page.lastIndexOf('/'));
		for (const img of extractImageUrls(await res.text(), dir)) {
			if (img.startsWith('/content/')) images.add(normalizePath(img));
		}
	}
	return {
		version: null,
		bytes: 0,
		files: [...pages, ...images].map((p) => ({ p: normalizePath(p), b: 0, h: '' }))
	};
}

/** Run `task` over `items` with at most `limit` at a time. */
async function pool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) await task(items[next++]);
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * Fetch the book's table of contents through the service worker (as the reader
 * does), or null.
 */
export async function loadOfflineToc(bookSlug: string): Promise<TableOfContents | null> {
	if (!browser) return null;
	try {
		const res = await fetch(`/content/${bookSlug}/toc.json`);
		return res.ok ? ((await res.json()) as TableOfContents) : null;
	} catch {
		return null;
	}
}

/**
 * What is really stored for a book, reconciled into the store: a record that says
 * "downloaded" while files are missing (a failed or interrupted download, or the
 * browser evicting storage) is corrected.
 *
 * @param tocVersion `toc.offline.version` as served now, or null when unknown
 */
export async function verifyBook(
	bookSlug: string,
	tocVersion: string | null
): Promise<{ status: OfflineStatus; missing: number }> {
	const record = offline.getBookState(bookSlug);
	if (!browser) return { status: 'none', missing: 0 };

	let held: HeldState | null = null;
	let cached = new Set<string>();
	const name = offlineCacheName(bookSlug);
	if (await caches.has(name)) {
		const cache = await caches.open(name);
		held = await readHeld(cache, bookSlug);
		cached = await cachedPaths(cache);
	}

	const result = deriveStatus(tocVersion, held, cached, !!record?.legacyIncomplete);
	if (record?.downloaded && (result.status === 'incomplete' || result.status === 'none')) {
		offline.setBook(bookSlug, { ...record, downloaded: false, missing: result.missing });
	}
	return result;
}

/** A failure whose message is written for the reader (Icelandic). */
class DownloadError extends Error {}

/** What the reader is shown for a failure; the raw error goes to the console. */
function readerMessage(e: unknown): string {
	if (e instanceof DownloadError) return e.message;
	if ((browser && !navigator.onLine) || e instanceof TypeError) {
		return 'Engin nettenging. Athugaðu tenginguna og reyndu aftur.';
	}
	if (e instanceof DOMException && e.name === 'QuotaExceededError') {
		return 'Ekki nóg geymslupláss á tækinu.';
	}
	return 'Villa við niðurhal';
}

/**
 * Whether the ACTIVE service worker serves downloaded books. A worker from before
 * offline-book:<slug> existed (the reader has not accepted the update prompt yet)
 * would never read the download, so the book would say "Sótt" and still not open
 * offline. Asks static/sw-offline-book.js over a message channel; silence = no.
 */
export async function workerServesOfflineBooks(): Promise<boolean> {
	if (!('serviceWorker' in navigator)) return false;
	const timeout = <T>(ms: number, value: T) => new Promise<T>((r) => setTimeout(() => r(value), ms));
	const registration = await Promise.race([navigator.serviceWorker.ready, timeout(5000, null)]);
	const worker = registration?.active;
	if (!worker) return false;
	return Promise.race([
		new Promise<boolean>((resolve) => {
			const channel = new MessageChannel();
			channel.port1.onmessage = (event) => resolve(event.data?.offlineBook === 1);
			worker.postMessage({ type: OFFLINE_CAPS_MESSAGE }, [channel.port2]);
		}),
		timeout(2000, false)
	]);
}

type DownloadResult = { success: boolean; error?: string; sizeBytes: number; failedCount?: number };

/** The download running in this tab, if any: one at a time, whatever the book. */
let activeDownload: { bookSlug: string; promise: Promise<DownloadResult> } | null = null;

/**
 * Download a book for offline use — or finish an interrupted download, or bring a
 * downloaded book up to date. Only files that are not already stored with the
 * current hash are fetched; files the book no longer has are deleted.
 *
 * One download runs at a time: a second call for the same book joins the running
 * one (a double tap must not fetch the book twice), and another tab downloading the
 * same book holds a Web Lock this call does not wait for.
 */
export function downloadBook(bookSlug: string): Promise<DownloadResult> {
	if (!browser) {
		return Promise.resolve({ success: false, error: 'Not in browser', sizeBytes: 0 });
	}
	if (activeDownload) {
		if (activeDownload.bookSlug === bookSlug) return activeDownload.promise;
		return Promise.resolve({ success: false, error: 'Önnur bók er í niðurhali', sizeBytes: 0 });
	}

	offline.beginDownload(bookSlug);
	const run = async (): Promise<DownloadResult> => {
		try {
			return await runDownload(bookSlug);
		} catch (e) {
			console.error('Offline download failed:', e);
			const error = readerMessage(e);
			offline.setError(bookSlug, error);
			return { success: false, error, sizeBytes: 0 };
		}
	};
	const locks = navigator.locks;
	const promise = (
		locks
			? locks.request(offlineCacheName(bookSlug), { ifAvailable: true }, (lock) => {
					if (lock) return run();
					const error = 'Bókin er þegar sótt í öðrum glugga.';
					offline.setError(bookSlug, error);
					return { success: false, error, sizeBytes: 0 };
				})
			: run()
	).finally(() => {
		activeDownload = null;
	});
	activeDownload = { bookSlug, promise };
	return promise;
}

async function runDownload(bookSlug: string): Promise<DownloadResult> {
	if (!(await workerServesOfflineBooks())) {
		throw new DownloadError(
			navigator.serviceWorker?.controller
				? 'Ný útgáfa af forritinu er tilbúin. Veldu „Uppfæra núna“ og sæktu bókina svo.'
				: 'Ónettengdur lestur er ekki tilbúinn enn. Opnaðu síðuna aftur og reyndu svo.'
		);
	}

	const tocPath = `/content/${bookSlug}/toc.json`;
	const tocResponse = await fetchDirect(tocPath);
	if (!tocResponse.ok) throw new DownloadError('Gat ekki hlaðið efnisyfirliti');
	const toc: TableOfContents = await tocResponse.clone().json();
	const manifest = await loadManifest(bookSlug, toc);

	// Ask the browser not to evict the download under storage pressure.
	await navigator.storage?.persist?.().catch(() => false);

	const cache = await caches.open(offlineCacheName(bookSlug));
	const held = await readHeld(cache, bookSlug);
	const { toFetch, toDelete, bytes } = planSync(bookSlug, manifest, held, await cachedPaths(cache));

	const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
	if (estimate?.quota && estimate.quota - (estimate.usage ?? 0) < bytes) {
		throw new DownloadError(
			`Ekki nóg geymslupláss á tækinu: þarf ${formatBytes(bytes)}, laust ${formatBytes(
				estimate.quota - (estimate.usage ?? 0)
			)}.`
		);
	}

	// Start from the files kept unchanged; each verified fetch adds its own.
	const fetching = new Set(toFetch);
	const files: Record<string, string> = {};
	for (const f of manifest.files) {
		if (!fetching.has(f)) files[f.p] = f.h;
	}
	const writeHeld = (complete: boolean) =>
		cache.put(
			heldStateKey(bookSlug),
			new Response(
				JSON.stringify({
					version: manifest.version,
					complete,
					total: manifest.files.length,
					files
				} satisfies HeldState),
				{ headers: { 'content-type': 'application/json' } }
			)
		);

	offline.startDownload(bookSlug, toFetch.length, bytes);
	let done = 0;
	let failed = 0;
	let fetchedBytes = 0;

	await pool(toFetch, DOWNLOAD_CONCURRENCY, async (f: ManifestFile) => {
		try {
			const res = await fetchDirect(f.p);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const isPage = /\.(html|json)$/.test(f.p);
			// nginx answers a missing figure with the SPA shell (200, text/html).
			if (!isPage && (res.headers.get('content-type') ?? '').includes('text/html')) {
				throw new Error('not an image');
			}
			const size = (await res.clone().blob()).size;
			// A size other than the manifest's means a deploy changed the file mid-download.
			if (f.b > 0 && size !== f.b) throw new Error('size mismatch');
			await cache.put(f.p, res);
			files[f.p] = f.h;
			fetchedBytes += size;
		} catch (e) {
			console.warn(`Offline download: ${f.p}:`, e);
			failed++;
		}
		done++;
		offline.updateProgress(bookSlug, done, fetchedBytes, failed);
		if (done % FLUSH_EVERY === 0) await writeHeld(false);
	});

	await Promise.all(toDelete.map((p) => cache.delete(p)));

	// toc.json LAST, and only if it still describes the files just stored: a deploy
	// that landed at any point since the manifest was read changes its version, and
	// the book is then left incomplete so the next run fetches the new manifest.
	// (A browser-built list has no version to compare: frozen books.)
	const endToc = await fetchDirect(tocPath);
	const endVersion = endToc.ok
		? ((await endToc.clone().json()) as TableOfContents).offline?.version ?? null
		: undefined;
	const consistent = endToc.ok && (manifest.version === null || endVersion === manifest.version);
	if (consistent) await cache.put(tocPath, endToc);
	const complete = failed === 0 && consistent;
	await writeHeld(complete);

	// A browser-built list has no sizes: measure what is stored, whatever ran before.
	let sizeBytes = manifest.bytes;
	if (manifest.version === null) {
		sizeBytes = 0;
		for (const f of manifest.files) sizeBytes += (await (await cache.match(f.p))?.blob())?.size ?? 0;
	}
	offline.setBook(bookSlug, {
		downloaded: complete,
		downloadedAt: new Date().toISOString(),
		version: manifest.version,
		sizeBytes,
		missing: failed
	});
	offline.finishDownload(bookSlug);

	return { success: complete, sizeBytes, failedCount: failed > 0 ? failed : undefined };
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
