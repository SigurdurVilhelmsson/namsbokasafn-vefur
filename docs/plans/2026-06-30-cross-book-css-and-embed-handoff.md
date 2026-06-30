# Cross-book CSS + D4 embed styling — implementation handoff

**Created:** 2026-06-30 (handed off from a namsbokasafn-efni session). **Repo:** namsbokasafn-vefur.
**Status:** ready to implement in a fresh vefur session. **Owner:** vefur.

## Why this exists

The sister repo (namsbokasafn-efni) finished its pipeline-architecture arc (Track D cross-book onboarding,
D4 iframe embeds, B2 provenance routing — all merged). That work surfaced **two vefur-side styling tasks**
that efni cannot do (render HTML class names are a contract; the CSS lives here). Biology is the next book
to onboard, so its styling is the priority.

All technical detail is also in vefur memory `css-cross-book-gaps` (auto-loaded); this doc is the
single actionable plan.

### Scope reconciliation (so you don't chase ghosts)

- The 2026-06-23 live-QA reader items **I / J / H / G are DONE** (PR #164; J's nginx side PR #166) — see
  memory `live-qa-reader-fixes-2026-06-24`. **Not in scope here.**
- "Suppress empty-glossary TOC entries" (fixlist item **E**) is an **efni-side** issue (stale efni-built
  `glossary.json`/`index.json` aggregates), handed back to efni — see memory `glossary-aggregates-stale`.
  **Not a vefur task.**
- This handoff is **only** the two CSS tasks below.

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

## Suggested order

1. **Task 1 (embed CSS)** — small, self-contained, unblocks biology embeds. Do first.
2. **Task 2 biology subset** — `.note-evolution`/`.note-career`/`.note-visual-connection` + `.span-all` +
   the `.note-interactive` quick win — before biology launch.
3. Remaining Task 2 classes (organic/physics/microbiology) as each book is onboarded.

## References

- vefur memory: `css-cross-book-gaps` (the source detail), `project_multibook`.
- efni memory: `d4-iframe-embeds`, `pipeline-architecture-audit-2026-06`.
- efni consolidated backlog: `docs/plans/2026-06-28-pipeline-architecture-implementation-plan.md`
  § ★ Consolidated Backlog (the 🔗 vefur row).
