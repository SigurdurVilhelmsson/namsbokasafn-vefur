# Cross-book CSS + D4 embed styling + a11y MathML — implementation handoff

**Created:** 2026-06-30 (handed off from a namsbokasafn-efni session). **Updated:** 2026-06-30 (added Task 3, a11y-2 assistive MathML). **Repo:** namsbokasafn-vefur.
**Status:** ready to implement in a fresh vefur session. **Owner:** vefur.

## Why this exists

The sister repo (namsbokasafn-efni) finished its pipeline-architecture arc (Track D cross-book onboarding,
D4 iframe embeds, B2 provenance routing — all merged) and, separately, shipped **a11y-2 assistive MathML**
(PR #203, merged 2026-06-30). That work surfaced **three vefur-side tasks** that efni cannot do (render HTML
class names/structure are a contract; the CSS and content-processing live here): two styling tasks (biology
is the next book to onboard, so its styling is the priority) and one accessibility follow-up.

All technical detail is also in vefur memory `css-cross-book-gaps` (auto-loaded); this doc is the
single actionable plan.

### Scope reconciliation (so you don't chase ghosts)

- The 2026-06-23 live-QA reader items **I / J / H / G are DONE** (PR #164; J's nginx side PR #166) — see
  memory `live-qa-reader-fixes-2026-06-24`. **Not in scope here.**
- "Suppress empty-glossary TOC entries" (fixlist item **E**) is an **efni-side** issue (stale efni-built
  `glossary.json`/`index.json` aggregates), handed back to efni — see memory `glossary-aggregates-stale`.
  **Not a vefur task.**
- This handoff is the two CSS tasks **plus** the a11y MathML follow-up (Task 3) below.

**File for both tasks:** `static/styles/content.css`. Existing note rules to mirror live at
`static/styles/content.css:227` (`article.cnx-module aside.note` base), `:264`
(`.note-link-to-learning`), `:271` (`.note-everyday-life`). Selector pattern: `article.cnx-module aside.note-<type>`.

---

## Task 1 — D4 embed wrapper CSS · 🟠 High · gates biology embeds going live

efni D4 makes PhET/YouTube `<iframe>` embeds render. Each embed now emits:

```html
<div class="embed-responsive">
  <iframe
    src="<resolved-url>"
    title="…"
    loading="lazy"
    allowfullscreen
    width="…"
    height="…"
  ></iframe>
</div>
<p class="embed-fallback">
  <a href="<resolved-url>" target="_blank" rel="noopener"
    >Opna í nýjum glugga</a
  >
</p>
```

`content.css` has **no** `.embed-responsive` / `.embed-fallback` rules today → the iframe renders at its raw
`width`/`height` attributes and **overflows on mobile**. Add a responsive aspect-ratio wrapper:

```css
.embed-responsive {
  position: relative;
  aspect-ratio: 16 / 9;
  max-width: 100%;
  margin: 1rem 0;
}
.embed-responsive iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.embed-fallback {
  margin-top: 0.25rem;
  font-size: 0.9em;
}
```

- ~51 biology embeds (PhET sims + YouTube), plus physics. The fallback link is **intentional resilience** —
  a video can refuse embedding with no header signal; keep it visible.
- **Note:** these classes only appear in rendered HTML **after efni re-renders the embed-bearing chapters
  and syncs content** to this repo. Until then you can test against a hand-authored fixture (drop the two
  HTML lines above into a section's content and `npm run dev`).
- **Acceptance:** a PhET/YouTube embed renders inside a 16:9 responsive box that scales to mobile width
  without horizontal overflow; the "Opna í nýjum glugga" fallback link is visible beneath it.

---

## Task 2 — 14 cross-book note/section CSS gap classes · 🟡 Medium · per-book launch polish

efni's css-contract test (parametrized over all 5 books) found **14 classes** that non-chemistry books emit
but `content.css` doesn't style. None break rendering (they fall back to base `.note` / plain divs) — they
lack per-type accent/section polish. They are tracked in **efni's `KNOWN_GAPS`** (the contract stays green,
logging each). **Biology is next → its note variants + `span-all` are the priority.**

**Note-type variants** (add per-type accent/color/icon; base box already comes from `.note` — mirror the
existing `.note-link-to-learning` rule at `content.css:264`):

- `.note-evolution`, `.note-career`, `.note-visual-connection` _(biology — priority)_
- `.note-microbiology` _(microbiology)_
- `.note-interactive` _(SHARED 'interactive' note type — **quick win**, mirror `.note-link-to-learning`)_

**End-of-chapter / section types** (currently unstyled section divs):

- `.section-exercises` _(organic)_
- `.section-summary`, `.conceptual-questions`, `.problems-exercises` _(physics)_
- `.chemistry-matters`, `.exercise-part`, `.key-terms-section` _(organic)_

**Layout / misc:**

- `.span-all` _(full-width table row — biology, microbiology; priority)_
- `.centered-text` _(organic)_

### Cross-repo verification loop (important)

- The authoritative checker is **in efni**: `tools/__tests__/css-contract.test.js`. Run it pointed at this
  repo with `VEFUR_CONTRACT=1 npx vitest run tools/__tests__/css-contract.test.js` (from the efni repo).
- **As each class gets a real rule here, remove it from efni's `KNOWN_GAPS`** so the contract re-arms (it
  will then catch an accidental future removal). This is a coordinated two-repo edit — flag it back to efni.
- **Acceptance:** biology note variants + `.span-all` styled and removed from efni `KNOWN_GAPS`; remaining
  classes follow as their books are onboarded. A biology page with an `.note-evolution` note and a
  `.span-all` table row renders with proper per-type styling (not the flat base `.note`).

---

## Task 3 — a11y-2 assistive MathML follow-ups · 🟡 Medium (one real fix) + verify items

efni's **a11y-2** (PR #203, merged 2026-06-30) makes server-rendered math accessible to screen readers.
`cnxml-render.js` (`tools/lib/mathjax-render.js`) now, **for every block and inline expression**, marks the
visual `<mjx-container>` `aria-hidden="true"` and appends a **visually-hidden, inline-styled** sibling:

```html
<mjx-container … aria-hidden="true"><svg …></svg></mjx-container
><math
  class="assistive-mathml"
  xmlns="http://www.w3.org/1998/Math/MathML"
  display="block"
  style="position:absolute;width:1px;height:1px;…clip:rect(0,0,0,0);…"
  >…source MathML…</math
>
```

The hiding is **inline** by design (self-contained — so the rendered HTML needs no CSS from this repo).
**These elements appear in synced content only after efni re-renders the math-bearing books and syncs.**
Until then, test against a hand-authored fixture (drop the snippet above into a section's content).

> **⏱ NOW TIME-SENSITIVE (updated 2026-06-30):** efni has **re-rendered efnafraedi-2e** — every equation in
> `05-publication` now carries the assistive `<math>` sibling (efni PR **#205**, the combined a11y-2 + A3
> re-render; gate: 5496 assistive-`<math>` == 5496 `<mjx-container>`). Per the efni delivery runbook
> (`namsbokasafn-efni docs/plans/2026-06-30-efnafraedi-rerender-sync-runbook.md`, Phase 2), **Task 3a below
> must land in this repo BEFORE that content is synced here** (`scripts/sync-content.js`) — otherwise the
> full-text search index ingests MathML tokens from every equation. So 3a is no longer "nice to have soon";
> it is the **gate on the sync** that delivers a11y-2 + A3 to namsbokasafn.is. 3b/3c remain verify-only.

### 3a — Search-index strip (✅ SHIPPED — gate satisfied)

> **✅ DONE 2026-06-30 — vefur PR #176 MERGED to `main` (`0c219e1`).** `htmlToPlainText` extracted out of the worker into `src/lib/utils/html.ts` (exported, worker-safe; `search.worker.ts` imports it). The leak was **inline math only** (block `.mathjax-display` was already stripped); regex hardened to `\bassistive-mathml\b` after grepping the real efni `05-publication` (~5,496 hits, no namespace prefix). Tests in `src/lib/utils/html.test.ts` (RED-verified). Phase 2 gate satisfied → **Phase 3 (sync+deploy) is lead-side on the deployment server.** efni runbook updated via efni PR #206.

> **▶ Execution-ready brief:** `docs/plans/2026-06-30-vefur-task3a-search-index-strip-brief.md` (TDD steps, testability decision, exact regex, acceptance).

`src/lib/workers/search.worker.ts` strips MathJax before indexing: `:39` removes `<mjx-container>…</mjx-container>`,
`:40` removes block `<span class="mathjax…">…</span>`. **Neither covers the new `<math class="assistive-mathml">`
sibling** — and for **inline** math (wrapped in `<span class="math-inline">`, which `:40` does not match), the
generic tag-strip at `:42` then leaves the MathML's **text** (variable letters from `<mi>`, numbers from `<mn>`,
operators) in the full-text index → search noise that didn't exist before (content was SVG-only).

- **Fix:** add a strip for the assistive sibling **before** the generic `<[^>]*>` strip at `:42`, e.g.
  `.replace(/<math\b[^>]*class="assistive-mathml"[\s\S]*?<\/math>/gi, '')` (lazy — MathML can't nest `<math>`).
- **Acceptance:** after the strip, indexing a section with inline + block math yields no stray single-letter /
  bare-number tokens from equations; a search for a real word in the surrounding prose still hits.

### 3b — Verify items (🟢 likely no change, confirm)

- **Print / PDF** (`static/styles/print.css` styles `.mathjax-display` / `mjx-container` at `:108`,`:151`): the
  assistive `<math>`'s **inline** `position:absolute;clip` should keep it hidden in print too, but print.css has
  no `<math>` rule — **verify the per-chapter/full-book PDFs (`scripts/generate-pdfs.js`) don't show duplicated
  or stray MathML.** If they do, add a `print.css` rule hiding `.assistive-mathml`.
- **Bionic reading** (`src/lib/actions/bionicReading.ts:15` keeps a skip-list incl. `mjx-container`): consider
  adding `math` / `.assistive-mathml` so the transform skips it. Cosmetic only (it's visually hidden), low
  priority.
- **Post-deploy screen-reader validation:** once efni re-renders+syncs, confirm with a real screen reader
  (VoiceOver/NVDA/Orca) that equations are now announced and navigable — this is the validation leg of
  reader-plan **§ P2.5**.

### 3c — Do NOT add MathML-hiding CSS to `content.css`

The sibling is hidden by its **inline** style on purpose (fail-safe, self-contained). Do **not** add a
`content.css`/`app.css` rule that hides or restyles `math` / `.assistive-mathml` in a way that could fight the
inline style — that would re-introduce the cross-repo coupling a11y-2 deliberately avoided. (Confirmed: vefur
`content.css` has no `math {` selector today.) `app.css` already styles `mjx-container` (the visible SVG) — leave that.

- **No-action note:** `src/lib/actions/equations.ts` selects by class (`.equation`, `.mathjax-display`,
  `.equation-content`), **not** the `<math>` tag, so it will not double-process the new sibling.

---

## Suggested order

1. **Task 1 (embed CSS)** — small, self-contained, unblocks biology embeds. Do first.
2. **Task 2 biology subset** — `.note-evolution`/`.note-career`/`.note-visual-connection` + `.span-all` +
   the `.note-interactive` quick win — before biology launch.
3. **Task 3a (search-index strip)** — small, real, and independent of the re-render (testable against a
   fixture now); do alongside Task 1. Task 3b/3c are verify-only.
4. Remaining Task 2 classes (organic/physics/microbiology) as each book is onboarded.

## References

- vefur memory: `css-cross-book-gaps` (the source detail), `project_multibook`, `a11y-assistive-math-from-efni` (Task 3).
- efni memory: `d4-iframe-embeds`, `pipeline-architecture-audit-2026-06`, `a11y-2-assistive-mathml` (Task 3 origin).
- efni consolidated backlog: `docs/plans/2026-06-28-pipeline-architecture-implementation-plan.md`
  § ★ Consolidated Backlog (the 🔗 vefur row).
- a11y origin: `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md` § P2.5.
