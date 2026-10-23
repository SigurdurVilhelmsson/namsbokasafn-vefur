# D05 · Release timing for predict-first and the SRS fixes

- **Date:** 2026-10-23
- **Status:** Ruled: (a) One train, first week of January 2027.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D05 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S4.5
- **Register:** PED-08, PED-11, PED-20, CODE-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

When do predict-first and D04's SRS fixes reach students: on one train at the start of the spring term, or each on the first train after it merges?

## Ruling

**(a) One train, first week of January 2027.** S4.5 runs at the term boundary, after M1 and M2 are live, announced in class. It carries what has merged: S4.1 and S4.2 are its prerequisites, S4.3 is the first cut, S4.4 waits for D04 (S4.5, S4.4, M4).

- Cost: 0.5 session (S4.5)
- The review recommends (report 8.5): 'one January deploy'. Its planner adds: 'so it meets students at a term start'. This ruling follows it.

## What follows

- (a) fixes M4's live date: S4.5, in the first week of January 2027, brings predict-first and any merged D04 fixes. (b) lets each of S4.1–S4.4 go live on the next train after it merges. S4.4 still waits for D04.

## The brief's evidence

- M4 is 'live in the first week of January 2027 if D05 holds' (M4).
- About 15.5 sessions are supplied to the spring term against 16.5 demanded; predict-first makes the boundary only if S3.3 moves to M5's train and S4.3 waits (report 9.3; plan, Capacity).
- Its accessibility PR (S4.2) merges before the train that brings it to students, and SRS changes ship only with the interval tables shown (report 9.5, rules 2 and 13).
- A relabel changes what students' past 'Erfitt' ratings mean in /greining [PED-08].

## Measured for the brief (main `0cdeab0`)

- Main has no predict-first: `git grep -n 'Man það' origin/main -- src | wc -l` → 0 (control: dde768e → 4).
- On main, 'Æfa' still starts an all-cards session (minniskort/+page.svelte:39-41; stores/flashcard.ts:226). The live site was not checked.
- Trains before S4.5 ('Deploys: yes' in the plan): S1.3 (week of 2 November), S2.3 (late November), S3.4 (about 11 December).

## Caveats the brief listed

- Section 8.5 says only 'one January deploy'; (b) and the planner's reason are its off-repo output (report Appendix D.6).
- The planner counts about 16 sessions of demand to the boundary; the report and plan say 16.5.
- Inference, not in the sources: a train carries everything merged since the last one (plan, How to use), so under (a) S4.1–S4.4 merge after train 3 (S3.4) or stay switched off on main until January.
- Either way, main's all-cards 'Æfa' [PED-11] stays until S4.4 ships.

## Options not chosen

- (b) As ready, never in the December release week
