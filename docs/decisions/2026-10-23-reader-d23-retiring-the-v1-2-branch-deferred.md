# D23 · Retiring the v1.2 branch

- **Date:** 2026-10-23
- **Status:** Deferred. [USER] rules it at S12.0, the decision session for D14–D17, D22–D24 and call 4 at the start of M12.
- **Decided by:** step S0.2, which defers it to S12.0 as the plan sets
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D23 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S14.7
- **Register:** CODE-04
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Once P1 is ported, is feature/reader-v1.2 retired?

## Options in the brief

- **(a) Tag e3b29c7, then delete the branch.** Proposed tag 'reader-v1.2-port-source'. Cost: Inside S14.7.
- **(b) Keep the branch.** Leave it as is. Cost: None.

## The review's recommendation

The review's (8.5): delete after tagging e3b29c7.

## What the ruling sets

S14.7's last chunk tags and deletes, or is skipped. Cost: S14.7: 1 session, of which this is one chunk.

## What the 2026-10-23 rulings change for it

- D08 (a), ruled on 2026-10-23: S14.7 builds no per-section half.
- D04's re-queue (yes), ruled the same day: S14.7 builds it.

## The brief's evidence

- v1.2's June copy of P0 is superseded and broken against today's markup [CODE-04].

## Caveats the brief listed

- A branch-hygiene choice [CODE-04].

## When it is ruled

At S12.0, after its brief is updated with anything measured since S0.2. The ruling is a new dated file that names this one.
