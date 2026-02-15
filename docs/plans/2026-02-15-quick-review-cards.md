# Quick Review Summary Cards — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/:bookSlug/yfirlit` page that extracts key-concept, definition, learning-objectives, and checkpoint blocks from chapter HTML and presents them as a scrollable card stack for exam review.

**Architecture:** New route page fetches `toc.json` for chapter/section list, then on chapter selection fetches section HTML files and parses content blocks with DOMParser. A pure extraction utility handles the parsing. The page is added to the sidebar under study tools.

**Tech Stack:** SvelteKit route, DOMParser for HTML block extraction, existing CSS content-block styles.

---

### Task 1: Block extraction utility

**Files:**

- Create: `src/lib/utils/reviewExtractor.ts`
- Create: `src/lib/utils/reviewExtractor.test.ts`

**Step 1: Write the test file**

```typescript
import { describe, it, expect } from "vitest";
import { extractReviewBlocks, type ReviewBlock } from "./reviewExtractor";

const sampleHtml = `
<article class="cnx-module">
<main>
  <div class="learning-objectives">
    <h2>Námsmarkmið</h2>
    <ul><li>Skilgreina atóm</li><li>Lýsa efnafræði</li></ul>
  </div>
  <div class="content-block key-concept">
    <div class="content-block-title">Lykilhugtak</div>
    <div class="content-block-content"><p>Atóm er smæsta eining efnis.</p></div>
  </div>
  <div class="content-block definition">
    <div class="content-block-title">Skilgreining</div>
    <div class="content-block-content"><p><strong>Sameind</strong>: tveggja eða fleiri atóma.</p></div>
  </div>
  <div class="content-block checkpoint">
    <div class="content-block-title">Eftirlitsatriði</div>
    <div class="content-block-content"><p>Hvaða eindir mynda atóm?</p></div>
  </div>
  <div class="content-block note">
    <div class="content-block-content"><p>This note should NOT be extracted.</p></div>
  </div>
</main>
</article>`;

describe("extractReviewBlocks", () => {
  it("should extract the four target block types", () => {
    const blocks = extractReviewBlocks(sampleHtml);
    expect(blocks).toHaveLength(4);
  });

  it("should identify block types correctly", () => {
    const blocks = extractReviewBlocks(sampleHtml);
    const types = blocks.map((b) => b.type);
    expect(types).toEqual([
      "learning-objectives",
      "key-concept",
      "definition",
      "checkpoint",
    ]);
  });

  it("should preserve HTML content of each block", () => {
    const blocks = extractReviewBlocks(sampleHtml);
    const keyConcept = blocks.find((b) => b.type === "key-concept")!;
    expect(keyConcept.html).toContain("Atóm er smæsta eining efnis");
  });

  it("should not extract note blocks", () => {
    const blocks = extractReviewBlocks(sampleHtml);
    const types = blocks.map((b) => b.type);
    expect(types).not.toContain("note");
  });

  it("should return empty array for HTML with no matching blocks", () => {
    const blocks = extractReviewBlocks(
      "<article><main><p>Just text</p></main></article>",
    );
    expect(blocks).toEqual([]);
  });

  it("should return empty array for empty string", () => {
    const blocks = extractReviewBlocks("");
    expect(blocks).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/utils/reviewExtractor.test.ts`
Expected: FAIL — module not found

**Step 3: Write the extraction utility**

```typescript
/**
 * Extracts review-worthy content blocks from section HTML.
 * Used by the Quick Review (yfirlit) page.
 */

export type ReviewBlockType =
  | "key-concept"
  | "definition"
  | "learning-objectives"
  | "checkpoint";

export interface ReviewBlock {
  type: ReviewBlockType;
  html: string;
}

const BLOCK_SELECTORS: { selector: string; type: ReviewBlockType }[] = [
  { selector: ".learning-objectives", type: "learning-objectives" },
  { selector: ".content-block.key-concept", type: "key-concept" },
  { selector: ".content-block.definition", type: "definition" },
  { selector: ".content-block.checkpoint", type: "checkpoint" },
];

export function extractReviewBlocks(html: string): ReviewBlock[] {
  if (!html) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: ReviewBlock[] = [];

  for (const { selector, type } of BLOCK_SELECTORS) {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      blocks.push({ type, html: el.outerHTML });
    }
  }

  return blocks;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/utils/reviewExtractor.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```
git add src/lib/utils/reviewExtractor.ts src/lib/utils/reviewExtractor.test.ts
git commit -m "feat(review): add block extraction utility for Quick Review page"
```

---

### Task 2: Review page route

**Files:**

- Create: `src/routes/[bookSlug]/yfirlit/+page.svelte`

**Depends on:** Task 1 (extractReviewBlocks utility)

**Step 1: Create the page component**

Key patterns to follow (from `ordabok/+page.svelte`):

- `export let data: PageData` — receives `bookSlug` and `book` from parent layout
- `onMount` for client-side data fetching
- Skeleton loading states
- `svelte:head` for page title

The page should:

1. Load `toc.json` via `loadTableOfContents(data.bookSlug)` on mount
2. Show chapter picker chips (horizontal scrollable row)
3. On chapter selection, fetch all section HTML files for that chapter
4. Parse each section's HTML with `extractReviewBlocks()`
5. Render cards grouped by section

Section HTML files live at `/content/{bookSlug}/chapters/{chapterFolder}/{sectionFile}` — use `getChapterFolder(chapter)` from contentLoader.

```svelte
<!--
  Quick Review - Scrollable card stack of key concepts, definitions, and checkpoints
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageData } from './$types';
  import type { Chapter, Section, TableOfContents } from '$lib/types/content';
  import { loadTableOfContents, getChapterFolder } from '$lib/utils/contentLoader';
  import { extractReviewBlocks, type ReviewBlock } from '$lib/utils/reviewExtractor';
  import Skeleton from '$lib/components/Skeleton.svelte';

  export let data: PageData;

  let toc: TableOfContents | null = null;
  let loading = true;
  let loadingBlocks = false;
  let error: string | null = null;
  let selectedChapter: number | null = null;

  interface SectionBlocks {
    chapter: Chapter;
    section: Section;
    blocks: ReviewBlock[];
  }

  let sectionBlocks: SectionBlocks[] = [];
  let totalBlockCount = 0;

  onMount(async () => {
    try {
      toc = await loadTableOfContents(data.bookSlug);
    } catch (e) {
      error = 'Gat ekki hlaðið efnisyfirliti';
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function selectChapter(chapterNum: number | null) {
    selectedChapter = chapterNum;
    sectionBlocks = [];
    totalBlockCount = 0;
    if (!toc) return;

    const chapters = chapterNum === null
      ? toc.chapters
      : toc.chapters.filter((c) => c.number === chapterNum);

    loadingBlocks = true;
    try {
      for (const chapter of chapters) {
        const folder = getChapterFolder(chapter);
        for (const section of chapter.sections) {
          const url = `/content/${data.bookSlug}/chapters/${folder}/${section.file}`;
          try {
            const resp = await fetch(url);
            if (!resp.ok) continue;
            const html = await resp.text();
            const blocks = extractReviewBlocks(html);
            if (blocks.length > 0) {
              sectionBlocks = [...sectionBlocks, { chapter, section, blocks }];
              totalBlockCount += blocks.length;
            }
          } catch {
            // Skip sections that fail to load
          }
        }
      }
    } finally {
      loadingBlocks = false;
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    'key-concept': 'Lykilhugtak',
    'definition': 'Skilgreining',
    'learning-objectives': 'Námsmarkmið',
    'checkpoint': 'Eftirlitsatriði'
  };

  const TYPE_COLORS: Record<string, string> = {
    'key-concept': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    'definition': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'learning-objectives': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    'checkpoint': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };
</script>

<svelte:head>
  <title>Yfirlit | {data.book?.title ?? 'Bók'}</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
    Yfirlit
  </h1>
  <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
    Lykilhugtök, skilgreiningar og eftirlitsatriði úr kaflanum &mdash; tilvalið til yfirlestrar.
  </p>

  {#if loading}
    <Skeleton variant="content" />
  {:else if error}
    <p class="text-red-600 dark:text-red-400">{error}</p>
  {:else if toc}
    <!-- Chapter picker -->
    <div class="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin" role="tablist" aria-label="Veldu kafla">
      <button
        role="tab"
        aria-selected={selectedChapter === null && sectionBlocks.length > 0}
        class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors
          {selectedChapter === null && sectionBlocks.length > 0
            ? 'bg-[var(--accent-color)] text-white border-transparent'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}"
        on:click={() => selectChapter(null)}
      >
        Allir kaflar
      </button>
      {#each toc.chapters as chapter}
        <button
          role="tab"
          aria-selected={selectedChapter === chapter.number}
          class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors
            {selectedChapter === chapter.number
              ? 'bg-[var(--accent-color)] text-white border-transparent'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}"
          on:click={() => selectChapter(chapter.number)}
        >
          {chapter.number}. {chapter.title}
        </button>
      {/each}
    </div>

    <!-- Loading state -->
    {#if loadingBlocks}
      <div class="space-y-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    {:else if sectionBlocks.length > 0}
      <!-- Results count -->
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {totalBlockCount} {totalBlockCount === 1 ? 'atriði' : 'atriði'} fundust
      </p>

      <!-- Card stack -->
      <div class="space-y-6">
        {#each sectionBlocks as { chapter, section, blocks }}
          <!-- Section group -->
          <div>
            <a
              href="/{data.bookSlug}/kafli/{getChapterFolder(chapter)}/{section.file.replace(/\.(html|md)$/, '')}"
              class="inline-block text-xs text-gray-400 dark:text-gray-500 hover:text-[var(--accent-color)] mb-2 transition-colors"
            >
              Kafli {chapter.number} &rsaquo; {section.number || 'Inngangur'} {section.title}
            </a>

            <div class="space-y-3">
              {#each blocks as block}
                <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
                  <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium mb-3 {TYPE_COLORS[block.type] ?? ''}">
                    {TYPE_LABELS[block.type] ?? block.type}
                  </span>
                  <div class="review-block-content reading-content">
                    {@html block.html}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else if selectedChapter !== null || sectionBlocks.length === 0}
      <!-- Prompt / empty state -->
      <div class="text-center py-12 text-gray-400 dark:text-gray-500">
        {#if selectedChapter === null && totalBlockCount === 0 && !loadingBlocks}
          <p class="text-lg mb-2">Veldu kafla til að byrja</p>
          <p class="text-sm">Smelltu á kafla hér að ofan til að sjá lykilhugtök og skilgreiningar.</p>
        {:else}
          <p>Engin lykilatriði fundust í þessum kafla.</p>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Reset nested content-block styling so cards don't double-border */
  .review-block-content :global(.content-block) {
    border: none;
    box-shadow: none;
    padding: 0;
    margin: 0;
    background: transparent;
  }

  .review-block-content :global(.content-block-title) {
    display: none;
  }

  .review-block-content :global(.learning-objectives) {
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
  }

  .review-block-content :global(.learning-objectives h2) {
    display: none;
  }
</style>
```

**Step 2: Verify the page loads**

Run: `npm run check`
Expected: No new errors

**Step 3: Commit**

```
git add src/routes/\[bookSlug\]/yfirlit/+page.svelte
git commit -m "feat(review): add Quick Review page at /:bookSlug/yfirlit"
```

---

### Task 3: Sidebar link

**Files:**

- Modify: `src/lib/components/layout/Sidebar.svelte` (study tools section, ~line 338)

**Step 1: Add the link**

Add after the existing "Námslota" link (or in alphabetical position among the study tools), following the exact same pattern:

```svelte
<a
    href="/{bookSlug}/yfirlit"
    class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
    <span class="text-sm">Yfirlit</span>
</a>
```

Icon: clipboard-list (summarizes the "study guide" concept).

**Step 2: Verify**

Run: `npm run check`
Expected: No new errors

**Step 3: Commit**

```
git add src/lib/components/layout/Sidebar.svelte
git commit -m "feat(review): add Quick Review link to sidebar"
```

---

### Task 4: Verification

**Step 1: Type check**

Run: `npm run check`
Expected: 0 new errors (only the 0 pre-existing)

**Step 2: All tests pass**

Run: `npm run test`
Expected: All tests pass (340 existing + 6 new = 346)

**Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to `/efnafraedi/yfirlit`
3. Verify chapter chips render
4. Click a chapter — cards should appear with colored badges
5. Click "Allir kaflar" — cards from all chapters
6. Check sidebar link works
7. Click a section breadcrumb — navigates to the source section

**Step 4: Final commit (if any fixups needed)**
