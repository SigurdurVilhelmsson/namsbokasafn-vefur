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
import { browser } from '$app/env';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray } from '$lib/utils/storeValidation';
import { generateId, getCurrentTimestamp } from '$lib/utils/storeHelpers';
import { renameInRecall, type SectionRename } from '$lib/utils/sectionRenames';

const STORAGE_KEY = 'namsbokasafn:recall';
/** The newest entries kept; older ones are dropped, on add and on load */
export const MAX_ENTRIES = 500;
/** The newest prompted sections kept (a book has a few hundred) */
export const MAX_PROMPTED = 2000;

export interface RecallEntry {
	id: string;
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	text: string;
	createdAt: string;
}

/** A section, by the keys a rename moves */
export interface SectionRef {
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
}

interface RecallState {
	entries: RecallEntry[];
	/**
	 * Sections whose prompt has shown. Call 2 ruled one prompt per section, and D10 lets a
	 * section be marked read by hand before its prompt, so the read mark cannot say whether
	 * the prompt is spent (plan step S5.2).
	 */
	prompted: SectionRef[];
}

const defaultState: RecallState = {
	entries: [],
	prompted: []
};

const recallValidators = {
	entries: isArray,
	prompted: isArray
};

const STRING_FIELDS = ['id', 'bookSlug', 'chapterSlug', 'sectionSlug', 'createdAt'] as const;

/** A stored entry with every field a string and some text: anything else is dropped */
export function isRecallEntry(value: unknown): value is RecallEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	if (!STRING_FIELDS.every((field) => typeof entry[field] === 'string')) return false;
	return typeof entry.text === 'string' && entry.text.trim() !== '';
}

export function isSectionRef(value: unknown): value is SectionRef {
	if (typeof value !== 'object' || value === null) return false;
	const ref = value as Record<string, unknown>;
	return ['bookSlug', 'chapterSlug', 'sectionSlug'].every((field) => typeof ref[field] === 'string');
}

const sameSection = (a: SectionRef, b: SectionRef) =>
	a.bookSlug === b.bookSlug && a.chapterSlug === b.chapterSlug && a.sectionSlug === b.sectionSlug;

/**
 * A section's own entries, oldest first (plan step S5.5, CODE-24). Pure, so a component reads
 * it as `$derived(entriesForSection($recallStore, ref))` and updates when the store does.
 */
export function entriesForSection(state: { entries: RecallEntry[] }, ref: SectionRef): RecallEntry[] {
	return state.entries.filter((entry) => sameSection(entry, ref));
}

/** Parse stored JSON into a state: unknown shapes give the defaults, bad items are dropped */
function toState(stored: unknown): RecallState {
	const state = validateStoreData(stored, defaultState, recallValidators);
	return {
		entries: state.entries.filter(isRecallEntry).slice(-MAX_ENTRIES),
		prompted: state.prompted.filter(isSectionRef).slice(-MAX_PROMPTED)
	};
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
			const prompted = renameInRecall(state.prompted, renames);
			if (entries !== state.entries || prompted !== state.prompted) set({ entries, prompted });
		},

		/** Remember that a section's prompt has shown, so it does not show again */
		markPrompted: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const ref = { bookSlug, chapterSlug, sectionSlug };
			if (get({ subscribe }).prompted.some((p) => sameSection(p, ref))) return;
			update((state) => ({ ...state, prompted: [...state.prompted, ref].slice(-MAX_PROMPTED) }));
		},

		/** Save a recall. Returns the new entry, or null for blank text. */
		addEntry: (bookSlug: string, chapterSlug: string, sectionSlug: string, text: string): RecallEntry | null => {
			const trimmed = text.trim();
			if (!trimmed) return null;

			const entry: RecallEntry = {
				id: generateId(),
				bookSlug,
				chapterSlug,
				sectionSlug,
				text: trimmed,
				createdAt: getCurrentTimestamp()
			};

			update((state) => ({
				...state,
				entries: [...state.entries, entry].slice(-MAX_ENTRIES)
			}));
			return entry;
		},

		removeEntry: (id: string) => {
			update((state) => ({ ...state, entries: state.entries.filter((e) => e.id !== id) }));
		},

		reset: () => set(defaultState)
	};
}

export const recallStore = createRecallStore();

export const recallEntryCount = derived(recallStore, ($store) => $store.entries.length);
