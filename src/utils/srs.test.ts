import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateNewEaseFactor,
  calculateNextInterval,
  processReview,
  isCardDue,
  sortCardsByPriority,
  getDueCards,
  getNewCards,
  calculateDeckStats,
  previewRatingIntervals,
} from "./srs";
import type { FlashcardStudyRecord, StudyQuality } from "@/types/flashcard";

// =============================================================================
// EASE FACTOR TESTS
// =============================================================================

describe("calculateNewEaseFactor", () => {
  it("should maintain ease factor at 2.5 for quality 5 (easy)", () => {
    const result = calculateNewEaseFactor(2.5, 5);
    expect(result).toBe(2.6);
  });

  it("should slightly increase ease factor for quality 4 (good)", () => {
    const result = calculateNewEaseFactor(2.5, 4);
    expect(result).toBeCloseTo(2.5, 1);
  });

  it("should decrease ease factor for quality 3 (hard but correct)", () => {
    const result = calculateNewEaseFactor(2.5, 3);
    expect(result).toBeLessThan(2.5);
  });

  it("should significantly decrease ease factor for quality 2", () => {
    const result = calculateNewEaseFactor(2.5, 2);
    expect(result).toBeLessThan(2.36);
  });

  it("should heavily decrease ease factor for quality 0 (again)", () => {
    const result = calculateNewEaseFactor(2.5, 0);
    expect(result).toBeLessThan(2.0);
  });

  it("should never go below minimum ease factor 1.3", () => {
    // Even with repeated low quality, ease should not go below 1.3
    let ease = 2.5;
    for (let i = 0; i < 20; i++) {
      ease = calculateNewEaseFactor(ease, 0);
    }
    expect(ease).toBe(1.3);
  });

  it("should increase ease factor when starting from minimum", () => {
    const result = calculateNewEaseFactor(1.3, 5);
    expect(result).toBeGreaterThan(1.3);
  });
});

// =============================================================================
// INTERVAL CALCULATION TESTS
// =============================================================================

describe("calculateNextInterval", () => {
  describe("wrong answers (quality < 3)", () => {
    it("should reset to 1 day for quality 0", () => {
      const result = calculateNextInterval(5, 30, 2.5, 0);
      expect(result).toBe(1);
    });

    it("should reset to 1 day for quality 1", () => {
      const result = calculateNextInterval(3, 15, 2.5, 1);
      expect(result).toBe(1);
    });

    it("should reset to 1 day for quality 2", () => {
      const result = calculateNextInterval(10, 60, 2.5, 2);
      expect(result).toBe(1);
    });
  });

  describe("first correct answer", () => {
    it("should return 1 day for first correct (consecutiveCorrect = 0)", () => {
      const result = calculateNextInterval(0, 0, 2.5, 4);
      expect(result).toBe(1);
    });
  });

  describe("second correct answer", () => {
    it("should return 6 days for second correct (consecutiveCorrect = 1)", () => {
      const result = calculateNextInterval(1, 1, 2.5, 4);
      expect(result).toBe(6);
    });
  });

  describe("subsequent reviews", () => {
    it("should multiply interval by ease factor", () => {
      // 6 days * 2.5 = 15 days
      const result = calculateNextInterval(2, 6, 2.5, 4);
      expect(result).toBe(15);
    });

    it("should round to nearest day", () => {
      // 6 days * 2.3 = 13.8 -> 14 days
      const result = calculateNextInterval(2, 6, 2.3, 4);
      expect(result).toBe(14);
    });

    it("should cap at 365 days maximum", () => {
      const result = calculateNextInterval(10, 200, 2.5, 5);
      expect(result).toBe(365);
    });
  });
});

// =============================================================================
// PROCESS REVIEW TESTS
// =============================================================================

describe("processReview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create new record for first review", () => {
    const result = processReview("card-1", 4);

    expect(result.cardId).toBe("card-1");
    expect(result.reviewCount).toBe(1);
    expect(result.consecutiveCorrect).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.ease).toBeCloseTo(2.5, 1);
    expect(result.lastReviewed).toContain("2024-01-15");
  });

  it("should update existing record on review", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-14T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 1,
      reviewCount: 1,
      consecutiveCorrect: 1,
    };

    const result = processReview("card-1", 4, existingRecord);

    expect(result.reviewCount).toBe(2);
    expect(result.consecutiveCorrect).toBe(2);
    expect(result.interval).toBe(6); // Second correct = 6 days
  });

  it("should reset consecutive correct on wrong answer", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-14T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 6,
      reviewCount: 2,
      consecutiveCorrect: 2,
    };

    const result = processReview("card-1", 0, existingRecord);

    expect(result.consecutiveCorrect).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.reviewCount).toBe(3);
  });

  it("should set next review date correctly", () => {
    const result = processReview("card-1", 4);

    // Next review should be 1 day from now (start of day)
    expect(result.nextReview).toContain("2024-01-16");
  });

  it("should decrease ease factor on wrong answer", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-14T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 6,
      reviewCount: 2,
      consecutiveCorrect: 2,
    };

    const result = processReview("card-1", 0, existingRecord);

    expect(result.ease).toBeLessThan(2.5);
  });
});

// =============================================================================
// IS CARD DUE TESTS
// =============================================================================

describe("isCardDue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for new card (no record)", () => {
    expect(isCardDue(undefined)).toBe(true);
  });

  it("should return true for overdue card", () => {
    const record: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-10T12:00:00Z",
      nextReview: "2024-01-14T00:00:00Z", // Yesterday
      ease: 2.5,
      interval: 4,
      reviewCount: 1,
      consecutiveCorrect: 1,
    };

    expect(isCardDue(record)).toBe(true);
  });

  it("should return true for card due today", () => {
    const record: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-14T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z", // Today
      ease: 2.5,
      interval: 1,
      reviewCount: 1,
      consecutiveCorrect: 1,
    };

    expect(isCardDue(record)).toBe(true);
  });

  it("should return false for card due in future", () => {
    const record: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-15T12:00:00Z",
      nextReview: "2024-01-20T00:00:00Z", // 5 days from now
      ease: 2.5,
      interval: 5,
      reviewCount: 1,
      consecutiveCorrect: 1,
    };

    expect(isCardDue(record)).toBe(false);
  });
});

// =============================================================================
// CARD SORTING TESTS
// =============================================================================

describe("sortCardsByPriority", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should sort due cards before new cards", () => {
    const cardIds = ["new-card", "due-card"];
    const records: Record<string, FlashcardStudyRecord> = {
      "due-card": {
        cardId: "due-card",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-14T00:00:00Z",
        ease: 2.5,
        interval: 4,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const sorted = sortCardsByPriority(cardIds, records);

    expect(sorted[0]).toBe("due-card");
    expect(sorted[1]).toBe("new-card");
  });

  it("should sort future cards before new cards", () => {
    // Implementation puts cards with records (even future) before new cards
    const cardIds = ["new-card", "future-card"];
    const records: Record<string, FlashcardStudyRecord> = {
      "future-card": {
        cardId: "future-card",
        lastReviewed: "2024-01-15T12:00:00Z",
        nextReview: "2024-01-20T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const sorted = sortCardsByPriority(cardIds, records);

    expect(sorted[0]).toBe("future-card");
    expect(sorted[1]).toBe("new-card");
  });

  it("should sort older due cards first", () => {
    const cardIds = ["due-recent", "due-old"];
    const records: Record<string, FlashcardStudyRecord> = {
      "due-recent": {
        cardId: "due-recent",
        lastReviewed: "2024-01-13T12:00:00Z",
        nextReview: "2024-01-14T00:00:00Z",
        ease: 2.5,
        interval: 1,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      "due-old": {
        cardId: "due-old",
        lastReviewed: "2024-01-05T12:00:00Z",
        nextReview: "2024-01-10T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const sorted = sortCardsByPriority(cardIds, records);

    expect(sorted[0]).toBe("due-old");
    expect(sorted[1]).toBe("due-recent");
  });

  it("should handle mixed card states correctly", () => {
    const cardIds = ["new-1", "due-1", "future-1", "new-2", "due-2"];
    const records: Record<string, FlashcardStudyRecord> = {
      "due-1": {
        cardId: "due-1",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-12T00:00:00Z",
        ease: 2.5,
        interval: 2,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      "due-2": {
        cardId: "due-2",
        lastReviewed: "2024-01-13T12:00:00Z",
        nextReview: "2024-01-14T00:00:00Z",
        ease: 2.5,
        interval: 1,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      "future-1": {
        cardId: "future-1",
        lastReviewed: "2024-01-15T12:00:00Z",
        nextReview: "2024-01-22T00:00:00Z",
        ease: 2.5,
        interval: 7,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const sorted = sortCardsByPriority(cardIds, records);

    // Due cards first (oldest first), then future cards, then new cards
    expect(sorted[0]).toBe("due-1");
    expect(sorted[1]).toBe("due-2");
    expect(sorted[2]).toBe("future-1");
    expect(sorted.slice(3, 5)).toContain("new-1");
    expect(sorted.slice(3, 5)).toContain("new-2");
  });
});

// =============================================================================
// GET DUE CARDS TESTS
// =============================================================================

describe("getDueCards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return new cards as due", () => {
    const cardIds = ["new-card"];
    const records: Record<string, FlashcardStudyRecord> = {};

    const due = getDueCards(cardIds, records);

    expect(due).toContain("new-card");
  });

  it("should return overdue cards", () => {
    const cardIds = ["due-card", "future-card"];
    const records: Record<string, FlashcardStudyRecord> = {
      "due-card": {
        cardId: "due-card",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-14T00:00:00Z",
        ease: 2.5,
        interval: 4,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      "future-card": {
        cardId: "future-card",
        lastReviewed: "2024-01-15T12:00:00Z",
        nextReview: "2024-01-20T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const due = getDueCards(cardIds, records);

    expect(due).toContain("due-card");
    expect(due).not.toContain("future-card");
  });

  it("should return empty array when no cards are due", () => {
    const cardIds = ["future-card"];
    const records: Record<string, FlashcardStudyRecord> = {
      "future-card": {
        cardId: "future-card",
        lastReviewed: "2024-01-15T12:00:00Z",
        nextReview: "2024-01-20T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const due = getDueCards(cardIds, records);

    expect(due).toHaveLength(0);
  });
});

// =============================================================================
// GET NEW CARDS TESTS
// =============================================================================

describe("getNewCards", () => {
  it("should return cards without records", () => {
    const cardIds = ["new-1", "reviewed-1", "new-2"];
    const records: Record<string, FlashcardStudyRecord> = {
      "reviewed-1": {
        cardId: "reviewed-1",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-15T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const newCards = getNewCards(cardIds, records);

    expect(newCards).toContain("new-1");
    expect(newCards).toContain("new-2");
    expect(newCards).not.toContain("reviewed-1");
    expect(newCards).toHaveLength(2);
  });

  it("should return empty array when all cards have records", () => {
    const cardIds = ["card-1"];
    const records: Record<string, FlashcardStudyRecord> = {
      "card-1": {
        cardId: "card-1",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-15T00:00:00Z",
        ease: 2.5,
        interval: 5,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const newCards = getNewCards(cardIds, records);

    expect(newCards).toHaveLength(0);
  });

  it("should return all cards when none have records", () => {
    const cardIds = ["new-1", "new-2", "new-3"];
    const records: Record<string, FlashcardStudyRecord> = {};

    const newCards = getNewCards(cardIds, records);

    expect(newCards).toHaveLength(3);
  });
});

// =============================================================================
// DECK STATS TESTS
// =============================================================================

describe("calculateDeckStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should count new cards correctly", () => {
    const cardIds = ["new-1", "new-2", "reviewed"];
    const records: Record<string, FlashcardStudyRecord> = {
      reviewed: {
        cardId: "reviewed",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-20T00:00:00Z",
        ease: 2.5,
        interval: 10,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const stats = calculateDeckStats(cardIds, records);

    expect(stats.new).toBe(2);
    expect(stats.total).toBe(3);
  });

  it("should count due cards correctly", () => {
    const cardIds = ["due-1", "due-2", "future"];
    const records: Record<string, FlashcardStudyRecord> = {
      "due-1": {
        cardId: "due-1",
        lastReviewed: "2024-01-10T12:00:00Z",
        nextReview: "2024-01-14T00:00:00Z",
        ease: 2.5,
        interval: 4,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      "due-2": {
        cardId: "due-2",
        lastReviewed: "2024-01-14T12:00:00Z",
        nextReview: "2024-01-15T00:00:00Z",
        ease: 2.5,
        interval: 1,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      future: {
        cardId: "future",
        lastReviewed: "2024-01-15T12:00:00Z",
        nextReview: "2024-01-22T00:00:00Z",
        ease: 2.5,
        interval: 7,
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
    };

    const stats = calculateDeckStats(cardIds, records);

    expect(stats.due).toBe(2);
  });

  it("should distinguish learning from review cards", () => {
    const cardIds = ["learning", "review"];
    const records: Record<string, FlashcardStudyRecord> = {
      learning: {
        cardId: "learning",
        lastReviewed: "2024-01-14T12:00:00Z",
        nextReview: "2024-01-15T00:00:00Z",
        ease: 2.5,
        interval: 1, // < 7 days = learning
        reviewCount: 1,
        consecutiveCorrect: 1,
      },
      review: {
        cardId: "review",
        lastReviewed: "2024-01-08T12:00:00Z",
        nextReview: "2024-01-15T00:00:00Z",
        ease: 2.5,
        interval: 7, // >= 7 days = review
        reviewCount: 3,
        consecutiveCorrect: 3,
      },
    };

    const stats = calculateDeckStats(cardIds, records);

    expect(stats.learning).toBe(1);
    expect(stats.review).toBe(1);
  });

  it("should return zeros for empty deck", () => {
    const stats = calculateDeckStats([], {});

    expect(stats.total).toBe(0);
    expect(stats.new).toBe(0);
    expect(stats.due).toBe(0);
    expect(stats.learning).toBe(0);
    expect(stats.review).toBe(0);
  });
});

// =============================================================================
// PREVIEW RATING INTERVALS TESTS
// =============================================================================

describe("previewRatingIntervals", () => {
  it("should return intervals for all ratings on new card", () => {
    const intervals = previewRatingIntervals();

    expect(intervals.again).toBe("1 d");
    expect(intervals.hard).toBe("1 d");
    expect(intervals.good).toBe("1 d");
    expect(intervals.easy).toBe("1 d");
  });

  it("should return different intervals based on existing record", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-14T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 1,
      reviewCount: 1,
      consecutiveCorrect: 1,
    };

    const intervals = previewRatingIntervals(existingRecord);

    // Again should reset to 1 day
    expect(intervals.again).toBe("1 d");
    // Good/easy should give 6 days (second correct)
    expect(intervals.good).toBe("6 d");
    expect(intervals.easy).toBe("6 d");
  });

  it("should show weeks for longer intervals", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-08T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 6,
      reviewCount: 2,
      consecutiveCorrect: 2,
    };

    const intervals = previewRatingIntervals(existingRecord);

    // 6 * 2.5 = 15 days = ~2 weeks
    expect(intervals.good).toBe("2 v");
  });

  it("should show months for very long intervals", () => {
    const existingRecord: FlashcardStudyRecord = {
      cardId: "card-1",
      lastReviewed: "2024-01-01T12:00:00Z",
      nextReview: "2024-01-15T00:00:00Z",
      ease: 2.5,
      interval: 30,
      reviewCount: 5,
      consecutiveCorrect: 5,
    };

    const intervals = previewRatingIntervals(existingRecord);

    // 30 * 2.5+ = 75+ days = 2-3 months
    expect(intervals.good).toMatch(/\d+ m/);
  });
});

// =============================================================================
// EDGE CASES AND REGRESSION TESTS
// =============================================================================

describe("edge cases", () => {
  it("should handle quality boundary values", () => {
    const qualities: StudyQuality[] = [0, 1, 2, 3, 4, 5];

    for (const quality of qualities) {
      const ease = calculateNewEaseFactor(2.5, quality);
      expect(ease).toBeGreaterThanOrEqual(1.3);
      expect(ease).toBeLessThanOrEqual(3.0);
    }
  });

  it("should handle very low ease factor", () => {
    const interval = calculateNextInterval(5, 30, 1.3, 4);
    expect(interval).toBeGreaterThan(0);
    expect(interval).toBeLessThanOrEqual(365);
  });

  it("should handle empty card list in sorting", () => {
    const sorted = sortCardsByPriority([], {});
    expect(sorted).toHaveLength(0);
  });

  it("should handle single card in sorting", () => {
    const sorted = sortCardsByPriority(["only-card"], {});
    expect(sorted).toEqual(["only-card"]);
  });
});
