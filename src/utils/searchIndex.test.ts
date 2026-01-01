import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  highlightQuery,
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  isSearchIndexReady,
  getSearchChapters,
} from "./searchIndex";

// =============================================================================
// SETUP
// =============================================================================

describe("searchIndex", () => {
  // Store localStorage data
  let mockStorage: Map<string, string>;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    // Create fresh storage for each test
    mockStorage = new Map();

    // Create mock localStorage object
    mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
      key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
      get length() {
        return mockStorage.size;
      },
    };

    // Replace global localStorage
    vi.stubGlobal("localStorage", mockLocalStorage);

    // Mock Date for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ===========================================================================
  // HIGHLIGHT QUERY TESTS
  // ===========================================================================

  describe("highlightQuery", () => {
    it("should highlight a single word", () => {
      const result = highlightQuery("This is a test string", "test");
      expect(result).toContain("<mark");
      expect(result).toContain("test");
      expect(result).toContain("</mark>");
    });

    it("should be case-insensitive", () => {
      const result = highlightQuery("This is a TEST string", "test");
      expect(result).toContain("<mark");
      expect(result).toContain("TEST");
    });

    it("should highlight multiple occurrences", () => {
      const result = highlightQuery("test one test two test", "test");
      const matches = result.match(/<mark/g);
      expect(matches).toHaveLength(3);
    });

    it("should return original text when query is empty", () => {
      const text = "This is a test string";
      const result = highlightQuery(text, "");
      expect(result).toBe(text);
    });

    it("should return original text when query is whitespace only", () => {
      const text = "This is a test string";
      const result = highlightQuery(text, "   ");
      expect(result).toBe(text);
    });

    it("should escape special regex characters in query", () => {
      const result = highlightQuery("Price is $5.00", "$5.00");
      expect(result).toContain("<mark");
      expect(result).toContain("$5.00");
    });

    it("should handle query with parentheses", () => {
      const result = highlightQuery("Function call: foo()", "foo()");
      expect(result).toContain("<mark");
    });

    it("should handle query with brackets", () => {
      const result = highlightQuery("Array: [1, 2, 3]", "[1, 2, 3]");
      expect(result).toContain("<mark");
    });

    it("should preserve case of original text", () => {
      const result = highlightQuery("The Word appears here", "word");
      expect(result).toContain("Word");
      expect(result).not.toContain("word</mark>");
    });

    it("should handle Icelandic characters", () => {
      const result = highlightQuery("Þetta er efnafræði", "efnafræði");
      expect(result).toContain("<mark");
      expect(result).toContain("efnafræði");
    });

    it("should include proper CSS classes in the mark tag", () => {
      const result = highlightQuery("test string", "test");
      expect(result).toContain("bg-yellow-200");
      expect(result).toContain("dark:bg-yellow-900/50");
      expect(result).toContain("rounded");
    });

    it("should handle query at start of text", () => {
      const result = highlightQuery("test at the start", "test");
      expect(result).toMatch(/^<mark/);
    });

    it("should handle query at end of text", () => {
      const result = highlightQuery("at the end test", "test");
      expect(result).toMatch(/test<\/mark>$/);
    });
  });

  // ===========================================================================
  // SEARCH HISTORY - getSearchHistory TESTS
  // ===========================================================================

  describe("getSearchHistory", () => {
    it("should return empty array when no history exists", () => {
      const history = getSearchHistory();
      expect(history).toEqual([]);
    });

    it("should return stored history items", () => {
      const storedHistory = [
        { query: "efnafræði", timestamp: "2024-01-15T10:00:00Z", resultCount: 5 },
        { query: "átóm", timestamp: "2024-01-15T09:00:00Z", resultCount: 3 },
      ];
      mockStorage.set(
        "efnafraedi-search-history",
        JSON.stringify(storedHistory),
      );

      const history = getSearchHistory();
      expect(history).toEqual(storedHistory);
    });

    it("should return empty array on invalid JSON", () => {
      mockStorage.set("efnafraedi-search-history", "invalid json{{{");

      const history = getSearchHistory();
      expect(history).toEqual([]);
    });
  });

  // ===========================================================================
  // SEARCH HISTORY - addToSearchHistory TESTS
  // ===========================================================================

  describe("addToSearchHistory", () => {
    it("should add a new search item", () => {
      addToSearchHistory("efnafræði", 10);

      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("efnafræði");
      expect(history[0].resultCount).toBe(10);
      expect(history[0].timestamp).toBe("2024-01-15T12:00:00.000Z");
    });

    it("should add new items at the beginning", () => {
      addToSearchHistory("first", 1);
      vi.setSystemTime(new Date("2024-01-15T13:00:00Z"));
      addToSearchHistory("second", 2);

      const history = getSearchHistory();
      expect(history[0].query).toBe("second");
      expect(history[1].query).toBe("first");
    });

    it("should remove duplicate queries (case-insensitive)", () => {
      addToSearchHistory("efnafræði", 5);
      vi.setSystemTime(new Date("2024-01-15T13:00:00Z"));
      addToSearchHistory("Efnafræði", 10);

      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("Efnafræði");
      expect(history[0].resultCount).toBe(10);
    });

    it("should trim whitespace from query", () => {
      addToSearchHistory("  efnafræði  ", 5);

      const history = getSearchHistory();
      expect(history[0].query).toBe("efnafræði");
    });

    it("should not add empty queries", () => {
      addToSearchHistory("", 0);

      const history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it("should not add whitespace-only queries", () => {
      addToSearchHistory("   ", 0);

      const history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it("should not add queries shorter than 2 characters", () => {
      addToSearchHistory("a", 1);

      const history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it("should limit history to 10 items", () => {
      // Add 12 items
      for (let i = 0; i < 12; i++) {
        vi.setSystemTime(new Date(`2024-01-15T${10 + i}:00:00Z`));
        addToSearchHistory(`query${i}`, i);
      }

      const history = getSearchHistory();
      expect(history).toHaveLength(10);
      // Most recent should be first
      expect(history[0].query).toBe("query11");
      // Oldest should be last
      expect(history[9].query).toBe("query2");
    });

    it("should update timestamp when adding duplicate", () => {
      addToSearchHistory("test", 5);
      vi.setSystemTime(new Date("2024-01-15T15:00:00Z"));
      addToSearchHistory("test", 10);

      const history = getSearchHistory();
      expect(history[0].timestamp).toBe("2024-01-15T15:00:00.000Z");
    });
  });

  // ===========================================================================
  // SEARCH HISTORY - clearSearchHistory TESTS
  // ===========================================================================

  describe("clearSearchHistory", () => {
    it("should clear all history items", () => {
      addToSearchHistory("query1", 5);
      addToSearchHistory("query2", 10);

      clearSearchHistory();

      const history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it("should work when history is empty", () => {
      // Should not throw
      expect(() => clearSearchHistory()).not.toThrow();
    });
  });

  // ===========================================================================
  // SEARCH HISTORY - removeFromSearchHistory TESTS
  // ===========================================================================

  describe("removeFromSearchHistory", () => {
    it("should remove a specific item by query", () => {
      addToSearchHistory("query1", 5);
      addToSearchHistory("query2", 10);
      addToSearchHistory("query3", 15);

      removeFromSearchHistory("query2");

      const history = getSearchHistory();
      expect(history).toHaveLength(2);
      expect(history.find((h) => h.query === "query2")).toBeUndefined();
    });

    it("should be case-insensitive when removing", () => {
      addToSearchHistory("TestQuery", 5);

      removeFromSearchHistory("testquery");

      const history = getSearchHistory();
      expect(history).toHaveLength(0);
    });

    it("should not affect other items when removing", () => {
      addToSearchHistory("query1", 5);
      addToSearchHistory("query2", 10);

      removeFromSearchHistory("query1");

      const history = getSearchHistory();
      expect(history).toHaveLength(1);
      expect(history[0].query).toBe("query2");
    });

    it("should work when item does not exist", () => {
      addToSearchHistory("existing", 5);

      expect(() => removeFromSearchHistory("nonexistent")).not.toThrow();

      const history = getSearchHistory();
      expect(history).toHaveLength(1);
    });
  });

  // ===========================================================================
  // SEARCH INDEX STATE TESTS
  // ===========================================================================

  describe("isSearchIndexReady", () => {
    it("should return false when index is not built", () => {
      // Reset the singleton - in a fresh state without documents
      expect(isSearchIndexReady()).toBe(false);
    });
  });

  describe("getSearchChapters", () => {
    it("should return empty array when index is not built", () => {
      const chapters = getSearchChapters();
      expect(chapters).toEqual([]);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle localStorage errors gracefully in getSearchHistory", () => {
      // Replace with error-throwing localStorage
      vi.stubGlobal("localStorage", {
        getItem: () => {
          throw new Error("Storage error");
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      });

      const history = getSearchHistory();
      expect(history).toEqual([]);
    });

    it("should handle localStorage errors gracefully in addToSearchHistory", () => {
      // Replace with error-throwing localStorage
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {
          throw new Error("Storage error");
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      });

      // Should not throw
      expect(() => addToSearchHistory("test", 5)).not.toThrow();
    });

    it("should handle localStorage errors gracefully in clearSearchHistory", () => {
      // Replace with error-throwing localStorage
      vi.stubGlobal("localStorage", {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {
          throw new Error("Storage error");
        },
        clear: () => {},
        key: () => null,
        length: 0,
      });

      // Should not throw
      expect(() => clearSearchHistory()).not.toThrow();
    });

    it("should handle localStorage errors gracefully in removeFromSearchHistory", () => {
      // Replace with error-throwing localStorage
      vi.stubGlobal("localStorage", {
        getItem: () => "[]",
        setItem: () => {
          throw new Error("Storage error");
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      });

      // Should not throw
      expect(() => removeFromSearchHistory("test")).not.toThrow();
    });

    it("should highlight query with pipe character", () => {
      const result = highlightQuery("x | y", "|");
      expect(result).toContain("<mark");
    });

    it("should highlight query with backslash", () => {
      const result = highlightQuery("path\\to\\file", "\\");
      expect(result).toContain("<mark");
    });

    it("should highlight query with asterisk", () => {
      const result = highlightQuery("multiply: 2 * 3", "*");
      expect(result).toContain("<mark");
    });

    it("should highlight query with plus", () => {
      const result = highlightQuery("add: 2 + 3", "+");
      expect(result).toContain("<mark");
    });

    it("should highlight query with question mark", () => {
      const result = highlightQuery("Is it true?", "?");
      expect(result).toContain("<mark");
    });

    it("should highlight query with caret", () => {
      const result = highlightQuery("2^3 = 8", "^");
      expect(result).toContain("<mark");
    });
  });

  // ===========================================================================
  // HISTORY ITEM STRUCTURE TESTS
  // ===========================================================================

  describe("SearchHistoryItem structure", () => {
    it("should have correct fields in history item", () => {
      addToSearchHistory("test query", 42);

      const history = getSearchHistory();
      expect(history[0]).toHaveProperty("query");
      expect(history[0]).toHaveProperty("timestamp");
      expect(history[0]).toHaveProperty("resultCount");
    });

    it("should store ISO timestamp", () => {
      addToSearchHistory("test", 5);

      const history = getSearchHistory();
      expect(history[0].timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      );
    });

    it("should preserve result count", () => {
      addToSearchHistory("zero results", 0);
      addToSearchHistory("many results", 999);

      const history = getSearchHistory();
      expect(history[0].resultCount).toBe(999);
      expect(history[1].resultCount).toBe(0);
    });
  });
});
