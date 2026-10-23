# D06 · The pager until call 3: dark or early opt-in

- **Date:** 2026-10-23
- **Status:** Ruled: (b) Early opt-in, on a condition (below).
- **Decided by:** [USER], in step S0.2's decision session, with the follow-up answers [USER] gave the same day (below)
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D06 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S8.2
- **Register:** PED-01, CODE-05, PED-35, UI-03
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Until call 3 is ruled, does the ported pager stay dark (visit-only '?lestur=' links), or may readers opt in through 'Lestrarstilling' before the crossover?

## Ruling

**(b) Early opt-in.** S11.1–S11.3 (those four fixes, an accessible 'Lestrarstilling') and S11.5 come before S9.6. A mode is stored only when picked, the default stays scrolled, and call 1 is ruled first (S8.2; S11.5; S9.6).

- Cost: About 4–5 sessions (M9 goal).
- The review's recommendation (8.5): early opt-in, if the crossover still fits before the May exams (at 1.5 sessions a week it moves from mid-April to about early May). This ruling follows it.

## What follows

- Unblocks S8.2. Under (a), an opt-in reaches readers if call 3 rules one, in M11 (late May 2027 at 1.5 a week); under (b), S9.6 first needs S11.1–S11.3 and S11.5.
- Call 1, which (b) needs ruled first, was ruled the same day (CALL1).

## The condition, recorded at [USER]'s request

[USER] chose (b) with the review's condition: **the early opt-in holds only if the in-class crossover still fits before the May 2027 exams.**

- The opt-in puts about 4–5 sessions before S9.6 and saves 3 in M11 (M9 goal). The M9 goal's 'about 37 sessions from today' leaves them out; with them it is 41.25–42.25 (the brief's caveat).
- At 1.5 sessions a week, that moves the crossover from mid-April 2027 to about 24 April–3 May, depending on which break weeks are counted (the brief's measurement, below; the review says 'about early May').
- At one session a week, the crossover falls in the autumn 2027 term with or without the opt-in (M10 goal), so the condition cannot hold at that pace.
- No source dates the May exams. [USER] gives the dates before S9.0.

**Checkpoint: S9.0**, where D21 sets the crossover's term. If the crossover does not fit before the exams, (b) lapses and D06 is ruled again there; the other option is (a), dark until call 3. Until then the plan runs as (b).

## The brief's evidence

- As built, v1.1 silently switches every existing profile to paged [PED-01], as today's store saves every default on first load [CODE-05]; a store saving only chosen values comes first (S8.2 needs S6.3).
- Paging's direct evidence is null or weak (R1-04, phones excluded; R1-14; a trend, p = .066, R1-13) (report 8.3); PED-01 reads one abstract-only study as a case for offering paged, not imposing it (R1-12).
- 'Lestrarstilling' as built shows its choice by colour only, an accessibility failure (WCAG 4.1.2, Level A) [UI-03]. One class can expose large harms, not prove equivalence [PED-35].

## Measured for the brief (main `0cdeab0`)

- `git show dde768e:src/lib/stores/settings.ts` → :77 readingMode: 'paged'; on origin/main :108-110 write the full state on load, and `grep -c -E 'settingsVersion|chosen'` → 0.
- `git grep -l -E 'readingMode|PagedReaderControls|lestur=' origin/main -- src` → none; dde768e SettingsModal.svelte: 0 aria-pressed.
- `python3 -I v0609_timing.py` (plan estimates; 5.5 sessions by 1 Nov; assumed none 14–20 Dec, 4 over 21 Dec–3 Jan) gives 16.5 to M4, 37.25 to S9.6 and, at one a week, 15.5 supplied by January (report 9.3). At 1.5 a week S10.2's desk work ends 6 Apr; 4–5 sessions ÷ 1.5 = 2.7–3.3 weeks → 24–29 Apr (to 3 May with other break dates). Reproduced.

## Caveats the brief listed

- No source dates the May exams (spring term: January–May 2027 [PED-35]); at one a week the crossover is autumn 2027 either way (M10 goal).
- The M9 goal's 'about 37 sessions' follows the opt-in sentence but excludes it (with it, 41.25–42.25).

## Options not chosen

- (a) Dark until call 3
