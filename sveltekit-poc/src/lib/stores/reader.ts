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

const STORAGE_KEY = 'namsbokasafn:reader';

export interface SectionProgress {
	read: boolean;
	lastVisited: string;
}

export interface ReadingProgress {
	[sectionId: string]: SectionProgress;
}

interface ReaderState {
	progress: ReadingProgress;
	currentChapter: string | null;
	currentSection: string | null;
	bookmarks: string[];
}

const defaultState: ReaderState = {
	progress: {},
	currentChapter: null,
	currentSection: null,
	bookmarks: []
};

function loadState(): ReaderState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultState, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.warn('Failed to load reader state:', e);
	}
	return defaultState;
}

function createReaderStore() {
	const { subscribe, set, update } = writable<ReaderState>(loadState());

	// Persist to localStorage
	if (browser) {
		subscribe((state) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

		reset: () => set(defaultState)
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
