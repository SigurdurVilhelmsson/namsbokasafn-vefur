# D09 · Pilot classes and a counts-only export

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Student-started export.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D09 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S5.5
- **Register:** PED-17, PED-35, PED-39, PED-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Should pilot classes hand in a counts-only export that students start and preview, with which fields, and may counts leave the device otherwise, given some readers are minors?

## Ruling

**(a) Student-started export.** 'Flytja út' (proposed): counts only, started and previewed by the student, sending nothing (S5.5); data reach [USER] only through exports students choose to send [PED-17].

- Cost: Inside S5.5's 1.25 stretch sessions; cut second, after the compare step.
- The review's recommendation (8.5): a student-started export. This ruling follows it.

## What follows

- S5.5 and S10.1 need D09. D21 (the crossover's term, margin and consent) is ruled at S9.0; a school data sheet waits for D03 [PED-39].
- A school data sheet [PED-39] no longer waits on D03, which was ruled the same day (remove).

## The brief's evidence

- Nothing records a prompt shown, skipped or abandoned, or a mode switch [PED-17]; S5.4 and S9.5 add those counters; switch-off counts feed a revisit of call 3 [PED-01].
- Data already leave the device: GoatCounter's count and a production build's page-view event to the editorial server; D03 rules on it before any school data sheet [PED-39].
- The register on privacy: 'the readers are minors; a data sheet for schools belongs to the teacher-integration work' and 'a privacy decision about minors' [PED-17]; 'an export to the teacher would bring in Persónuvernd's school checklist (R5)' [PED-35]; 'they are 16–20, so some but not all are' [PED-34]; R5-23 is 'Persónuvernd 2022 school checklist; abstract; not legal advice' [PED-14].
- Counters show uptake, not efficacy (report 8.2).

## Measured for the brief (main `0cdeab0`)

- `git grep -l -i counters origin/main -- src` → none; no recall store on main (`git ls-tree`).
- `git show origin/main:src/lib/stores/analytics.ts` → :703-726 export has reading times, sessions, streaks, daily stats, last 100 activities, goals, hourly data; no recall or flashcard data.
- `git show origin/main:…` → [bookSlug]/+layout.svelte:28 trackPageView; api.ts:30 skips without an API URL, :38 sendBeacon to /api/analytics/event; app.html:13-26 GoatCounter.
- `git ls-tree -r --name-only origin/main -- src/routes` → no privacy route; greining/+page.svelte:163-164 promise 'eyða öllum námsupplýsingum', then clear analytics only.

## Caveats the brief listed

- Not legal advice. R5-23 is a summary page, read as an abstract, for 'Compulsory schools and municipalities' (B.2); these readers are 16–20. KEEP-01: whether the reader stays outside ePrivacy Art. 5(3) 'was not re-assessed'.
- PED-34 corrects PED-17's 'the readers are minors' to 'some but not all', as 8.5 does.

## Options not chosen

- (b) No export
- (c) Automatic sending
