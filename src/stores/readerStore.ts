import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  createSectionKey,
  createChapterPrefix,
  getCurrentTimestamp,
} from "@/utils/storeHelpers";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "efnafraedi-reading";

// =============================================================================
// TYPES
// =============================================================================

interface SectionProgress {
  read: boolean;
  lastVisited: string; // ISO date string
}

interface ReadingProgress {
  [sectionId: string]: SectionProgress;
}

interface ReaderState {
  // Reading progress
  progress: ReadingProgress;
  markAsRead: (chapterSlug: string, sectionSlug: string) => void;
  isRead: (chapterSlug: string, sectionSlug: string) => boolean;
  getChapterProgress: (chapterSlug: string, totalSections: number) => number;

  // Current location
  currentChapter: string | null;
  currentSection: string | null;
  setCurrentLocation: (chapterSlug: string, sectionSlug: string) => void;

  // Bookmarks
  bookmarks: string[]; // Array of section IDs (chapterSlug/sectionSlug)
  addBookmark: (chapterSlug: string, sectionSlug: string) => void;
  removeBookmark: (chapterSlug: string, sectionSlug: string) => void;
  isBookmarked: (chapterSlug: string, sectionSlug: string) => boolean;
}

// =============================================================================
// STORE
// =============================================================================

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // Default values
      progress: {},
      currentChapter: null,
      currentSection: null,
      bookmarks: [],

      // Mark as read
      markAsRead: (chapterSlug, sectionSlug) => {
        const sectionId = createSectionKey(chapterSlug, sectionSlug);
        set((state) => ({
          progress: {
            ...state.progress,
            [sectionId]: {
              read: true,
              lastVisited: getCurrentTimestamp(),
            },
          },
        }));
      },

      // Check if read
      isRead: (chapterSlug, sectionSlug) => {
        const sectionId = createSectionKey(chapterSlug, sectionSlug);
        return get().progress[sectionId]?.read || false;
      },

      // Get chapter progress as percentage
      getChapterProgress: (chapterSlug, totalSections) => {
        if (totalSections <= 0) return 0;

        const { progress } = get();
        const chapterPrefix = createChapterPrefix(chapterSlug);

        const readCount = Object.entries(progress).filter(
          ([sectionId, data]) =>
            sectionId.startsWith(chapterPrefix) && data.read,
        ).length;

        return Math.round((readCount / totalSections) * 100);
      },

      // Set current location
      setCurrentLocation: (chapterSlug, sectionSlug) => {
        const sectionId = createSectionKey(chapterSlug, sectionSlug);

        set((state) => ({
          currentChapter: chapterSlug,
          currentSection: sectionSlug,
          progress: {
            ...state.progress,
            [sectionId]: {
              read: state.progress[sectionId]?.read || false,
              lastVisited: getCurrentTimestamp(),
            },
          },
        }));
      },

      // Add bookmark
      addBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmarkId],
        }));
      },

      // Remove bookmark
      removeBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
        set((state) => ({
          bookmarks: state.bookmarks.filter((id) => id !== bookmarkId),
        }));
      },

      // Check if bookmarked
      isBookmarked: (chapterSlug, sectionSlug) => {
        const bookmarkId = createSectionKey(chapterSlug, sectionSlug);
        return get().bookmarks.includes(bookmarkId);
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
