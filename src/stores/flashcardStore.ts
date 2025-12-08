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
  startStudySession: (
    deckId: string,
    studyMode?: "all" | "due" | "new",
  ) => void;
  nextCard: () => void;
  previousCard: () => void;
  toggleAnswer: () => void;

  // SRS functions
  rateCard: (cardId: string, rating: DifficultyRating) => void;
  getCardRecord: (cardId: string) => FlashcardStudyRecord | undefined;
  isCardDue: (cardId: string) => boolean;
  getDeckStats: (deckId: string) => {
    total: number;
    new: number;
    due: number;
    learning: number;
    review: number;
  };
  getPreviewIntervals: (cardId: string) => Record<DifficultyRating, string>;

  // Reset
  resetSession: () => void;
}

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

        let queue: string[];
        switch (studyMode) {
          case "due":
            queue = getDueCards(cardIds, studyRecords);
            break;
          case "new":
            queue = getNewCards(cardIds, studyRecords);
            break;
          default:
            // "all" - sort by priority (due first, then new, then future)
            queue = sortCardsByPriority(cardIds, studyRecords);
        }

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
        const today = new Date().toISOString().split("T")[0];
        const { lastStudyDate, studyStreak, todayStudied } = get();

        let newStreak = studyStreak;
        let newTodayStudied = todayStudied;

        if (lastStudyDate !== today) {
          // New day
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastStudyDate === yesterdayStr) {
            // Continuing streak
            newStreak = studyStreak + 1;
          } else {
            // Streak broken, start new
            newStreak = 1;
          }
          newTodayStudied = 1;
        } else {
          newTodayStudied = todayStudied + 1;
        }

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
      name: "efnafraedi-flashcards",
    },
  ),
);
