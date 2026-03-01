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

	let loadPromise: Promise<void> | null = null;

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

			// Already loading - return the existing promise so callers wait
			if (loadPromise) return loadPromise;

			loadPromise = (async () => {
				update((s) => ({ ...s, loading: true, error: null }));

				try {
					const response = await fetch(`/content/${bookSlug}/glossary.json`);
					if (!response.ok) {
						throw new Error('Glossary not found');
					}

					const glossary: Glossary = await response.json();

					update((s) => ({
						...s,
						bookSlug,
						terms: glossary.terms,
						loading: false,
						error: null
					}));
				} catch {
					loadPromise = null;
					update((s) => ({
						...s,
						loading: false,
						error: 'Villa við að hlaða orðasafni'
					}));
				}
			})();

			return loadPromise;
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
			loadPromise = null;
			set(defaultState);
		}
	};
}

export const glossaryStore = createGlossaryStore();

// Derived stores
export const glossaryTerms = derived(glossaryStore, ($store) => $store.terms);
export const glossaryLoading = derived(glossaryStore, ($store) => $store.loading);
export const glossaryError = derived(glossaryStore, ($store) => $store.error);
