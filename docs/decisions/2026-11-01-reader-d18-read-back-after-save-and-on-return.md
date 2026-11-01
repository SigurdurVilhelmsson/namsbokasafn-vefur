# D18 · Where the recall read-back shows: after the save, and on a return visit

- **Date:** 2026-11-01
- **Status:** Ruled: the saved message shows the text just saved with 'Eyða', and reaching the end of a section already recalled shows that entry with 'Eyða', in place of the prompt.
- **Decided by:** [USER], at the start of step S5.5
- **Names:** `2026-10-23-reader-d18-recall-read-back-with-delete-now.md` (D18). Its ruling, (a) a read-back with a delete now, in S5.5, stands. This file records where the read-back shows, because D18's wording cannot occur as built.
- **Gates:** S5.5
- **Register:** CODE-24, PED-19
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`, S5.5

> **Frozen record, dated 2026-11-01.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

D18 rules: 'After a new save, show the section's earlier entry with 'Eyða''. Its brief was written against v1.1's prompt (dde768e). On `main`, call 2 (one prompt per section) is built as once ever: since S5.2 (#332) the recall store remembers every section whose prompt has shown (`prompted` in `src/lib/stores/recall.ts`), and the prompt never shows for that section again. So a save never has an earlier entry for its section, and the read-back as worded would almost never appear. Where should it show instead?

## Ruling

**After the save and on a return visit** ([USER], 2026-11-01).

- **After the save:** the saved message shows the text just saved, with 'Eyða' and 'Loka'.
- **On a return visit:** reaching the end of a section whose prompt has already shown, and which has a saved entry, shows that entry with 'Eyða' and 'Loka', in place of the prompt. It appears the way the prompt does (the end of the section in view for 1.5 s) and never takes focus on its own.
- A student can see and delete their recall right away and later, for example on a shared school computer [CODE-24].

## What follows

- Call 2's once-per-section rule is unchanged: the prompt itself never comes back.
- PED-19's caution, 'show the earlier entry only after the new attempt, or the prompt turns into rereading', concerned a prompt that comes again. With no second attempt there is no retrieval for the read-back to replace, and it shows only once the section has been read to its end.
- The full list of a student's recalls stays with P2.3's recall-review tab (plan, 'Deferred').
- S5.5's export stays counts-only (D09). On /greining, the counts export takes D09's name, 'Flytja út' (proposed), and the existing download of the whole statistics file is renamed ([USER], 2026-11-01). That is an implementation of D09, not a change to it.

## Options not chosen

- Only after the save: once closed, a recall could not be seen again until P2.3.
- Only on a return visit: nothing in the saved message.
- Let the prompt come back on a later visit, so D18's wording works: a change to call 2 as built, needing its own decision.
