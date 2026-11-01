# D04 · The interval table, as built in S4.4

- **Date:** 2026-11-01
- **Status:** Record: the interval table and the one number D04 left to S4.4. No new ruling.
- **Names:** `2026-10-23-reader-d04-srs-relabel-due-only-aefa-confident-errors.md` (D04). Its rulings stand: the relabel by correctness, the due-only 'Æfa' with 'Aukaæfing', and the message after a confident error.
- **Decided by:** [USER], the D04 rulings of 2026-10-23. The new-card cap is S4.4's, as D04 allowed.
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`, S4.4; M4's exit criteria ask for this table.
- **Register:** PED-08, PED-11, PED-20

> **Frozen record, dated 2026-11-01.** It records what was built and measured that day. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Why a new file

M4's exit criteria say D04's decision file holds the interval table. That file is a frozen record, so the table as built is here, and D04's file stays as it was.

## The table

Measured on `feature/reader-m4` with S4.4's code by the store tests in `src/lib/stores/flashcard.test.ts` ("the interval table as built" and "due sessions and extra practice"). They drive `rateCard` and `startStudySession` with a fake clock, and each 'Rétt' is given on the day the card falls due. `srs.ts` is unchanged, so every number equals D04's table; only the labels are new.

| Ratings                                                                     | Next interval                       | Ease |
| --------------------------------------------------------------------------- | ----------------------------------- | ---- |
| A new card, first 'Rétt' (was 'Gott', quality 4)                            | 1 d                                 | 2.50 |
| 'Rétt' on the day it falls due, the second time                             | 6 d                                 | 2.50 |
| The third time                                                              | 15 d                                | 2.50 |
| The fourth time                                                             | 38 d                                | 2.50 |
| 'Að hluta' (was 'Erfitt', quality 2) when the interval is 1, 6 or 15 d      | 1 d each; the correct streak resets | 2.18 |
| 'Rangt' (was 'Aftur', quality 0) on a new card                              | 1 d                                 | 1.70 |
| A second, third or fourth 'Rétt' on the same day, through 'Aukaæfing'       | stays 1 d                           | 2.50 |
| A miss ('Rangt' or 'Að hluta') in 'Aukaæfing' on a card that is not due yet | 1 d; the correct streak resets      | —    |

- In 'Æfa' a card is not queued again on the day it was remembered, so the old path to 38 days in one sitting is gone. The last two rows are 'Aukaæfing'.
- 'Auðvelt' (quality 5) is unchanged.
- The previews show 'Að hluta' as '1 d', like 'Rangt'. `src/lib/types/flashcard.test.ts` pins every preview to what the store schedules, for five card states, so the two quality tables cannot drift apart.

## The number D04 left to S4.4

**A due session takes at most 10 new cards** (`NEW_CARDS_PER_SESSION` in `src/lib/stores/flashcard.ts`). D04: 'the reviewer suggests 10, and S4.4 sets the number'. S4.4 took the reviewer's number. Changing it is one constant and needs no change to `srs.ts`.

## What S4.4 built, in short

- The labels 'Rangt' / 'Að hluta' / 'Rétt' / 'Auðvelt' and the hint 'Berðu saman við svarið: hafðirðu rétt fyrir þér?' (all proposed, D20). They come from one table, `RATINGS` in `src/lib/types/flashcard.ts`, used by the rating buttons and /greining's flashcard tab.
- 'Æfa' takes the due cards plus at most 10 new ones. A due session with nothing due gets its own screen ('Ekkert kort á dagskrá', proposed). 'Þú hefur lokið öllum kortum fyrir í dag.' shows only after a due session.
- 'Aukaæfing' (proposed) takes every card. A card that is not due yet keeps its schedule when remembered, and a miss reschedules it. Its reviews are stored with `extra: true`, so a calibration view (P1.1) can leave them out.
- After 'Man það' and a miss, the message 'Þú hélst að þú myndir þetta — skoðaðu svarið vel.' (D04's draft, proposed) shows with the answer before the next card, and 'Áfram' (proposed) records the rating. The miss is `classifyPrediction`'s 'overconfident' (S4.3), so 'Að hluta' counts as one, as under the relabel it should.
- Not in S4.4: bringing a confident error back once in the session. D04 put that in S14.7.

## What it changes for past data

As D04's caveat says, past 'Erfitt' ratings now show in /greining as 'Að hluta', and past 'Gott' as 'Rétt'. The stored ratings and their qualities are unchanged.
