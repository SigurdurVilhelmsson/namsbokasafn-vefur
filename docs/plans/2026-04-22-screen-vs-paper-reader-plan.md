# Reader development plan — closing the screen-vs-paper gap

**Date:** 2026-04-22
**Branch of origin:** `claude/evaluate-reader-research-aCOVa`
**Status:** Plan only — no code changes yet
**Source research:** "Why screens lose to paper — and how to build a reader that closes the gap" (Claude-generated literature review, April 2026), drawing on Delgado et al. 2018, Clinton 2019, Salmerón et al. 2024, Dunlosky et al. 2013, Ackerman & Lauterman 2012, Roediger & Karpicke 2006, and others.

## Executive summary

The screen-inferiority effect (Hedges' g ≈ −0.21 to −0.25 in favor of paper for expository text) is driven by two mechanisms screens make worse: shallow processing and over-confident self-monitoring. The literature is unusually clear about which UI choices import the failure mode and which mitigate it.

Audit of this reader against that literature shows the learning-science scaffolding is in place (SM-2, four-rating reviews, study-session phases, learning objectives, read-detection, analytics) but the four highest-evidence interventions are missing or implemented in ways that work against the research:

1. The whole section renders as one scrollable page (worst case in Salmerón et al. 2024)
2. Default measure (~97 chars/line) exceeds the 50–75 char band
3. Section completion shows a celebration animation with no retrieval prompt
4. Flashcard confidence is asked after the answer reveals, not before

This plan addresses each, sized in **Claude Code sessions** (one focused 1–3 hour session). Total P0: ~8 sessions; P1: ~6 sessions; P2: ~3 sessions; P3 (AI tutor) deferred.

## Audit summary

Full audit lives in conversation history; the structural findings are:

| Area | Current state | File:line |
|---|---|---|
| Section render | One scrollable `<article>` | `[sectionSlug]/+page.svelte:189`, `ContentRenderer.svelte:52-67` |
| Default measure | `--content-width: 52rem` ≈ 97 chars | `app.css:23-25,344-345` |
| Default theme | `'light'`, no `prefers-color-scheme` | `settings.ts:62` |
| Body font | Literata 16px, line-height 1.75 | `app.css:130,265,466-467` |
| OpenDyslexic | Offered as "Letur hannað fyrir lesblinda" | `SettingsModal.svelte:34-38` |
| Atkinson Hyperlegible | Not offered | — |
| Section markers in HTML | `<section>` with h2/h3 present | `content.css:147-161` |
| Read detection | IntersectionObserver + 1500ms | `readDetection.ts:31-106` |
| Section-end behavior | "Vel gert!" particle burst, no retrieval | `[sectionSlug]/+page.svelte:137-149` |
| Flashcard rating | Post-reveal only, no pre-prediction | `ReviewPhase.svelte:120-150` |
| Confidence ↔ performance | Stored separately, never compared | `objectives.ts:215-237`, `analytics.ts` |
| Highlights | Visual + Markdown export, no card path | `TextHighlighter.svelte`, `annotation.ts` |
| AI integration | None | — |

## Prioritized roadmap

### P0 — Closes the highest-evidence gaps

| # | Item | Sessions | Research basis |
|---|---|---|---|
| P0.1 | Tighten default measure to 38rem (~71 chars) | 1 | Baymard / NN-G / Bringhurst 50–75 char band |
| P0.2 | Replace section-completion celebration with free-recall prompt | 1 | Roediger & Karpicke 2006; Dunlosky 2013 |
| P0.3 | Predict-first flashcard rating (2-point pre-prediction) | 1 | Ackerman & Lauterman 2012; Clinton 2019 |
| P0.4 | Hybrid viewport-aware pagination (Option C — see detailed spec below) | 5 | Salmerón et al. 2024 (g 0.35–0.48 → 0.03–0.12) |

### P1 — Closes the metacognitive loop

| # | Item | Sessions | Research basis |
|---|---|---|---|
| P1.1 | Calibration tab on `/greining` (confidence vs. actual perf) | 2 | Ackerman; Clinton |
| P1.2 | Pre-question on section load | 1 | Pre-questions branch of testing-effect literature |
| P1.3 | Highlight → cloze card in one tap | 2 | Dunlosky 2013 (couple highlights to active use) |
| P1.4 | Typography corrections: relabel OpenDyslexic, add Atkinson Hyperlegible Next, `prefers-color-scheme` only when unset | 1 | Rello & Baeza-Yates 2013; Wery & Diliberto 2017 |

### P2 — Polish

| # | Item | Sessions |
|---|---|---|
| P2.1 | Bounded progress label ("Hluti N af M") replaces 2px scroll bar | 0.5 |
| P2.2 | Spaced-review surfacing in study planner | 1.5 |
| P2.3 | Recall-review tab in `/bokamerki` | 1 |
| P2.4 | `CLAUDE.md` note: optimize for expository, not narrative | 0 |

### P3 — Larger bets, evaluate after P0–P1

| # | Item | Sessions | Note |
|---|---|---|---|
| P3.1 | Socratic-only AI tutor | 8–12 | Build only after P0.2/P0.3 ship; constraints in research |
| P3.2 | Social annotation | — | Probably skip; not justified at current scale |

---

## P0.4 detailed spec — hybrid viewport-aware pagination (Option C)

### Goal

Eliminate required scrolling within a logical reading unit. Top-level navigation is sub-section by sub-section (the boundaries already in the prerendered HTML); within a sub-section, if content exceeds viewport height it splits at safe break points into "inner pages." User advances with Next/Prev (keyboard, button, swipe); never scrolls to complete a unit.

This is the only item in P0 that crosses architectural boundaries. Every other item is contained in one or two files.

### Why hybrid (not pure sub-section, not pure viewport)

- **Pure sub-section chunking (Option A):** Cosmetic. Long sub-sections still scroll. Doesn't move the Salmerón effect-size needle.
- **Pure viewport pagination (Option B):** Correct but over-engineered. Requires a full pagination engine for content the source already segments.
- **Hybrid (Option C):** Use the source's natural sub-section breaks as the outer pagination level. Within each sub-section, run a layout-time splitter that creates inner pages only when needed. Most sub-sections are 1–3 inner pages; many short ones stay as a single page.

### Data model

```ts
type SubsectionState = {
  index: number;          // 0..N-1 over article.cnx-module > section
  innerPages: PageBreak[]; // empty if no split needed
  currentPage: number;    // 0..innerPages.length - 1, or 0 if no split
  read: boolean;
};

type PageBreak = {
  startNodeIndex: number; // child index into the sub-section's element list
  endNodeIndex: number;   // exclusive
  approxHeightPx: number;
};

type ReaderViewState = {
  subsections: SubsectionState[];
  currentSubsection: number;
  layoutKey: string;      // `${fontSizePx}|${measurePx}|${viewportH}|${lineHeight}`
};
```

`innerPages` is computed on demand and cached keyed by `layoutKey`. Settings change → invalidate, recompute, restore reading position by `(subsectionIndex, firstVisibleNodeIndex)`.

### Page-break algorithm

Pure function over a flat list of top-level child elements of one sub-section. Runs after fonts loaded, MathJax SVG settled, images loaded.

```
input:  children: HTMLElement[]   (direct children of a <section>)
        viewportH: number          (available reading height in px)

walk children in order:
  page = []; pageH = 0
  for each child:
    h = measure(child)               // offsetHeight after layout
    atomic = isAtomic(child)         // see classification below

    if atomic and h > viewportH:
      // unavoidable: this block alone exceeds the page
      flush(page); push([child]); continue

    if pageH + h <= viewportH:
      page.push(child); pageH += h; continue

    if !atomic and looksLikeParagraph(child) and pageH > 0.3 * viewportH:
      // OK to break here; commit current page and start fresh
      flush(page); page = [child]; pageH = h
    else if pageH > 0:
      // commit before this child to avoid overflow
      flush(page); page = [child]; pageH = h
    else:
      // empty page would result; force this child onto its own page
      flush([child]); page = []; pageH = 0

  flush(page) if non-empty
```

`isAtomic` (never split, never share with subsequent if it pushes overflow):

- `figure`, `table`, `pre`, `.equation`, `.math-display`, `mjx-container[display="true"]`
- `.note`, `.example`, `.exercise`, `.checkpoint`, `.learning-objectives`, `.chapter-outline`
- `h2`, `h3` — atomic *and* "keep with next" (a heading at end of page moves to top of next)

`looksLikeParagraph`: `p`, `ul > li`, `ol > li` — these can sit at page boundaries without harm.

### Rendering

- Each inner page is rendered as a fixed-height container `overflow: hidden`, holding the slice of the sub-section's children.
- Page transition: instant by default; honor `prefers-reduced-motion`. Behind a setting, allow a 150ms cross-fade.
- Outer scroll is locked to the body when paginated mode is active. Tall atomic blocks (rare; e.g. a wide figure) get internal scroll within their page only.

### Navigation

- Buttons: visible Prev / Next at bottom of reading region; labeled "Fyrri" / "Næsta".
- Keyboard: `→` / `Space` / `PageDown` = next; `←` / `Shift+Space` / `PageUp` = prev. Existing keyboard-shortcuts action (`keyboardShortcuts.ts`) registers these alongside its current bindings.
- Touch: swipe left = next, right = prev. Ignore vertical swipes; do not interfere with browser pull-to-refresh.
- Position label: "Hluti N af M · Síða X af Y" in the section header. Replaces the 2px scroll bar (P2.1 ships as part of this item, not separately).

### URL scheme

- `/[bookSlug]/kafli/[ch]/[sec]` — sub-section 0, inner page 0 (default)
- `/[bookSlug]/kafli/[ch]/[sec]#sub-3` — sub-section 3, inner page 0
- `/[bookSlug]/kafli/[ch]/[sec]#sub-3-p-2` — sub-section 3, inner page 2
- Hash changes update state without full navigation; SvelteKit `goto(..., { replaceState: true })` for in-section moves to keep history clean.

### Read detection rewire

Today: IntersectionObserver on end-of-section marker fires `markAsRead` once.

Pagination changes the contract:

- A **sub-section is read** when the user advances past its last inner page (Next from the last page → marks prior sub-section read AND advances).
- The **whole section is read** when all sub-sections are read.
- The free-recall prompt (P0.2) fires on **sub-section** completion, not whole-section. Granularity is closer to the research's "between sections" cadence and avoids the trap of asking for a recall over 4000 words at once.
- Manual "mark as read" remains for accessibility (and for users who already finished and want to skip).

### Cross-references and in-page links

- On click of an internal anchor (`#fig-1.2`, `#eq-3.4`, glossary term jumps): resolve the target's sub-section index and inner page; navigate to that page; scroll target into view *within* the page if internally scrollable.
- Glossary tooltips and figure-viewer lightbox already use absolute-positioned overlays; unaffected by pagination.
- Cross-section links (e.g. "see chapter 4.2") work as before — full SvelteKit navigation.

### Settings interaction

- Pagination is on by default.
- Setting: "Lestrarstilling" (Reading mode) — `paged` (default) | `scrolled`. Scrolled mode preserves the current behavior verbatim (no page splits, full overflow scroll). One source of truth, not branching code paths in N components.
- Font size, line height, measure changes invalidate `layoutKey` → recompute pages for current sub-section (not all of them — lazy on visit).
- ResizeObserver on the reading container, debounced 150ms, triggers the same recompute path.

### Accessibility

- Screen reader users get **scrolled mode by default** when a screen reader is detected via... actually, no — there is no reliable SR detection in browsers. So instead: a clearly labeled toggle in settings ("Samfellt skrun" / Continuous scroll), and a one-line note in the settings explaining when to prefer it.
- Each page change announces "Síða X af Y" via `aria-live="polite"` region.
- Focus: when navigating Next/Prev, move focus to the first focusable element of the new page, or to the page container itself with `tabindex="-1"`. Prev/Next buttons retain their focus position for repeated activation.
- `prefers-reduced-motion: reduce` disables any transition.

### MathJax considerations

- MathJax SVG is pre-rendered in the HTML pipeline, so heights are stable once the DOM is parsed.
- Display equations are atomic — never split mid-equation.
- Inline math sits in flow with paragraphs; no special handling.
- If MathJax is ever switched to client-side rendering (not currently the case per `CLAUDE.md`), the `MathJax.startup.promise` must resolve before the page-break algorithm runs.

### Figure and table handling

- `<figure>` + `<figcaption>` treated as one atomic unit.
- If a figure exceeds viewport height: figure gets its own page. Within that page, allow internal vertical scroll *and* the existing zoom action (`figureViewer.ts`) — user can tap to lightbox at full size.
- Wide tables: same atomic-with-internal-scroll pattern. Long tables (> viewport height) get their own page; horizontal scroll within if wide.

### Fallback behavior

- SSR renders scrolled content (current behavior). Pagination is purely client-side enhancement applied after hydration.
- Feature detect `ResizeObserver`. If absent (very old browsers), fall back to scrolled mode silently.
- If the JS layout pass throws for any reason: log to console, fall back to scrolled mode for that sub-section. Per-sub-section graceful degradation, not whole-app failure.

### Test plan

- **Vitest unit tests** for `paginate(children, viewportH)`:
  - Short sub-section → 1 page
  - 5 paragraphs of equal height, viewport fits 2 → 3 pages
  - Atomic block at end of would-be page → moved to next page
  - Atomic block taller than viewport → on its own page
  - Heading at page end → "keep with next" promotes to next page
- **Playwright E2E** on a known long section (e.g., a chemistry chapter with multiple figures and equations):
  - Navigate from page 1 to last page via keyboard; assert no scroll occurs
  - Resize window mid-read; assert position preserved
  - Change font size; assert recompute and position preserved
  - Toggle to scrolled mode and back; assert content identical
  - Click a cross-reference; assert lands on correct page with target visible
- **Manual smoke** before merge:
  - Equation-heavy section
  - Figure-heavy section (Chapter 1 has many)
  - Very short sub-section (< viewport)
  - Mobile viewport (375px width)
  - Screen reader pass (VoiceOver/NVDA): verify continuous-scroll toggle and aria-live announcements

### Effort breakdown (sessions)

| Sub-task | Sessions |
|---|---|
| Sub-section segmentation + outer Prev/Next + state model | 1 |
| Page-break algorithm + caching by layoutKey | 1.5 |
| Settings toggle + scrolled-mode fallback path | 0.5 |
| URL scheme + deep-link routing + cross-reference resolver | 0.5 |
| Read-detection rewire + free-recall integration with P0.2 | 0.5 |
| Keyboard / touch / focus management / aria-live | 0.5 |
| ResizeObserver + recompute + position preservation | 0.5 |
| Vitest + Playwright tests | 1 |
| **Total** | **~6 sessions** |

(Slightly over the earlier "5" estimate once tests are included honestly.)

### Acceptance criteria

1. On a chemistry chapter at default settings (16px, 38rem, viewport 1024×768), no required vertical scrolling within any inner page.
2. Page recompute on font-size change preserves the user's current first-visible-node within ±1 page.
3. Deep-link `#sub-3-p-2` lands directly on that page after hydration.
4. Continuous-scroll toggle restores byte-identical reading experience to today's implementation.
5. All existing E2E tests pass; new pagination tests pass.
6. Read-detection still marks sections complete (now via "advanced past last page"); free-recall prompt fires per sub-section.
7. No layout shift after MathJax / image load completes (page-break runs after).

### Sequencing inside P0

P0.1 (measure) and P0.2 (free recall) are independent and can ship first — they sharpen the existing scrolled experience. P0.3 (predict-first flashcards) is fully orthogonal. P0.4 (this) should ship last in P0 because the free-recall prompt's hooking point changes from "scrolled to bottom" to "advanced past last inner page," and it's cheaper to write the free-recall code once against the new contract than to migrate it.

Recommended order: **P0.1 → P0.3 → P0.2 (scaffold against scrolled mode) → P0.4 (rewires P0.2's trigger to per-sub-section).**

---

## Effort summary

| Tier | Items | Sessions | Calendar (evenings) |
|---|---|---|---|
| P0 | 4 items | ~8 | ~2 weeks |
| P1 | 4 items | ~6 | ~1.5 weeks |
| P2 | 3 items + 1 doc note | ~3 | ~0.5 week |
| P3 | AI tutor (deferred) | 8–12 | 2–3 weeks when started |

After P0 ships, the defensible claim is: every documented driver of the screen-inferiority effect — required scrolling, excess line length, unprompted completion, uncalibrated self-monitoring — has been directly designed against. That is the specification the literature implies.
