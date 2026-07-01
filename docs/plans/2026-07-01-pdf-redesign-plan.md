# PDF Output Redesign — Design Spec & Implementation Plan

> **Status (2026-07-01, branch `feature/pdf-redesign`):** **Phase 0** (spikes) ✓ · **Phase 1** (visual redesign, incl. duplex margins + pagination) ✓ · **Task 1.8** (build date + MT watermark) ✓ · **Task 4.1** (standalone-only colophon) ✓ · **Phase 2 core** — content-link resurrection + clickable TOC ✓ (2.1 fonts deferred, 2.2 section outline blocked-noted). **Next:** Phase 3 link _styling_ (dark-amber cross-refs) + exercise↔answer + back-of-book glossary; Phase 4.2/4.3 metadata/footer; Phase 5 profiles. Created 2026-07-01.
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

### Task 1.6: Binding margin — DUPLEX (double-sided) default

**Reviewer decision (2026-07-01): double-sided is the target** (school/professional printers duplex by default, and that's where binding is applied). This supersedes the plan's original `bound` single-sided default. **Files:** `static/styles/print.css` (`@page`), `scripts/generate-pdfs.js` (`printToPdf` margin option, `MARGIN_X` comment).

- **Why symmetric, not mirrored:** true mirrored margins (wide inner gutter / narrow outer) can't be done reliably here — chapters are rendered separately then merged, so a chapter's internal `@page :left`/`:right` parity doesn't match its position in the merged book (a chapter that renders recto-first may land on a verso page → gutter on the wrong side for half the pages). Real books fix this by forcing every chapter to start on a recto with blank filler pages; that needs folio/TOC re-accounting → **deferred to Task 5.1**.
- [x] `@page` margins **20 / 22 / 22 / 22 mm** (top/right/bottom/left) — symmetric, binding-safe on both sides (22mm ≥ 4-hole punch ~12mm + clearance, comb/spiral bite) so the alternating gutter always clears. `preferCSSPageSize` makes `@page` authoritative (verified: content sits at 22mm); generator margin option mirrored for clarity.
- [x] Folios/headers already correct for duplex (original recto/verso logic kept): odd/recto → folio + chapter-title header on the **right**; even/verso → folio + book-title header on the **left**; on the outer edge (`MARGIN_X` 18mm), inside the 22mm margin, never in the gutter. Verified on the assembled book (p27 recto right, p28 verso left).
- **Effect on page count & pagination (measured, kafli-15):** total pages **53 — unchanged** vs the 18mm tightened version (the equation density work already freed the room, so the wider gutter costs 0 pages). Oversized-core examples: 18mm → **3**, 22mm → **4** (only Dæmi 15.11 tips ~1px over) — negligible, and covered by the seam-break + graceful-break handling from Task 1.7.
- [x] Commit: `feat(pdf): double-sided binding margins`.
- [x] **Re-benchmark checkpoint (done 2026-07-01):** compared our kafli-15 (opener + Dæmi 15.1 equation page) against OpenStax `Chemistry2e-WEB.pdf` p763/p765 (same fluorite/Ksp content). **Closed gaps:** serif body (the biggest one), running header + folio on every page, figure label+caption treatment, compact two-column reaction/Ksp equation layout (matches OpenStax), colored section headings (amber vs their teal). **Intentional differences:** amber brand vs teal; boxed examples vs icon-marked; dedicated chapter cover page vs combined opener. **Residual gaps → later phases:** cross-ref links still blue (Phase 3 → dark-amber); no clickable TOC / PDF outline yet (Phase 2). Verdict: Phase 1 output reads as a professional textbook comparable to the OpenStax reference.

### Task 1.7: Pagination cohesion + equation density (keep examples whole)

**Files:** `static/styles/print.css`. **Added after review feedback (2026-07-01):** examples/notes/figures/tables must not split across pages where avoidable, and a worked example must stay with its "Kannaðu þekkingu þína" (test-your-knowledge). Two levers, in priority order: **(a) density** — reclaim wasted vertical space so more examples fit a page; **(b) cohesion** — control where the residual breaks land.

- **Structure finding:** "Kannaðu þekkingu þína" is authored _inside_ `<aside class="example">` (nested, last child), so an example and its test-your-knowledge are one HTML block and stay together whenever the block fits a page.

- **(a) Equation density — the dominant lever (done).** `content.css` gives every `div.equation` 20px margins + 0.25rem padding and an inner 10px `mjx-container` padding — fine on screen, wasteful in print where worked examples stack many calculation steps. Tightened in print to `div.equation { margin: 0.35em; padding: 0 }` + inner `padding: 1px` + display-math `margin: 0.35em`. **Measured on kafli-15 (16 examples, A4 content box ≈ 956px, via a browser `getBoundingClientRect` pass):**
  | metric | before | after tightening |
  | --- | --- | --- |
  | examples whose **core** (problem+solution) alone > 1 page | 8 | **2** (15.12, 15.16) |
  | examples whose **full** block > 1 page | 14 | 6 |
  | kafli-15 total pages | 63 | **53** (−16%) |
  Equations remain visually well-spaced (not cramped); Dæmi 15.6 went from spanning 2 pages to fitting whole (incl. test-your-knowledge).

- **(b) Cohesion — seam-break (done; policy confirmed by reviewer).** Removed `aside.example` from the global `break-inside: avoid` list; instead fence the core so the problem+solution can't split (each direct child `break-inside: avoid`, `break-before: avoid` between consecutive core children) while leaving the nested check-knowledge as the single permitted break point. So: example stays whole when it fits; for the ~4 borderline cases (core fits, full block doesn't) the test-your-knowledge drops to the next page instead of leaving a ~40% gap; **never splits mid-solution.** Seam protection: `break-after: avoid` on `.note-type`/note `h4`/`.para-title`/example label so no heading is stranded.

- **Unavoidable residual:** 2 of 16 examples (15.12, 15.16) have a core taller than one A4 page even when tight — physically impossible to keep whole. Verified they break **gracefully** (between calculation steps, no mid-equation split, no stranded heading; 15.16 breaks before the final mass calc, check-knowledge concludes on the next page).

- [x] Equation density tightening (measured 8→2 oversized cores, 63→53 pages).
- [x] Example core-fencing + test-your-knowledge seam-break; heading seam protection.
- [ ] **Phase 5 QA must include:** a scan for (a) any example split mid-solution, (b) any mid-equation/stranded-heading break, (c) excessive (> ~⅓ page) whitespace at page feet. Re-measure oversized-core counts if content changes materially.
- **Not doing (documented):** height-based conditional cohesion isn't expressible in CSS; a measurement-based JS repagination pass is possible but out of scope — revisit only if QA finds systematically bad whitespace. Could tighten paragraph spacing further (already 0.5em) but equation spacing was the dominant lever; leave paragraphs for readability.
- [ ] Commit: `style(pdf): tighten equation spacing` + `style(pdf): example pagination cohesion`.

### Task 1.8: Transparency — PDF build date + MT watermark

**Reviewer requests (2026-07-01):** (a) show the PDF creation date so readers can tell which version they hold (PDFs are regenerated as proofread content lands); (b) mark machine-translated (unreviewed) content — essential while most content is still MT preview (efnafraedi-2e is **212/216 sections unreviewed**; the other four books are 100% MT).

- [x] **Build date on every cover.** `Útgáfudagur PDF-skjals: {date}` on the book cover colophon and each chapter cover. Formatted with **date-fns + `is` locale** (`d. MMMM yyyy` → "1. júlí 2026") — `Intl.toLocaleDateString('is-IS')` renders English under Node small-ICU, so it's not used. Verified. _(Refinement, not done: the date is `new Date()` per route — same day within a build; a single generator-passed timestamp would be exact.)_
- [x] **Per-section MT watermark.** The print loader now propagates `section.reviewed` and adds an `mt-content` class to the `<article>` of every unreviewed section (`markMachineTranslated`); `print.css` renders a faint (6%) tiled diagonal **"VÉLÞÝTT EFNI"** SVG-background watermark on `.mt-content`, repeating across every page the section spans. **Per-section**, so a partly-reviewed chapter marks only its MT sections (verified on kafli-01: reviewed 1.0/1.1 clean, MT sections watermarked). Wording matches the reader's "Vélþýtt efni" banner. Answer-key/aggregation blocks default to watermarked (conservative). Class injected into the article (not a wrapper) so `:first-of-type` page-break logic is preserved. Greyscale-safe.
- **Go-live gate:** the MT watermark must be in place before any PDF is published while content is still MT.
- [ ] **COVERAGE GAP (found 2026-07-01, go-live-relevant):** the watermark only hits `article.cnx-module.mt-content` (section content). The **appendix** (the `vidauki` loader doesn't inject `mt-content`) and the **back-of-book glossary** (`.print-glossary`, MT-derived definitions) currently render **unmarked**. Extend watermarking to both (vidauki loader `markMachineTranslated`; a `.print-glossary` watermark) before go-live, ideally gated on review status.
- [x] Commit: `feat(pdf): build date on covers + MT watermark on unreviewed content`.

---

## Phase 2 — Navigation (outline + TOC links + real fonts)

### Task 2.1: Embed brand fonts in stamps — DEFERRED

**Files:** `scripts/generate-pdfs.js` (`stampPages`, `encodableText`).

- **Deferred (2026-07-01):** blocked on tooling for low visual payoff. pdf-lib's `embedFont` for a custom face needs **`@pdf-lib/fontkit` (not installed)** + a **TTF/OTF** stamp face, but `static/fonts/` has only **woff2** and there's **no converter available** (no fonttools/brotli/wawoff2). The stamps are 8.5–9pt folios/headers in the margin — Helvetica there is barely distinguishable from Bricolage. Revisit if we add `@pdf-lib/fontkit` + a committed `.ttf` under `scripts/assets/` (or a build-time woff2→ttf step).
- [ ] Acceptance (when picked up): running headers/folios render in the brand face; Icelandic glyphs intact.

### Task 2.2: Hierarchical outline (sections) — PARTIALLY BLOCKED

**Files:** `scripts/generate-pdfs.js` (`addOutline`, `generateForBook`).

- **Blocker found (2026-07-01):** the plan assumed each section `<article>` has a linkable `id` to get its start page — it does **not** (sections carry `data-module-id="m…"`, not `id`, so Chromium emits no dest for the section start). Harvested dests are figure/content anchors (`CNX_Chem_15_00_*`), not section openers. So section start pages aren't directly available.
- **Options when picked up:** (a) inject an `id` + an invisible in-`/bok`-style target per section so Chromium emits a section-start dest (same trick as the clickable TOC), then read its page from the harvested dests; or (b) inject a section-start `id` into each block's `<article>` in the print loader (like `markMachineTranslated` does for `mt-content`) and register a synthetic dest at render/measure time. Then nest the outline (`First/Last/Parent/Next/Prev/Count`).
- [ ] **Acceptance:** a viewer shows chapters expandable into sections; every entry lands on the right page. Lower priority than the content-link win below.

### Task 2.3: Clickable TOC + content-link resurrection — DONE (core)

**Files:** `bok/+page.svelte` (anchor-link TOC rows + invisible targets), `scripts/generate-pdfs.js` (harvest/rebase `/Dests` + register TOC dests), `static/styles/print.css`, `scripts/lib/pdf-links.js` (Phase 0 utilities).

- [x] **Content-link resurrection (the big win, also Phase 3.1/3.2 core):** generate-pdfs now harvests each chapter/appendix `/Dests` and rebases them onto the merged page tree (`harvestDests`→`findCollidingNames`→`mergeChapterDests`→`writeMergedDests`), rebuilding the catalog `/Dests` that `copyPages` drops. Verified on the book: `/Dests` **0 → 805 keys**; **1026** in-content name-dest link annotations now resolve (e.g. `CNX_Chem_15_00_Fluorite` → the correct merged page). All "Mynd/Tafla/jafna" cross-references are clickable in the book again.
- [x] **Clickable TOC:** `/bok` TOC rows are anchor-links (`#kafli-N` / `#vidaukar`); Chromium only emits a Link annotation when the target id exists in `/bok`, so invisible `.toc-anchor-targets` spans give them local targets (verified: 22 annotations emitted). generate-pdfs registers `kafli-N` / `vidaukar` as merged dests (`[pageRef, /Fit]`) at the chapter/appendix start pages, so the surviving annotations re-point to the real pages. TOC rows styled to inherit (not blue).
- [x] Commit: `feat(pdf): resurrect content links + clickable TOC`.
- **Note:** external URI links (146) already survived the merge untouched. Cross-ref link _styling_ (dark-amber underline) is Phase 3.2; exercise↔answer + glossary links are Phase 3.3/3.4.

---

## Phase 3 — Interactivity (anchor registry)

### Task 3.1: Anchor registry + link utilities

**Files:** `scripts/lib/pdf-links.js`, `scripts/lib/pdf-links.test.js`.

- **Phase 0 already built the utilities** in `scripts/lib/pdf-links.js`: `harvestDests`, `findCollidingNames`, `mergeChapterDests`, `writeMergedDests` (the harvest+rebase path — the recorded 0.2 decision), plus `defineNamedDest` + `addGoToLink` for synthetic links. The registry approach is settled; **no rect-harvest/rect-compute choice remains**.
- [x] Wired the harvest/rebase utilities into `generate-pdfs.js`'s merge loop (Phase 2 commit `7a3ffe8`): `harvestDests` per chapter/appendix/glossary with its merged offset, accumulate, `writeMergedDests`. Book `/Dests` 0→805.
- [x] **CARRY-OVER done:** `scripts/lib/pdf-links.test.js` — 9 hermetic Vitest cases on synthetic in-memory PDFs (round-trip resolve, annotation shape, collider namespacing). Commit `test(pdf): Vitest for pdf-links utilities`.

### Task 3.2: Cross-reference links — DONE

- **Key realisation:** these did **not** need per-`<a>` GoTo injection. The content `<a href="#id">` links are already Chromium name-dest annotations; the Phase 2 harvest/rebase makes them resolve. So 3.2 was just **styling** (Task 3.2 commit): `article.cnx-module a[href]` → dark-amber `#8a5e14` + underline (greyscale-legible), overriding content.css blue. Verified: "Mynd 15.x" + chapter-outline refs jump and read as links.
- [x] Commit: `style(pdf): dark-amber underlined content links`.

### Task 3.3: Exercise ↔ answer links — DEFERRED (needs render-time injection)

- **Verified:** exercise↔answer links are **reader-only** — the answer-key HTML has **0** `<a href>` and exercises only 4 (incidental). `answerLinks.ts` builds the pairing at runtime in the reader, so the print HTML has no anchors to harvest.
- **Approach when picked up (deferred):** don't compute rects in pdf-lib — instead **replicate `answerLinks.ts` at render time in the print loader** (transform the EOC/answer-key HTML to wrap exercise numbers + answer entries in `<a href="#…">` with a shared id scheme). Then Chromium emits the annotations and the existing harvest/rebase resolves both directions — same pattern as the clickable TOC. Same mechanism unlocks glossary term-links (3.4 below).

### Task 3.4: Back-of-book glossary — PAGE DONE, term-links deferred

**Files:** new `src/routes/print/[bookSlug]/ordabok/{+page.ts,+page.svelte}`, `scripts/generate-pdfs.js`, `bok/+page.svelte` (TOC row), `print.css`.

- [x] **Glossary page:** renders all 753 terms from `glossary.json`, Icelandic-collated, two-column, each with a stable `gloss-N` id. `generate-pdfs` renders it once, measures it (pass 1), merges it after the appendices with continuous folios + a running header, an **outline bookmark ("Orðaskrá")**, and a **clickable TOC row** (`#ordaskra`, via the invisible-target trick + `toc-pages.json` `glossaryPage`).
- [ ] **Term-links (deferred, needs render-time injection like 3.3):** link the **first `<dfn class="term">` per section** → its `gloss-N` entry; entry back-links to first use. The `gloss-N` ids are already in place; the remaining work is the render-time `<dfn>`→`<a href="#gloss-…">` transform in the print loader + a term→id map.
- [x] Commit (page): `feat(pdf): back-of-book glossary page`.

---

## Phase 4 — CC-BY hardening

### Task 4.1: Colophon on standalone chapters — and keep it OUT of the book

**Reviewer question (2026-07-01):** should the per-chapter colophon be stripped from the whole-book version, and are two render tracks more logical? **Findings:**

- The chapter print route (`kafli/[chapterSlug]/+page.svelte`) **already** renders a `.print-attribution` colophon at the end (lines 42–52), and `generate-pdfs.js` reuses that one raw render for **both** the standalone chapter PDF **and** the book merge — so the book currently carries the chapter colophon **22 times** (verified: `breytingar gerðar` × 22 in `-bok.pdf`), redundant with the front-matter colophon. This must be fixed.
- **Do NOT split into two full render tracks.** Rendering each chapter twice (bare-for-book + with-extras-for-standalone) doubles a ~3-min build for no real gain. Chapter-first rendering is deliberate and correct: a single whole-book `page.pdf()` of ~1400 pages is memory-risky; per-chapter renders are bounded and the pdf-lib merge is cheap. **The right pattern is: render chapter _content_ once, then diverge standalone vs book at the pdf-lib assembly stage** (they already load the raw separately — `standalone` vs `src`).

**Files:** `kafli/[chapterSlug]/+page.svelte` (remove inline colophon), a small colophon render (new tiny route or reuse `/bok` colophon), `scripts/generate-pdfs.js`.

- [x] Moved the colophon **out** of the shared chapter render (removed the inline `.print-attribution` from `kafli/+page.svelte`). New `/print/[bookSlug]/colophon` route renders a full colophon **page**; `generate-pdfs.js` renders it **once per book** and appends it (pdf-lib `copyPages`, unstamped addendum) **only to each standalone** `*-kafli-NN.pdf`. The book merges colophon-free chapters (no code change there — the raw chapters no longer contain a colophon).
- [x] Standalone colophon upgraded to the full set (credit / authors / publisher / source / **licence+URL** / **modification statement** / NC-SA notices) matching the `/bok` cover colophon — verified on the appended kafli page.
- [x] Also removed the **appendix** (`vidauki`) inline colophon — appendices only appear inside the book (no standalone appendix PDF), so the front-matter colophon covers them; this was the source of the book's 2nd colophon.
- **Kept in the book:** chapter **cover pages** (dividers). Also added the build date to the appendix cover for consistency.
- [x] **Acceptance MET:** `-bok.pdf` colophon count **23 → 1** (front matter only); every standalone `*-kafli-NN.pdf` carries **1** full colophon page; chapter dividers intact. (Marker: `Aðgangur að frumefninu` — book 1, kafli-03 1.)
- [x] Commit: `feat(pdf): standalone-only CC-BY colophon (stripped from book)`.

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

### Task 5.1: margin profiles + true-mirrored duplex

**Default is already DUPLEX** (Task 1.6, symmetric binding-safe margins). Task 5.1 adds the two harder options on top. **Files:** `scripts/generate-pdfs.js` (`parseArgs`, filler-page insertion, `stampPages` edge logic), `static/styles/print.css` (`@page :left`/`:right`).

- [ ] **True-mirrored duplex** (efficient: wide inner gutter, narrow outer) — requires forcing every chapter to start on a **recto** by inserting a blank verso filler page when a chapter would otherwise start on a verso, so per-chapter `@page :left`/`:right` parity matches the merged book. Then re-account folio numbers + TOC page numbers for the fillers. Only worth it if the symmetric outer margin (22mm) feels too wide in review.
- [ ] **`--profile bound`** (single-sided, spiral/4-hole): uniform left 26mm gutter, folios/headers on the right every page. (Original stampPages had this shape; re-add behind the flag.)
- [ ] **Acceptance:** duplex (default) mirrors correctly with no wrong-side gutters; `bound` has a consistent left gutter. Document in `docs/guides/deployment.md` / script header.
- [ ] Commit: `feat(pdf): mirrored duplex + bound profile`.

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
