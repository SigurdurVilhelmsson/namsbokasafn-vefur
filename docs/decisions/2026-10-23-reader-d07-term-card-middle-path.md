# D07 · P1.3: what card a selection makes

- **Date:** 2026-10-23
- **Status:** Ruled: (b) Term-card middle path.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D07 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S14.1
- **Register:** PED-23, CODE-11, PED-36, PED-31
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

When P1.3 is ported, what should a selection make: v1.2's one-tap verbatim cloze, reworked; a term card; the existing 'Minniskort' dialog; or nothing yet?

## Ruling

**(b) Term-card middle path.** A tap on a key term makes 'Hvað er {term}?' (proposed); the student writes the back, then sees the definition, labelled 'Vélþýtt' (cleared chapters, D19). Other selections get a template; key-term decks follow (report 4.9; S14.2).

- Cost: 3.75 sessions (S14.1–S14.4).
- The review's recommendation (8.5; 4.9): the middle path. The reviewers ranked verbatim cloze lowest and saw the dialog as the smaller change [PED-23]. This ruling follows it.

## What follows

- Unblocks S14.1 (after S7.2); S14.2 and S14.4 need D19, S14.4 also D22. (b) and (c) change plan P1.3, 'Highlight → cloze card in one tap' [PED-23].
- The definition on the back comes only from chapters cleared under D19 (b), ruled the same day.

## The brief's evidence

- Against verbatim cloze: fill-in-the-blank helped only the exact items (R2-22); higher-order and mixed quizzes, not fact quizzes, improved higher-order performance (R2-23); self-made cards beat premade (R2-24, secondary) [PED-23].
- For it: fill-in-the-blank had the largest classroom effect of the quiz formats compared (g = 0.773 across studies; R2-01).
- v1.2's text step: with only the Icelandic term selected, 534 of 848 key-term fronts end in a dangling '(e.'; at most 132 are clean [CODE-11].
- The glossary is machine-translated and some books lack one [PED-23]; its terms are under efni's review [PED-36]. Cards come only from a mouseup popup, so P1.3 waits for M7 [PED-36] (S14.1 needs S7.2); highlight-to-card is untested [PED-31].

## Measured for the brief (main `0cdeab0`)

- `node v0609_dfn_probe.mjs` (e3b29c7's buildClozeFront and block rule; jsdom; 114 numbered sections, local ② preview) → 850 dfn.term; term alone: 534 end in '(e.', 182 null; whole term: 92 '(e.', 5 null.
- `git diff --quiet 02c5ce9 e3b29c7 -- src/lib/utils/cloze.ts` → exit 0; `git grep -l Eyðukort` → e3b29c7 only (not main, dde768e).
- `git show origin/main:…` → FlashcardModal.svelte:64 front: selectedText, :130 saving needs a typed back; TextHighlighter.svelte:449 onmouseup only.
- `python3 -I` on local glossary.json → 755 terms, all defined, 691 with English; orverufraedi has none.

## Caveats the brief listed

- 8.5's '4.9's (B)' is 4.9's (b); the register's (B) puts the definition on the back, a premade card PED-23 walks back.
- Counts are from efni's ② preview; CODE-11 has 848 terms, 181 null.

## Options not chosen

- (a) Reworked cloze
- (c) The 'Minniskort' dialog
- (d) Defer
