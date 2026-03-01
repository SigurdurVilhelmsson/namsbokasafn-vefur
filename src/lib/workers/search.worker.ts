/**
 * Search Index Web Worker
 *
 * Offloads search index building and search operations from the main thread.
 * Uses Fuse.js for fuzzy search.
 */
import Fuse from 'fuse.js';
import type {
	SearchDocument,
	RawDocument,
	SearchFilters,
	SearchResult,
	WorkerMessage,
	WorkerResponse
} from './search.types';

// =============================================================================
// WORKER STATE
// =============================================================================

let fuse: Fuse<SearchDocument> | null = null;
let documents: SearchDocument[] = [];
let _currentBookSlug = '';

// =============================================================================
// CONTENT PROCESSING
// =============================================================================

/**
 * Convert HTML to plain text for searching
 */
function htmlToPlainText(html: string): string {
	return (
		html
			// Remove script and style blocks entirely
			.replace(/<script[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?<\/style>/gi, '')
			// Remove MathJax/math markup
			.replace(/<mjx-container[\s\S]*?<\/mjx-container>/gi, '')
			.replace(/<span class="mathjax[\s\S]*?<\/span>(?=\s*(?:<\/span>)*)/gi, '')
			// Remove all HTML tags, keeping text content
			.replace(/<[^>]*>/g, ' ')
			// Decode common HTML entities
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&nbsp;/g, ' ')
			// Clean up whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
}

// =============================================================================
// INDEX BUILDING
// =============================================================================

/**
 * Build the Fuse.js search index from raw documents
 */
function buildIndex(rawDocs: RawDocument[], bookSlug: string): void {
	_currentBookSlug = bookSlug;

	// Process documents
	documents = rawDocs.map((doc) => {
		const plainText = htmlToPlainText(doc.content);

		return {
			chapterSlug: doc.chapterSlug,
			sectionSlug: doc.sectionSlug,
			chapterTitle: doc.chapterTitle,
			sectionTitle: doc.sectionTitle,
			sectionNumber: doc.sectionNumber,
			content: doc.content,
			plainText
		};
	});

	// Configure Fuse.js for fuzzy search
	fuse = new Fuse(documents, {
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

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
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
function createSnippet(text: string, query: string, contextLength: number = 100): string {
	const normalized = normalizeText(text);
	const normalizedQuery = normalizeText(query);

	// Find the position of the query
	const index = normalized.indexOf(normalizedQuery);
	if (index === -1) {
		// If exact match not found, return first part of text
		return text.length > contextLength * 2 ? text.substring(0, contextLength * 2) + '...' : text;
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
 * Search the index
 */
function search(query: string, filters?: SearchFilters): SearchResult[] {
	if (!fuse || !query.trim()) {
		return [];
	}

	// Use Fuse.js search
	let results = fuse.search(query);

	// Apply filters
	if (filters?.chapterSlug) {
		results = results.filter((r) => r.item.chapterSlug === filters.chapterSlug);
	}

	// Convert to SearchResult format
	return results.slice(0, 20).map((result) => {
		const doc = result.item;
		const score = result.score ?? 1;

		// Create snippet from the match
		const snippet = createSnippet(doc.plainText, query);

		// Count approximate matches
		const normalizedQuery = normalizeText(query);
		const normalizedContent = normalizeText(doc.plainText);
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
 * Clear the index
 */
function clear(): void {
	fuse = null;
	documents = [];
	_currentBookSlug = '';
}

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case 'build':
			try {
				buildIndex(message.documents, message.bookSlug);
				const response: WorkerResponse = {
					type: 'build-complete',
					documentCount: documents.length
				};
				self.postMessage(response);
			} catch (error) {
				const response: WorkerResponse = {
					type: 'build-error',
					error: error instanceof Error ? error.message : 'Unknown error'
				};
				self.postMessage(response);
			}
			break;

		case 'search': {
			const results = search(message.query, message.filters);
			const searchResponse: WorkerResponse = {
				type: 'search-results',
				results
			};
			self.postMessage(searchResponse);
			break;
		}

		case 'clear': {
			clear();
			const clearResponse: WorkerResponse = { type: 'cleared' };
			self.postMessage(clearResponse);
			break;
		}
	}
};
