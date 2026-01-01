import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { useFlashcardStore } from "./flashcardStore";
import type { Flashcard, FlashcardDeck } from "@/types/flashcard";

// =============================================================================
// TEST DATA
// =============================================================================

function createTestDeck(id: string, name: string): FlashcardDeck {
  return {
    id,
    name,
    description: `Test deck: ${name}`,
    cards: [],
    createdAt: "2024-01-15T12:00:00Z",
  };
}

function createTestCard(id: string, front: string, back: string): Flashcard {
  return {
    id,
    front,
    back,
    createdAt: "2024-01-15T12:00:00Z",
  };
}

// =============================================================================
// SETUP
// =============================================================================

describe("flashcardStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));

    // Reset store to default state
    act(() => {
      useFlashcardStore.setState({
        decks: [],
        studyRecords: {},
        currentDeckId: null,
        currentCardIndex: 0,
        showAnswer: false,
        studyQueue: [],
        todayStudied: 0,
        studyStreak: 0,
        lastStudyDate: null,
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // DECK MANAGEMENT TESTS
  // ===========================================================================

  describe("deck management", () => {
    it("should have no decks by default", () => {
      const state = useFlashcardStore.getState();
      expect(state.decks).toHaveLength(0);
    });

    it("should add a deck", () => {
      const deck = createTestDeck("deck-1", "Test Deck");

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });

      const state = useFlashcardStore.getState();
      expect(state.decks).toHaveLength(1);
      expect(state.decks[0].id).toBe("deck-1");
      expect(state.decks[0].name).toBe("Test Deck");
    });

    it("should add multiple decks", () => {
      const deck1 = createTestDeck("deck-1", "Deck 1");
      const deck2 = createTestDeck("deck-2", "Deck 2");

      act(() => {
        useFlashcardStore.getState().addDeck(deck1);
        useFlashcardStore.getState().addDeck(deck2);
      });

      const state = useFlashcardStore.getState();
      expect(state.decks).toHaveLength(2);
    });

    it("should remove a deck", () => {
      const deck = createTestDeck("deck-1", "Test Deck");

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.getState().removeDeck("deck-1");
      });

      const state = useFlashcardStore.getState();
      expect(state.decks).toHaveLength(0);
    });

    it("should clear currentDeckId when removing current deck", () => {
      const deck = createTestDeck("deck-1", "Test Deck");

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.setState({ currentDeckId: "deck-1" });
        useFlashcardStore.getState().removeDeck("deck-1");
      });

      expect(useFlashcardStore.getState().currentDeckId).toBeNull();
    });

    it("should not affect currentDeckId when removing different deck", () => {
      const deck1 = createTestDeck("deck-1", "Deck 1");
      const deck2 = createTestDeck("deck-2", "Deck 2");

      act(() => {
        useFlashcardStore.getState().addDeck(deck1);
        useFlashcardStore.getState().addDeck(deck2);
        useFlashcardStore.setState({ currentDeckId: "deck-1" });
        useFlashcardStore.getState().removeDeck("deck-2");
      });

      expect(useFlashcardStore.getState().currentDeckId).toBe("deck-1");
    });

    it("should get a deck by id", () => {
      const deck = createTestDeck("deck-1", "Test Deck");

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });

      const result = useFlashcardStore.getState().getDeck("deck-1");
      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Deck");
    });

    it("should return undefined for non-existent deck", () => {
      const result = useFlashcardStore.getState().getDeck("non-existent");
      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // CARD MANAGEMENT TESTS
  // ===========================================================================

  describe("card management", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });
    });

    it("should add a card to deck", () => {
      const card = createTestCard("card-1", "Front", "Back");

      act(() => {
        useFlashcardStore.getState().addCardToDeck("deck-1", card);
      });

      const deck = useFlashcardStore.getState().getDeck("deck-1");
      expect(deck?.cards).toHaveLength(1);
      expect(deck?.cards[0].front).toBe("Front");
    });

    it("should add multiple cards to deck", () => {
      const card1 = createTestCard("card-1", "Front 1", "Back 1");
      const card2 = createTestCard("card-2", "Front 2", "Back 2");

      act(() => {
        useFlashcardStore.getState().addCardToDeck("deck-1", card1);
        useFlashcardStore.getState().addCardToDeck("deck-1", card2);
      });

      const deck = useFlashcardStore.getState().getDeck("deck-1");
      expect(deck?.cards).toHaveLength(2);
    });

    it("should remove a card from deck", () => {
      const card = createTestCard("card-1", "Front", "Back");

      act(() => {
        useFlashcardStore.getState().addCardToDeck("deck-1", card);
        useFlashcardStore.getState().removeCardFromDeck("deck-1", "card-1");
      });

      const deck = useFlashcardStore.getState().getDeck("deck-1");
      expect(deck?.cards).toHaveLength(0);
    });

    it("should not affect other cards when removing one", () => {
      const card1 = createTestCard("card-1", "Front 1", "Back 1");
      const card2 = createTestCard("card-2", "Front 2", "Back 2");

      act(() => {
        useFlashcardStore.getState().addCardToDeck("deck-1", card1);
        useFlashcardStore.getState().addCardToDeck("deck-1", card2);
        useFlashcardStore.getState().removeCardFromDeck("deck-1", "card-1");
      });

      const deck = useFlashcardStore.getState().getDeck("deck-1");
      expect(deck?.cards).toHaveLength(1);
      expect(deck?.cards[0].id).toBe("card-2");
    });
  });

  // ===========================================================================
  // STUDY SESSION TESTS
  // ===========================================================================

  describe("study session", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [
        createTestCard("card-1", "Q1", "A1"),
        createTestCard("card-2", "Q2", "A2"),
        createTestCard("card-3", "Q3", "A3"),
      ];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });
    });

    it("should start a study session", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
      });

      const state = useFlashcardStore.getState();
      expect(state.currentDeckId).toBe("deck-1");
      expect(state.currentCardIndex).toBe(0);
      expect(state.showAnswer).toBe(false);
      expect(state.studyQueue.length).toBeGreaterThan(0);
    });

    it("should not start session for non-existent deck", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("non-existent");
      });

      const state = useFlashcardStore.getState();
      expect(state.currentDeckId).toBeNull();
    });

    it("should go to next card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().nextCard();
      });

      expect(useFlashcardStore.getState().currentCardIndex).toBe(1);
    });

    it("should not go past last card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().nextCard();
        useFlashcardStore.getState().nextCard();
        useFlashcardStore.getState().nextCard(); // Try to go past end
      });

      expect(useFlashcardStore.getState().currentCardIndex).toBe(2);
    });

    it("should go to previous card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().nextCard();
        useFlashcardStore.getState().previousCard();
      });

      expect(useFlashcardStore.getState().currentCardIndex).toBe(0);
    });

    it("should not go before first card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().previousCard();
      });

      expect(useFlashcardStore.getState().currentCardIndex).toBe(0);
    });

    it("should toggle answer visibility", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
      });

      expect(useFlashcardStore.getState().showAnswer).toBe(false);

      act(() => {
        useFlashcardStore.getState().toggleAnswer();
      });

      expect(useFlashcardStore.getState().showAnswer).toBe(true);

      act(() => {
        useFlashcardStore.getState().toggleAnswer();
      });

      expect(useFlashcardStore.getState().showAnswer).toBe(false);
    });

    it("should reset answer visibility when navigating", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().toggleAnswer();
        useFlashcardStore.getState().nextCard();
      });

      expect(useFlashcardStore.getState().showAnswer).toBe(false);
    });

    it("should reset session", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().nextCard();
        useFlashcardStore.getState().toggleAnswer();
        useFlashcardStore.getState().resetSession();
      });

      const state = useFlashcardStore.getState();
      expect(state.currentDeckId).toBeNull();
      expect(state.currentCardIndex).toBe(0);
      expect(state.showAnswer).toBe(false);
      expect(state.studyQueue).toHaveLength(0);
    });
  });

  // ===========================================================================
  // SRS RATING TESTS
  // ===========================================================================

  describe("SRS rating", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [
        createTestCard("card-1", "Q1", "A1"),
        createTestCard("card-2", "Q2", "A2"),
      ];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.getState().startStudySession("deck-1");
      });
    });

    it("should create study record when rating card", () => {
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      const record = useFlashcardStore.getState().getCardRecord("card-1");
      expect(record).toBeDefined();
      expect(record?.cardId).toBe("card-1");
    });

    it("should update study record on subsequent ratings", () => {
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      const firstRecord = useFlashcardStore.getState().getCardRecord("card-1");
      const firstReviewCount = firstRecord?.reviewCount;

      // Advance time and rate again
      vi.advanceTimersByTime(86400000); // 1 day

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      const secondRecord = useFlashcardStore.getState().getCardRecord("card-1");
      expect(secondRecord?.reviewCount).toBe((firstReviewCount || 0) + 1);
    });

    it("should auto-advance to next card after rating", () => {
      expect(useFlashcardStore.getState().currentCardIndex).toBe(0);

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().currentCardIndex).toBe(1);
    });

    it("should update today studied count", () => {
      expect(useFlashcardStore.getState().todayStudied).toBe(0);

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().todayStudied).toBe(1);
    });

    it("should update last study date", () => {
      expect(useFlashcardStore.getState().lastStudyDate).toBeNull();

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().lastStudyDate).toBe("2024-01-15");
    });

    it("should start study streak", () => {
      expect(useFlashcardStore.getState().studyStreak).toBe(0);

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(1);
    });
  });

  // ===========================================================================
  // CARD DUE STATUS TESTS
  // ===========================================================================

  describe("card due status", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [createTestCard("card-1", "Q1", "A1")];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });
    });

    it("should return true for new card", () => {
      expect(useFlashcardStore.getState().isCardDue("card-1")).toBe(true);
    });

    it("should return false for recently studied card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().isCardDue("card-1")).toBe(false);
    });

    it("should return true for overdue card", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      // Advance 2 days (past the 1-day interval for new card)
      vi.advanceTimersByTime(2 * 86400000);

      expect(useFlashcardStore.getState().isCardDue("card-1")).toBe(true);
    });
  });

  // ===========================================================================
  // DECK STATS TESTS
  // ===========================================================================

  describe("deck stats", () => {
    it("should return zeros for non-existent deck", () => {
      const stats = useFlashcardStore.getState().getDeckStats("non-existent");

      expect(stats.total).toBe(0);
      expect(stats.new).toBe(0);
      expect(stats.due).toBe(0);
    });

    it("should count new cards correctly", () => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [
        createTestCard("card-1", "Q1", "A1"),
        createTestCard("card-2", "Q2", "A2"),
        createTestCard("card-3", "Q3", "A3"),
      ];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });

      const stats = useFlashcardStore.getState().getDeckStats("deck-1");

      expect(stats.total).toBe(3);
      expect(stats.new).toBe(3);
    });

    it("should update stats after studying", () => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [
        createTestCard("card-1", "Q1", "A1"),
        createTestCard("card-2", "Q2", "A2"),
      ];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      const stats = useFlashcardStore.getState().getDeckStats("deck-1");

      expect(stats.total).toBe(2);
      expect(stats.new).toBe(1); // One card studied
    });
  });

  // ===========================================================================
  // PREVIEW INTERVALS TESTS
  // ===========================================================================

  describe("preview intervals", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [createTestCard("card-1", "Q1", "A1")];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });
    });

    it("should return intervals for new card", () => {
      const intervals = useFlashcardStore
        .getState()
        .getPreviewIntervals("card-1");

      expect(intervals.again).toBeDefined();
      expect(intervals.hard).toBeDefined();
      expect(intervals.good).toBeDefined();
      expect(intervals.easy).toBeDefined();
    });

    it("should return 1 day for all ratings on new card", () => {
      const intervals = useFlashcardStore
        .getState()
        .getPreviewIntervals("card-1");

      expect(intervals.again).toBe("1 d");
      expect(intervals.good).toBe("1 d");
    });
  });

  // ===========================================================================
  // STUDY MODE TESTS
  // ===========================================================================

  describe("study modes", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [
        createTestCard("card-1", "Q1", "A1"),
        createTestCard("card-2", "Q2", "A2"),
        createTestCard("card-3", "Q3", "A3"),
      ];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
      });
    });

    it("should include all cards in 'all' mode", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1", "all");
      });

      expect(useFlashcardStore.getState().studyQueue).toHaveLength(3);
    });

    it("should only include new cards in 'new' mode", () => {
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1", "new");
      });

      expect(useFlashcardStore.getState().studyQueue).toHaveLength(3);
    });

    it("should filter studied cards in 'new' mode", () => {
      // Study one card first
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().rateCard("card-1", "good");
        useFlashcardStore.getState().resetSession();
      });

      // Start new mode session
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1", "new");
      });

      const queue = useFlashcardStore.getState().studyQueue;
      expect(queue).toHaveLength(2);
      expect(queue).not.toContain("card-1");
    });

    it("should show due cards in 'due' mode", () => {
      // Study one card
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1");
        useFlashcardStore.getState().rateCard("card-1", "good");
        useFlashcardStore.getState().resetSession();
      });

      // New cards are considered due
      act(() => {
        useFlashcardStore.getState().startStudySession("deck-1", "due");
      });

      const queue = useFlashcardStore.getState().studyQueue;
      // Should include the 2 new cards (new cards are due)
      expect(queue.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // STREAK CALCULATION TESTS
  // ===========================================================================

  describe("study streak", () => {
    beforeEach(() => {
      const deck = createTestDeck("deck-1", "Test Deck");
      deck.cards = [createTestCard("card-1", "Q1", "A1")];

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.getState().startStudySession("deck-1");
      });
    });

    it("should maintain streak when studying same day", () => {
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      const streak = useFlashcardStore.getState().studyStreak;

      // Rate again same day
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(streak);
    });

    it("should increment streak when studying consecutive days", () => {
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(1);

      // Next day
      vi.advanceTimersByTime(86400000);

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(2);
    });

    it("should reset streak when missing a day", () => {
      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(1);

      // Skip 2 days
      vi.advanceTimersByTime(2 * 86400000);

      act(() => {
        useFlashcardStore.getState().rateCard("card-1", "good");
      });

      expect(useFlashcardStore.getState().studyStreak).toBe(1);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle empty deck in study session", () => {
      const deck = createTestDeck("deck-1", "Empty Deck");

      act(() => {
        useFlashcardStore.getState().addDeck(deck);
        useFlashcardStore.getState().startStudySession("deck-1");
      });

      expect(useFlashcardStore.getState().studyQueue).toHaveLength(0);
    });

    it("should handle getting record for non-existent card", () => {
      const record = useFlashcardStore.getState().getCardRecord("non-existent");
      expect(record).toBeUndefined();
    });

    it("should handle adding card to non-existent deck", () => {
      const card = createTestCard("card-1", "Q1", "A1");

      act(() => {
        useFlashcardStore.getState().addCardToDeck("non-existent", card);
      });

      // Should not crash, deck count should remain 0
      expect(useFlashcardStore.getState().decks).toHaveLength(0);
    });

    it("should handle removing card from non-existent deck", () => {
      act(() => {
        useFlashcardStore.getState().removeCardFromDeck("non-existent", "card");
      });

      // Should not crash
      expect(useFlashcardStore.getState().decks).toHaveLength(0);
    });
  });
});
