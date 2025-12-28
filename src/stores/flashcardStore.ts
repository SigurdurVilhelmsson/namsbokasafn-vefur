import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Flashcard,
  FlashcardDeck,
  FlashcardStudyRecord,
  DifficultyRating,
} from "@/types/flashcard";
import { DIFFICULTY_TO_QUALITY } from "@/types/flashcard";
import {
  processReview,
  isCardDue,
  sortCardsByPriority,
  getDueCards,
  getNewCards,
  calculateDeckStats,
  previewRatingIntervals,
} from "@/utils/srs";
import {
  getTodayDateString,
  getYesterdayDateString,
} from "@/utils/storeHelpers";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "efnafraedi-flashcards";

// =============================================================================
// TYPES
// =============================================================================

type StudyMode = "all" | "due" | "new";

interface DeckStats {
  total: number;
  new: number;
  due: number;
  learning: number;
  review: number;
}

interface FlashcardState {
  // Decks
  decks: FlashcardDeck[];

  // Study records (SRS data for each card)
  studyRecords: Record<string, FlashcardStudyRecord>;

  // Current session state
  currentDeckId: string | null;
  currentCardIndex: number;
  showAnswer: boolean;
  studyQueue: string[]; // Card IDs in study order (prioritized by SRS)

  // Study statistics
  todayStudied: number;
  studyStreak: number;
  lastStudyDate: string | null;

  // Deck management
  addDeck: (deck: FlashcardDeck) => void;
  removeDeck: (deckId: string) => void;
  getDeck: (deckId: string) => FlashcardDeck | undefined;

  // Card management
  addCardToDeck: (deckId: string, card: Flashcard) => void;
  removeCardFromDeck: (deckId: string, cardId: string) => void;

  // Study session
  startStudySession: (deckId: string, studyMode?: StudyMode) => void;
  nextCard: () => void;
  previousCard: () => void;
  toggleAnswer: () => void;

  // SRS functions
  rateCard: (cardId: string, rating: DifficultyRating) => void;
  getCardRecord: (cardId: string) => FlashcardStudyRecord | undefined;
  isCardDue: (cardId: string) => boolean;
  getDeckStats: (deckId: string) => DeckStats;
  getPreviewIntervals: (cardId: string) => Record<DifficultyRating, string>;

  // Reset
  resetSession: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate updated study streak based on last study date
 */
function calculateStudyStreak(
  lastStudyDate: string | null,
  currentStreak: number,
): number {
  const today = getTodayDateString();

  if (lastStudyDate === today) {
    // Already studied today, keep current streak
    return currentStreak;
  }

  if (lastStudyDate === getYesterdayDateString()) {
    // Continuing streak from yesterday
    return currentStreak + 1;
  }

  // Streak broken, start new
  return 1;
}

/**
 * Build study queue based on study mode
 */
function buildStudyQueue(
  cardIds: string[],
  studyRecords: Record<string, FlashcardStudyRecord>,
  studyMode: StudyMode,
): string[] {
  switch (studyMode) {
    case "due":
      return getDueCards(cardIds, studyRecords);
    case "new":
      return getNewCards(cardIds, studyRecords);
    default:
      // "all" - sort by priority (due first, then new, then future)
      return sortCardsByPriority(cardIds, studyRecords);
  }
}

// =============================================================================
// STORE
// =============================================================================

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set, get) => ({
      // Initial state
      decks: [],
      studyRecords: {},
      currentDeckId: null,
      currentCardIndex: 0,
      showAnswer: false,
      studyQueue: [],
      todayStudied: 0,
      studyStreak: 0,
      lastStudyDate: null,

      // Add a new deck
      addDeck: (deck) => {
        set((state) => ({
          decks: [...state.decks, deck],
        }));
      },

      // Remove a deck
      removeDeck: (deckId) => {
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
          currentDeckId:
            state.currentDeckId === deckId ? null : state.currentDeckId,
        }));
      },

      // Get a specific deck
      getDeck: (deckId) => {
        return get().decks.find((d) => d.id === deckId);
      },

      // Add card to deck
      addCardToDeck: (deckId, card) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId
              ? { ...deck, cards: [...deck.cards, card] }
              : deck,
          ),
        }));
      },

      // Remove card from deck
      removeCardFromDeck: (deckId, cardId) => {
        set((state) => ({
          decks: state.decks.map((deck) =>
            deck.id === deckId
              ? { ...deck, cards: deck.cards.filter((c) => c.id !== cardId) }
              : deck,
          ),
        }));
      },

      // Start study session with SRS prioritization
      startStudySession: (deckId, studyMode = "all") => {
        const deck = get().getDeck(deckId);
        if (!deck) return;

        const { studyRecords } = get();
        const cardIds = deck.cards.map((c) => c.id);
        const queue = buildStudyQueue(cardIds, studyRecords, studyMode);

        set({
          currentDeckId: deckId,
          currentCardIndex: 0,
          showAnswer: false,
          studyQueue: queue,
        });
      },

      // Next card in study queue
      nextCard: () => {
        const { studyQueue, currentCardIndex } = get();

        const nextIndex = currentCardIndex + 1;
        if (nextIndex < studyQueue.length) {
          set({
            currentCardIndex: nextIndex,
            showAnswer: false,
          });
        }
      },

      // Previous card
      previousCard: () => {
        const { currentCardIndex } = get();
        if (currentCardIndex > 0) {
          set({
            currentCardIndex: currentCardIndex - 1,
            showAnswer: false,
          });
        }
      },

      // Toggle answer visibility
      toggleAnswer: () => {
        set((state) => ({
          showAnswer: !state.showAnswer,
        }));
      },

      // Rate card with SRS algorithm
      rateCard: (cardId, rating) => {
        const quality = DIFFICULTY_TO_QUALITY[rating];
        const existingRecord = get().studyRecords[cardId];
        const newRecord = processReview(cardId, quality, existingRecord);

        // Update study streak
        const today = getTodayDateString();
        const { lastStudyDate, studyStreak, todayStudied } = get();

        const isNewDay = lastStudyDate !== today;
        const newStreak = isNewDay
          ? calculateStudyStreak(lastStudyDate, studyStreak)
          : studyStreak;
        const newTodayStudied = isNewDay ? 1 : todayStudied + 1;

        set((state) => ({
          studyRecords: {
            ...state.studyRecords,
            [cardId]: newRecord,
          },
          lastStudyDate: today,
          studyStreak: newStreak,
          todayStudied: newTodayStudied,
        }));

        // Auto-advance to next card after rating
        get().nextCard();
      },

      // Get study record for a card
      getCardRecord: (cardId) => {
        return get().studyRecords[cardId];
      },

      // Check if a card is due for review
      isCardDue: (cardId) => {
        const record = get().studyRecords[cardId];
        return isCardDue(record);
      },

      // Get deck statistics
      getDeckStats: (deckId) => {
        const deck = get().getDeck(deckId);
        if (!deck) {
          return { total: 0, new: 0, due: 0, learning: 0, review: 0 };
        }

        const cardIds = deck.cards.map((c) => c.id);
        return calculateDeckStats(cardIds, get().studyRecords);
      },

      // Get preview of what intervals each rating would give
      getPreviewIntervals: (cardId) => {
        const record = get().studyRecords[cardId];
        return previewRatingIntervals(record);
      },

      // Reset session
      resetSession: () => {
        set({
          currentDeckId: null,
          currentCardIndex: 0,
          showAnswer: false,
          studyQueue: [],
        });
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
