# D20 · Who checks new Icelandic strings

- **Date:** 2026-10-23
- **Status:** Ruled: (b) A batch before each train.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D20 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S1.3
- **Register:** PED-27, PED-18, PED-25, PED-14, UI-13
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Who checks new and changed Icelandic UI strings before they ship, and when: in each PR, or as one batch before each deploy?

## Ruling

**(b) A batch before each train.** Strings merge marked 'proposed' and are checked together before the deploy that ships them.

- Cost: Not estimated.
- The review recommends (report 8.5): '[USER], per PR or per deploy'. It names the checker and leaves the timing open; its planner suggests (c). (b) is the 'per deploy' half of it, and the checker is [USER] (below).

## What follows

- Unblocks S1.3 (0.75 session, week of 2 November, train 1, with the reworded bionic and OpenDyslexic labels) and sets the routine for the 17 later steps that name D20.

## Who checks, and the first deadline

- **Checker: [USER].** (b) names no checker. Report 8.5 names [USER] ('[USER], per PR or per deploy'), and no source names anyone else.
- **First batch: before train 1** (S1.3, the week of 2 November 2026): the reworded 'Hraðlestur' label and its description, and 'Letur hannað fyrir lesblinda'.
- The 17 later steps that name D20 follow the same routine.
- PED-27's copy review of claims is not part of this check unless [USER] says so (the brief's caveat).

## The brief's evidence

- Strings the review marks '(proposed)' are not in the code; each needs a native-speaker check (report 4.2).
- Fixes to live strings need it too: the bionic setting promises easier reading where every recent test found no benefit or a cost [PED-27]; /greining's confirm says all study data is erased when only analytics is [PED-14]; the selection popup's aria-label looks misspelt [UI-13].
- New copy waits on the check: the recall prompt's wording [PED-18] and first-use explainers, whose rationale lines may claim only what the evidence supports [PED-25].
- 18 plan steps name D20 under 'Decide first', from S1.3 (train 1, week of 2 November) to SF.4 (plan).
- All UI text, aria-labels and error messages are Icelandic (origin/main CLAUDE.md:101-103).

## Measured for the brief (main `0cdeab0`)

- `git grep -n -E 'Hraðlestur|auðvelda lestur|Letur hannað fyrir lesblinda|Valmoguleikar|öllum námsupplýsingum' origin/main -- src` → SettingsModal.svelte:39, :365, :368; SelectionPopup.svelte:72 ('Valmoguleikar yfirstrokunar'); greining/+page.svelte:163. 'Valmöguleikar': 0 hits.
- awk over the plan's step headings and 'Decide first' lines: 18 steps name D20 (S1.3, S3.2, S3.3, S4.2, S4.3, S5.3, S5.4, S7.1, S9.3, S11.3, S11.5, S11.6, S12.1, S12.2, S13.2, S13.4, S14.6, SF.4).

## Caveats the brief listed

- Section 8.5 does not pick per PR or per deploy; all three options and 'proposed until checked' are the planner's (off-repo).
- No source names a checker other than [USER].
- PED-27 also asks for a copy review of claims; the sources do not say whether the language check covers it.

## Options not chosen

- (a) [USER], in each PR
- (c) Per PR for one to three strings, else a batch
