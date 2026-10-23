# D10 · Does an early mark-read open the recall prompt?

- **Date:** 2026-10-23
- **Status:** Ruled: (b) No: mark read without the prompt; it waits for the section end.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D10 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S5.2
- **Register:** UI-04, UI-21, KEEP-05
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Should the one-time recall prompt open when a reader marks a section read by hand before its end ('Merkja sem lesið' in the toolbar, 'Merkja kafla sem lesinn' at the bottom)?

## Ruling

**(b) No: mark read without the prompt; it waits for the section end.** Once a section is read nothing re-opens the prompt, so this needs a new trigger S5.2 does not list (dde768e :172-178, :451).

- Cost: Not estimated (the trigger)
- The review recommends (report 8.5): 'No'. Its planner picks (b), since 'the one-time prompt would otherwise be spent before any reading'. This ruling follows it.

## What follows

- Sets how S5.2 wires the manual mark-read ('the mark-read follows D10'). Under (b) or (c), batch D's line and the tests written for (a) need amending.
- Of the two readings of report 8.5's 'No', [USER] chose (b): the prompt waits for the section end. (d) would have dropped it for that section.
- On v1.1 the prompt opens only on a section's first completion, and scroll detection stops once a section is read (`dde768e`, the section page: `markAsRead` at lines 172-178, `readDetection`'s `enabled: !isRead && !paged` at line 451). So a section marked read by hand never reaches its prompt: S5.2 needs a new section-end trigger that it does not list, and nobody has estimated it.
- Batch D's P0.2 line (`docs/manual-qa-2026-06.md:162-166` on `dde768e`, which names 'the manual button' as a way to open the prompt) and the UI-04, UI-21 and KEEP-05 tests were written for (a); they change with S5.2.

## The brief's evidence

- On v1.1 the prompt opens on a section's first completion from four callers: both mark-read buttons, the last 'Næsta' and scroll detection [UI-04, UI-21].
- Paged, the bottom button shows on every page; pressed on page 1 it spends the prompt before any reading [UI-04]. S9.3 hides it while the pager works, whatever D10 says (S9.3).
- That leaves the toolbar button (icon-only on phones), which UI-04 keeps opening the prompt; the prompt takes focus, probably pulling the reader to the section end (inferred) [UI-04, KEEP-05].
- The reader plan keeps manual mark-read for accessibility 'and for users who already finished and want to skip' (origin/main docs/plans/2026-04-22-screen-vs-paper-reader-plan.md:190).
- S5.2 comes before the pager (M8), so the ruling first applies in scrolled mode (S5.2, M8).

## Measured for the brief (main `0cdeab0`)

- dde768e section +page.svelte: prompt only `if (!wasAlreadyRead)` (:177-178); callers: toolbar :356 (label hidden below 640 px, :361), pager :442, scroll detection :450 (`enabled: !isRead && !paged`, :451), bottom :473; RecallPrompt.svelte:24-26 focuses the textarea.
- Main: 0 RecallPrompt and 0 PagedReaderControls files (`git ls-tree`); 0 'readingMode', 0 'rifjaðu upp' in src (dde768e: 12; RecallPrompt.svelte:62). Its mark-read shows 'Vel gert!' for 2 s (:158-170, :498).
- Batch D expects 'the manual button' to open the prompt (dde768e docs/manual-qa-2026-06.md:162-166).

## Caveats the brief listed

- Report 8.5's 'No' fits (b) or (d); the sources do not say which.
- UI-04's and UI-21's acceptance tests and KEEP-05's scroll test are written for (a).
- Nothing changes on the live site before S5.2: main has no prompt.

[USER] chose (b), which settles the first caveat.

## Options not chosen

- (a) Yes, as built on v1.1
- (c) A small 'Rifja upp' button
- (d) No: mark read with no prompt for that section
