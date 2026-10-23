# D18 · Recall read-back with a delete: now or later

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Now, in S5.5.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D18 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S5.5
- **Register:** CODE-24, PED-19, PED-36
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Should a student be able to see, and delete, their earlier recall for a section from the first recall release (S5.5, a stretch step aimed at the early-February 2027 recall train), or only once P2.3's recall-review tab exists?

## Ruling

**(a) Now, in S5.5.** After a new save, show the section's earlier entry with 'Eyða' (proposed). S5.5's export stays counts-only (D09).

- Cost: Inside S5.5's 1.25 sessions (stretch); not estimated alone.
- The review's recommendation (8.5): 'Now', as S5.5's third chunk; the full list waits for P2 (plan, 'Deferred'). This ruling follows it.

## What follows

- (a) or (b) keeps S5.5's read-back chunk, on a selector that reads $recallStore (S5.1 drops the get()-based getters) [CODE-24]; (b) adds an unplanned download; (c) drops the chunk. S5.5 also waits on D19 and D09.
- If S5.5 runs long, the cut order does not say whether the read-back goes with the compare step and the export; [USER] decides then.

## The brief's evidence

- On v1.1 nothing in the app shows, deletes or exports a saved recall, though the store has removeEntry and reset; as students may share school computers, CODE-24 pairs any read-back with a per-entry delete [CODE-24] (dde768e:src/lib/stores/recall.ts:95-116).
- After 'Vista upprifjun' the prompt closes after 1.2 s and the entry never shows again [PED-19] (dde768e:src/lib/components/RecallPrompt.svelte:33).
- Main's 'Hreinsa gögn' asks to erase all study data but clears analytics only; S3.2 adds a real erase (main:src/routes/[bookSlug]/greining/+page.svelte:163-164; S3.2).
- Show the earlier entry only after the new attempt, or the prompt turns into rereading [PED-19, PED-28].

## Measured for the brief (main `0cdeab0`)

- git grep -nE 'removeEntry|getForSection|getForBook|recallEntryCount' dde768e -- src, tests and recall.ts excluded → 0 lines (control: recall.test.ts → 4)
- git grep -n recallStore dde768e -- src, same exclusions → RecallPrompt.svelte:9, :30 (addEntry) only; stores/index.ts names recall 0 times (control: 10 exports of other stores)
- git show dde768e:src/lib/components/RecallPrompt.svelte → :33 setTimeout(() => onclose?.(), 1200); clearTimeout 0 times.
- origin/main 0cdeab0: no stores/recall.ts; git grep clearAllStorage -- src → definition only (storageMigration.ts:97); greining/+page.svelte:163-164 → confirm, then analyticsStore.clearAllData() only.

## Caveats the brief listed

- CODE-24 stages the read-back 'after release', assuming it waits for P2.3; 8.5 says 'Now'.
- PED-36 sits in 8.5's joint D18/D19 row; it bears on D19 (S14.4), not on this timing.
- The cut order drops S5.5's compare step, then its counts export; it does not name the read-back.

## Options not chosen

- (b) Now, plus a download of one's own recalls
- (c) Later, with P2.3
