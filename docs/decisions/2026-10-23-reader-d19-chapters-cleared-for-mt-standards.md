# D19 · Chapters cleared for machine-translated standards

- **Date:** 2026-10-23
- **Status:** Ruled: (b) Reviewed, or checked by [USER].
- **Decided by:** [USER], in step S0.2's decision session, with the follow-up answers [USER] gave the same day (below)
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D19 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S5.5
- **Register:** PED-05, PED-23, PED-19, PED-36
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Where may machine-translated text be the standard students check themselves against: Samantekt (summary) sentences after a recall (S5.5), and later glossary definitions on term cards and decks (S14.2, S14.4)? If you choose (b), say in the note who clears a chapter and on what evidence, for example efni's H6 answer or your terminology review.

## Ruling

**(b) Reviewed, or checked by [USER].** Plus chapters [USER] clears after the terminology review, listed by hand in readerPolicy, labelled 'Vélþýtt'.

- Cost: Inside S5.5 (1.25 sessions, stretch); [USER]'s checks not estimated.
- The review's (8.5): 'reviewed or checked only'. PED-05: the summaries are not yet a safe standard; gate any compare step on efni's terminology pass. This ruling follows it.

## What follows

- (a)–(c) fill compareStepChapters (S5.5) and set the rule for term cards (S14.2) and decks (S14.4); (d) drops S5.5's compare chunk. Any clearing waits for efni's H6 answer.
- Clearing a chapter is a commit that adds it to `compareStepChapters`; naming the terminology review it rests on in that commit keeps the record.

## The standard [USER] confirmed

The brief asked who clears a chapter, and on what evidence. On 2026-10-23 [USER] confirmed the option's own wording:

- **Who:** [USER].
- **On what:** efni's terminology review of that chapter.
- **How:** [USER] lists the chapter by hand in `compareStepChapters`, in readerPolicy (S5.5's first chunk).
- **Label:** the machine-translated standard from a cleared chapter is labelled 'Vélþýtt': the Samantekt sentences in S5.5, and the definitions on term cards and decks in S14.2 and S14.4.

Status on 2026-10-23: no chapter is cleared, and `compareStepChapters` starts empty. The brief says any clearing waits for efni's H6 answer. H6 (vefur's note `docs/handoffs/2026-10-16-reader-branches-requests-for-efni.md`) asked efni to confirm that §1.5's accuracy/precision pair, and the drift between chapter text, summaries and `glossary.json`, are in the terminology review, with a regression gate. efni logged it as §C201 on 2026-10-17: [USER]'s stage-1 terminology ruling keeps the live pair (hittni for accuracy, nákvæmni for precision), and the gate is not built.

## The brief's evidence

- Preview content: §1.5 defines 'nákvæmni (e. accuracy)', but its Samantekt uses 'nákvæmni' for precision [PED-05] (preview chapters/01, measured today).
- Live too: §1.3's Samantekt calls intensive properties 'Eðliseiginleikar', the section's own word for physical properties (live chapters/01/1-summary.html, fetched today).
- All 114 numbered sections have their own Samantekt block, keyed by module id [PED-19] (preview content, measured today).
- A standard in view cut the wrong definitions middle-school students credited from 73% to 44% (R2-18, abstract); fluent but wrong MT drew less distrust than disfluent MT (R4-24, abstract) (report 4.4, 4.11).

## Measured for the brief (main `0cdeab0`)

- origin/main, dde768e, e3b29c7: git cat-file -e src/lib/utils/readerPolicy.ts → absent; git grep -E 'compareStepChapters|summary-section' -- src → 0 (control 'Vista upprifjun': 1 on dde768e)
- origin/main:scripts/generate-toc.js:259-278 → a summary counts as reviewed only when its whole chapter is faithful.
- curl namsbokasafn.is/content/efnafraedi-2e/toc.json → 200; reviewed 4 of 216 (1-0, 1.1, 3-0, 3.1), summaries 0 of 21; preview toc.json (efni ② 48dbbb7a2) → 0 of 216.
- Preview 1-5, 1-summary.html → <dfn> 'nákvæmni (e. accuracy)'; Samantekt 'nákvæmni (breytileiki milli endurtekinna mæliniðurstaðna)'; 114 of 114 summary-<module id> blocks.
- Live 1-5, 1-3, 1-summary.html → §1.5 Samantekt matches <dfn> 'nákvæmni (e. precision)'; §1.3 <dfn> 'Eðliseiginleiki (e. physical property)', Samantekt 'Eðliseiginleikar eru ekki háðir magni efnisins'.

## Caveats the brief listed

- (a) clears nothing today; [USER] has ruled the old reviewed pages retired (main:CLAUDE.md:660).
- UI-09 calls live chemistry unreviewed; live toc.json marks 4 pages reviewed, no summary.
- 'Checked' is undefined; the plan says chapters '[USER] has cleared' (report 9.5, rule 12).
- PED-05's 'not live today' is about §1.5; the live §1.3 drift is this brief's own measurement.

The third caveat's undefined 'checked' is now defined: see 'The standard [USER] confirmed'.

## Options not chosen

- (a) Reviewed only
- (c) Every chapter, labelled 'Vélþýtt'
- (d) None yet
