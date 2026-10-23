# D08 · P1.1 'Kvörðun': action list, per-section half, or defer

- **Date:** 2026-10-23
- **Status:** Ruled. Content: (a) Action list only. Scope: (a) All books, labelled 'Öll minniskort' (proposed) for now.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D08 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S14.5
- **Register:** PED-09, PED-10, CODE-14, PED-08
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

When P1.1 ('Kvörðun') is ported, does it show an action list, the list plus a relabelled per-section half, or nothing yet; and one book's cards, or all as 'Öll minniskort' (proposed)?

## Rulings

### What 'Kvörðun' shows

**(a) Action list only.** Lead with 'Kort sem komu þér á óvart' and 'Æfa þessi kort núna' (both proposed), reviewing exactly those cards; counts replace the 'Raunsætt sjálfsmat' headline [PED-09].

- Cost: S14.5–S14.7: 3 sessions.
- The review's final recommendation (8.5): the action list after the pilot, without the per-section half. The reviewers' own recommendation (8.5; 4.7; PED-10): keep that half, relabelled as self-assessment, with no verdicts. This ruling follows it.

### Which cards it counts

**(a) All books, labelled 'Öll minniskort' (proposed) for now.** The register's fix: review entries carry no book today, so the flashcard half is labelled as covering every book [PED-09].

- Cost: Inside S14.5–S14.7.
- The review's recommendation: PED-09's fix (5): label it 'Öll minniskort' for now. This ruling follows it.

## What follows

- Unblocks S14.5 (after S4.5) and sets its book scope. S14.6 also needs D04 and D20; S14.7 builds the per-section half only as ruled, and needs D23.
- Under (a), S14.7 builds no per-section half; it still builds D04's re-queue (D04, ruled the same day).
- S14.6's other two prerequisites, D04 and D20, were ruled the same day; S14.7's D23 is ruled at S12.0.

## The brief's evidence

- 'Raunsætt sjálfsmat' is plain agreement: always tapping 'Man það' at 80% recall scores the same as predictions that separate known from unknown cards by 60 points [PED-09].
- The section verdicts compare two self-reports, objective confidence and self-graded practice [PED-10]. With the standard in view, middle-school students still credited 44% of their wrong definitions, 73% without (R2-18) (report 4.7).
- 'Erfitt' is stored as wrong (quality 2, below 3), so an effortful correct recall after 'Man það' counts as 'Ofmat'; S14.6 gives it its own cell unless D04 relabels the ratings [PED-08].
- Calibration feedback and dashboards have weak, abstract-level support (R2-19, R2-20, R5-21) (report 4.7); the tab's maths is untested and its sort runs backwards [CODE-14].

## Measured for the brief (main `0cdeab0`)

- `node v0609_calib.mjs` (e3b29c7 CalibrationTab.svelte:27-49, :102) → always 'Man það', 80 of 100 right: 80%; 50/50 predictions, 90% vs 30% right: 80%; 'Most overconfident first' sorts −60, 0, 25, 60.
- `git show origin/main:…` → types/flashcard.ts:31 hard: 2; stores/flashcard.ts:296 wasCorrect: quality >= 3. `node v0609_srs_hard.mjs` (main's srs.ts) → 'Gott', 'Gott', 'Erfitt': 1, 6, 1 days, ease 2.18.
- `git grep -l predictedKnown origin/main -- src` → none: P0.3 is not on main yet (S4.1).

## Caveats the brief listed

- 8.5 does not say which pilot; elsewhere 'the pilot' is the classroom pager pilot (9.6), and M14 (autumn 2027) waits for weeks of predictions.
- Holding the half back 'until a scored outcome exists' means indefinitely: every practice writer self-grades [PED-10]. Verifiers differ on per-book scoping [PED-09].

## Options not chosen

- What 'Kvörðun' shows: (b) Plus the per-section half
- What 'Kvörðun' shows: (c) Defer
- Which cards it counts: (b) One book at a time
