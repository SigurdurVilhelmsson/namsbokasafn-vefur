import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSectionKey,
  createStatsKey,
  createObjectiveKey,
  createChapterPrefix,
  calculateProgress,
  calculateProgressFromCounts,
  getCurrentTimestamp,
  getTodayDateString,
  getYesterdayDateString,
  filterByChapterPrefix,
  filterItemsByChapter,
  filterItemsBySection,
  generateId,
} from "./storeHelpers";
import type { CompletableItem } from "./storeHelpers";

// =============================================================================
// KEY GENERATION TESTS
// =============================================================================

describe("createSectionKey", () => {
  it("should create key from chapter and section slugs", () => {
    const key = createSectionKey("01-grunnhugmyndir", "1-1-efnafraedi");
    expect(key).toBe("01-grunnhugmyndir/1-1-efnafraedi");
  });

  it("should handle special characters in slugs", () => {
    const key = createSectionKey("chapter-with-dash", "section_with_underscore");
    expect(key).toBe("chapter-with-dash/section_with_underscore");
  });

  it("should handle empty strings", () => {
    const key = createSectionKey("", "");
    expect(key).toBe("/");
  });
});

describe("createStatsKey", () => {
  it("should create section key when both chapter and section provided", () => {
    const key = createStatsKey("01-grunnhugmyndir", "1-1-efnafraedi");
    expect(key).toBe("01-grunnhugmyndir/1-1-efnafraedi");
  });

  it("should return chapter slug when only chapter provided", () => {
    const key = createStatsKey("01-grunnhugmyndir");
    expect(key).toBe("01-grunnhugmyndir");
  });

  it("should return 'global' when neither provided", () => {
    const key = createStatsKey();
    expect(key).toBe("global");
  });

  it("should return 'global' when both are undefined", () => {
    const key = createStatsKey(undefined, undefined);
    expect(key).toBe("global");
  });

  it("should return chapter when section is undefined", () => {
    const key = createStatsKey("chapter-1", undefined);
    expect(key).toBe("chapter-1");
  });

  it("should return 'global' when chapter is undefined but section is provided", () => {
    // Edge case: section without chapter should return "global"
    const key = createStatsKey(undefined, "section-1");
    expect(key).toBe("global");
  });
});

describe("createObjectiveKey", () => {
  it("should create key with chapter, section, and index", () => {
    const key = createObjectiveKey("01-grunnhugmyndir", "1-1-efnafraedi", 0);
    expect(key).toBe("01-grunnhugmyndir/1-1-efnafraedi/0");
  });

  it("should handle different index values", () => {
    const key = createObjectiveKey("chapter", "section", 42);
    expect(key).toBe("chapter/section/42");
  });

  it("should handle negative index", () => {
    const key = createObjectiveKey("chapter", "section", -1);
    expect(key).toBe("chapter/section/-1");
  });
});

describe("createChapterPrefix", () => {
  it("should create prefix with trailing slash", () => {
    const prefix = createChapterPrefix("01-grunnhugmyndir");
    expect(prefix).toBe("01-grunnhugmyndir/");
  });

  it("should handle empty string", () => {
    const prefix = createChapterPrefix("");
    expect(prefix).toBe("/");
  });
});

// =============================================================================
// PROGRESS CALCULATION TESTS
// =============================================================================

describe("calculateProgress", () => {
  it("should calculate progress for completed items", () => {
    const items: CompletableItem[] = [
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: false },
      { isCompleted: false },
    ];

    const result = calculateProgress(items);

    expect(result.total).toBe(4);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it("should return 100% when all items completed", () => {
    const items: CompletableItem[] = [
      { isCompleted: true },
      { isCompleted: true },
      { isCompleted: true },
    ];

    const result = calculateProgress(items);

    expect(result.percentage).toBe(100);
  });

  it("should return 0% when no items completed", () => {
    const items: CompletableItem[] = [
      { isCompleted: false },
      { isCompleted: false },
    ];

    const result = calculateProgress(items);

    expect(result.percentage).toBe(0);
  });

  it("should return 0% for empty array", () => {
    const result = calculateProgress([]);

    expect(result.total).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("should round percentage correctly", () => {
    const items: CompletableItem[] = [
      { isCompleted: true },
      { isCompleted: false },
      { isCompleted: false },
    ];

    const result = calculateProgress(items);

    expect(result.percentage).toBe(33); // 1/3 = 33.33% rounded to 33%
  });
});

describe("calculateProgressFromCounts", () => {
  it("should calculate progress from counts", () => {
    const result = calculateProgressFromCounts(5, 10);

    expect(result.total).toBe(10);
    expect(result.completed).toBe(5);
    expect(result.percentage).toBe(50);
  });

  it("should return 100% when completed equals total", () => {
    const result = calculateProgressFromCounts(10, 10);

    expect(result.percentage).toBe(100);
  });

  it("should return 0% when completed is 0", () => {
    const result = calculateProgressFromCounts(0, 10);

    expect(result.percentage).toBe(0);
  });

  it("should return 0% when total is 0", () => {
    const result = calculateProgressFromCounts(0, 0);

    expect(result.percentage).toBe(0);
  });

  it("should round percentage correctly", () => {
    const result = calculateProgressFromCounts(2, 3);

    expect(result.percentage).toBe(67); // 2/3 = 66.67% rounded to 67%
  });

  it("should handle completed greater than total", () => {
    // Edge case: shouldn't happen in practice but should handle gracefully
    const result = calculateProgressFromCounts(15, 10);

    expect(result.percentage).toBe(150);
  });
});

// =============================================================================
// DATE UTILITIES TESTS
// =============================================================================

describe("getCurrentTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:30:45.123Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return current timestamp as ISO string", () => {
    const timestamp = getCurrentTimestamp();

    expect(timestamp).toBe("2024-01-15T12:30:45.123Z");
  });

  it("should return valid ISO format", () => {
    const timestamp = getCurrentTimestamp();

    // Should be parseable as a date
    const date = new Date(timestamp);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe("getTodayDateString", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return today's date as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date("2024-01-15T12:30:45.123Z"));

    const dateString = getTodayDateString();

    expect(dateString).toBe("2024-01-15");
  });

  it("should handle different dates", () => {
    vi.setSystemTime(new Date("2023-12-31T23:59:59.999Z"));

    const dateString = getTodayDateString();

    expect(dateString).toBe("2023-12-31");
  });

  it("should handle single digit months and days", () => {
    vi.setSystemTime(new Date("2024-03-05T10:00:00.000Z"));

    const dateString = getTodayDateString();

    expect(dateString).toBe("2024-03-05");
  });
});

describe("getYesterdayDateString", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return yesterday's date as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date("2024-01-15T12:30:45.123Z"));

    const dateString = getYesterdayDateString();

    expect(dateString).toBe("2024-01-14");
  });

  it("should handle month boundaries", () => {
    vi.setSystemTime(new Date("2024-02-01T12:00:00.000Z"));

    const dateString = getYesterdayDateString();

    expect(dateString).toBe("2024-01-31");
  });

  it("should handle year boundaries", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));

    const dateString = getYesterdayDateString();

    expect(dateString).toBe("2023-12-31");
  });

  it("should handle leap year", () => {
    vi.setSystemTime(new Date("2024-03-01T12:00:00.000Z"));

    const dateString = getYesterdayDateString();

    expect(dateString).toBe("2024-02-29"); // 2024 is a leap year
  });
});

// =============================================================================
// FILTERING UTILITIES TESTS
// =============================================================================

describe("filterByChapterPrefix", () => {
  it("should filter record entries by chapter prefix", () => {
    const record = {
      "chapter-1/section-1": { value: 1 },
      "chapter-1/section-2": { value: 2 },
      "chapter-2/section-1": { value: 3 },
      "global": { value: 4 },
    };

    const filtered = filterByChapterPrefix(record, "chapter-1");

    expect(filtered).toHaveLength(2);
    expect(filtered[0][0]).toBe("chapter-1/section-1");
    expect(filtered[1][0]).toBe("chapter-1/section-2");
  });

  it("should return empty array when no matches", () => {
    const record = {
      "chapter-1/section-1": { value: 1 },
    };

    const filtered = filterByChapterPrefix(record, "chapter-99");

    expect(filtered).toHaveLength(0);
  });

  it("should handle empty record", () => {
    const filtered = filterByChapterPrefix({}, "chapter-1");

    expect(filtered).toHaveLength(0);
  });

  it("should not match partial prefixes", () => {
    const record = {
      "chapter-1/section-1": { value: 1 },
      "chapter-10/section-1": { value: 2 },
    };

    // "chapter-1/" should not match "chapter-10/"
    const filtered = filterByChapterPrefix(record, "chapter-1");

    expect(filtered).toHaveLength(1);
    expect(filtered[0][0]).toBe("chapter-1/section-1");
  });
});

describe("filterItemsByChapter", () => {
  it("should filter items by chapter slug", () => {
    const items = [
      { chapterSlug: "chapter-1", name: "Item 1" },
      { chapterSlug: "chapter-1", name: "Item 2" },
      { chapterSlug: "chapter-2", name: "Item 3" },
    ];

    const filtered = filterItemsByChapter(items, "chapter-1");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.chapterSlug === "chapter-1")).toBe(true);
  });

  it("should return empty array when no matches", () => {
    const items = [{ chapterSlug: "chapter-1", name: "Item 1" }];

    const filtered = filterItemsByChapter(items, "chapter-99");

    expect(filtered).toHaveLength(0);
  });

  it("should handle empty array", () => {
    const filtered = filterItemsByChapter([], "chapter-1");

    expect(filtered).toHaveLength(0);
  });
});

describe("filterItemsBySection", () => {
  it("should filter items by chapter and section slugs", () => {
    const items = [
      { chapterSlug: "chapter-1", sectionSlug: "section-1", name: "Item 1" },
      { chapterSlug: "chapter-1", sectionSlug: "section-2", name: "Item 2" },
      { chapterSlug: "chapter-1", sectionSlug: "section-1", name: "Item 3" },
      { chapterSlug: "chapter-2", sectionSlug: "section-1", name: "Item 4" },
    ];

    const filtered = filterItemsBySection(items, "chapter-1", "section-1");

    expect(filtered).toHaveLength(2);
    expect(filtered[0].name).toBe("Item 1");
    expect(filtered[1].name).toBe("Item 3");
  });

  it("should return empty array when chapter doesn't match", () => {
    const items = [
      { chapterSlug: "chapter-1", sectionSlug: "section-1", name: "Item 1" },
    ];

    const filtered = filterItemsBySection(items, "chapter-99", "section-1");

    expect(filtered).toHaveLength(0);
  });

  it("should return empty array when section doesn't match", () => {
    const items = [
      { chapterSlug: "chapter-1", sectionSlug: "section-1", name: "Item 1" },
    ];

    const filtered = filterItemsBySection(items, "chapter-1", "section-99");

    expect(filtered).toHaveLength(0);
  });

  it("should handle empty array", () => {
    const filtered = filterItemsBySection([], "chapter-1", "section-1");

    expect(filtered).toHaveLength(0);
  });
});

// =============================================================================
// ID GENERATION TESTS
// =============================================================================

describe("generateId", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should generate a string ID", () => {
    const id = generateId();

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("should include timestamp", () => {
    const id = generateId();

    // ID starts with timestamp
    expect(id.startsWith("1705320000000")).toBe(true);
  });

  it("should have format timestamp-random", () => {
    const id = generateId();

    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });

  it("should generate unique IDs", () => {
    // Even with same timestamp, random part should differ
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    // With fake timers, timestamp is same, but random should differ
    // There's a tiny chance of collision, but 100 IDs should mostly be unique
    expect(ids.size).toBeGreaterThan(90);
  });
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe("integration", () => {
  it("should work together for typical store operations", () => {
    // Create keys
    const sectionKey = createSectionKey("01", "1-1");
    const objectiveKey = createObjectiveKey("01", "1-1", 2);
    const prefix = createChapterPrefix("01");

    expect(sectionKey).toBe("01/1-1");
    expect(objectiveKey).toBe("01/1-1/2");
    expect(objectiveKey.startsWith(prefix)).toBe(true);
  });

  it("should calculate progress correctly with filter and calculate", () => {
    const items = [
      { chapterSlug: "01", sectionSlug: "1-1", isCompleted: true },
      { chapterSlug: "01", sectionSlug: "1-1", isCompleted: false },
      { chapterSlug: "01", sectionSlug: "1-2", isCompleted: true },
      { chapterSlug: "02", sectionSlug: "2-1", isCompleted: true },
    ];

    // Filter by section and calculate progress
    const sectionItems = filterItemsBySection(items, "01", "1-1");
    const progress = calculateProgress(sectionItems);

    expect(progress.total).toBe(2);
    expect(progress.completed).toBe(1);
    expect(progress.percentage).toBe(50);
  });
});
