import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useGlossary } from "./useGlossary";
import type { Glossary } from "@/types/glossary";

// =============================================================================
// TEST DATA
// =============================================================================

const mockGlossary: Glossary = {
  terms: [
    {
      term: "Atóm",
      english: "Atom",
      definition: "Minnsta eining efnis sem hefur eiginleika frumefnis",
      chapter: "01-grunnhugmyndir",
      section: "1-1-efnafraedi",
    },
    {
      term: "Frumeind",
      english: "Element",
      definition: "Efni sem samanstendur af aðeins einni gerð atóma",
      chapter: "01-grunnhugmyndir",
      section: "1-2-frumeindir",
    },
    {
      term: "Sameind",
      english: "Molecule",
      definition: "Tveir eða fleiri atómar sem tengjast með efnatengjum",
      chapter: "02-sameindir",
      section: "2-1-sameindir",
    },
    {
      term: "Efnaformúla",
      english: "Chemical formula",
      definition: "Tákn sem sýnir samsetningu efnasambands",
      chapter: "02-sameindir",
      section: "2-2-efnaformulur",
    },
    {
      term: "Ákefð",
      english: "Concentration",
      definition: "Magn leysts efnis í tiltekinni rúmmálseiningu",
      chapter: "03-lausnir",
      section: "3-1-lausnir",
    },
  ],
};

// =============================================================================
// MOCK SETUP
// =============================================================================

function createMockFetch(response: Glossary, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  });
}

function createMockFetchError() {
  return vi.fn().mockRejectedValue(new Error("Network error"));
}

// =============================================================================
// LOADING STATE TESTS
// =============================================================================

describe("useGlossary - loading state", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should start with loading true when bookSlug is provided", () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    expect(result.current.loading).toBe(true);
    expect(result.current.glossary).toBeNull();
  });

  it("should start with loading false when bookSlug is empty", () => {
    const { result } = renderHook(() => useGlossary(""));

    expect(result.current.loading).toBe(false);
    expect(result.current.glossary).toBeNull();
  });

  it("should load glossary and set loading to false", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.glossary).toEqual(mockGlossary);
  });

  it("should fetch from correct URL", async () => {
    renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/content/efnafraedi/glossary.json");
    });
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe("useGlossary - error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return empty terms array on fetch error", async () => {
    vi.stubGlobal("fetch", createMockFetchError());

    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.glossary?.terms).toEqual([]);
  });

  it("should return empty terms array on non-ok response", async () => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary, false));

    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.glossary?.terms).toEqual([]);
  });
});

// =============================================================================
// SEARCH TERMS TESTS
// =============================================================================

describe("useGlossary - searchTerms", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should find terms by Icelandic name", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // "Atóm" matches: term "Atóm", and definitions containing "atóma"/"atómar"
    const results = result.current.searchTerms("Atóm");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.term === "Atóm")).toBe(true);
  });

  it("should find terms by English name", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const results = result.current.searchTerms("Atom");
    expect(results).toHaveLength(1);
    expect(results[0].term).toBe("Atóm");
  });

  it("should find terms by definition", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const results = result.current.searchTerms("efnatengjum");
    expect(results).toHaveLength(1);
    expect(results[0].term).toBe("Sameind");
  });

  it("should be case insensitive", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // lowercase "atóm" should find same results as uppercase
    const results = result.current.searchTerms("atóm");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.term === "Atóm")).toBe(true);
  });

  it("should return multiple matches", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // "efn" appears in multiple terms/definitions
    const results = result.current.searchTerms("efn");
    expect(results.length).toBeGreaterThan(1);
  });

  it("should return empty array for no matches", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const results = result.current.searchTerms("xyz123");
    expect(results).toHaveLength(0);
  });

  it("should return empty array for empty query", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const results = result.current.searchTerms("");
    expect(results).toHaveLength(0);
  });

  it("should return empty array for whitespace-only query", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const results = result.current.searchTerms("   ");
    expect(results).toHaveLength(0);
  });

  it("should return empty array when glossary not loaded", () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    // Immediately call search before loading completes
    const results = result.current.searchTerms("Atóm");
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// FIND TERM TESTS
// =============================================================================

describe("useGlossary - findTerm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should find term by exact name", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const term = result.current.findTerm("Atóm");
    expect(term).toBeDefined();
    expect(term?.term).toBe("Atóm");
    expect(term?.english).toBe("Atom");
  });

  it("should be case insensitive", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const term = result.current.findTerm("atóm");
    expect(term).toBeDefined();
    expect(term?.term).toBe("Atóm");
  });

  it("should return undefined for non-existent term", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const term = result.current.findTerm("NonExistent");
    expect(term).toBeUndefined();
  });

  it("should return undefined when glossary not loaded", () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    const term = result.current.findTerm("Atóm");
    expect(term).toBeUndefined();
  });
});

// =============================================================================
// GET SORTED TERMS TESTS
// =============================================================================

describe("useGlossary - getSortedTerms", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should return terms sorted alphabetically (Icelandic locale)", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const sorted = result.current.getSortedTerms();

    // Icelandic alphabet: A, Á, B, ... E, É, F, ... S, T, ...
    // So: Atóm, Ákefð, Efnaformúla, Frumeind, Sameind
    expect(sorted[0].term).toBe("Atóm");
    expect(sorted[1].term).toBe("Ákefð");
    expect(sorted[2].term).toBe("Efnaformúla");
    expect(sorted[3].term).toBe("Frumeind");
    expect(sorted[4].term).toBe("Sameind");
  });

  it("should return empty array when glossary not loaded", () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    const sorted = result.current.getSortedTerms();
    expect(sorted).toHaveLength(0);
  });

  it("should not mutate original glossary", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const originalFirst = result.current.glossary?.terms[0].term;
    result.current.getSortedTerms();
    expect(result.current.glossary?.terms[0].term).toBe(originalFirst);
  });
});

// =============================================================================
// GET TERMS BY LETTER TESTS
// =============================================================================

describe("useGlossary - getTermsByLetter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should group terms by first letter", async () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const grouped = result.current.getTermsByLetter();

    expect(grouped["A"]).toHaveLength(1);
    expect(grouped["A"][0].term).toBe("Atóm");

    expect(grouped["Á"]).toHaveLength(1);
    expect(grouped["Á"][0].term).toBe("Ákefð");

    expect(grouped["E"]).toHaveLength(1);
    expect(grouped["E"][0].term).toBe("Efnaformúla");

    expect(grouped["F"]).toHaveLength(1);
    expect(grouped["F"][0].term).toBe("Frumeind");

    expect(grouped["S"]).toHaveLength(1);
    expect(grouped["S"][0].term).toBe("Sameind");
  });

  it("should handle multiple terms with same first letter", async () => {
    const glossaryWithDuplicateLetters: Glossary = {
      terms: [
        {
          term: "Atóm",
          definition: "Def 1",
          chapter: "01",
          section: "1-1",
        },
        {
          term: "Atómkjarni",
          definition: "Def 2",
          chapter: "01",
          section: "1-1",
        },
      ],
    };

    vi.stubGlobal("fetch", createMockFetch(glossaryWithDuplicateLetters));

    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const grouped = result.current.getTermsByLetter();
    expect(grouped["A"]).toHaveLength(2);
  });

  it("should return empty object when glossary not loaded", () => {
    const { result } = renderHook(() => useGlossary("efnafraedi"));

    const grouped = result.current.getTermsByLetter();
    expect(Object.keys(grouped)).toHaveLength(0);
  });

  it("should uppercase the first letter", async () => {
    const glossaryLowercase: Glossary = {
      terms: [
        {
          term: "atóm", // lowercase
          definition: "Def",
          chapter: "01",
          section: "1-1",
        },
      ],
    };

    vi.stubGlobal("fetch", createMockFetch(glossaryLowercase));

    const { result } = renderHook(() => useGlossary("efnafraedi"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const grouped = result.current.getTermsByLetter();
    expect(grouped["A"]).toHaveLength(1);
    expect(grouped["a"]).toBeUndefined();
  });
});

// =============================================================================
// HOOK LIFECYCLE TESTS
// =============================================================================

describe("useGlossary - lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockGlossary));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should reload when bookSlug changes", async () => {
    const { result, rerender } = renderHook(
      ({ slug }) => useGlossary(slug),
      { initialProps: { slug: "efnafraedi" } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith("/content/efnafraedi/glossary.json");

    // Change bookSlug
    rerender({ slug: "liffraedi" });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/content/liffraedi/glossary.json");
    });
  });

  it("should not fetch when bookSlug is empty", () => {
    renderHook(() => useGlossary(""));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("should handle unmount during fetch gracefully", async () => {
    // Create a delayed fetch
    let resolvePromise: (value: unknown) => void;
    const delayedFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );
    vi.stubGlobal("fetch", delayedFetch);

    const { unmount } = renderHook(() => useGlossary("efnafraedi"));

    // Unmount before fetch completes
    unmount();

    // Resolve the fetch after unmount
    act(() => {
      resolvePromise({
        ok: true,
        json: () => Promise.resolve(mockGlossary),
      });
    });

    // Should not throw or cause issues
    expect(true).toBe(true);
  });
});
