# D13 · Continue-reading, find-in-page, the page label

- **Date:** 2026-11-08
- **Status:** Ruled: (a) a return visit offers the saved page, find-in-page reaches hidden pages through `hidden="until-found"`, and the label keeps the spec's format.
- **Decided by:** [USER], in step S9.0's decision session
- **Names:** `2026-10-23-reader-d13-continue-reading-find-and-page-label-deferred.md`, the deferral to S9.0 that this ruling ends.
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D13 (S9.0 prep, measured on the live build `1794077349564`, 2026-11-07)
- **Gates:** S11.1, S11.3
- **Register:** CODE-07, CODE-08, UI-29
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-11-08.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

In paged mode, does a return visit restore the saved page or offer it, how does find-in-page reach other pages, and does the label keep the spec's format?

## Ruling

**(a) Offer the page; 'until-found'; the spec's label.** A return visit offers the saved page with 'Halda áfram' (existing) and 'Byrja á byrjun' (new) [CODE-07]; the pager hides other pages with `hidden="until-found"`, so the browser's find can open a hidden page [CODE-08]; the label keeps 'Hluti N af M · Síða X af Y' [UI-29].

- Cost: Not estimated.
- The review's recommendation (8.5): offer the page, 'until-found', the spec's label. This ruling follows it.

## What follows

- S11.3 stores the place as {unit, block id} inside the existing scroll-position record, so #258's rename migration carries it, offers the page as ruled here, and builds the label in one function, worded to fit a 390 px phone and no longer counting the introduction and the footnotes as parts.
- S11.1 handles find-in-page as ruled here, and only if call 3 makes paged anyone's default (S11.1's chunk). Under D06's early opt-in, S11.1 and S11.3 come before S9.6.
- 'Byrja á byrjun' is a new string: it merges marked `D20: proposed`, and [USER] checks it in a batch before the train that ships it.
- CODE-07's false percentage (a paged visit saves its scroll position as if the section scrolled) is fixed in S9.3 whatever this rules; this ruling decides what the offer does in paged mode.

## Caveats

- **Browser support for `until-found`, checked 2026-11-08 on caniuse and the web-features explorer, not measured on a device:** Firefox from 148; Safari partial from 26.2, with the caniuse snapshots disagreeing and VoiceOver support reported as unfinished. Students read on iPhones and iPads, so the find may not reach other pages for many of them for a while. Per the HTML standard, not measured here, a browser that does not know the value treats the element as plain `hidden`, so find there reaches only the current page, as today.
- The browser reveals a matched block by removing its `hidden`; the pager has to turn to that block's page (the `beforematch` event), or the block shows under the current page.

## The brief's evidence (S9.0 prep)

- Find-in-page: the pager hides the other pages with `hidden=""` (all 6 hidden elements on page 1, each `display: none`), not `hidden="until-found"`. The browser's find does not search `display: none` content, so as built it cannot reach another page (that last point is how browsers work, not a measurement here) [CODE-08].
- Continue-reading, a return after a paged visit [CODE-07]: a reader who left from page 4 of 15 (the last page of the first part), through the app to §1.2, had 53% saved, at 354 px. A plain return offered 'Haltu áfram að lesa' with 'Þú varst komin(n) 53% í gegnum þennan kafla'.
- A return through the link opened page 1 ('Hluti 1 af 4 · Síða 1 af 4'; the page was not restored) and showed the same offer. 'Halda áfram' there scrolled the window to 354 px and stayed on page 1.
- The label as shipped is 'Hluti N af M · Síða X af Y': pages are counted within each part, and nothing counts them over the section (§1.1's parts have 4, 3, 3 and 5 pages at this size) [UI-29].

## Measured for the brief (the live build, 2026-11-07)

- `s90-measure.mjs` → hidden attribute values `{"": 6}`, 6 of 6 `display: none`; left on 'Hluti 1 af 4 · Síða 4 af 4'; `scrollPositions` for §1.1 `{scrollY: 354, percentage: 53}`; the plain return's offer as quoted; the link return's label as quoted, with the offer shown.
- `s90-continue.mjs` → before 'Halda áfram': 'Síða 1 af 4' at 448 px; after: 'Síða 1 af 4' at 354 px, no hash.

## Options not chosen

- (b) Restore the page directly
- (c) A section search box
- (d) An overall page count

## Sources for the support caveat

- https://caniuse.com/mdn-html_global_attributes_hidden_until-found
- https://caniuse.com/wf-hidden-until-found
- https://github.com/Fyrd/caniuse/issues/7356
- https://web-platform-dx.github.io/web-features-explorer/features/hidden-until-found
