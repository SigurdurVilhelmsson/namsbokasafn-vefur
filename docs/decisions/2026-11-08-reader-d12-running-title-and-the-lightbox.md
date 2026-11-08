# D12 · A title on every page; figures and their text

- **Date:** 2026-11-08
- **Status:** Ruled: (a) a running title on every page, and the lightbox only; no keep-together rule for now.
- **Decided by:** [USER], in step S9.0's decision session
- **Names:** `2026-10-23-reader-d12-page-titles-and-figures-deferred.md`, the deferral to S9.0 that this ruling ends.
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D12 (S9.0 prep, measured on the live build `1794077349564`, 2026-11-07)
- **Gates:** S9.2, S9.4, S11.6
- **Register:** UI-19, UI-05, UI-09, PED-03
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-11-08.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Does the section title stay visible on every paged page (UI-19 measured its cost at 29–58 px a page), and is the lightbox enough for figures split from the paragraph that cites them?

## Ruling

**(a) Running title; lightbox only.** The section title stays visible on every paged page, so its `h1` is there for screen readers on every page too [UI-19, UI-05]. A figure on another page from the paragraph that cites it is reached through the lightbox [UI-09, PED-03].

- Cost: Not estimated.
- The review's recommendation (8.5): a title on every page, the lightbox. This ruling follows it. PED-03's reviewers wanted the lightbox first, then a keep-with-figure flag with a capped figure or thumbnail.

## A keep-together rule: not wanted now

S9.0 asks this file to say whether a keep-together figure variant is wanted and, if not, why the lightbox alone suffices [PED-03].

- **Not now; put off, not rejected** ([USER]): the lightbox comes first, and keep-together is taken up if QA batch E or the crossover shows readers losing figures.
- **Why the lightbox suffices meanwhile**, in the review's and PED-03's reviewers' reasoning: their order is the lightbox first, then a keep-with-figure flag. The brief's measurements bear on it: every §1.1 figure fits whole in the window but figure 1.5 at 1280×720, and the in-text link to figure 1.2 already turns to the figure's page, with the browser's Back returning to the citing page.

## What follows

- S9.2 takes the module header out of pagination, keeps the `h1` on every page and takes its height off the budget, and folds an introduction that holds only the header into the first unit. Its acceptance: every page of §1.2 has one `h1`, and axe's page-has-heading-one passes.
- S9.4 lets an in-text figure link open the lightbox over the current page (figureViewer's lightbox needs a public entry point); table links keep the page jump.
- The title costs 29–58 px a page (UI-19). For scale, a desktop text page of §1.1 shows 8 lines (median, the brief's table).

## The brief's evidence (S9.0 prep)

- The section title is on page 1 only. On every later page, at all four sizes, the `h1` is not rendered: it is in the first block, which the pager hides, so it is gone for screen readers as well as from sight [UI-19, UI-05].
- None of §1.1's 4 figures shares a page with the paragraph that cites it, at any of the four sizes [PED-03]. Each figure has a page of its own, except at 768×1024, where figure 1.3 shares one with a paragraph that does not cite it.
- Every figure fits whole in the window, except figure 1.5 (581 px) at 1280×720.
- Figure 1.2's citation is on the page before the figure (390×844: page 3, the figure on 4; 1280×800: page 2, the figure on 3). Clicking 'Mynd 1.2' turned to the figure's page without opening the lightbox, and the browser's Back returned to the citing page. Where the other three figures' citations sit was not measured.

## Measured for the brief (the live build, 2026-11-07)

- `s90-measure.mjs` → the `h1` rendered on page 1 and on no later page at any size; the figure's citing paragraph on the figure's page 0 times in 16 (4 figures × 4 sizes); the figures 226–581 px tall, all whole in the window but 1.5 at 1280×720 (its page ends at 745 px).
- `s90-figlink.mjs` → before: 'Síða 3 af 5' (390×844) and 'Síða 2 af 4' (1280×800), figure not shown; after the click: the next page, the address's hash `#CNX_Chem_01_01_Alchemist`, the figure in the window, no dialog open; after Back: the citing page again.

## Options not chosen

- (b) Running title; lightbox plus a keep-together rule (put off, as above)
- (c) Title kept for screen readers only; lightbox
