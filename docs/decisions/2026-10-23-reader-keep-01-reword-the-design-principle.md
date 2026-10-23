# KEEP-01 · Reword CLAUDE.md's design principle

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Reword as the review suggests.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, KEEP-01 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** None
- **Register:** KEEP-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

CLAUDE.md calls pre-questions, recall prompts, predict-first ratings and pagination 'deliberate learning interventions backed by the testing-effect literature' and says 'don't "streamline" them away as friction'. Should it say instead: keep the interventions, and make them skippable, faded and measured?

## Ruling

**(a) Reword as the review suggests.** Replace the 'backed by' claim with that sentence: delivery may change, removal may not (report 4.2; rule 15, report 9.5).

- Cost: Not estimated; [USER]'s edit, ruled within S0.2 (1 session for the step).
- The review's suggested wording: 'keep the interventions, and make them skippable, faded and measured' (report B.1, R5 row 1). KEEP-01's decision line has the edit carry rules (1)–(4), i.e. (c). This ruling follows it.

## What follows

- No step waits on it; its data rule waits on D03. A reword carries rule 15 into the file that guides every Claude Code session here (main:CLAUDE.md:3). S0.2's files omit CLAUDE.md, so the edit is [USER]'s (KEEP-01).
- D03's data rule is a second CLAUDE.md edit, which lands with S3.3 (D03's file).

## What changes, and what does not

- **Changes:** CLAUDE.md's design principle (main `0cdeab0`, `CLAUDE.md:9`) drops 'backed by the testing-effect literature' and says instead: keep the interventions, and make them skippable, faded and measured. Their delivery may change; removing one may not.
- **Stays where it is:** the four rules (every prompt skippable in one tap, nothing gated on a prompt, no completion-contingent rewards, no peer comparison) stay in the review, in report section 8 (KEEP-01) and section 9.5 (rule 15). They do not go into CLAUDE.md: (c) was not chosen.

This file fixes what the principle must say, not its words, which are [USER]'s.

## The brief's evidence

- The citation audit rates the principle 'partly' accurate: the literature backs answered retrieval, not an objective-statement pre-question or pagination (report 4.2; B.1, R5 row 1).
- About half of the prompts shown led to the intended activity (R5-06, full text, 70 German undergraduates).
- Fixed prompts over a term lost their advantage; faded ones kept it (R5-05, full text, first-semester psychology students).
- Non-skippable prompts limited low performers' transfer (R5-07, full text, 72 German sixth graders) [KEEP-01].
- Dropping cards had small but consistent costs (R2-15, abstract); completion-contingent rewards lowered intrinsic motivation, d = −0.36 (R5-18, abstract) [KEEP-01].

## Measured for the brief (main `0cdeab0`)

- git show origin/main:CLAUDE.md: line 9 holds the principle as quoted.
- git cat-file -e, git grep: RecallPrompt, PreQuestionPrompt, PagedReaderControls and predictAndFlip are absent on main; dde768e has all but the pre-question, which only origin/feature/reader-v1.2 (e3b29c7) has.
- One-tap exits: dde768e RecallPrompt.svelte:79-84 'Sleppa'; v1.2 PreQuestionPrompt.svelte:52-57 'Ég hugleiddi þetta — byrja að lesa'; dde768e minniskort/+page.svelte:213-217, both predict buttons call predictAndFlip.
- Main's reader plan (docs/plans/2026-04-22-screen-vs-paper-reader-plan.md) states none of the four rules (grep for skip, gate, reward, badge, peer, social, compare: only unrelated hits; control 'recall': 6).

## Caveats the brief listed

- No study tests 16–20-year-olds reading chemistry on phones (report 4.2); the prompt studies are of undergraduates and sixth graders.
- 'Faded' and 'measured' are not built: no counters exist [PED-17] (S5.4 adds them), and fading is only proposed under calls 2 and 4 (report 8.2, 8.4). D03's undefined 'guardrails' may overlap (c).

## Options not chosen

- (b) Keep today's wording
- (c) Reword and add the four rules
