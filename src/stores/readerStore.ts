import { create } from "zustand";
import { persist } from "zustand/middleware";

// Type for reading progress
interface ReadingProgress {
  [sectionId: string]: {
    read: boolean;
    lastVisited: string; // ISO date string
  };
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
        const sectionId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          progress: {
            ...state.progress,
            [sectionId]: {
              read: true,
              lastVisited: new Date().toISOString(),
            },
          },
        }));
      },

      // Check if read
      isRead: (chapterSlug, sectionSlug) => {
        const sectionId = `${chapterSlug}/${sectionSlug}`;
        return get().progress[sectionId]?.read || false;
      },

      // Get chapter progress as percentage
      getChapterProgress: (chapterSlug, totalSections) => {
        const progress = get().progress;
        let readCount = 0;

        Object.keys(progress).forEach((sectionId) => {
          if (sectionId.startsWith(chapterSlug) && progress[sectionId].read) {
            readCount++;
          }
        });

        return totalSections > 0
          ? Math.round((readCount / totalSections) * 100)
          : 0;
      },

      // Set current location
      setCurrentLocation: (chapterSlug, sectionSlug) => {
        set({ currentChapter: chapterSlug, currentSection: sectionSlug });
        // Also mark as visited
        const sectionId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          progress: {
            ...state.progress,
            [sectionId]: {
              read: state.progress[sectionId]?.read || false,
              lastVisited: new Date().toISOString(),
            },
          },
        }));
      },

      // Add bookmark
      addBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmarkId],
        }));
      },

      // Remove bookmark
      removeBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          bookmarks: state.bookmarks.filter((id) => id !== bookmarkId),
        }));
      },

      // Check if bookmarked
      isBookmarked: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        return get().bookmarks.includes(bookmarkId);
      },
    }),
    {
      name: "efnafraedi-reading",
    },
  ),
);
