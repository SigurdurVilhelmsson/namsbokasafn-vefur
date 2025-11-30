import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Flashcard,
  FlashcardDeck,
  FlashcardStudyRecord,
} from "@/types/flashcard";

interface FlashcardState {
  // Decks
  decks: FlashcardDeck[];

  // Study records
  studyRecords: Record<string, FlashcardStudyRecord>;

  // Current session state
  currentDeckId: string | null;
  currentCardIndex: number;
  showAnswer: boolean;

  // Deck management
  addDeck: (deck: FlashcardDeck) => void;
  removeDeck: (deckId: string) => void;
  getDeck: (deckId: string) => FlashcardDeck | undefined;

  // Card management
  addCardToDeck: (deckId: string, card: Flashcard) => void;
  removeCardFromDeck: (deckId: string, cardId: string) => void;

  // Study session
  startStudySession: (deckId: string) => void;
  nextCard: () => void;
  previousCard: () => void;
  toggleAnswer: () => void;
  rateCard: (cardId: string, ease: number) => void;

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

      // Start study session
      startStudySession: (deckId) => {
        set({
          currentDeckId: deckId,
          currentCardIndex: 0,
          showAnswer: false,
        });
      },

      // Next card
      nextCard: () => {
        const { currentDeckId, currentCardIndex } = get();
        if (!currentDeckId) return;

        const deck = get().getDeck(currentDeckId);
        if (!deck) return;

        const nextIndex = currentCardIndex + 1;
        if (nextIndex < deck.cards.length) {
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

      // Rate card (for SRS later)
      rateCard: (cardId, ease) => {
        const now = new Date().toISOString();

        set((state) => ({
          studyRecords: {
            ...state.studyRecords,
            [cardId]: {
              cardId,
              lastReviewed: now,
              ease,
              reviewCount: (state.studyRecords[cardId]?.reviewCount || 0) + 1,
            },
          },
        }));
      },

      // Reset session
      resetSession: () => {
        set({
          currentDeckId: null,
          currentCardIndex: 0,
          showAnswer: false,
        });
      },
    }),
    {
      name: "efnafraedi-flashcards",
    },
  ),
);
