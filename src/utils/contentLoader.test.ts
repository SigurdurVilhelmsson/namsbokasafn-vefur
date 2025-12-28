import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadTableOfContents,
  loadSectionContent,
  parseFrontmatter,
  findChapterBySlug,
  findSectionBySlug,
} from "./contentLoader";
import type { TableOfContents } from "@/types/content";

// =============================================================================
// TEST DATA
// =============================================================================

const mockTableOfContents: TableOfContents = {
  title: "Efnafræði",
  chapters: [
    {
      number: 1,
      title: "Grunnhugmyndir",
      slug: "01-grunnhugmyndir",
      sections: [
        {
          number: "1.1",
          title: "Efnafræði og efni",
          slug: "1-1-efnafraedi-og-efni",
          file: "1-1-efnafraedi-og-efni.md",
        },
        {
          number: "1.2",
          title: "Atóm og frumeindir",
          slug: "1-2-atom-og-frumeindir",
          file: "1-2-atom-og-frumeindir.md",
        },
      ],
    },
    {
      number: 2,
      title: "Atóm og sameindir",
      slug: "02-atom-og-sameindir",
      sections: [
        {
          number: "2.1",
          title: "Atómbygging",
          slug: "2-1-atombygging",
          file: "2-1-atombygging.md",
        },
      ],
    },
  ],
};

const mockMarkdownWithFrontmatter = `---
title: Efnafræði og efni
section: 1.1-intro
chapter: 1
objectives:
- Skilja hvað efnafræði er
- Þekkja mismunandi efni
---

# Efnafræði og efni

Þetta er innihald kaflans.

![Mynd](images/figure-1.png)
`;

const mockMarkdownWithoutFrontmatter = `# Kafli án frontmatter

Þetta er innihald.
`;

// =============================================================================
// MOCK SETUP
// =============================================================================

function createMockFetch(response: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(response as string),
  });
}

function createMockFetchError() {
  return vi.fn().mockRejectedValue(new Error("Network error"));
}

// =============================================================================
// PARSE FRONTMATTER TESTS
// =============================================================================

describe("parseFrontmatter", () => {
  it("should parse markdown with valid frontmatter", () => {
    const result = parseFrontmatter(mockMarkdownWithFrontmatter);

    expect(result.metadata.title).toBe("Efnafræði og efni");
    expect(result.metadata.section).toBe("1.1-intro");
    expect(result.metadata.chapter).toBe(1);
    expect(result.metadata.objectives).toEqual([
      "Skilja hvað efnafræði er",
      "Þekkja mismunandi efni",
    ]);
    expect(result.content).toContain("# Efnafræði og efni");
  });

  it("should return empty metadata for markdown without frontmatter", () => {
    const result = parseFrontmatter(mockMarkdownWithoutFrontmatter);

    expect(result.metadata).toEqual({});
    expect(result.content).toBe(mockMarkdownWithoutFrontmatter);
  });

  it("should parse numeric values as numbers", () => {
    const markdown = `---
chapter: 5
page: 42
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata.chapter).toBe(5);
    expect(result.metadata.page).toBe(42);
    expect(typeof result.metadata.chapter).toBe("number");
  });

  it("should keep string values that look like numbers with quotes", () => {
    const markdown = `---
section: "1.1"
version: "2.0"
---
Content`;

    const result = parseFrontmatter(markdown);

    // Note: The parser treats "1.1" as a string because of quotes
    expect(result.metadata.section).toBe('"1.1"');
  });

  it("should handle empty frontmatter", () => {
    // Note: The regex requires content between --- markers, so truly empty
    // frontmatter (---\n---) doesn't match. We need at least a blank line.
    const markdown = `---

---
Content here`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata).toEqual({});
    expect(result.content).toBe("Content here");
  });

  it("should handle frontmatter with only arrays", () => {
    const markdown = `---
tags:
- chemistry
- science
- education
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata.tags).toEqual(["chemistry", "science", "education"]);
  });

  it("should handle mixed simple values and arrays", () => {
    const markdown = `---
title: My Title
chapter: 3
keywords:
- word1
- word2
author: John
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata.title).toBe("My Title");
    expect(result.metadata.chapter).toBe(3);
    expect(result.metadata.keywords).toEqual(["word1", "word2"]);
    expect(result.metadata.author).toBe("John");
  });

  it("should handle empty lines in frontmatter", () => {
    const markdown = `---
title: Test

chapter: 1
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata.title).toBe("Test");
    expect(result.metadata.chapter).toBe(1);
  });

  it("should handle colons in values", () => {
    const markdown = `---
time: 10:30
url: https://example.com
---
Content`;

    const result = parseFrontmatter(markdown);

    expect(result.metadata.time).toBe("10:30");
    expect(result.metadata.url).toBe("https://example.com");
  });
});

// =============================================================================
// LOAD TABLE OF CONTENTS TESTS
// =============================================================================

describe("loadTableOfContents", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockTableOfContents));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should fetch and return table of contents", async () => {
    const result = await loadTableOfContents("efnafraedi");

    expect(fetch).toHaveBeenCalledWith("/content/efnafraedi/toc.json");
    expect(result).toEqual(mockTableOfContents);
  });

  it("should throw error when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      createMockFetch(null, false),
    );

    await expect(loadTableOfContents("efnafraedi")).rejects.toThrow(
      "Gat ekki hlaðið efnisyfirliti",
    );
  });

  it("should throw error on network failure", async () => {
    vi.stubGlobal("fetch", createMockFetchError());

    await expect(loadTableOfContents("efnafraedi")).rejects.toThrow();
  });

  it("should use correct path for different book slugs", async () => {
    await loadTableOfContents("liffraedi");

    expect(fetch).toHaveBeenCalledWith("/content/liffraedi/toc.json");
  });
});

// =============================================================================
// LOAD SECTION CONTENT TESTS
// =============================================================================

describe("loadSectionContent", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", createMockFetch(mockMarkdownWithFrontmatter));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should fetch and parse section content", async () => {
    const result = await loadSectionContent(
      "efnafraedi",
      "01-grunnhugmyndir",
      "1-1-section.md",
    );

    expect(fetch).toHaveBeenCalledWith(
      "/content/efnafraedi/chapters/01-grunnhugmyndir/1-1-section.md",
    );
    expect(result.title).toBe("Efnafræði og efni");
    expect(result.section).toBe("1.1-intro");
    expect(result.chapter).toBe(1);
    expect(result.objectives).toEqual([
      "Skilja hvað efnafræði er",
      "Þekkja mismunandi efni",
    ]);
  });

  it("should transform relative image paths to absolute paths", async () => {
    const result = await loadSectionContent(
      "efnafraedi",
      "01-grunnhugmyndir",
      "1-1-section.md",
    );

    expect(result.content).toContain(
      "![Mynd](/content/efnafraedi/chapters/01-grunnhugmyndir/images/figure-1.png)",
    );
    expect(result.content).not.toContain("![Mynd](images/");
  });

  it("should handle markdown without frontmatter", async () => {
    vi.stubGlobal("fetch", createMockFetch(mockMarkdownWithoutFrontmatter));

    const result = await loadSectionContent(
      "efnafraedi",
      "01-grunnhugmyndir",
      "1-1-section.md",
    );

    expect(result.title).toBe("");
    expect(result.section).toBe("");
    expect(result.chapter).toBe(0);
    expect(result.objectives).toEqual([]);
    expect(result.content).toContain("# Kafli án frontmatter");
  });

  it("should throw error when fetch fails", async () => {
    vi.stubGlobal("fetch", createMockFetch(null, false));

    await expect(
      loadSectionContent("efnafraedi", "01-grunnhugmyndir", "1-1-section.md"),
    ).rejects.toThrow("Gat ekki hlaðið kafla");
  });

  it("should handle multiple images in content", async () => {
    const markdownWithMultipleImages = `---
title: Test
chapter: 1
---

![First](images/first.png)

Some text

![Second](images/second.jpg)
`;
    vi.stubGlobal("fetch", createMockFetch(markdownWithMultipleImages));

    const result = await loadSectionContent(
      "efnafraedi",
      "chapter-1",
      "section.md",
    );

    expect(result.content).toContain(
      "![First](/content/efnafraedi/chapters/chapter-1/images/first.png)",
    );
    expect(result.content).toContain(
      "![Second](/content/efnafraedi/chapters/chapter-1/images/second.jpg)",
    );
  });

  it("should not transform external image URLs", async () => {
    const markdownWithExternalImage = `---
title: Test
chapter: 1
---

![External](https://example.com/image.png)
`;
    vi.stubGlobal("fetch", createMockFetch(markdownWithExternalImage));

    const result = await loadSectionContent(
      "efnafraedi",
      "chapter-1",
      "section.md",
    );

    expect(result.content).toContain("![External](https://example.com/image.png)");
  });
});

// =============================================================================
// FIND CHAPTER BY SLUG TESTS
// =============================================================================

describe("findChapterBySlug", () => {
  it("should find chapter by slug", () => {
    const chapter = findChapterBySlug(mockTableOfContents, "01-grunnhugmyndir");

    expect(chapter).toBeDefined();
    expect(chapter?.title).toBe("Grunnhugmyndir");
    expect(chapter?.number).toBe(1);
  });

  it("should return undefined for non-existent slug", () => {
    const chapter = findChapterBySlug(mockTableOfContents, "non-existent");

    expect(chapter).toBeUndefined();
  });

  it("should find second chapter", () => {
    const chapter = findChapterBySlug(mockTableOfContents, "02-atom-og-sameindir");

    expect(chapter).toBeDefined();
    expect(chapter?.title).toBe("Atóm og sameindir");
    expect(chapter?.number).toBe(2);
  });

  it("should handle empty chapters array", () => {
    const emptyToc: TableOfContents = {
      title: "Empty",
      chapters: [],
    };

    const chapter = findChapterBySlug(emptyToc, "any-slug");

    expect(chapter).toBeUndefined();
  });
});

// =============================================================================
// FIND SECTION BY SLUG TESTS
// =============================================================================

describe("findSectionBySlug", () => {
  it("should find section by chapter and section slugs", () => {
    const result = findSectionBySlug(
      mockTableOfContents,
      "01-grunnhugmyndir",
      "1-1-efnafraedi-og-efni",
    );

    expect(result).not.toBeNull();
    expect(result?.chapter.title).toBe("Grunnhugmyndir");
    expect(result?.section.title).toBe("Efnafræði og efni");
    expect(result?.section.number).toBe("1.1");
  });

  it("should return null for non-existent chapter", () => {
    const result = findSectionBySlug(
      mockTableOfContents,
      "non-existent",
      "1-1-efnafraedi-og-efni",
    );

    expect(result).toBeNull();
  });

  it("should return null for non-existent section", () => {
    const result = findSectionBySlug(
      mockTableOfContents,
      "01-grunnhugmyndir",
      "non-existent-section",
    );

    expect(result).toBeNull();
  });

  it("should find section in different chapter", () => {
    const result = findSectionBySlug(
      mockTableOfContents,
      "02-atom-og-sameindir",
      "2-1-atombygging",
    );

    expect(result).not.toBeNull();
    expect(result?.chapter.number).toBe(2);
    expect(result?.section.title).toBe("Atómbygging");
  });

  it("should find second section in chapter", () => {
    const result = findSectionBySlug(
      mockTableOfContents,
      "01-grunnhugmyndir",
      "1-2-atom-og-frumeindir",
    );

    expect(result).not.toBeNull();
    expect(result?.section.number).toBe("1.2");
    expect(result?.section.title).toBe("Atóm og frumeindir");
  });

  it("should handle chapter with no sections", () => {
    const tocWithEmptySections: TableOfContents = {
      title: "Test",
      chapters: [
        {
          number: 1,
          title: "Empty Chapter",
          slug: "empty-chapter",
          sections: [],
        },
      ],
    };

    const result = findSectionBySlug(
      tocWithEmptySections,
      "empty-chapter",
      "any-section",
    );

    expect(result).toBeNull();
  });
});

// =============================================================================
// EDGE CASES AND INTEGRATION TESTS
// =============================================================================

describe("edge cases", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should handle special characters in slugs", () => {
    const tocWithSpecialChars: TableOfContents = {
      title: "Test",
      chapters: [
        {
          number: 1,
          title: "Æ, Ð, Þ kafli",
          slug: "ae-d-th-kafli",
          sections: [
            {
              number: "1.1",
              title: "Íslenskt efni",
              slug: "1-1-islenskt-efni",
              file: "1-1-islenskt-efni.md",
            },
          ],
        },
      ],
    };

    const chapter = findChapterBySlug(tocWithSpecialChars, "ae-d-th-kafli");
    expect(chapter).toBeDefined();

    const section = findSectionBySlug(
      tocWithSpecialChars,
      "ae-d-th-kafli",
      "1-1-islenskt-efni",
    );
    expect(section).not.toBeNull();
  });

  it("should handle frontmatter with Icelandic characters", () => {
    const icelandicMarkdown = `---
title: Efnafræði í íslenskum skólum
section: "1.1"
chapter: 1
objectives:
- Læra um þyngd
- Skilja örðugleika
- Reikna með ákefð
---

# Innihald`;

    const result = parseFrontmatter(icelandicMarkdown);

    expect(result.metadata.title).toBe("Efnafræði í íslenskum skólum");
    expect(result.metadata.objectives).toHaveLength(3);
    expect((result.metadata.objectives as string[])[0]).toBe("Læra um þyngd");
  });

  it("should handle deeply nested image paths correctly", async () => {
    const markdown = `---
title: Test
chapter: 1
---
![Deep](images/subfolder/deep/image.png)
`;
    vi.stubGlobal("fetch", createMockFetch(markdown));

    const result = await loadSectionContent("book", "chapter", "section.md");

    // The regex only matches "images/" at the start, so subfolder paths work
    expect(result.content).toContain(
      "![Deep](/content/book/chapters/chapter/images/subfolder/deep/image.png)",
    );
  });
});
