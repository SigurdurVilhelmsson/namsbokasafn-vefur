# D11 · Keys and oversized worked examples

- **Date:** 2026-11-08
- **Status:** Ruled: (d) Space and PageDown scroll a tall page before turning it, and (c) a trial of the 'Lausn' break on §3.1 in batch E; where the trial is not kept, the example scrolls (b).
- **Decided by:** [USER], in step S9.0's decision session
- **Names:** `2026-10-23-reader-d11-keys-and-oversized-examples-deferred.md`, the deferral to S9.0 that this ruling ends.
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D11 (S9.0 prep, measured on the live build `1794077349564`, 2026-11-07)
- **Gates:** S9.1
- **Register:** CODE-06, PED-02, PED-26
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-11-08.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

How should paged mode handle a worked example taller than the screen? And may Space and PageDown scroll a tall page before turning it?

## Ruling

**(c) Trial the 'Lausn' break, with (d) keys that scroll before turning.** On a page taller than the window, Space and PageDown scroll until the page's end is in view and only then turn; Shift+Space and PageUp do the same upwards (d) [CODE-06]. For worked examples, one break before the check-your-learning part ('Lausn') is trialled on §3.1 in QA batch E (c); where the trial is not kept, the example stays whole and scrolls (b) [PED-02].

- Cost: (d) inside S9.1; (c) not estimated.
- The review's recommendation (8.5): keys scroll first (d); trial the 'Lausn' break on §3.1 in batch E, else let the unit scroll. This ruling follows it. The reviewers recommended (a) or (b), with the break only as an experiment (6.2).

## What follows

- S9.1 builds it: the keys in a pure helper, the 'Lausn' trial, the restated acceptance criterion 1, and a dated note amending plan line 170 and QA batch E (S9.1's chunks). The arrow keys, the buttons and swipes always turn.
- (d) covers every page taller than the window, not only examples: at 390×844 two of §1.1's pages each hold one paragraph, of 34 and 41 lines, and run past the window.
- Four of §3.1's examples (780–787 px) run past an 800 px window only because a desktop page starts 174 px down. That is the page budget's (`PAGE_BUDGET`, pinned until S9.5 applies call 1), not this policy's.

## The brief's evidence (S9.0 prep)

- Each of §3.1's 8 worked examples gets a page of its own, and every one of those pages overflows the window, at 390×844 and at 1280×800 [PED-02].
- At 390×844 all 8 are taller than the window (995–1,834 px against 844). At 1280×800 four are (933–1,512 px against 800); the other four (780–787 px) are shorter than the window but still overflow, because the page starts 174 px down.
- Space on Dæmi 3.1's page, with focus on no control, turned to the next page. The example's last 328 px (390×844) or 161 px (1280×800) were never on screen [CODE-06].
- Oversized blocks are not only examples: at 390×844 two of §1.1's pages each hold one paragraph, of 34 and 41 lines, and overflow the window.
- By the code, Space and PageDown skip the unseen rest of a tall page, whatever the example policy [CODE-06].

## Measured for the brief (the live build, 2026-11-07)

- `s90-measure.mjs`, §3.1 at 390×844 → 29 pages; the examples on pages 2.5, 2.9 and 3.12–3.17 ('Hluti' and 'Síða'), 995, 1,022, 1,135, 1,172, 1,452, 1,519, 1,631 and 1,834 px tall, each page overflowing. At 1280×800 → 27 pages; 780, 787 (three), 933, 1,215, 1,474 and 1,512 px, each page overflowing, each example's top at 174 px.
- The same script, Space on 'Hluti 2 af 4 · Síða 5 af 9' → 'Síða 6 af 9' at both sizes; the example ended at 1,172 px in an 844 px window, and at 961 px in an 800 px one.
- `git show origin/main:src/lib/utils/pager.ts`, `keyAction`'s comment → "→ PageDown and Space turn forward … Space on a page taller than the window still turns it".

## Caveats the brief listed

- On a phone the break still leaves a part taller than the page [PED-02]. From the brief's figures: half of §3.1's tallest example (1,834 px) is 917 px, taller than an 844 px window, so (d) still carries the rest.

## Options not chosen

- (a) Split at safe boundaries
- (b) Let the unit scroll, except where the 'Lausn' trial is not kept
- (e) Keys: turn as specified
