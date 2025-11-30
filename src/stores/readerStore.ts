import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Gerð fyrir lesframvindu (reading progress)
interface ReadingProgress {
  [sectionId: string]: {
    read: boolean;
    lastVisited: string; // ISO date string
  };
}

interface ReaderState {
  // Lesframvinda (reading progress)
  progress: ReadingProgress;
  markAsRead: (chapterSlug: string, sectionSlug: string) => void;
  isRead: (chapterSlug: string, sectionSlug: string) => boolean;
  getChapterProgress: (chapterSlug: string, totalSections: number) => number;

  // Núverandi staðsetning (current location)
  currentChapter: string | null;
  currentSection: string | null;
  setCurrentLocation: (chapterSlug: string, sectionSlug: string) => void;

  // Bókamerki (bookmarks)
  bookmarks: string[]; // Array af section IDs (chapterSlug/sectionSlug)
  addBookmark: (chapterSlug: string, sectionSlug: string) => void;
  removeBookmark: (chapterSlug: string, sectionSlug: string) => void;
  isBookmarked: (chapterSlug: string, sectionSlug: string) => boolean;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      // Sjálfgefin gildi
      progress: {},
      currentChapter: null,
      currentSection: null,
      bookmarks: [],

      // Merkja sem lesið (mark as read)
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

      // Athuga hvort kafli sé lesinn (check if read)
      isRead: (chapterSlug, sectionSlug) => {
        const sectionId = `${chapterSlug}/${sectionSlug}`;
        return get().progress[sectionId]?.read || false;
      },

      // Fá framvindu kafla sem prósentu (get chapter progress as percentage)
      getChapterProgress: (chapterSlug, totalSections) => {
        const progress = get().progress;
        let readCount = 0;

        Object.keys(progress).forEach((sectionId) => {
          if (sectionId.startsWith(chapterSlug) && progress[sectionId].read) {
            readCount++;
          }
        });

        return totalSections > 0 ? Math.round((readCount / totalSections) * 100) : 0;
      },

      // Stilla núverandi staðsetningu (set current location)
      setCurrentLocation: (chapterSlug, sectionSlug) => {
        set({ currentChapter: chapterSlug, currentSection: sectionSlug });
        // Merkja einnig sem heimsótt (also mark as visited)
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

      // Bæta við bókamerki (add bookmark)
      addBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmarkId],
        }));
      },

      // Fjarlægja bókamerki (remove bookmark)
      removeBookmark: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        set((state) => ({
          bookmarks: state.bookmarks.filter((id) => id !== bookmarkId),
        }));
      },

      // Athuga hvort bókamerki sé til (check if bookmarked)
      isBookmarked: (chapterSlug, sectionSlug) => {
        const bookmarkId = `${chapterSlug}/${sectionSlug}`;
        return get().bookmarks.includes(bookmarkId);
      },
    }),
    {
      name: 'efnafraedi-reading',
    }
  )
);
