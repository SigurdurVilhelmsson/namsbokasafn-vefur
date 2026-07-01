# PDF Output Redesign — Design Spec & Implementation Plan

> **Status:** **Phase 0 spikes COMPLETE (2026-07-01)** on branch `feature/pdf-redesign` — both spikes pass; the link-reconstruction risk is retired (decision recorded below → Phase 3 unblocked). Next: Phase 1 (CSS-only visual redesign). Created 2026-07-01.
> **For agentic workers:** use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement task-by-task. Steps use `- [ ]` checkboxes.
> **Attached to:** `docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md` (§ Planned) and the open-work triage `docs/plans/2026-06-30-open-work-triage-vs-efni.md` (backlog).

**Goal:** Turn the functional-but-plain generated PDFs into a _designed_, professional textbook that is genuinely interactive in a PDF reader (bookmarks, clickable TOC, cross-references, glossary, exercise↔answer links) **and** prints/binds well (spiral or 4-hole-punch A4), while carrying complete CC-BY / CC-BY-NC-SA attribution on every artifact.

**Architecture:** Keep the existing two-pass pipeline — Chromium `page.pdf()` renders the SvelteKit `/print/*` routes (styled by `static/styles/print.css`), then `scripts/generate-pdfs.js` assembles + stamps with `pdf-lib`. The redesign is layered: (1) a CSS-only visual overhaul in `print.css`, (2) richer pdf-lib post-processing (hierarchical outline, embedded brand fonts, TOC links), (3) a shared **anchor-registry + link-reconstruction** pass in pdf-lib that powers all in-document interactivity, (4) CC-BY hardening across artifacts, (5) print/binding margin profiles. Interactivity must be reconstructed in pdf-lib because per-chapter renders are merged and Chromium's in-page link destinations do not survive the merge.

**Tech Stack:** SvelteKit print routes, `static/styles/print.css`, Playwright Chromium (`page.pdf`), `pdf-lib` (`PDFDocument`, outline, annotations, named destinations), self-hosted fonts (Literata serif, Bricolage Grotesque, JetBrains Mono), `date-fns`. Verification: `pdfinfo`/`pdftotext` (poppler) + `pdftoppm` rasterization + visual review; benchmark against `Chemistry2e-WEB.pdf` (OpenStax reference, gitignored in repo root).

---

## Global Constraints

- **Page size:** A4 (`594.96 × 841.92 pt`). Do not change to Letter.
- **Fonts:** self-hosted only, no CDN. Serif body = **Literata**; headings = **Bricolage Grotesque**; mono = **JetBrains Mono** (all already in `static/fonts/`).
- **Brand colour:** amber/gold `#c78c20` (accent), `#a87518` (hover/darker), per the design-system rule — accent = amber for brand/interactive; blue reserved for semantic note/info blocks. **Never** introduce a branding blue.
- **Licensing (data-driven, never per-slug conditionals):** most books CC BY 4.0; **`lifraen-efnafraedi` and `edlisfraedi-2e` are CC BY-NC-SA 4.0**. Licence facts come from `src/lib/data/licences.ts` (`LICENCES`, flags `nonCommercial`/`shareAlike`) and `book.attribution` in `src/lib/types/book.ts` — branch on descriptor flags, not `book.slug`. Attribution must **fail loud**, never render silently-empty.
- **Rendering media:** `generate-pdfs.js` emulates **screen** media (`page.emulateMedia({media:'screen'})`) so `app.css`'s global `@media print` block never applies; `print.css` rules are unconditional on `/print/*`. Keep this.
- **Content is trusted pre-rendered HTML** from the namsbokasafn-efni CNXML pipeline. Element/class names are a cross-repo contract (see `CLAUDE.md` § Cross-repo CSS contract). Do not depend on new class names without coordinating with efni.
- **No content workarounds here.** Untranslated strings, missing alt-text, bad ids are efni-side. This plan styles/links existing structure only.

---

## Design Spec (the "scope out …" deliverable)

These are the concrete target values. Phase 1 implements them in `print.css`; phase 2 embeds matching fonts in the stamps.

### Page geometry & binding

Two margin **profiles**, selected by a build flag (`--profile bound|duplex`, default `bound`):

| Edge         | `bound` (single-sided, spiral / 4-hole) | `duplex` (double-sided book) |
| ------------ | --------------------------------------- | ---------------------------- |
| Binding edge | **left 26 mm** (uniform every page)     | inner 24 mm (mirrored)       |
| Outer edge   | right 18 mm                             | outer 16 mm                  |
| Top          | 20 mm                                   | 20 mm                        |
| Bottom       | 22 mm (folio sits here)                 | 22 mm                        |

- **Binding clearance:** ≥ 26 mm on the binding edge guarantees clearance for both A4 4-hole punch (holes ~12 mm from edge, 80 mm pitch) and plastic-coil/spiral (~15–20 mm bite). Content (text, figures, tables) must never enter the binding-edge margin.
- Text measure in `bound`: 210 − 26 − 18 = **166 mm** (~90–95 chars at 10.5 pt — matches OpenStax's wide single column; acceptable for a reference textbook). If review finds lines too long, add `max-width` to `.reading-content` in print and centre within the measure.
- Folios move to the **outer** edge (already done for duplex via recto/verso logic in `stampPages`); for `bound` single-sided, folios sit bottom-**right** on every page and running header top-right.

### Typography

| Element                                       | Font                    | Size                 | Leading / spacing                   | Colour                                       |
| --------------------------------------------- | ----------------------- | -------------------- | ----------------------------------- | -------------------------------------------- |
| Body (`p`, `li`)                              | Literata                | **10.5 pt**          | line-height **1.45**                | `#1a1a1a`                                    |
| Section `h1`/`h2` (section title)             | Bricolage Grotesque 700 | **20 pt**            | 1.15, `break-after: avoid`          | amber `#c78c20`                              |
| `h3`                                          | Bricolage 700           | **15 pt**            | 1.2                                 | `#1a1a1a`                                    |
| `h4`                                          | Bricolage 700           | **12.5 pt**          | 1.2                                 | `#1a1a1a`                                    |
| Figure/table label ("Mynd 15.3", "Tafla 1.2") | Bricolage 700           | 9.5 pt               | —                                   | amber `#c78c20`                              |
| Figure/table caption text                     | Literata italic         | 9.5 pt               | 1.4, **left-aligned** (per PR #179) | `#444`                                       |
| Display math                                  | MathJax SVG             | ~1.0–1.05 em of body | centred, `break-inside: avoid`      | —                                            |
| Inline math                                   | MathJax SVG             | 1.0 em of body       | —                                   | —                                            |
| Code / mono                                   | JetBrains Mono          | 9.5 pt               | 1.4                                 | `#1a1a1a`                                    |
| Running header                                | Bricolage               | 8.5 pt               | —                                   | `#6b7280`                                    |
| Folio                                         | Literata                | 9 pt                 | —                                   | `#333`                                       |
| Links (interactive)                           | inherits                | inherits             | underline                           | `#8a5e14` (dark amber, legible in greyscale) |

- **Serif body is the single highest-impact change** (closes the biggest benchmark gap vs OpenStax). Literata is already self-hosted and is the website body face → web/PDF consistency.
- Headings sans (Bricolage) + serif body = classic textbook contrast.

### Colour use (print-safe)

- Amber `#c78c20` for section headings, figure/table labels, horizontal rules, TOC chapter numbers, cover chapter number (already amber on cover).
- **Greyscale legibility is mandatory** (spiral/punch copies are often B&W): every colour-carrying element must remain distinguishable when desaturated. Links keep an **underline** (not colour alone). Note/callout blocks keep a **left border + bold label**, not fill-only. Verify by exporting a page to greyscale (`pdftoppm -gray`).
- Note/info blocks keep their semantic blue tint (`--note-blue-*`) — semantic, allowed — but must pass the greyscale-border check.

### Interactivity → PDF properties (namsbokasafn-unique features)

The reader's live features map to PDF constructs as follows. All in-document jumps use a shared **named-destination registry** built in pdf-lib (see Phase 0 spike + Phase 3):

| Reader feature (action)                                               | PDF realisation                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bookmarks                                                             | Hierarchical PDF **outline** (chapters → sections → subsections).                                                                                                                                                                                                               |
| TOC → chapter/section                                                 | Link annotations over TOC rows → named dest of the section's start page.                                                                                                                                                                                                        |
| Cross-references (`crossReferences.ts`: "Mynd 15.2", eq/section refs) | `<a href="#id">` in content → link annotation → named dest of the target's page.                                                                                                                                                                                                |
| Exercise ↔ answer (`answerLinks.ts`)                                  | Bidirectional link annotations between each exercise number and its answer-key entry.                                                                                                                                                                                           |
| Glossary term "hover" (`glossaryTerms.ts`, `<dfn class="term">`)      | **Primary:** term (first occurrence per section) → internal link to its glossary entry at the back; entry back-links to first use. **Enhancement:** short definitions also written to the link annotation's `/Contents` (tooltip in viewers that show it). No fragile hover-JS. |
| External links                                                        | Kept as visible footnote-style URL (already in `print.css`) **and** a URI link annotation.                                                                                                                                                                                      |

- **Why pdf-lib, not just HTML anchors:** Chromium converts in-page `#anchor` links to GoTo destinations _within one PDF_. The book is rendered per-chapter then merged with `copyPages`, which does **not** rebase those destinations — so cross-chapter (and TOC→chapter) links dangle. The registry re-creates them against the merged page tree. This is the plan's central technical risk → Phase 0 spike.

### CC-BY / CC-BY-NC-SA compliance (every artifact)

Both the full-book PDF **and** each standalone chapter PDF must carry, at minimum:

1. **Colophon content** (cover for the book; a compact colophon page or footer block for standalone chapters): work title, `attribution.originalTitle` + `originalAuthors`, publisher (`attribution.publisher`), source URL (`attribution.sourceUrl`), the licence name + **licence URL**, translator/credit line (`creditLine(...)`), "Aðgangur að frumefninu er ókeypis á openstax.org", and an explicit **modification statement** (this is an Icelandic translation — a derivative — which CC-BY requires be indicated).
2. **NC-SA books:** additionally state NonCommercial + ShareAlike (derived from `LICENCES[...].nonCommercial/shareAlike`, not slug).
3. **PDF document metadata:** `Title`, `Author` (= "OpenStax; þýðing: Námsbókasafn"), `Subject` (= licence name + URL), `Keywords`, `Lang='is'`. XMP `dc:rights` = licence URL is a nice-to-have.
4. **Footer licence line** (optional but recommended, à la OpenStax's "Access for free…"): a short licence/source line in the folio band.

---

## File Structure

- `static/styles/print.css` — **primary visual surface.** All typography, colour, geometry, cover/colophon, note/figure/table styling, link styling. Loaded by `/print/*` via `src/routes/print/+layout.svelte`.
- `scripts/generate-pdfs.js` — assembly + stamping. Extend: embed brand fonts for stamps; hierarchical outline; TOC/cross-ref/glossary/answer link reconstruction; margin profiles; metadata/XMP; standalone-chapter colophon.
- `src/routes/print/[bookSlug]/bok/+page.svelte` — full-book front matter (cover, colophon, TOC). Add section-level TOC rows + anchor `id`s/`href`s the registry keys off.
- `src/routes/print/[bookSlug]/kafli/[chapterSlug]/+page.svelte` — chapter render. Add compact colophon + chapter-scoped glossary section for standalone distribution.
- `src/routes/print/[bookSlug]/vidauki/+page.svelte` — appendices (existing).
- **New:** `src/routes/print/[bookSlug]/ordabok/+page.svelte` (or a glossary block appended to `/bok`) — the back-of-book glossary rendered from `glossary.json`, with per-term `id`s the registry links to.
- `src/lib/data/licences.ts` / `src/lib/types/book.ts` — read-only source of licence + attribution facts (add a `licenceUrl` accessor if not present).
- **New helper:** `scripts/lib/pdf-links.js` — the anchor-registry + link-reconstruction utilities (named-dest name tree, annotation rewrite), unit-tested with a synthetic PDF.
- **New (tests):** `scripts/lib/pdf-links.test.js` (Vitest) — registry/annotation logic on a fixture PDF.
- Verification scratch (not committed): rasterized page PNGs + `pdftotext` dumps under the session scratchpad.

---

## Phasing overview

Each phase ends with a **regenerate-one-chapter + benchmark** deliverable, independently shippable.

- **Phase 0 — Spikes (de-risk).** Validate (a) serif body via `print.css`, (b) pdf-lib link reconstruction across a merged 2-chapter PDF. No production commitment until these pass.
- **Phase 1 — Visual redesign (CSS-only).** Serif body, heading system, figure/table/label styling, greyscale-safe colour, binding margins, cover/colophon polish. _Highest impact, lowest risk._
- **Phase 2 — Navigation.** Embed brand fonts in stamps; hierarchical (section-level) outline; clickable TOC.
- **Phase 3 — Interactivity.** Anchor registry powering cross-references, exercise↔answer links, glossary-term links + back-of-book glossary section.
- **Phase 4 — CC-BY hardening.** Colophon on every artifact (incl. standalone chapters), PDF metadata/XMP, modification statement, NC-SA handling.
- **Phase 5 — Print/binding profiles.** `--profile bound|duplex`, greyscale verification, single/double-sided, punch/spiral clearance check.
- **Phase 6 — (stretch) Tagged/accessible PDF investigation.**

---

## Phase 0 — Spikes

### Task 0.1: Serif print body spike

**Files:** `static/styles/print.css` (temp branch).

- [x] Add serif body to `print.css` document defaults: `font-family: "Literata", Georgia, serif; font-size: 10.5pt; line-height: 1.45;`. Literata `@font-face` comes from `app.css` (loaded globally by the root layout, so present on `/print/*`); Task 1.1 will add a belt-and-braces `@font-face` to `print.css` so print never depends on `app.css`.
- [x] Rendered one chapter (`/print/efnafraedi-2e/kafli/15`) via a minimal Playwright driver (confirms **Chromium runs in this environment** — `~/.cache/ms-playwright/chromium-1228`).
- [x] `pdffonts` → **Literata embedded/subset** for all body runs (Type3 custom-encoded, `emb/sub/uni = yes`); **no Helvetica/Arial** for body text.
- [x] Rasterized a content page — serif body confirmed, math/figures unaffected.
- **Acceptance MET:** body renders in Literata serif; math/figures unaffected; Icelandic glyphs (á ð é í ó ú ý þ æ ö) all intact, no fallback boxes.

### Task 0.2: pdf-lib link-reconstruction spike (the risk)

**Files:** `scripts/lib/pdf-links.js` (new, spike), a throwaway driver.

- [x] Built the 2-chapter fixture by `copyPages`-merging the existing kafli-03 + kafli-15 PDFs (mirrors `generate-pdfs.js`), in `.pdf-spike-driver.mjs`.
- [x] Implemented `defineNamedDest` + `addGoToLink` **and** the harvest/rebase utilities in `scripts/lib/pdf-links.js` (real module, not throwaway). Note: Chromium uses the catalog **`/Dests` name-dictionary**, not the `/Names /Dests` string tree — so the utilities target `/Dests`.
- [x] **Proved cross-chapter jump:** after harvest/rebase, a name owned by kafli-15 resolves to the correct merged page (39, in kafli-15's range) — verified through a **save→reload round-trip**, and the target page rasterized to genuine kafli-15 content (Mynd 15.1 flúorít).
- [x] **Proved synthetic inject:** `defineNamedDest` + `addGoToLink` on a kafli-03 page → a kafli-15 dest resolves correctly after reload; both injected annotations persist. This is the mechanism for TOC/glossary/answer links (which have **no** Chromium source anchor).
- [x] Characterised the corpus (all 21 chapters): **792** internal name-dest links + **146** external URI links (URIs are all `http(s)`, self-contained, already survive the merge — no work needed); **0** array-dests, **0** `/GoTo`-action, **0** `/GoToR`. Collisions across chapters: **only `fnref-N`** (footnote-return anchors, intra-chapter, cosmetic); `CNX_Chem_NN_*` content ids are globally unique. **No genuine cross-chapter content cross-references exist in efnafraedi-2e** (OpenStax chem refs stay within-module) — so cross-chapter had to be proven by synthetic injection, per above.

**DECISION (recorded 2026-07-01): approach (B), refined — harvest + rebase, do _not_ rebuild from rects.** Chromium already emits every internal `<a href="#id">` as a **name-object `/Dest` Link annotation**, and those annotations **survive `copyPages`** onto the merged pages (938/938 present in the current `-bok.pdf`); what `copyPages` drops is the catalog `/Dests` dict, so the names dangle. Phase 3 therefore does **not** touch the surviving annotations or compute any rects for content links: it harvests each chapter's `/Dests`, rebases page refs to merged indices, and writes one combined `/Dests` (`harvestDests` → `findCollidingNames` → `mergeChapterDests` → `writeMergedDests`). Colliding names (`fnref-*` only) are namespaced per chapter; everything else stays global so cross-chapter resolution works. Constructs with no source anchor (TOC rows Task 2.3, back-of-book glossary Task 3.4, exercise↔answer Task 3.3 if those aren't `<a href>` in print HTML) are built with `defineNamedDest` + `addGoToLink`. **Phase 3 is UNBLOCKED.** Fallback (outline-only) is not needed.

---

## Phase 1 — Visual redesign (CSS-only, `print.css`)

> One coherent commit-per-task; each ends with regenerate `--book efnafraedi-2e` + visual check vs `Chemistry2e-WEB.pdf`.

### Task 1.1: Serif body + base rhythm

**Files:** Modify `static/styles/print.css` (document defaults block, ~lines 31–42).

- [ ] Set body font-family Literata, `font-size: 10.5pt`, `line-height: 1.45`; ensure `@font-face` for Literata + Bricolage + JetBrains Mono are declared in `print.css` (self-hosted `/fonts/*.woff2`) so `/print/*` never depends on `app.css`.
- [ ] Regenerate + rasterize p4; **Acceptance:** serif body, Icelandic glyphs intact, math unchanged.
- [ ] Commit: `style(pdf): serif (Literata) print body`.

### Task 1.2: Heading system

**Files:** `static/styles/print.css`.

- [ ] `article.cnx-module h1, article.cnx-module section h2 { font-family:"Bricolage Grotesque"; font-weight:700; font-size:20pt; color:#c78c20; line-height:1.15; break-after:avoid; }`; `h3 {15pt; #1a1a1a}`; `h4 {12.5pt}`.
- [ ] **Acceptance:** section titles render amber sans, clear hierarchy; no heading orphaned at page bottom.
- [ ] Commit: `style(pdf): heading type scale + amber section titles`.

### Task 1.3: Figure & table label styling

**Files:** `static/styles/print.css` (figcaption ~141, add table caption/label rules).

- [ ] `figcaption` label span (`.figure-label`) + table `caption .table-label`: Bricolage 700, amber. Caption body Literata italic 9.5pt, **left-aligned** (already left per #179 — keep). Figures/tables `break-inside: avoid`; centre the image, left-align the caption.
- [ ] **Acceptance:** matches OpenStax figure treatment (bold coloured label + left-aligned descriptive caption); image stays centred.
- [ ] Commit: `style(pdf): figure/table label + caption styling`.

### Task 1.4: Notes/callouts greyscale-safe + colour palette

**Files:** `static/styles/print.css`.

- [ ] Ensure note blocks (`aside.note*`, `.learning-objectives`, `.chapter-outline`) render with a **left accent border + bold label** so they survive B&W; keep semantic tint fills light. Horizontal rules amber.
- [ ] **Acceptance:** `pdftoppm -gray` of a note page keeps all blocks distinguishable; colour page looks designed.
- [ ] Commit: `style(pdf): greyscale-safe callouts + palette`.

### Task 1.5: Cover & colophon polish

**Files:** `static/styles/print.css` (`.print-cover*`, `.print-attribution`), `src/routes/print/[bookSlug]/bok/+page.svelte`.

- [ ] Refine cover hierarchy (eyebrow, title, subtitle, chapter number already amber); ensure a dedicated **colophon block** with full attribution (see CC-BY spec) renders below or on its own page. Verify `attribution` fails loud if missing.
- [ ] **Acceptance:** cover looks intentional; colophon lists title/authors/publisher/source/licence+URL/translators/modification statement.
- [ ] Commit: `style(pdf): cover + colophon layout`.

### Task 1.6: Binding margin (interim, `bound` default)

**Files:** `scripts/generate-pdfs.js` (`printToPdf` margins ~129; `MARGIN_X`, stamp geometry ~71–76).

- [ ] Set left margin 26 mm, right 18 mm; update `MARGIN_X` and folio/header x-positions so stamps stay in the (new) margins on the correct edge for single-sided.
- [ ] **Acceptance:** no content within 26 mm of the left edge; folio/header positioned correctly; regenerate confirms.
- [ ] Commit: `feat(pdf): binding-edge margin for spiral/4-hole`.
- [ ] **Re-benchmark checkpoint:** rasterize p4 + cover + a figure page; compare to OpenStax; note residual gaps.

---

## Phase 2 — Navigation (outline + TOC links + real fonts)

### Task 2.1: Embed brand fonts in stamps

**Files:** `scripts/generate-pdfs.js` (`stampPages` ~166; `encodableText` ~143).

- [ ] Replace `StandardFonts.Helvetica/Oblique` with embedded Literata/Bricolage (read woff2→ttf; note pdf-lib needs TTF/OTF, not woff2 — add a `.ttf` of the stamp face under `scripts/assets/` or convert at build). Keep `encodableText` guard.
- [ ] **Acceptance:** running headers/folios render in the brand face; Icelandic glyphs intact.
- [ ] Commit: `feat(pdf): embed brand font in headers/folios`.

### Task 2.2: Hierarchical outline (sections)

**Files:** `scripts/generate-pdfs.js` (`addOutline` ~207; `generateForBook` ~238 to gather section page offsets).

- [ ] Extend outline items to nested `{title, pageIndex, children[]}`; measure section start pages (each section is an `article.cnx-module` with an `id` — count pages up to each within the per-chapter raw PDF, or split page offsets from the render). Rewrite `addOutline` to build `First/Last/Parent/Next/Prev/Count` for nesting.
- [ ] **Acceptance:** `pdfinfo -struct-text` / a viewer shows chapters expandable into sections; every entry lands on the right page.
- [ ] Commit: `feat(pdf): hierarchical (section-level) outline`.

### Task 2.3: Clickable TOC

**Files:** `src/routes/print/[bookSlug]/bok/+page.svelte` (add section rows + `href="#…"`), `scripts/generate-pdfs.js` (register TOC dests), `scripts/lib/pdf-links.js`.

- [ ] Render TOC rows with the anchor names the registry uses; after assembly, add GoTo link annotations over TOC row rects → chapter/section start-page dests (approach from Task 0.2).
- [ ] **Acceptance:** clicking a TOC entry in a reader jumps to that chapter/section; page numbers already present.
- [ ] Commit: `feat(pdf): clickable table of contents`.

---

## Phase 3 — Interactivity (anchor registry)

### Task 3.1: Anchor registry + link utilities

**Files:** `scripts/lib/pdf-links.js`, `scripts/lib/pdf-links.test.js`.

- [ ] Implement `buildRegistry()` mapping every target `id` (section, figure, table, equation, exercise, answer, glossary term) → merged page index (derive ids by scanning the rendered HTML per chapter and tracking page offsets from Task 2.2). Implement `defineNamedDest`, `addGoToLink`, and (per Task 0.2 decision) either rect-harvest or rect-compute.
- [ ] Vitest on a fixture PDF: dest resolves to correct page; annotation rect present.
- [ ] Commit: `feat(pdf): anchor registry + link utilities (tested)`.

### Task 3.2: Cross-reference links

**Files:** `scripts/generate-pdfs.js`.

- [ ] For every content `<a href="#id">`, add a GoTo link to the registry dest. Style handled in CSS (dark-amber underline).
- [ ] **Acceptance:** "Mynd 15.2", section/equation refs jump correctly across chapters.
- [ ] Commit: `feat(pdf): working cross-reference links`.

### Task 3.3: Exercise ↔ answer links

**Files:** `scripts/generate-pdfs.js`, possibly `src/routes/print/.../+page.svelte` to ensure ids exist.

- [ ] Bidirectional GoTo links: exercise number → answer-key entry; answer → exercise. Mirror the reader's `answerLinks.ts` id scheme.
- [ ] **Acceptance:** both directions jump; verify on a chapter with EOC + answer key.
- [ ] Commit: `feat(pdf): exercise↔answer navigation`.

### Task 3.4: Back-of-book glossary + term links

**Files:** new `src/routes/print/[bookSlug]/ordabok/+page.svelte` (or glossary block in `/bok`), `scripts/generate-pdfs.js`.

- [ ] Render glossary from `glossary.json` with per-term `id`s; assemble it after appendices. Link the **first occurrence per section** of each `<dfn class="term">` → its glossary entry; entry back-links to first use. Optionally set the link annotation `/Contents` to the (short) definition for hover-tooltip viewers.
- [ ] **Acceptance:** clicking a term jumps to its definition; glossary entries back-link; no over-linking (one link per term per section).
- [ ] Commit: `feat(pdf): back-of-book glossary + term links`.

---

## Phase 4 — CC-BY hardening

### Task 4.1: Colophon on standalone chapter PDFs

**Files:** `src/routes/print/[bookSlug]/kafli/[chapterSlug]/+page.svelte`, `static/styles/print.css`.

- [ ] Add a compact colophon (title/authors/publisher/source/licence+URL/translators/modification note) as the last page (or a footer band) of each standalone chapter, since a chapter distributed alone still needs full attribution. Data from `book.attribution` + `getLicence(...)`; **fail loud** if missing.
- [ ] **Acceptance:** every `*-kafli-NN.pdf` carries complete attribution; NC-SA books show NonCommercial + ShareAlike from descriptor flags.
- [ ] Commit: `feat(pdf): CC-BY colophon on standalone chapters`.

### Task 4.2: PDF metadata + optional XMP

**Files:** `scripts/generate-pdfs.js` (already `setTitle`/`setLanguage`).

- [ ] Set `Author`, `Subject` (= licence name + URL), `Keywords`, keep `Lang='is'`, on both book and chapter docs. Optionally write XMP `dc:rights` = licence URL.
- [ ] **Acceptance:** `pdfinfo` shows Title/Author/Subject/Keywords; licence URL present in metadata.
- [ ] Commit: `feat(pdf): licence-aware document metadata`.

### Task 4.3: Footer licence line (optional)

**Files:** `scripts/generate-pdfs.js` (`stampPages`).

- [ ] Add a short licence/source line to the folio band (e.g., "CC BY 4.0 · openstax.org / namsbokasafn.is"), NC-SA variant from flags.
- [ ] **Acceptance:** every content page footer carries the licence line; greyscale-legible.
- [ ] Commit: `feat(pdf): licence line in footer`.

---

## Phase 5 — Print/binding profiles

### Task 5.1: `--profile bound|duplex`

**Files:** `scripts/generate-pdfs.js` (`parseArgs`, `printToPdf` margins, `stampPages` edge logic).

- [ ] Add `--profile` (default `bound`). `bound` = uniform left 26 mm gutter, folios/headers on right every page (single-sided). `duplex` = mirrored inner/outer + recto/verso folios (current behaviour).
- [ ] **Acceptance:** `bound` output has consistent left gutter on all pages; `duplex` mirrors. Document in `docs/guides/deployment.md` / script header.
- [ ] Commit: `feat(pdf): bound vs duplex margin profiles`.

### Task 5.2: Greyscale + binding verification

- [ ] `pdftoppm -gray` a sample of pages (cover, content, note, figure, TOC, glossary); confirm all elements legible in B&W. Physically check 26 mm binding clearance against a 4-hole punch / spiral template.
- [ ] **Acceptance:** documented checklist passes; no content in the binding margin; links/callouts legible greyscale.
- [ ] Commit: `docs(pdf): print/binding verification checklist`.

---

## Phase 6 — (stretch) Tagged/accessible PDF investigation

- [ ] **Investigate only** (no commitment): Chromium `page.pdf()` produces **untagged** PDFs (no structure tree, no image `/Alt`, no MathML) — not screen-reader-accessible as a PDF, regardless of the web-side a11y-2 assistive MathML. Assess options: (a) Chromium tagged-PDF flags (limited), (b) a Prince/`pandoc`/`weasyprint` alternate path from the same HTML, (c) post-hoc tagging. Record findings; likely a separate future project.
- **Acceptance:** a short written recommendation appended here; no code unless a cheap win is found.

---

## Self-Review (against the request)

- font size ✓ (10.5 pt body, full type scale) · margins ✓ (bound/duplex profiles, 26 mm gutter) · line-spacing ✓ (1.45) · colour ✓ (amber palette, greyscale-safe) · internal links ✓ (Phase 2–3) · CC-BY footer ✓ (Task 4.3) + colophon/metadata (4.1/4.2).
- term-hover-glossary ✓ (Task 3.4, link-to-glossary + optional `/Contents` tooltip) · TOC links ✓ (Task 2.3) · exercise/answer crosslinks ✓ (Task 3.3).
- single complete book PDF first ✓ (Phases 1–4 target the book) · single-chapter structure ✓ (Task 4.1 + standalone stamping already present) · all CC-BY content on both ✓.
- designed + interactive + printable/bindable ✓.
- **Open risk:** Phase 3 depends on the Phase 0.2 spike outcome; if link reconstruction proves unreliable, ship Phases 1–2 + 4 (outline-only nav) and revisit.
- **Known limitation:** accessible/tagged PDF is out of scope (Phase 6 investigation only).

## Not executing now

Per the request this plan is **parked for pickup when convenient** — no execution handoff is initiated. When picked up, start at **Phase 0** (spikes gate the rest), then Phase 1 for immediate visible payoff.
