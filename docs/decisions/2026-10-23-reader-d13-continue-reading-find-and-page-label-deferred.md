# D13 · Continue-reading, find-in-page, the page label

- **Date:** 2026-10-23
- **Status:** Deferred. [USER] rules it at S9.0, the decision session for D11–D13 and D21 at the start of M9.
- **Decided by:** step S0.2, which defers it to S9.0 as the plan sets
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D13 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S11.1
- **Register:** CODE-07, CODE-08, UI-29
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

In paged mode, does a return visit restore the saved page or offer it, how does find-in-page reach other pages, and does the label keep the spec's format?

## Options in the brief

- **(a) Offer the page; 'until-found'; the spec's label.** 'Halda áfram' (existing) / 'Byrja á byrjun' (new; native-speaker check); 'until-found' lets the browser's find open a hidden page [CODE-07, CODE-08, UI-29]. Cost: Not estimated.
- **(b) Restore the page directly.** [CODE-07] Cost: Not estimated.
- **(c) A section search box.** [CODE-08] Cost: Not estimated.
- **(d) An overall page count.** [UI-29] Cost: Not estimated.

## The review's recommendation

The review's (8.5): offer the page, 'until-found', the spec's label.

## What the ruling sets

S11.1 builds find-in-page as ruled; S11.3 restores or offers the place and builds the label. Cost: S11.1: 1 session; S11.3: 1 session.

## What the 2026-10-23 rulings change for it

- D06's early opt-in (b), ruled on 2026-10-23, moves S11.1–S11.3 before S9.6; S9.0 still comes before them.
- S9.0 rules D11–D13 and D21, and checks D06's condition (D06's file).

## Caveats the brief listed

- CODE-08 calls the search box 'the safer path on phones' ('until-found' is unverified on iPadOS and iOS Safari); S11.1 builds find-in-page only if call 3 makes paged anyone's default.
- UI-29 puts the label call in QA batch E; 8.5 rules it here.

## When it is ruled

At S9.0, after its brief is updated with what M8 measured. The ruling is a new dated file that names this one.
