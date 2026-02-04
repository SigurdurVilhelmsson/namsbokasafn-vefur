/**
 * Search index utility using Fuse.js for fuzzy search
 *
 * Index building and search operations are offloaded to a web worker
 * to prevent blocking the main thread.
 */
import { browser } from '$app/environment';
import type { TableOfContents } from '$lib/types/content';
import { getChapterPath, getSectionPath, getChapterFolder } from '$lib/utils/contentLoader';
import type {
	WorkerMessage,
	WorkerResponse,
	RawDocument,
	SearchResult as WorkerSearchResult,
	SearchFilters as WorkerSearchFilters
} from '$lib/workers/search.types';

// =============================================================================
// TYPES
// =============================================================================

export interface SearchResult {
	chapterSlug: string;
	sectionSlug: string;
	chapterTitle: string;
	sectionTitle: string;
	sectionNumber: string;
	snippet: string;
	matches: number;
	score: number; // Fuse.js relevance score (0 = perfect match)
}

export interface SearchDocument {
	chapterSlug: string;
	sectionSlug: string;
	chapterTitle: string;
	sectionTitle: string;
	sectionNumber: string;
	content: string;
	plainText: string;
}

export interface SearchFilters {
	chapterSlug?: string;
	onlyTitles?: boolean;
}

// =============================================================================
// WORKER-BASED SEARCH INDEX CLASS
// =============================================================================

class SearchIndexWorker {
	private worker: Worker | null = null;
	private bookSlug: string = '';
	private isBuilding: boolean = false;
	private buildPromise: Promise<void> | null = null;
	private isReady: boolean = false;
	private chapters: { slug: string; title: string }[] = [];
	private pendingSearches: Map<
		string,
		{ resolve: (results: SearchResult[]) => void; reject: (error: Error) => void }
	> = new Map();
	private searchIdCounter = 0;

	constructor() {
		if (browser && typeof Worker !== 'undefined') {
			this.initWorker();
		}
	}

	private initWorker() {
		try {
			// Vite's worker import syntax
			this.worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
				type: 'module'
			});

			this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				this.handleWorkerMessage(event.data);
			};

			this.worker.onerror = (error) => {
				console.error('Search worker error:', error);
				// Fall back to no-op on worker error
				this.worker = null;
			};
		} catch (error) {
			console.warn('Web workers not supported, search will run on main thread:', error);
			this.worker = null;
		}
	}

	private handleWorkerMessage(response: WorkerResponse) {
		switch (response.type) {
			case 'build-complete':
				this.isReady = true;
				this.isBuilding = false;
				break;

			case 'build-error':
				console.error('Search index build error:', response.error);
				this.isBuilding = false;
				break;

			case 'search-results': {
				// Resolve the oldest pending search
				// Note: This simple approach assumes searches complete in order
				// For production, you'd want to use unique IDs
				const entry = this.pendingSearches.entries().next().value;
				if (entry) {
					const [searchId, pending] = entry;
					pending.resolve(response.results);
					this.pendingSearches.delete(searchId);
				}
				break;
			}

			case 'cleared':
				this.isReady = false;
				this.bookSlug = '';
				this.chapters = [];
				break;
		}
	}

	/**
	 * Build the search index from the table of contents
	 */
	async buildIndex(toc: TableOfContents, bookSlug: string): Promise<void> {
		// Return existing build promise if already building
		if (this.isBuilding && this.buildPromise) {
			return this.buildPromise;
		}

		// Skip if already built for this book
		if (this.isReady && this.bookSlug === bookSlug) {
			return;
		}

		this.isBuilding = true;
		this.bookSlug = bookSlug;

		this.buildPromise = this.doBuildIndex(toc, bookSlug);
		await this.buildPromise;

		this.isBuilding = false;
		this.buildPromise = null;
	}

	private async doBuildIndex(toc: TableOfContents, bookSlug: string): Promise<void> {
		// Extract chapters for filtering (use path for routing)
		this.chapters = toc.chapters.map((chapter) => ({
			slug: getChapterPath(chapter),
			title: chapter.title
		}));

		// Fetch all section content on the main thread
		const documents: RawDocument[] = [];

		for (const chapter of toc.chapters) {
			const chapterFolder = getChapterFolder(chapter);
			const chapterPath = getChapterPath(chapter);

			for (const section of chapter.sections) {
				const sectionPath = getSectionPath(section);

				try {
					const response = await fetch(
						`/content/${bookSlug}/chapters/${chapterFolder}/${section.file}`
					);
					if (!response.ok) continue;

					const content = await response.text();

					documents.push({
						chapterSlug: chapterPath,
						sectionSlug: sectionPath,
						chapterTitle: chapter.title,
						sectionTitle: section.title,
						sectionNumber: section.number,
						content
					});
				} catch (error) {
					console.error(`Villa við að hlaða ${chapterPath}/${sectionPath}:`, error);
				}
			}
		}

		// If worker is available, send documents for processing
		if (this.worker) {
			return new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					reject(new Error('Search index build timeout'));
				}, 30000);

				const originalHandler = this.worker!.onmessage;
				this.worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
					if (event.data.type === 'build-complete' || event.data.type === 'build-error') {
						clearTimeout(timeout);
						this.worker!.onmessage = originalHandler;

						if (event.data.type === 'build-error') {
							reject(new Error(event.data.error));
						} else {
							this.isReady = true;
							resolve();
						}
					}
				};

				const message: WorkerMessage = {
					type: 'build',
					documents,
					bookSlug
				};
				this.worker!.postMessage(message);
			});
		} else {
			// Fallback: build index on main thread (should rarely happen)
			console.warn('Building search index on main thread');
			this.isReady = true;
		}
	}

	/**
	 * Search the index
	 */
	async search(query: string, filters?: SearchFilters): Promise<SearchResult[]> {
		if (!this.isReady || !query.trim()) {
			return [];
		}

		if (this.worker) {
			return new Promise<SearchResult[]>((resolve, reject) => {
				const searchId = `search-${++this.searchIdCounter}`;
				this.pendingSearches.set(searchId, { resolve, reject });

				const timeout = setTimeout(() => {
					this.pendingSearches.delete(searchId);
					reject(new Error('Search timeout'));
				}, 5000);

				const originalHandler = this.worker!.onmessage;
				this.worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
					if (event.data.type === 'search-results') {
						clearTimeout(timeout);
						this.worker!.onmessage = originalHandler;
						this.pendingSearches.delete(searchId);
						resolve(event.data.results);
					} else {
						// Handle other message types
						this.handleWorkerMessage(event.data);
					}
				};

				const workerFilters: WorkerSearchFilters = {};
				if (filters?.chapterSlug) {
					workerFilters.chapterSlug = filters.chapterSlug;
				}

				const message: WorkerMessage = {
					type: 'search',
					query,
					filters: workerFilters
				};
				this.worker!.postMessage(message);
			});
		}

		// Fallback: no results if no worker and no fallback implementation
		return [];
	}

	/**
	 * Check if index is ready
	 */
	checkIsReady(): boolean {
		return this.isReady;
	}

	/**
	 * Get chapter list for filtering
	 */
	getChapters(): { slug: string; title: string }[] {
		return this.chapters;
	}

	/**
	 * Clear the index
	 */
	clear(): void {
		if (this.worker) {
			const message: WorkerMessage = { type: 'clear' };
			this.worker.postMessage(message);
		}
		this.isReady = false;
		this.bookSlug = '';
		this.chapters = [];
	}
}

// Singleton instance
const searchIndex = new SearchIndexWorker();

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Build the search index (call once when loading the book)
 */
export async function buildSearchIndex(toc: TableOfContents, bookSlug: string): Promise<void> {
	await searchIndex.buildIndex(toc, bookSlug);
}

/**
 * Search content using fuzzy matching
 */
export async function searchContent(
	query: string,
	toc: TableOfContents,
	bookSlug: string,
	filters?: SearchFilters
): Promise<SearchResult[]> {
	// Ensure index is built
	await searchIndex.buildIndex(toc, bookSlug);
	return searchIndex.search(query, filters);
}

/**
 * Check if search index is ready
 */
export function isSearchIndexReady(): boolean {
	return searchIndex.checkIsReady();
}

/**
 * Get available chapters for filtering
 */
export function getSearchChapters(): { slug: string; title: string }[] {
	return searchIndex.getChapters();
}

/**
 * Escape HTML entities to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
	const htmlEntities: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};
	return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Highlight query in text (for displaying results)
 * IMPORTANT: This function returns HTML-safe output with escaped entities
 */
export function highlightQuery(text: string, query: string): string {
	if (!query.trim()) return escapeHtml(text);

	// First, escape ALL HTML entities in both text and query
	const escapedText = escapeHtml(text);
	const escapedQuery = escapeHtml(query);

	// Escape special regex characters in the query
	const regexSafeQuery = escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	// Create regex for matching (case-insensitive)
	const regex = new RegExp(`(${regexSafeQuery})`, 'gi');

	// Replace matches with highlighted version
	// The matched text is already escaped, so it's safe to wrap in <mark>
	return escapedText.replace(
		regex,
		(match) =>
			`<mark class="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">${match}</mark>`
	);
}

// =============================================================================
// SEARCH HISTORY
// =============================================================================

const SEARCH_HISTORY_KEY = 'namsbokasafn:search-history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
	query: string;
	timestamp: string;
	resultCount: number;
}

/**
 * Get search history from localStorage
 */
export function getSearchHistory(): SearchHistoryItem[] {
	if (!browser) return [];

	try {
		const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
		if (!stored) return [];
		return JSON.parse(stored);
	} catch {
		return [];
	}
}

/**
 * Add a search to history
 */
export function addToSearchHistory(query: string, resultCount: number): void {
	if (!browser || !query.trim() || query.length < 2) return;

	try {
		const history = getSearchHistory();

		// Remove duplicate if exists
		const filtered = history.filter((item) => item.query.toLowerCase() !== query.toLowerCase());

		// Add new item at the beginning
		const newHistory: SearchHistoryItem[] = [
			{
				query: query.trim(),
				timestamp: new Date().toISOString(),
				resultCount
			},
			...filtered
		].slice(0, MAX_HISTORY_ITEMS);

		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
	} catch {
		// Ignore storage errors
	}
}

/**
 * Clear search history
 */
export function clearSearchHistory(): void {
	if (!browser) return;

	try {
		localStorage.removeItem(SEARCH_HISTORY_KEY);
	} catch {
		// Ignore storage errors
	}
}

/**
 * Remove a single item from history
 */
export function removeFromSearchHistory(query: string): void {
	if (!browser) return;

	try {
		const history = getSearchHistory();
		const filtered = history.filter((item) => item.query.toLowerCase() !== query.toLowerCase());
		localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
	} catch {
		// Ignore storage errors
	}
}
