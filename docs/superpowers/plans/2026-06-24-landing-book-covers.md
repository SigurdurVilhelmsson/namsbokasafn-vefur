# Landing-page Book Covers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain book tiles on the landing page with a cover-forward poster grid of procedural, branded book covers generated from book metadata.

**Architecture:** A pure `bookCover.ts` module holds the decorative motif registry and title-sizing logic (unit-tested). A presentational `BookCover.svelte` renders the cover from a book + subject key using those helpers. `src/routes/+page.svelte` composes `<BookCover>` + a caption strip in both book grids. The dead `coverImage` field and unused cover SVGs are removed.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest (jsdom), Tailwind v4 + `src/app.css` design tokens.

## Global Constraints

- Svelte 5 runes only: `$props()`, `$derived`. Callback props, no `createEventDispatcher`.
- Icelandic for all UI text; English for code/comments.
- Subject colors come from existing CSS vars `--subject-{key}` in `src/app.css`; **no new color tokens, no font changes.**
- Motif SVGs use `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` (decorative, `aria-hidden`).
- Test files are `*.test.ts` only (Vitest include excludes `.svelte`); component is verified via build + Playwright.
- Title is real HTML text (not SVG). Cover is pure CSS/inline-SVG — no image files, no network fetch.
- Verification gates (run from repo root): `npm run check` (0 errors/0 warnings), `npm run lint`, `npm run test`, `npm run build`.

---

## File Structure

- **Create** `src/lib/components/bookCover.ts` — motif registry (`COVER_MOTIFS`), `getCoverMotif(name)`, `coverTitleSize(title)`. Pure, testable.
- **Create** `src/lib/components/bookCover.test.ts` — unit tests for the above.
- **Create** `src/lib/components/BookCover.svelte` — presentational cover (gradient + motif + title + attribution).
- **Modify** `src/lib/types/book.ts` — add `coverMotif?: string` to `BookConfig` + each book; remove `coverImage` field + its 5 values.
- **Delete** `static/covers/efnafraedi-2e.svg`, `liffraedi-2e.svg`, `orverufraedi.svg`, `lifraen-efnafraedi.svg`, `edlisfraedi-2e.svg`.
- **Modify** `src/routes/+page.svelte` — swap `.book-card` markup in both grids for `<BookCover>` + caption strip; update `.book-grid` columns; delete tool-badge block and now-dead tile CSS (`.book-source`, `.external-icon`, `.book-tools`, `.tool-icon`, `.book-cta`).

---

### Task 1: Cover logic module (`bookCover.ts`)

**Files:**

- Create: `src/lib/components/bookCover.ts`
- Test: `src/lib/components/bookCover.test.ts`

**Interfaces:**

- Consumes: `IconNode` type from `./icons` (`type IconNode = [string, Record<string, string|number>][]`).
- Produces:
  - `COVER_MOTIFS: Record<string, IconNode>` — keys `atom, benzene, leaf, microbe, orbit, book`.
  - `getCoverMotif(name: string | undefined): IconNode` — returns the named motif, or `COVER_MOTIFS.book` for unknown/undefined.
  - `coverTitleSize(title: string): 'regular' | 'long'` — `'long'` when the longest whitespace-separated word has length > 10, else `'regular'`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/components/bookCover.test.ts
import { describe, it, expect } from "vitest";
import { COVER_MOTIFS, getCoverMotif, coverTitleSize } from "./bookCover";

describe("getCoverMotif", () => {
  it("returns the named motif", () => {
    expect(getCoverMotif("atom")).toBe(COVER_MOTIFS.atom);
  });
  it("falls back to book for an unknown name", () => {
    expect(getCoverMotif("definitely-not-a-motif")).toBe(COVER_MOTIFS.book);
  });
  it("falls back to book for undefined", () => {
    expect(getCoverMotif(undefined)).toBe(COVER_MOTIFS.book);
  });
});

describe("COVER_MOTIFS", () => {
  it("every motif has at least one svg child node", () => {
    for (const node of Object.values(COVER_MOTIFS)) {
      expect(node.length).toBeGreaterThan(0);
    }
  });
});

describe("coverTitleSize", () => {
  it("regular for a short single word", () => {
    expect(coverTitleSize("Efnafræði")).toBe("regular"); // 9 chars
  });
  it("long when a single word exceeds 10 chars", () => {
    expect(coverTitleSize("Örverufræði")).toBe("long"); // 11 chars
  });
  it("regular for a multi-word title whose words are each short", () => {
    expect(coverTitleSize("Lífræn efnafræði")).toBe("regular"); // longest word = 9
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/components/bookCover.test.ts`
Expected: FAIL — cannot resolve `./bookCover`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/components/bookCover.ts
/**
 * Decorative motifs and title sizing for procedural book covers (BookCover.svelte).
 * Motifs are LARGE decorative illustrations rendered as a low-opacity watermark —
 * a different role from the 16/20/24 UI icons in icons.ts, hence a separate registry.
 * Each motif is an IconNode: [tag, attrs] children of a viewBox="0 0 24 24" <svg>.
 */
import type { IconNode } from "./icons";

export const COVER_MOTIFS = {
  // Generic chemistry — atom
  atom: [
    ["circle", { cx: 12, cy: 12, r: 1 }],
    [
      "path",
      {
        d: "M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z",
      },
    ],
    [
      "path",
      {
        d: "M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z",
      },
    ],
  ],
  // Organic chemistry — benzene ring
  benzene: [
    ["path", { d: "M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" }],
    ["circle", { cx: 12, cy: 12, r: 5.5 }],
  ],
  // Biology — leaf
  leaf: [
    [
      "path",
      {
        d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
      },
    ],
    ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6" }],
  ],
  // Microbiology — cell / microbe
  microbe: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["circle", { cx: 10, cy: 10, r: 1.6 }],
    ["circle", { cx: 14.5, cy: 13, r: 1.2 }],
    ["circle", { cx: 11, cy: 15, r: 1 }],
    ["path", { d: "M12 2v2M12 20v2M2 12h2M20 12h2" }],
  ],
  // Physics — orbit
  orbit: [
    ["circle", { cx: 12, cy: 12, r: 2 }],
    ["ellipse", { cx: 12, cy: 12, rx: 10, ry: 4.5 }],
    [
      "ellipse",
      { cx: 12, cy: 12, rx: 10, ry: 4.5, transform: "rotate(60 12 12)" },
    ],
    [
      "ellipse",
      { cx: 12, cy: 12, rx: 10, ry: 4.5, transform: "rotate(120 12 12)" },
    ],
  ],
  // Neutral fallback — closed book
  book: [
    [
      "path",
      { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" },
    ],
  ],
} satisfies Record<string, IconNode>;

export function getCoverMotif(name: string | undefined): IconNode {
  return name && Object.prototype.hasOwnProperty.call(COVER_MOTIFS, name)
    ? COVER_MOTIFS[name as keyof typeof COVER_MOTIFS]
    : COVER_MOTIFS.book;
}

/**
 * Long Icelandic compounds (a single word > 10 chars, e.g. "Örverufræði") can't
 * wrap and crowd the cover edge; they get the smaller title step. Multi-word titles
 * wrap naturally and keep the regular size.
 */
export function coverTitleSize(title: string): "regular" | "long" {
  const longest = title.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  return longest > 10 ? "long" : "regular";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/components/bookCover.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/bookCover.ts src/lib/components/bookCover.test.ts
git commit -m "feat(covers): cover motif registry + title-size logic"
```

---

### Task 2: `BookCover.svelte` component

**Files:**

- Create: `src/lib/components/BookCover.svelte`

**Interfaces:**

- Consumes: `getCoverMotif`, `coverTitleSize` from `./bookCover`; `BookConfig` from `$lib/types/book`.
- Produces: `<BookCover {book} {subject} />` where `book: BookConfig` and `subject: string` is the subject-color key (e.g. `'chemistry'`). Renders the cover art only (no link, no caption).

- [ ] **Step 1: Write the component**

```svelte
<!-- src/lib/components/BookCover.svelte -->
<!--
  Procedural book cover (docs/superpowers/specs/2026-06-24-landing-book-covers-design.md).
  Self-contained: gradient from the subject color, a decorative motif watermark, the
  Icelandic title (real text), and the full source attribution. No image / network.
-->
<script lang="ts">
	import type { BookConfig } from '$lib/types/book';
	import { getCoverMotif, coverTitleSize } from './bookCover';

	interface Props {
		book: BookConfig;
		/** Subject-color key → CSS var --subject-{subject} (e.g. 'chemistry'). */
		subject: string;
	}
	let { book, subject }: Props = $props();

	const motif = $derived(getCoverMotif(book.coverMotif));
	const titleSize = $derived(coverTitleSize(book.title));
</script>

<div class="book-cover" style="--cover-c: var(--subject-{subject}, #6b7280)">
	<svg
		class="cover-motif"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		{#each motif as [tag, attrs], i (i)}
			<svelte:element this={tag} {...attrs} />
		{/each}
	</svg>
	<span class="cover-title" class:long={titleSize === 'long'}>{book.title}</span>
	<span class="cover-attr">OpenStax {book.source.title}</span>
</div>

<style>
	.book-cover {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: 7px;
		overflow: hidden;
		color: #fff;
		background: linear-gradient(150deg, var(--cover-c), color-mix(in srgb, var(--cover-c) 52%, #0b1f2a));
		box-shadow: var(--shadow-lg);
		font-family: 'Bricolage Grotesque', system-ui, sans-serif;
	}
	/* left-edge spine highlight */
	.book-cover::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 6px;
		background: linear-gradient(90deg, rgba(0, 0, 0, 0.3), rgba(255, 255, 255, 0.1) 60%, rgba(0, 0, 0, 0));
		z-index: 3;
	}
	.cover-motif {
		position: absolute;
		bottom: -36px;
		right: -36px;
		width: 160px;
		height: 160px;
		opacity: 0.2;
		color: #fff;
	}
	.cover-title {
		position: absolute;
		left: 15px;
		right: 13px;
		top: 20px;
		z-index: 2;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.05;
		font-size: 1.25rem;
		overflow-wrap: break-word;
	}
	.cover-title.long {
		font-size: 1.05rem;
	}
	.cover-attr {
		position: absolute;
		left: 15px;
		right: 13px;
		bottom: 14px;
		z-index: 2;
		font-size: 0.57rem;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.92);
	}
</style>
```

- [ ] **Step 2: Type-check (the component compiles + props line up)**

Run: `npm run check`
Expected: 0 errors, 0 warnings. (Note: `book.coverMotif` is added in Task 3 — if running Task 2 standalone before Task 3, `coverMotif` won't exist yet. Execute Task 3 immediately after, then run check. If you prefer, do Task 3 step 1 — the interface field — before this check.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/BookCover.svelte
git commit -m "feat(covers): BookCover.svelte presentational component"
```

---

### Task 3: Book config — add `coverMotif`, remove `coverImage`, delete cover SVGs

**Files:**

- Modify: `src/lib/types/book.ts`
- Delete: `static/covers/*.svg`

**Interfaces:**

- Produces: `BookConfig.coverMotif?: string`; each book has a `coverMotif` value. `coverImage` no longer exists.

- [ ] **Step 1: Confirm `coverImage` is dead before removing**

Run: `grep -rn "coverImage" src/ scripts/ static/ 2>/dev/null`
Expected: matches ONLY in `src/lib/types/book.ts`. If anything else references it (e.g. an `og:image`), stop and keep the field — re-scope this task. (At spec time, only `book.ts` referenced it.)

- [ ] **Step 2: Edit the interface** — in `src/lib/types/book.ts`, remove the `coverImage: string;` line from `interface BookConfig` and add:

```ts
	/** Decorative cover motif key (see bookCover.ts COVER_MOTIFS). Defaults to 'book'. */
	coverMotif?: string;
```

- [ ] **Step 3: Edit each book entry** — remove every `coverImage: '/covers/...svg',` line and add the matching `coverMotif`:

| slug                 | add line                 |
| -------------------- | ------------------------ |
| `efnafraedi-2e`      | `coverMotif: 'atom',`    |
| `liffraedi-2e`       | `coverMotif: 'leaf',`    |
| `orverufraedi`       | `coverMotif: 'microbe',` |
| `lifraen-efnafraedi` | `coverMotif: 'benzene',` |
| `edlisfraedi-2e`     | `coverMotif: 'orbit',`   |

- [ ] **Step 4: Delete the unused cover SVGs**

```bash
git rm static/covers/efnafraedi-2e.svg static/covers/liffraedi-2e.svg static/covers/orverufraedi.svg static/covers/lifraen-efnafraedi.svg static/covers/edlisfraedi-2e.svg
```

- [ ] **Step 5: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings (BookCover now resolves `book.coverMotif`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/book.ts
git commit -m "feat(covers): add coverMotif per book; drop dead coverImage + unused SVGs"
```

---

### Task 4: Swap the landing-page grids to covers

**Files:**

- Modify: `src/routes/+page.svelte`

**Interfaces:**

- Consumes: `BookCover` from `$lib/components/BookCover.svelte`; existing `subjectIcons` map (subject-color key per slug); existing `translationBooks`, `sampleBooks`, `percentage` logic.

- [ ] **Step 1: Import BookCover** — add to the `<script>` imports in `src/routes/+page.svelte`:

```ts
import BookCover from "$lib/components/BookCover.svelte";
```

- [ ] **Step 2: Replace the Tier-1 translations card body.** Find the `{#each translationBooks ...}` block. Replace the inner `<a href="/{book.slug}" class="book-link"> … </a>` (the status badge, `<h3 class="book-title">`, `<p class="book-source">…</p>`, the `{#if book.stats}` progress block, the `{#if book.features}` tool-badge block, and the `<div class="book-cta">`) with:

```svelte
          <a href="/{book.slug}" class="book-link">
            <BookCover {book} {subject} />
            <div class="book-caption">
              <h3 class="book-name">{book.title}</h3>
              {#if book.stats}
                <div class="progress-track">
                  <div class="progress-fill" style="width: {percentage}%"></div>
                </div>
              {/if}
              <div class="caption-row">
                <span class="caption-meta">
                  {#if book.stats}{book.stats.translatedChapters}/{book.stats.totalChapters} kaflar{/if}
                </span>
                <span
                  class="book-status"
                  class:status-available={book.status === 'available'}
                  class:status-in-progress={book.status === 'in-progress'}
                >
                  {book.status === 'available' ? 'Í boði' : 'Í vinnslu'}
                </span>
              </div>
            </div>
          </a>
```

- [ ] **Step 3: Replace the Tier-2 samples card body.** In the `{#each sampleBooks ...}` block, replace its inner `<a class="book-link"> … </a>` (status badge, title, source, `book-preview-info`, cta) with:

```svelte
            <a href="/{book.slug}" class="book-link">
              <BookCover {book} {subject} />
              <div class="book-caption">
                <h3 class="book-name">{book.title}</h3>
                <div class="caption-row">
                  <span class="caption-meta">{book.stats?.translatedChapters ?? 1} kafli í forskoðun</span>
                  <span class="book-status status-preview">Forskoðun</span>
                </div>
              </div>
            </a>
```

- [ ] **Step 4: Update grid + add caption CSS, remove dead tile CSS.** In the `<style>` block:

Replace the `.book-grid` rule and its `@media (min-width: 640px)` override with a poster grid:

```css
.book-grid {
  max-width: 72rem;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.75rem 1.4rem;
}
```

Add caption styles (near the old card styles):

```css
.book-link {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  text-decoration: none;
  color: inherit;
}
.book-card.clickable .book-link:hover .book-cover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-xl);
}
.book-cover {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.book-caption {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.book-name {
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.caption-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.caption-meta {
  font-size: 0.72rem;
  color: var(--text-secondary);
}
```

Delete the now-unused rules: the old `.book-link` block (padding/border/height variant), `.book-card-top`, `.book-title`, `.book-source`, `.external-icon`, `.book-progress`, `.book-tools`, `.tool-icon`, `.tool-icon svg`, `.book-cta`, `.book-preview-info`, `.preview-label`, `.preview-note`. Keep `.book-status`/`.status-*`, `.progress-track`, `.progress-fill`, and the `.book-card` animation rules.

- [ ] **Step 5: Type-check + lint**

Run: `npm run check && npx eslint src/routes/+page.svelte`
Expected: 0 errors / 0 warnings; eslint exit 0. Fix any "unused selector" warnings by deleting the flagged rule.

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat(covers): cover-forward poster grid on the landing page"
```

---

### Task 5: Visual verification + full gates

**Files:** none (verification only).

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 2: Start preview and screenshot light + dark.** Start `npm run preview` (background), then with Playwright (pattern from earlier sessions, run a temp `.mjs` from repo root) load `/`, screenshot full page; toggle `document.documentElement.classList.add('dark')` and screenshot again. Save both to the scratchpad.

- [ ] **Step 3: Inspect the screenshots.** Confirm: all 5 covers render with gradients; the two chemistry covers (atom vs benzene) and two biology covers (leaf vs microbe) are visually distinct; every title fits within its cover including "Örverufræði"; the caption strip shows name + progress/status; the grid reflows (multiple columns desktop, fewer on a narrow viewport); covers read well in dark mode. If any title overflows or a motif looks wrong, fix `BookCover.svelte` / `bookCover.ts` and re-run.

- [ ] **Step 4: Full gates**

Run: `npm run check && npm run lint && npm run test && npm run build`
Expected: check 0/0; lint clean; tests all pass (includes the 7 new `bookCover` tests); build exit 0.

- [ ] **Step 5: Stop preview, final commit (if Step 3 required fixes)**

```bash
git add -A
git commit -m "fix(covers): visual-pass adjustments"
```

---

## Self-Review notes

- **Spec coverage:** cover style/gradient/motif/title/attribution → Task 2 + Task 1; per-book motifs → Task 1 registry + Task 3 config; caption strip + grid + dropped tool badges → Task 4; `BookCover` component + motif registry separation → Tasks 1–2; `coverMotif` add / `coverImage` + SVG removal → Task 3; accessibility (real text, decorative motif) → Task 2; testing/gates → Tasks 1 & 5. All covered.
- **Contrast check** (spec a11y): performed by eye in Task 5 Step 3 across all subject colors; darken the `color-mix` end in `BookCover.svelte` if any title fails AA.
- **Types:** `coverTitleSize` returns `'regular' | 'long'` (Task 1) and is consumed as such in Task 2; `getCoverMotif`/`COVER_MOTIFS` names match across Tasks 1–3; `coverMotif` field name consistent Tasks 2–3.
