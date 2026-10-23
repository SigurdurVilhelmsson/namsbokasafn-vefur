# CALL1 · Page-height budget

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Maximise usable lines.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, CALL1 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S10.1, or S9.6 under D06's early opt-in
- **Register:** UI-08, UI-12, PED-03, PED-02
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

How much of the screen may a paged page fill, and so how many lines does it hold?

## Ruling

**(a) Maximise usable lines.** Step 1, code only, removes the artefacts (about 67–68% of the screen on phone and desktop, 78% on tablet). Step 2 drops the 76 px clearance (about 77%), only after the floating chrome is docked, or it covers 'Næsta' [UI-12].

- Cost: Inside S9.5.
- The review recommends (a), step 1 first, judged by lines per page rather than tuned for learning; figures go through the lightbox. Rule after reading on the dark pager (live, link-only; S9.6), before S10.1. This ruling follows it.

## What follows

- S9.5 sets PAGE_BUDGET from one exported constant; a ruling after S9.6 ships as a small deploy before S10.1. S10.1 and S11.6 wait on it, and it sets how far D12's figure rule can reach [PED-03]. Ruling 1 holds regardless [UI-08].

## Ruled early

- The brief asked for this call after [USER] had read on the dark pager (S9.6), before S10.1. S0.2 lets [USER] rule any call early, and [USER] did.
- D06's early opt-in, ruled the same day, moves the gate from S10.1 to S9.6: readers can opt into paging before the crossover, so the budget must be set first.

## What the pager holds today: the 16 October measurements

Measured on 2026-10-16, and not in the brief: v1.1's pager as built (`dde768e`, today's budget), on efni's ② preview content, in Chromium with a WebKit spot check. A control reproduced the review's six runs exactly. The raw data were not kept; this table is the durable copy.

| Device (browser window)                  | Lines a fitted page holds, §1.2 / §3.1 |
| ---------------------------------------- | -------------------------------------- |
| iPhone 15, Safari (393×659)              | 10.3 / 9.2                             |
| iPhone 13 mini                           | 9.4 / 8.9                              |
| Pixel 7                                  | 11.9 / 13.2                            |
| iPad portrait (about 810×1006)           | 16.7 / 15.3                            |
| iPad landscape (about 1080×736)          | 9.0 / 8.6                              |
| Laptop, 1366×768 screen (about 1366×633) | 8.2 / 7.4                              |
| MacBook (about 1440×790)                 | 9.3 / 10.2                             |
| 1920×1080 screen (about 947 px tall)     | 13.3 / 13.5                            |
| 2560×1440 screen (about 1307 px tall)    | 25 / 21.5                              |

- On the iPhone 15, 13 of 35 pages (§1.2) and 15 of 32 (§3.1) needed window scrolling.
- On the laptop the page budget was 260 px, 41% of the window.
- Landscape phones and 150–200% zoom hit the 240 px floor: almost every page needed window scrolling, and the pager was off-screen on arrival.
- In Chromium's landscape iPhone run, the floating tools button covered 'Næsta' and taps stopped turning pages [UI-12].
- The review's 390×844 and 1280×800 windows were whole screens, so its figures are upper bounds.

## The brief's evidence

- A page may fill 53% (1280×800), 61% (390×844) or 67% (768×1024) of the screen, so desktop pages hold 9.2–10.6 lines, phone pages 12.3–13.9 [UI-08].
- About 80–103 px of each page is code artefact, not chrome [UI-08].
- Pages break only between blocks, so average fill tops out near 58–59%; 100 px more joins only 3 of 18 split phone figure pairs [UI-08, PED-03].
- The 8 measured worked examples (§3.1) are taller than the whole screen on phone and at 1280×800, so no budget fits them there [PED-02].
- Window height showed no comprehension effect, though small windows cost page handling (R1-17, review, full text; R1-18, abstract; adults at desktops).

## Measured for the brief (main `0cdeab0`)

- git show dde768e:…/PagedReaderControls.svelte | grep -n 'OFFSET\|CLEARANCE\|96' → :64 SCROLL_OFFSET 96, :68 BOTTOM_CLEARANCE 76, :87-88 max(240, innerHeight − 96 − gapAbove − gapBelow − 76), :172 a second literal 96.
- python3 -I, that formula with UI-08's gaps → 427/514/683 px = 53/61/67%.
- git cat-file -e origin/main:…/PagedReaderControls.svelte → absent (dde768e: present); grep -n 260 docs/manual-qa-2026-06.md → stale 'viewport − 260 px' at main:204, dde768e:212.

## Caveats the brief listed

- Gaps, lines and pages are from the review's browser capture (preview content); only constants and arithmetic were re-checked.
- D06 (ruled at S0.2) sets the gate. M9: about late March 2027 at 1.5 sessions a week, late May at one.

## Options not chosen

- (b) A fixed share
- (c) Similar lines on every device
- (d) Today's 53–67%
