/**
 * Recall Store - Free-recall entries written after completing a section
 *
 * Retrieval practice: after marking a section read, the learner writes what
 * they remember (reader plan P0.2, Roediger & Karpicke 2006). Entries are
 * kept for later review (reader plan P2.3, recall tab in /bokamerki).
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray } from '$lib/utils/storeValidation';
import { generateId, getCurrentTimestamp } from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:recall';
const MAX_ENTRIES = 500;

export interface RecallEntry {
	id: string;
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	text: string;
	createdAt: string;
}

interface RecallState {
	entries: RecallEntry[];
}

const defaultState: RecallState = {
	entries: []
};

const recallValidators = {
	entries: isArray
};

function loadState(): RecallState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return validateStoreData(JSON.parse(stored), defaultState, recallValidators);
		}
	} catch (e) {
		console.warn('Failed to load recall state:', e);
	}
	return defaultState;
}

function createRecallStore() {
	const { subscribe, set, update } = writable<RecallState>(loadState());

	let _externalUpdate = false;
	if (browser) {
		subscribe((state) => {
			if (!_externalUpdate) {
				safeSetItem(STORAGE_KEY, JSON.stringify(state));
			}
		});

		// Cross-tab synchronization
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				set(validateStoreData(JSON.parse(newValue), defaultState, recallValidators));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	return {
		subscribe,

		addEntry: (bookSlug: string, chapterSlug: string, sectionSlug: string, text: string) => {
			const trimmed = text.trim();
			if (!trimmed) return;

			const entry: RecallEntry = {
				id: generateId(),
				bookSlug,
				chapterSlug,
				sectionSlug,
				text: trimmed,
				createdAt: getCurrentTimestamp()
			};

			update((state) => ({
				entries: [...state.entries, entry].slice(-MAX_ENTRIES)
			}));
		},

		getForSection: (bookSlug: string, chapterSlug: string, sectionSlug: string): RecallEntry[] => {
			return get({ subscribe }).entries.filter(
				(e) =>
					e.bookSlug === bookSlug && e.chapterSlug === chapterSlug && e.sectionSlug === sectionSlug
			);
		},

		getForBook: (bookSlug: string): RecallEntry[] => {
			return get({ subscribe }).entries.filter((e) => e.bookSlug === bookSlug);
		},

		removeEntry: (id: string) => {
			update((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
		},

		reset: () => set(defaultState)
	};
}

export const recallStore = createRecallStore();

export const recallEntryCount = derived(recallStore, ($store) => $store.entries.length);
