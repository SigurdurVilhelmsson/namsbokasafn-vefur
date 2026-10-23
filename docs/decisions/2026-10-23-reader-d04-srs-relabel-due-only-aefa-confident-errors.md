# D04 · SRS: the rating step, a due-only 'Æfa', a confident-error message

- **Date:** 2026-10-23
- **Status:** Ruled. Rating: (a) Relabel by correctness. Due-only 'Æfa': yes. Confident-error message: yes. Re-queue once: yes.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D04 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S4.4
- **Register:** PED-08, PED-11, PED-20, CODE-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Four flashcard-schedule (SRS) choices, under CLAUDE.md's caution: how an effortful correct recall scores, whether 'Æfa' takes only due cards, whether a confident error gets a message, and whether that card comes back once in the session.

## Rulings

### The rating step

**(a) Relabel by correctness.** 'Rangt' / 'Að hluta' / 'Rétt' / 'Auðvelt' (proposed); srs.ts untouched; effortful but correct is 'Rétt', a pass [PED-08].

- Cost: Inside S4.4.
- The review's recommendation: Relabel by correctness (report 8.5). This ruling follows it.

### A due-only 'Æfa'

**Yes: 'Æfa' takes due cards.** Due cards plus capped new ones (the reviewer suggests 10); 'Aukaæfing' (proposed) leaves not-yet-due intervals alone but reschedules a lapse [PED-11].

- Cost: Inside S4.4.
- The review's recommendation: A due session (report 8.5) [PED-11]. This ruling follows it.

### A message after a confident error

**Yes: show a message.** After 'Man það' and a miss: 'Þú hélst að þú myndir þetta — skoðaðu svarið vel.' (draft) [PED-20].

- Cost: Inside S4.4.
- The review's recommendation: The message (report 8.5) [PED-20]. This ruling follows it.

### Bring a confident error back once in the session

**Yes: bring it back once.** Built in S14.7, which does it 'only if D04 asked for it'.

- Cost: Part of S14.7 (not estimated separately).
- The review's recommendation: Report 8.5's recommendation leaves it out; report 4.5 says to bring a confident error back once. This ruling follows report 4.5.

## What follows

- Unblocks S4.4 (M4: December and the break); its decision file holds the table (M4 exit). Also sets S4.3's 'Erfitt' case, S14.6's Kvörðun cell and S14.7's re-queue.
- 'Æfa' takes due cards plus a capped number of new ones: the reviewer suggests 10, and S4.4 sets the number.
- The labels and the message are drafts, marked proposed: under D20 (b) they are checked in the batch before the train that ships them.
- The relabel, the due-only 'Æfa' and the message are built in S4.4 and reach students on S4.5's January train (D05).
- The re-queue is not part of that train: S14.7 builds it ('only if D04 asked for it'), in M14, about autumn 2027.

## The interval table (M4's exit criteria put it here)

From the brief, measured on main `0cdeab0` with `node d04-intervals.mjs` from the repo root on Node 22.22.2 (the script is in the brief's appendix). It drives `srs.ts` and `types/flashcard.ts` as `rateCard` does; no browser.

| Ratings                                                           | Next interval                       | Ease |
| ----------------------------------------------------------------- | ----------------------------------- | ---- |
| A new card, first 'Gott'                                          | 1 d                                 | 2.50 |
| Second 'Gott', the same day                                       | 6 d                                 | 2.50 |
| Third 'Gott', the same day                                        | 15 d                                | 2.50 |
| Fourth 'Gott', the same day                                       | 38 d                                | 2.50 |
| One 'Erfitt' (quality 2, today) when the interval is 1, 6 or 15 d | 1 d each; the correct streak resets | 2.18 |
| The same 'Erfitt' scored as quality 3 (option (b), not chosen)    | 6, 14 and 35 d                      | 2.36 |
| 'Aftur' (quality 0)                                               | 1 d                                 | 1.70 |

Previews show 'Erfitt' as '1 d', like 'Aftur'.

What the rulings change in it:

- The rating ruling (a) leaves `srs.ts` untouched, so every row keeps its numbers. It changes the labels (all proposed): quality 0 'Aftur' becomes 'Rangt', 2 'Erfitt' becomes 'Að hluta', 4 'Gott' becomes 'Rétt', and 5 stays 'Auðvelt'. An effortful but correct recall is then 'Rétt', quality 4, a pass, where today's 'Erfitt' scores it as a fail.
- The due-only 'Æfa' stops queuing cards that are not due, so a second, third or fourth 'Gott' on the same day no longer happens in 'Æfa'. 'Aukaæfing' (proposed) still lets a student practise those cards; it leaves a not-yet-due card's interval alone unless the student misses it.

## The brief's evidence

- 'Hversu auðvelt var þetta?' asks about ease, but 'Erfitt' is quality 2, below the pass mark of 3: an effortful correct recall lapses, counts as wrong in /greining and, in a ported Kvörðun, as 'rangt'. Pre-existing on main, and conservative [PED-08].
- 'Æfa' queues every card, due or not; spaced beat massed retrieval, g = 0.74 after correction for publication bias (R2-21, mostly lab undergraduates) [PED-11].
- Confident errors are the likeliest to be corrected after feedback (R2-14, adults, abstract) [PED-20].

## Measured for the brief (main `0cdeab0`)

- Mapping, origin/main: minniskort/+page.svelte:218-248 and ReviewPhase.svelte:122-152 → stores/flashcard.ts:279, DIFFICULTY_TO_QUALITY (types/flashcard.ts:29-34): 0, 2, 4, 5; wasCorrect = quality >= 3 (:296), /greining's ring (:428); srs.ts RATING_TO_QUALITY (:27-32) only previews (:253). 'Æfa': no mode (minniskort :39-41) → 'all' (stores/flashcard.ts:226), which keeps cards 'due' drops.

## Caveats the brief listed

- (a) changes what past 'Erfitt' ratings mean in /greining [PED-08].
- A miss in (f) follows the rating choice; today only 'Aftur' [PED-20].

## Options not chosen

- The rating step: (b) 'Erfitt' becomes quality 3
- The rating step: (c) Correctness first, then ease
- The rating step: (d) As is
- A due-only 'Æfa': No: 'Æfa' keeps every card
- A message after a confident error: No message
- Bring a confident error back once in the session: No
