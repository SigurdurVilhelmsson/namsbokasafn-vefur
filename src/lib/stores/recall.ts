/**
 * Recall Store - Free-recall entries written after completing a section
 *
 * Retrieval practice: after marking a section read, the learner writes what
 * they remember (reader plan P0.2, Roediger & Karpicke 2006). Entries are
 * kept for later review (reader plan P2.3, recall tab in /bokamerki).
 *
 * Ported from feature/reader-v1.1 at dde768e (plan step S5.1), with three changes for main:
 * each stored entry is validated, entries follow a renamed section (renameSections, #258),
 * and the get()-based getters are gone (CLAUDE.md: such a method in $derived computes once).
 * The prompt that writes entries comes in S5.2.
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray } from '$lib/utils/storeValidation';
import { generateId, getCurrentTimestamp } from '$lib/utils/storeHelpers';
import { renameInRecall, type SectionRename } from '$lib/utils/sectionRenames';

const STORAGE_KEY = 'namsbokasafn:recall';
/** The newest entries kept; older ones are dropped, on add and on load */
export const MAX_ENTRIES = 500;

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

const STRING_FIELDS = ['id', 'bookSlug', 'chapterSlug', 'sectionSlug', 'createdAt'] as const;

/** A stored entry with every field a string and some text: anything else is dropped */
export function isRecallEntry(value: unknown): value is RecallEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	if (!STRING_FIELDS.every((field) => typeof entry[field] === 'string')) return false;
	return typeof entry.text === 'string' && entry.text.trim() !== '';
}

/** Parse stored JSON into a state: unknown shapes give the defaults, bad entries are dropped */
function toState(stored: unknown): RecallState {
	const state = validateStoreData(stored, defaultState, recallValidators);
	return { entries: state.entries.filter(isRecallEntry).slice(-MAX_ENTRIES) };
}

function loadState(): RecallState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) return toState(JSON.parse(stored));
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

		// Cross-tab synchronization. Another tab removing the key (an erase) sends 'null',
		// which toState turns into the defaults.
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				set(toState(JSON.parse(newValue)));
			} catch {
				/* ignore */
			} finally {
				_externalUpdate = false;
			}
		});
	}

	return {
		subscribe,

		/** Carry entries across renamed sections (lib/utils/sectionRenames.ts). Saves only on change. */
		renameSections: (renames: SectionRename[]) => {
			const state = get({ subscribe });
			const entries = renameInRecall(state.entries, renames);
			if (entries !== state.entries) set({ ...state, entries });
		},

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

		removeEntry: (id: string) => {
			update((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
		},

		reset: () => set(defaultState)
	};
}

export const recallStore = createRecallStore();

export const recallEntryCount = derived(recallStore, ($store) => $store.entries.length);
