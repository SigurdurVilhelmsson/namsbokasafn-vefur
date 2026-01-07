/**
 * Search index utility using Fuse.js for fuzzy search
 */
import Fuse from 'fuse.js';
import { browser } from '$app/environment';
import type { TableOfContents } from '$lib/types/content';

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
// SEARCH INDEX CLASS
// =============================================================================

class SearchIndex {
	private fuse: Fuse<SearchDocument> | null = null;
	private documents: SearchDocument[] = [];
	private bookSlug: string = '';
	private isBuilding: boolean = false;
	private buildPromise: Promise<void> | null = null;

	/**
	 * Build the search index from the table of contents
	 */
	async buildIndex(toc: TableOfContents, bookSlug: string): Promise<void> {
		// Return existing build promise if already building
		if (this.isBuilding && this.buildPromise) {
			return this.buildPromise;
		}

		// Skip if already built for this book
		if (this.fuse && this.bookSlug === bookSlug && this.documents.length > 0) {
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
		const documents: SearchDocument[] = [];

		// Load all section content
		for (const chapter of toc.chapters) {
			for (const section of chapter.sections) {
				try {
					const response = await fetch(
						`/content/${bookSlug}/chapters/${chapter.slug}/${section.file}`
					);
					if (!response.ok) continue;

					const markdown = await response.text();

					// Remove frontmatter
					const contentWithoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n/, '');

					// Create plain text version for searching
					const plainText = this.markdownToPlainText(contentWithoutFrontmatter);

					documents.push({
						chapterSlug: chapter.slug,
						sectionSlug: section.slug,
						chapterTitle: chapter.title,
						sectionTitle: section.title,
						sectionNumber: section.number,
						content: contentWithoutFrontmatter,
						plainText
					});
				} catch (error) {
					console.error(`Villa við að hlaða ${chapter.slug}/${section.slug}:`, error);
				}
			}
		}

		this.documents = documents;

		// Configure Fuse.js for fuzzy search
		this.fuse = new Fuse(documents, {
			keys: [
				{ name: 'sectionTitle', weight: 3 }, // Title matches are most important
				{ name: 'chapterTitle', weight: 2 },
				{ name: 'plainText', weight: 1 }
			],
			includeScore: true,
			includeMatches: true,
			threshold: 0.4, // Allow some fuzziness (0 = exact, 1 = match anything)
			ignoreLocation: true, // Don't prioritize matches at the start
			minMatchCharLength: 2,
			findAllMatches: true,
			useExtendedSearch: true
		});
	}

	/**
	 * Convert markdown to plain text for searching
	 */
	private markdownToPlainText(markdown: string): string {
		return (
			markdown
				// Remove headings
				.replace(/#{1,6}\s/g, '')
				// Remove bold/italic
				.replace(/\*\*(.+?)\*\*/g, '$1')
				.replace(/\*(.+?)\*/g, '$1')
				.replace(/__(.+?)__/g, '$1')
				.replace(/_(.+?)_/g, '$1')
				// Remove links but keep text
				.replace(/\[(.+?)\]\(.+?\)/g, '$1')
				// Remove images
				.replace(/!\[.*?\]\(.+?\)/g, '')
				// Remove code blocks
				.replace(/```[\s\S]*?```/g, '')
				.replace(/`([^`]+)`/g, '$1')
				// Remove tables
				.replace(/^\|.+\|$/gm, '')
				.replace(/^\s*[-|:]+\s*$/gm, '')
				// Remove custom blocks
				.replace(/:::.+?:::/gs, '')
				// Remove LaTeX
				.replace(/\$\$[\s\S]*?\$\$/g, '')
				.replace(/\$[^$]+\$/g, '')
				// Clean up whitespace
				.replace(/\n{3,}/g, '\n\n')
				.trim()
		);
	}

	/**
	 * Search the index
	 */
	search(query: string, filters?: SearchFilters): SearchResult[] {
		if (!this.fuse || !query.trim()) {
			return [];
		}

		// Use Fuse.js search
		let results = this.fuse.search(query);

		// Apply filters
		if (filters?.chapterSlug) {
			results = results.filter((r) => r.item.chapterSlug === filters.chapterSlug);
		}

		// Convert to SearchResult format
		return results.slice(0, 20).map((result) => {
			const doc = result.item;
			const score = result.score ?? 1;

			// Create snippet from the match
			const snippet = this.createSnippet(doc.plainText, query);

			// Count approximate matches
			const normalizedQuery = this.normalizeText(query);
			const normalizedContent = this.normalizeText(doc.plainText);
			const matches = (normalizedContent.match(new RegExp(normalizedQuery, 'gi')) || []).length;

			return {
				chapterSlug: doc.chapterSlug,
				sectionSlug: doc.sectionSlug,
				chapterTitle: doc.chapterTitle,
				sectionTitle: doc.sectionTitle,
				sectionNumber: doc.sectionNumber,
				snippet,
				matches: Math.max(matches, 1),
				score
			};
		});
	}

	/**
	 * Normalize text for comparison
	 */
	private normalizeText(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^\w\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	/**
	 * Create a snippet with context around the match
	 */
	private createSnippet(text: string, query: string, contextLength: number = 100): string {
		const normalized = this.normalizeText(text);
		const normalizedQuery = this.normalizeText(query);

		// Find the position of the query
		const index = normalized.indexOf(normalizedQuery);
		if (index === -1) {
			// If exact match not found, return first part of text
			return text.length > contextLength * 2
				? text.substring(0, contextLength * 2) + '...'
				: text;
		}

		// Calculate snippet boundaries
		const start = Math.max(0, index - contextLength);
		const end = Math.min(text.length, index + query.length + contextLength);

		let snippet = text.substring(start, end);

		// Add ellipsis if not at start/end
		if (start > 0) snippet = '...' + snippet;
		if (end < text.length) snippet = snippet + '...';

		return snippet;
	}

	/**
	 * Check if index is ready
	 */
	isReady(): boolean {
		return this.fuse !== null && this.documents.length > 0;
	}

	/**
	 * Get chapter list for filtering
	 */
	getChapters(): { slug: string; title: string }[] {
		const chapters = new Map<string, string>();
		for (const doc of this.documents) {
			if (!chapters.has(doc.chapterSlug)) {
				chapters.set(doc.chapterSlug, doc.chapterTitle);
			}
		}
		return Array.from(chapters.entries()).map(([slug, title]) => ({
			slug,
			title
		}));
	}
}

// Singleton instance
const searchIndex = new SearchIndex();

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
	return searchIndex.isReady();
}

/**
 * Get available chapters for filtering
 */
export function getSearchChapters(): { slug: string; title: string }[] {
	return searchIndex.getChapters();
}

/**
 * Highlight query in text (for displaying results)
 */
export function highlightQuery(text: string, query: string): string {
	if (!query.trim()) return text;

	// Escape special regex characters
	const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

	// Create regex for matching (case-insensitive)
	const regex = new RegExp(`(${escapedQuery})`, 'gi');

	// Replace matches with highlighted version
	return text.replace(
		regex,
		(match) =>
			`<mark class="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5">${match}</mark>`
	);
}

// =============================================================================
// SEARCH HISTORY
// =============================================================================

const SEARCH_HISTORY_KEY = 'namsbokasafn-search-history';
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
