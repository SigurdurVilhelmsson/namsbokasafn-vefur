# D05 · How M4 waits for January: on a feature branch

- **Date:** 2026-11-01
- **Status:** Ruled: M4's steps merge into `feature/reader-m4`, which merges into `main` at S4.5.
- **Decided by:** [USER]
- **Names:** `2026-10-23-reader-d05-one-january-release-train.md` (D05). Its ruling, (a) one train in the first week of January 2027, stands. This file records how M4 is kept off `main` until then.
- **Gates:** S4.1–S4.5
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`, M4

> **Frozen record, dated 2026-11-01.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

D05 sends predict-first and the SRS fixes to students on one train, in the first week of January 2027. A train carries everything merged into `main` since the last one. So if M4's steps merged into `main` as they were done, no train could run from `main` between S4.1's merge and January without shipping them early. The options: accept that lock, keep M4 off `main` on a feature branch, or re-rule D05.

## Ruling

**Keep M4 on a feature branch, so trains can still run before January** ([USER], 2026-11-01).

- `feature/reader-m4` was branched from `main` `db1653c` (train 6's build, tagged `s-2026-11-01`). Each M4 step, S4.1 to S4.4, opens its PR into it, not into `main`, on the branch name the plan gives the step. CI runs on it, as on every `feature/**` branch.
- `main` stays train-ready: a train from the deploy lane carries none of M4.
- At S4.5, `feature/reader-m4` merges into `main` after the D20 check of its strings, and the spring-term train runs from `main` by the deploy-lane checklist.
- Keep it current by merging `main` into `feature/reader-m4` whenever `main` changes a file M4 touches, and again before S4.5. The rule never to merge `main` into v1.2 (CODE-04) is about v1.2 only.
- M4's new strings stay marked `D20: proposed` on the feature branch. The deploy checklist's D20 step reads `main`, so they don't stop a train. [USER] checks them as one batch before S4.5.

## What follows

- D05's ruling (a) is unchanged: predict-first and any merged D04 fixes reach students together, in the first week of January 2027.
- The plan's M4 heading says "on main". Read it as "on `feature/reader-m4`, merged into `main` at S4.5".
- M5 and later phases still land on `main`. If one of them changes the flashcard page, /nam's review phase or the flashcard store before S4.5, merge `main` into `feature/reader-m4` and run `e2e/flashcards.spec.ts` again.

## Options not chosen

- Accept the lock: merge each M4 step into `main` when done, and run no train from S4.1's merge until January.
- Re-rule D05 to (b): each step goes live on the first train after it merges.
