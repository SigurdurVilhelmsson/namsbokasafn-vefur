# Learning-Objectives Revival + M4 Fix — Design

> Status: approved design (brainstorming output). Next: implementation plan via writing-plans.
> Scope decided 2026-06-19. Cross-repo (namsbokasafn-efni + namsbokasafn-vefur).

## Problem

Audit finding **M4**: objectives chapter/overall progress is always 100%. Investigation
showed this is the visible tip of a larger issue — **the learning-objectives interactive
feature is inert**:

- Objectives exist only as `.learning-objectives` HTML (`<ul><li>`); section page-data
  carries no `objectives` array, and `scripts/process-content.js` hardcodes
  `section.metadata.objectives = []`.
- Therefore `data.section.objectives` is always empty → the section reader's interactive
  checkbox block (`{#if data.section.objectives.length > 0}`) never renders → objectives
  can't be marked complete anywhere.
- `ReflectPhase.rate()` calls `setObjectiveConfidence`, which **no-ops unless an entry
  already exists** — so study-session rating records nothing either.
- The store only persists _completed_ objectives (un-completing deletes the entry), so any
  progress percentage computed from stored entries is structurally always 100%.

Reproduced (2026-06-19): visiting a section yields 0 interactive checkboxes and an empty
objectives store; seeding 2 completed objectives directly makes `/markmid` show 100%.

This is the same "data source dried up in a pipeline migration" pattern as the
practice-problem feature (see vefur memory `practice-problem-feature-inert`).

## Pedagogical frame (decided)

Track two **separate** constructs:

- **Assessed** — the learner has engaged with the objective (section checkbox, or rated it
  in ReflectPhase). Stored as an entry.
- **Confidence** — a 1–5 self-rating (calibration). Optional, and the _headline_ metric.

A self-marked completion % rewards clicking, not learning (it produced the misleading
100%). Confidence calibration is the pedagogically valuable signal, and `/markmid` already
half-implements it (confidence distribution + low-confidence "Þarfnast endurskoðunar" list).
So:

- `/markmid` **headline = confidence calibration**; a true **coverage bar**
  (`assessed / real total`) is secondary.
- A low-confidence ("1") rating reads as "assessed, needs review" — never as "done."
- Tying objectives to actual retrieval (recall/practice performance) is stronger still, but
  that's v1.2 Kvörðun territory — noted as a future integration, **not built here** (YAGNI).

## Architecture (cross-repo)

### efni (prerequisite — the data source) — separate efni-rooted session

- `tools/cnxml-render.js`: emit a structured `objectives: string[]` into each section's
  page-data JSON (alongside the existing `equations`/`terms`), extracted from the same
  source that produces the `.learning-objectives` block.
- Add a render test asserting page-data carries `objectives`.
- Re-render content; sync to vefur.
- **Distinct from** the already-shipped `check-knowledge-answer` marker (efni PR #137) —
  this is a new page-data field. Could be bundled into a follow-up efni render change.
- Rationale: CLAUDE.md — "fix content at the source; avoid vefur workarounds." Parsing the
  `.learning-objectives` HTML in vefur was explicitly rejected for this reason.

### vefur (this repo)

1. `scripts/process-content.js`: read `pageData.objectives` →
   `section.metadata.objectives` (replacing the hardcoded `[]`), so `toc.json` carries each
   section's objectives (texts + count).
2. **Section reader** (`[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte`): the
   existing checkbox block now renders and is markable once `data.section.objectives` is
   populated. Reframe UI copy from "kláruð/completed" toward "assessed" where it implies
   mastery (keep it light; this is the section-local x/y counter).
3. **`src/lib/stores/objectives.ts`**:
   - `getChapterObjectivesProgress` / `getOverallObjectivesProgress`: accept the **real
     total** (as `getSectionObjectivesProgress` already does) instead of deriving the
     denominator from stored entries. Guard total === 0.
   - Add a new **upsert** method `rateObjective(book, ch, sec, idx, text, confidence)`
     that creates the entry (assessed = `isCompleted: true`) AND sets confidence, so
     ReflectPhase records data. Leave `setObjectiveConfidence`'s existing "only if present"
     contract unchanged (still used where an entry is known to exist); ReflectPhase switches
     to `rateObjective`.
   - Keep the `isCompleted` storage field (now meaning "assessed") to minimize churn;
     only UI language/headline changes.
4. **`/markmid`** (`[bookSlug]/markmid/+page.svelte`):
   - Load real totals from `toc.json` (book-wide sum of section objective counts).
   - Headline: confidence distribution + low-confidence review list (already present).
   - Secondary: true coverage bar = `assessed / real total`. Fix the inline
     `progressPercent` (currently `completed / stored`).
   - Extract the coverage/calibration math into a testable pure helper.
5. **ReflectPhase** (`src/lib/components/study/ReflectPhase.svelte`): `rate()` upserts
   (assessed + confidence) via the new store method.

## Data flow

```
efni cnxml-render → page-data.objectives → (sync) → process-content.js → toc.json (section.objectives)
   → section page: data.section.objectives → checkboxes (mark assessed) → objectivesStore
   → /markmid: toc totals + objectivesStore → coverage % + confidence calibration
   → /nam ReflectPhase: extracted objectives → rate() → objectivesStore (upsert)
```

## Edge cases

- Section with no objectives → contributes 0 to the total; no checkbox block.
- **Books not yet re-rendered by efni** (objectives still `[]`) → feature degrades cleanly
  to an empty state; coverage shows "0 of 0"; no `/0` or NaN. `progressPercent` already
  guards `total > 0`; the chapter/overall getters must too.
- Cross-book key prefixes already handled (`bookSlug/...`).
- No data migration: no meaningful objectives entries exist today (feature was inert).

## Testing

- **efni** (efni session): render test asserting page-data includes `objectives`.
- **vefur**:
  - `objectives.ts`: progress computed against a real total is not always 100%; chapter &
    overall getters use the passed total and guard 0; the upsert rating creates an entry
    with `isCompleted` (assessed) + confidence.
  - `process-content.js`: populates `section.metadata.objectives` from page-data.
  - `/markmid`: coverage/calibration math (via the extracted pure helper).
  - Optional Playwright check once efni objectives land + sync.

## Coordination / order

- The efni emission is a hard prerequisite for **live** data, but vefur code can be built
  and unit-tested independently with fixtures / a seeded `toc.json`.
- Full end-to-end verification needs the efni change landed + synced.
- The efni half belongs in an efni-rooted session (cross-repo protocol); tracked in efni
  memory alongside the marker work.

## Out of scope (YAGNI)

- Tying objective mastery to recall/practice performance (v1.2 Kvörðun integration).
- Renaming the `isCompleted` storage field.
- Re-rendering / objective emission for books beyond what efni schedules.
