/**
 * Shared types for search worker communication
 */

export interface SearchDocument {
	chapterSlug: string;
	sectionSlug: string;
	chapterTitle: string;
	sectionTitle: string;
	sectionNumber: string;
	content: string;
	plainText: string;
}

export interface RawDocument {
	chapterSlug: string;
	sectionSlug: string;
	chapterTitle: string;
	sectionTitle: string;
	sectionNumber: string;
	markdown: string;
}

export interface SearchFilters {
	chapterSlug?: string;
}

export interface SearchResult {
	chapterSlug: string;
	sectionSlug: string;
	chapterTitle: string;
	sectionTitle: string;
	sectionNumber: string;
	snippet: string;
	matches: number;
	score: number;
}

// Message types
export type WorkerMessage =
	| { type: 'build'; documents: RawDocument[]; bookSlug: string }
	| { type: 'search'; query: string; filters?: SearchFilters }
	| { type: 'clear' };

export type WorkerResponse =
	| { type: 'build-complete'; documentCount: number }
	| { type: 'build-error'; error: string }
	| { type: 'search-results'; results: SearchResult[] }
	| { type: 'cleared' };
