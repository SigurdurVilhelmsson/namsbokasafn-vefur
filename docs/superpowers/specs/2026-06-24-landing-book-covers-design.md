# Landing-page procedural book covers — design

**Date:** 2026-06-24
**Status:** Approved (design); pending implementation plan
**Scope:** The two book grids on the landing page (`src/routes/+page.svelte`) — the
Tier-1 "Þýðingar" translations and the "Sýnishorn" samples. **Out of scope:** the
Tier-2 "OpenStax safnið" compact accordion list, the hero, tools, about, and FAQ
sections.

## Problem

The landing page renders each book as a plain text tile (subject-colored left
border, title, source line, progress, tool-icon badges, CTA). It reads as
utilitarian, not appealing. Five book-cover SVGs exist in `static/covers/` and are
referenced by `BookConfig.coverImage`, but they are **unused on the site** and
**off-brand** (teal `#5dba9c` vs the system's `--subject-chemistry #2e7d9c`,
Georgia/Arial vs Bricolage/Literata, a dated gradient+icon style).

## Goal

Replace the plain tiles with a **bookshelf of procedural, branded covers** generated
entirely from book metadata — on-brand, consistent, and auto-scaling to every current
and future book with zero per-book artwork.

## Chosen design (validated in the visual companion)

**Cover-forward poster grid.** Each book is a portrait cover with a caption strip
beneath it.

### The cover (Style B — gradient + motif)

A self-contained CSS/HTML construct (no image file, no network fetch):

- **Aspect:** 2:3 portrait, `border-radius` ~7px, soft drop shadow, and a thin
  left-edge "spine" highlight (layered gradient) for book feel.
- **Background:** a diagonal gradient from the book's subject color to a darker mix
  of it — `linear-gradient(150deg, var(--c), color-mix(in srgb, var(--c) 52%, #0b1f2a))`,
  where `var(--c)` is the subject color (`--subject-chemistry`, `--subject-biology`,
  `--subject-physics`, …).
- **Motif:** an oversized, low-opacity (~0.20) white decorative glyph bleeding off the
  bottom-right corner. Motif is **per book** (not per subject) so books that share a
  subject color stay distinguishable.
- **Title:** the Icelandic title in Bricolage Grotesque, weight 800, white,
  `letter-spacing -0.02em`, top-left. **Uniform base size** (~1.25rem at the reference
  160px width) with a **length-aware step-down**: if the title's longest single word
  exceeds ~10 characters, drop one size step so long Icelandic compounds (e.g.
  "Örverufræði") never crowd the right edge. `overflow-wrap: break-word` as a safety
  net. The title is **real HTML text** (selectable, accessible, indexable) — not baked
  into an SVG.
- **Attribution:** the full source title at the bottom-left, uppercased, letter-spaced,
  ~92% white — `"OpenStax " + book.source.title` (e.g. "OpenStax Chemistry 2e",
  "OpenStax Microbiology").

### Per-book motifs

| Book                                    | Subject color | Motif           |
| --------------------------------------- | ------------- | --------------- |
| Efnafræði (`efnafraedi-2e`)             | chemistry     | atom            |
| Lífræn efnafræði (`lifraen-efnafraedi`) | chemistry     | benzene hexagon |
| Líffræði (`liffraedi-2e`)               | biology       | leaf            |
| Örverufræði (`orverufraedi`)            | biology       | microbe (cell)  |
| Eðlisfræði (`edlisfraedi-2e`)           | physics       | orbit           |

Motif is a named identifier on each book; the renderer maps the name to a decorative
inline SVG. Unknown/missing motif falls back to a neutral default (e.g. `book`), so a
new book renders sensibly before a bespoke motif is assigned.

### Caption strip (below the cover)

- Book **name** (Bricolage, warm-navy in light / paper-white in dark).
- For in-progress translations: a thin **progress bar** (subject-colored fill) +
  `"{translated}/{total} kaflar"` meta.
- A **status chip**: `Í boði` (green), `Í vinnslu` (amber), or `Forskoðun` (blue);
  sample books show `Forskoðun` + `"1 kafli í forskoðun"`.
- Tool-icon badges (flashcards/glossary/exercises/periodic-table) are **dropped from
  the grid** — they already appear on each book's own page. This keeps the posters
  clean (per the cover-forward decision).

### Grid

A denser poster grid than today's 2-up wide cards: ~2 columns on mobile, ~3–4 on
desktop (tune to the cover width). Both the translations grid and the samples grid use
the same cover+caption card. The whole card remains a single link to `/{book.slug}`.

### Theming

The cover is self-contained color and reads on both themes; the caption strip uses
existing `--bg/--text/--border` tokens, so light/dark is automatic. No new color
tokens.

## Components & data

- **`src/lib/components/BookCover.svelte`** (new) — pure, presentational. Props: the
  book (or the fields it needs: `title`, subject color, `motif`, `source.title`).
  Renders only the cover art (gradient, motif, title, attribution). No links, no
  catalog logic — independently understandable and testable. Computes the title-size
  step from the title string.
- **Cover motif registry** — a small map of decorative SVG motifs
  (`atom`, `benzene`, `leaf`, `microbe`, `orbit`, default `book`), separate from the
  UI icon registry (`icons.ts`): these are large decorative illustrations, a different
  role than the 16/20/24 UI icons. Lives alongside `BookCover` (e.g.
  `src/lib/components/bookCoverMotifs.ts`).
- **`BookConfig`** (`src/lib/types/book.ts`) — add `coverMotif?: string` per book.
  Remove the now-dead `coverImage` field and delete the five unused
  `static/covers/*.svg` files (after confirming no remaining references; current grep
  shows `coverImage` used only in `book.ts`).
- **`src/routes/+page.svelte`** — replace the `.book-card` markup in both grids with
  `<BookCover {book} />` + the caption strip; update `.book-grid` columns; remove the
  tool-badge block and the now-unused tile CSS. The subject-color resolution
  (`subjectIcons` → `--subject-{key}`) stays.

## Boundaries / contract

- `BookCover` depends only on book metadata + the motif registry + CSS subject-color
  vars. It can be dropped anywhere (catalog, a future "all books" page) without change.
- Changing the cover's internals (gradient, motif placement) does not affect the
  caption strip or the grid — they communicate only through the book data and the link
  wrapper.

## Accessibility

- Title and attribution are real text. The motif SVG is decorative (`aria-hidden`).
- The card link's accessible name is the book title; progress/status are conveyed in
  visible text, not color alone (the chip has a label).
- Color contrast: white text on the subject-color gradients must clear WCAG AA for the
  title size; verify each subject color (darken the gradient end if any fails).

## Testing & verification

- Unit: `BookCover` renders the expected motif for a given `coverMotif`, falls back to
  the default for an unknown one, and applies the smaller title-size step when the
  longest word exceeds the threshold.
- Visual: build + Playwright screenshot of the landing page in light and dark; confirm
  all five covers render, motifs differ for same-color books, titles fit (incl.
  "Örverufræði"), and the grid reflows at mobile/desktop widths.
- Gates: `npm run check` 0/0, `npm run lint`, `npm run test`, `npm run build`.

## Non-goals (YAGNI)

- No real OpenStax cover art, no per-book commissioned imagery.
- No hover-reveal of tool badges (dropped, not relocated).
- No changes to Tier-2 compact list, hero, or other landing sections.
- No new color tokens or font changes.
