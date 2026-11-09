/**
 * Reader Store - Reading progress, bookmarks, and current location
 * Ported from React/Zustand readerStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { type SectionRename, renameInReader } from '$lib/utils/sectionRenames';
import { browser } from '$app/env';
import {
	createSectionKey,
	createChapterPrefix,
	getCurrentTimestamp,
	migrateRecordKeys,
	migrateBookmarkKeys
} from '$lib/utils/storeHelpers';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isObject, isNullOrString, isArray, isNumber } from '$lib/utils/storeValidation';

const STORAGE_KEY = 'namsbokasafn:reader';

export interface SectionProgress {
	read: boolean;
	lastVisited: string;
}

export interface ReadingProgress {
	[sectionId: string]: SectionProgress;
}

export interface ScrollPosition {
	scrollY: number; // Absolute scroll position in pixels
	percentage: number; // 0-100 percentage of document scrolled
	timestamp: string; // When this position was saved
	/** Where a paged reader was, when they left paging (S11.3) */
	page?: PagePlace;
}

/**
 * Where a paged reader was (plan step S11.3, register CODE-07, D13): the part, and the page's
 * first block by its id, or by its index in the part when it carries none. A page number would
 * not do: the split depends on the window and the font size. It lives inside the section's
 * ScrollPosition record, so #258's renameInReader carries it with the record.
 */
export interface PagePlace {
	unit: number;
	block: string | null;
	item: number;
}

/** A stored place, or null when it has another shape: what localStorage holds is not trusted */
export function readPagePlace(value: unknown): PagePlace | null {
	if (!value || typeof value !== 'object') return null;
	const { unit, block, item } = value as Record<string, unknown>;
	const index = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;
	if (!index(unit) || !index(item) || (block !== null && typeof block !== 'string')) return null;
	return { unit, block, item };
}

export interface ScrollPositions {
	[sectionId: string]: ScrollPosition;
}

interface ReaderState {
	progress: ReadingProgress;
	currentChapter: string | null;
	currentSection: string | null;
	bookmarks: string[];
	/** Read and written by no code since S11.2: kept so the stored shape stays the same for other
	 *  tabs and older builds. The live value is `sectionProgress` below, in memory only. */
	scrollProgress: number;
	scrollPositions: ScrollPositions; // Per-section scroll positions for persistence
}

const defaultState: ReaderState = {
	progress: {},
	currentChapter: null,
	currentSection: null,
	bookmarks: [],
	scrollProgress: 0,
	scrollPositions: {}
};

const readerValidators = {
	progress: isObject,
	currentChapter: isNullOrString,
	currentSection: isNullOrString,
	bookmarks: isArray,
	scrollProgress: isNumber,
	scrollPositions: isObject
};

function loadState(): ReaderState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const state = validateStoreData(JSON.parse(stored), defaultState, readerValidators);
			// Migrate legacy keys that lack book-slug prefix
			return {
				...state,
				progress: migrateRecordKeys(state.progress),
				bookmarks: migrateBookmarkKeys(state.bookmarks),
				scrollPositions: migrateRecordKeys(state.scrollPositions)
			};
		}
	} catch (e) {
		console.warn('Failed to load reader state:', e);
	}
	return defaultState;
}

/**
 * How far through the section on screen the reader is, 0-100, for the sidebar's ring. In
 * memory only (plan step S11.2, UI-10): the pager sets it on every page turn, and S9.3 keeps the
 * reader store unwritten while the pager works (CODE-07). Saved in the reader store, it was also
 * rewritten to localStorage on every scroll event, and another tab's scrolling moved this tab's
 * ring. Nothing read it back from storage: each section starts it at 0.
 */
const sectionProgress = writable(0);

function createReaderStore() {
	const { subscribe, set, update } = writable<ReaderState>(loadState());

	// Persist to localStorage
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
				set(validateStoreData(JSON.parse(newValue), defaultState, readerValidators));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	return {
		subscribe,
		/** Carry saved state across renamed sections (lib/utils/sectionRenames.ts). Saves only on change. */
		renameSections: (renames: SectionRename[]) => {
			const state = get({ subscribe });
			const next = renameInReader(state, renames);
			if (next !== state) set(next);
		},

		// Mark as read
		markAsRead: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			update((state) => ({
				...state,
				progress: {
					...state.progress,
					[sectionId]: {
						read: true,
						lastVisited: getCurrentTimestamp()
					}
				}
			}));
		},

		// Check if read
		isRead: (bookSlug: string, chapterSlug: string, sectionSlug: string): boolean => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			return get({ subscribe }).progress[sectionId]?.read || false;
		},

		// Get chapter progress as percentage
		getChapterProgress: (bookSlug: string, chapterSlug: string, totalSections: number): number => {
			if (totalSections <= 0) return 0;

			const { progress } = get({ subscribe });
			const chapterPrefix = createChapterPrefix(bookSlug, chapterSlug);

			const readCount = Object.entries(progress).filter(
				([sectionId, data]) => sectionId.startsWith(chapterPrefix) && data.read
			).length;

			return Math.round((readCount / totalSections) * 100);
		},

		// Set current location
		setCurrentLocation: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);

			update((state) => ({
				...state,
				currentChapter: chapterSlug,
				currentSection: sectionSlug,
				progress: {
					...state.progress,
					[sectionId]: {
						read: state.progress[sectionId]?.read || false,
						lastVisited: getCurrentTimestamp()
					}
				}
			}));
		},

		// Add bookmark
		addBookmark: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			update((state) => {
				if (state.bookmarks.includes(bookmarkId)) return state;
				return {
					...state,
					bookmarks: [...state.bookmarks, bookmarkId]
				};
			});
		},

		// Remove bookmark
		removeBookmark: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			update((state) => ({
				...state,
				bookmarks: state.bookmarks.filter((id) => id !== bookmarkId)
			}));
		},

		// Check if bookmarked
		isBookmarked: (bookSlug: string, chapterSlug: string, sectionSlug: string): boolean => {
			const bookmarkId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			return get({ subscribe }).bookmarks.includes(bookmarkId);
		},

		// Toggle bookmark
		toggleBookmark: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			const state = get({ subscribe });
			if (state.bookmarks.includes(bookmarkId)) {
				update((s) => ({
					...s,
					bookmarks: s.bookmarks.filter((id) => id !== bookmarkId)
				}));
			} else {
				update((s) => ({
					...s,
					bookmarks: [...s.bookmarks, bookmarkId]
				}));
			}
		},

		reset: () => set(defaultState),

		// How far through the section on screen the reader is, 0-100: window scroll, or the
		// pager's page (S11.2). In memory only, never saved: see sectionProgress
		setScrollProgress: (progress: number) => {
			sectionProgress.set(Math.max(0, Math.min(100, progress)));
		},

		// Save scroll position for a section (for reading position persistence)
		saveScrollPosition: (
			bookSlug: string,
			chapterSlug: string,
			sectionSlug: string,
			scrollY: number,
			percentage: number,
			page?: PagePlace
		) => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			// Only save if user has scrolled past the first 5% (to avoid saving initial positions)
			if (percentage < 5) return;

			update((state) => ({
				...state,
				scrollPositions: {
					...state.scrollPositions,
					[sectionId]: {
						scrollY,
						percentage,
						timestamp: getCurrentTimestamp(),
						...(page ? { page } : {})
					}
				}
			}));
		},

		// Get saved scroll position for a section
		getScrollPosition: (bookSlug: string, chapterSlug: string, sectionSlug: string): ScrollPosition | null => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			return get({ subscribe }).scrollPositions[sectionId] || null;
		},

		// Clear scroll position for a section (e.g., when user completes reading)
		clearScrollPosition: (bookSlug: string, chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
			update((state) => {
				const { [sectionId]: _, ...rest } = state.scrollPositions;
				return {
					...state,
					scrollPositions: rest
				};
			});
		}
	};
}

export const reader = createReaderStore();

// Derived stores
export const currentLocation = derived(reader, ($reader) => ({
	chapter: $reader.currentChapter,
	section: $reader.currentSection
}));

export const bookmarks = derived(reader, ($reader) => $reader.bookmarks);

export const readingProgress = derived(reader, ($reader) => $reader.progress);

export const scrollProgress = { subscribe: sectionProgress.subscribe };

export const scrollPositions = derived(reader, ($reader) => $reader.scrollPositions);

/**
 * Pure function to check if a section is read.
 * Use with $reader.progress for reactivity: isSectionRead($reader.progress, bookSlug, chapter, section)
 */
export function isSectionRead(
	progress: ReadingProgress,
	bookSlug: string,
	chapterSlug: string,
	sectionSlug: string
): boolean {
	const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
	return progress[sectionId]?.read || false;
}

/**
 * Pure function to calculate chapter progress percentage.
 * Use with $reader.progress for reactivity: calcChapterProgress($reader.progress, bookSlug, chapter, total)
 */
export function calcChapterProgress(
	progress: ReadingProgress,
	bookSlug: string,
	chapterSlug: string,
	totalSections: number
): number {
	if (totalSections <= 0) return 0;
	const chapterPrefix = createChapterPrefix(bookSlug, chapterSlug);
	const readCount = Object.entries(progress).filter(
		([sectionId, data]) => sectionId.startsWith(chapterPrefix) && data.read
	).length;
	return Math.round((readCount / totalSections) * 100);
}

/**
 * Pure function to check if a section is bookmarked.
 * Use with $reader.bookmarks for reactivity: isSectionBookmarked($reader.bookmarks, bookSlug, chapter, section)
 */
export function isSectionBookmarked(
	bookmarksList: string[],
	bookSlug: string,
	chapterSlug: string,
	sectionSlug: string
): boolean {
	const bookmarkId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
	return bookmarksList.includes(bookmarkId);
}

/**
 * Pure function to get saved scroll position for a section.
 * Use with $reader.scrollPositions for reactivity: getSavedScrollPosition($reader.scrollPositions, bookSlug, chapter, section)
 */
export function getSavedScrollPosition(
	scrollPositions: ScrollPositions,
	bookSlug: string,
	chapterSlug: string,
	sectionSlug: string
): ScrollPosition | null {
	const sectionId = createSectionKey(bookSlug, chapterSlug, sectionSlug);
	return scrollPositions[sectionId] || null;
}
