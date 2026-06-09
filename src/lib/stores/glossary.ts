/**
 * Glossary Store - Caches glossary data and provides lookup functionality
 */

import { writable, derived, get } from 'svelte/store';
import type { GlossaryTerm, Glossary } from '$lib/types/content';

interface GlossaryState {
	/** Currently loaded book slug */
	bookSlug: string | null;
	/** Loaded glossary terms */
	terms: GlossaryTerm[];
	/** Loading state */
	loading: boolean;
	/** Error message if load failed */
	error: string | null;
}

const defaultState: GlossaryState = {
	bookSlug: null,
	terms: [],
	loading: false,
	error: null
};

function createGlossaryStore() {
	const { subscribe, set, update } = writable<GlossaryState>(defaultState);

	// In-flight load, keyed by slug so a load for book B is never satisfied
	// by book A's promise (which previously left A's terms cached forever)
	let activeLoad: { slug: string; promise: Promise<void> } | null = null;
	// Monotonic token: only the most recent request may write state
	let requestCounter = 0;

	return {
		subscribe,

		/**
		 * Load glossary for a book (cached - only loads if not already loaded)
		 */
		load(bookSlug: string): Promise<void> {
			const state = get({ subscribe });

			// Already loaded for this book
			if (state.bookSlug === bookSlug && state.terms.length > 0) {
				return Promise.resolve();
			}

			// A load for this same book is already in flight
			if (activeLoad?.slug === bookSlug) return activeLoad.promise;

			const requestId = ++requestCounter;
			const promise = (async () => {
				update((s) => ({ ...s, loading: true, error: null }));

				try {
					const response = await fetch(`/content/${bookSlug}/glossary.json`);
					if (!response.ok) {
						throw new Error('Glossary not found');
					}

					const glossary: Glossary = await response.json();

					// Superseded by a newer load (or clear()) — drop the result
					if (requestId !== requestCounter) return;

					update((s) => ({
						...s,
						bookSlug,
						terms: glossary.terms,
						loading: false,
						error: null
					}));
				} catch {
					if (requestId !== requestCounter) return;
					update((s) => ({
						...s,
						loading: false,
						error: 'Villa við að hlaða orðasafni'
					}));
				} finally {
					if (requestId === requestCounter) {
						activeLoad = null;
					}
				}
			})();

			activeLoad = { slug: bookSlug, promise };
			return promise;
		},

		/**
		 * Look up a term in the glossary
		 * Returns the term if found, null otherwise
		 */
		lookup(searchText: string): GlossaryTerm | null {
			const state = get({ subscribe });
			if (!state.terms.length) return null;

			const normalizedSearch = searchText.toLowerCase().trim();
			if (!normalizedSearch) return null;

			// First try exact match
			const exactMatch = state.terms.find(
				(t) => t.term.toLowerCase() === normalizedSearch
			);
			if (exactMatch) return exactMatch;

			// Try partial match (term starts with search text)
			const partialMatch = state.terms.find(
				(t) => t.term.toLowerCase().startsWith(normalizedSearch)
			);
			if (partialMatch) return partialMatch;

			// Try if search text contains the term
			const containsMatch = state.terms.find(
				(t) => normalizedSearch.includes(t.term.toLowerCase())
			);
			if (containsMatch) return containsMatch;

			return null;
		},

		/**
		 * Search for terms matching a query
		 * Returns array of matching terms
		 */
		search(query: string, limit: number = 5): GlossaryTerm[] {
			const state = get({ subscribe });
			if (!state.terms.length || !query.trim()) return [];

			const normalizedQuery = query.toLowerCase().trim();

			return state.terms
				.filter(
					(t) =>
						t.term.toLowerCase().includes(normalizedQuery) ||
						t.definition.toLowerCase().includes(normalizedQuery) ||
						t.english?.toLowerCase().includes(normalizedQuery)
				)
				.slice(0, limit);
		},

		/**
		 * Clear the cached glossary
		 */
		clear(): void {
			// Invalidate any in-flight load so its result is dropped
			requestCounter++;
			activeLoad = null;
			set(defaultState);
		}
	};
}

export const glossaryStore = createGlossaryStore();

// Derived stores
export const glossaryTerms = derived(glossaryStore, ($store) => $store.terms);
export const glossaryLoading = derived(glossaryStore, ($store) => $store.loading);
export const glossaryError = derived(glossaryStore, ($store) => $store.error);
