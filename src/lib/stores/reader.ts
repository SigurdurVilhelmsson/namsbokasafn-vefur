/**
 * Reader Store - Reading progress, bookmarks, and current location
 * Ported from React/Zustand readerStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	createSectionKey,
	createChapterPrefix,
	getCurrentTimestamp
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
}

export interface ScrollPositions {
	[sectionId: string]: ScrollPosition;
}

interface ReaderState {
	progress: ReadingProgress;
	currentChapter: string | null;
	currentSection: string | null;
	bookmarks: string[];
	scrollProgress: number; // 0-100 percentage of current section scrolled
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
			return validateStoreData(JSON.parse(stored), defaultState, readerValidators);
		}
	} catch (e) {
		console.warn('Failed to load reader state:', e);
	}
	return defaultState;
}

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

		// Mark as read
		markAsRead: (chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);
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
		isRead: (chapterSlug: string, sectionSlug: string): boolean => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);
			return get({ subscribe }).progress[sectionId]?.read || false;
		},

		// Get chapter progress as percentage
		getChapterProgress: (chapterSlug: string, totalSections: number): number => {
			if (totalSections <= 0) return 0;

			const { progress } = get({ subscribe });
			const chapterPrefix = createChapterPrefix(chapterSlug);

			const readCount = Object.entries(progress).filter(
				([sectionId, data]) => sectionId.startsWith(chapterPrefix) && data.read
			).length;

			return Math.round((readCount / totalSections) * 100);
		},

		// Set current location
		setCurrentLocation: (chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);

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
		addBookmark: (chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
			update((state) => ({
				...state,
				bookmarks: [...state.bookmarks, bookmarkId]
			}));
		},

		// Remove bookmark
		removeBookmark: (chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
			update((state) => ({
				...state,
				bookmarks: state.bookmarks.filter((id) => id !== bookmarkId)
			}));
		},

		// Check if bookmarked
		isBookmarked: (chapterSlug: string, sectionSlug: string): boolean => {
			const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
			return get({ subscribe }).bookmarks.includes(bookmarkId);
		},

		// Toggle bookmark
		toggleBookmark: (chapterSlug: string, sectionSlug: string) => {
			const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
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

		// Update scroll progress (0-100)
		setScrollProgress: (progress: number) => {
			update((state) => ({
				...state,
				scrollProgress: Math.max(0, Math.min(100, progress))
			}));
		},

		// Save scroll position for a section (for reading position persistence)
		saveScrollPosition: (chapterSlug: string, sectionSlug: string, scrollY: number, percentage: number) => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);
			// Only save if user has scrolled past the first 5% (to avoid saving initial positions)
			if (percentage < 5) return;

			update((state) => ({
				...state,
				scrollPositions: {
					...state.scrollPositions,
					[sectionId]: {
						scrollY,
						percentage,
						timestamp: getCurrentTimestamp()
					}
				}
			}));
		},

		// Get saved scroll position for a section
		getScrollPosition: (chapterSlug: string, sectionSlug: string): ScrollPosition | null => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);
			return get({ subscribe }).scrollPositions[sectionId] || null;
		},

		// Clear scroll position for a section (e.g., when user completes reading)
		clearScrollPosition: (chapterSlug: string, sectionSlug: string) => {
			const sectionId = createSectionKey(chapterSlug, sectionSlug);
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

export const scrollProgress = derived(reader, ($reader) => $reader.scrollProgress);

export const scrollPositions = derived(reader, ($reader) => $reader.scrollPositions);

/**
 * Pure function to check if a section is read.
 * Use with $reader.progress for reactivity: isSectionRead($reader.progress, chapter, section)
 */
export function isSectionRead(
	progress: ReadingProgress,
	chapterSlug: string,
	sectionSlug: string
): boolean {
	const sectionId = createSectionKey(chapterSlug, sectionSlug);
	return progress[sectionId]?.read || false;
}

/**
 * Pure function to calculate chapter progress percentage.
 * Use with $reader.progress for reactivity: calcChapterProgress($reader.progress, chapter, total)
 */
export function calcChapterProgress(
	progress: ReadingProgress,
	chapterSlug: string,
	totalSections: number
): number {
	if (totalSections <= 0) return 0;
	const chapterPrefix = createChapterPrefix(chapterSlug);
	const readCount = Object.entries(progress).filter(
		([sectionId, data]) => sectionId.startsWith(chapterPrefix) && data.read
	).length;
	return Math.round((readCount / totalSections) * 100);
}

/**
 * Pure function to check if a section is bookmarked.
 * Use with $reader.bookmarks for reactivity: isSectionBookmarked($reader.bookmarks, chapter, section)
 */
export function isSectionBookmarked(
	bookmarks: string[],
	chapterSlug: string,
	sectionSlug: string
): boolean {
	const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
	return bookmarks.includes(bookmarkId);
}

/**
 * Pure function to get saved scroll position for a section.
 * Use with $reader.scrollPositions for reactivity: getSavedScrollPosition($reader.scrollPositions, chapter, section)
 */
export function getSavedScrollPosition(
	scrollPositions: ScrollPositions,
	chapterSlug: string,
	sectionSlug: string
): ScrollPosition | null {
	const sectionId = createSectionKey(chapterSlug, sectionSlug);
	return scrollPositions[sectionId] || null;
}
