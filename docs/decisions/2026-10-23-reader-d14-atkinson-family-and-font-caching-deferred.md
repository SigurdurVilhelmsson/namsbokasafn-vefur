# D14 · Atkinson family and font caching

- **Date:** 2026-10-23
- **Status:** Deferred. [USER] rules it at S12.0, the decision session for D14–D17, D22–D24 and call 4 at the start of M12.
- **Decided by:** step S0.2, which defers it to S12.0 as the plan sets
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D14 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S12.2
- **Register:** CODE-30, CODE-12, KEEP-09
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Does P1.4 ship the original Atkinson Hyperlegible 1.006 that v1.2 carries or the Next family the plan names, and are opt-in fonts precached for every visitor or fetched when first used?

## Options in the brief

- **(a) 1.006, fetched at runtime.** [CODE-30] Cost: Not estimated.
- **(b) Next, fetched at runtime.** [CODE-30] Cost: Not estimated.
- **(c) Either family, precached as today.** Every visitor's install would fetch 97,040 B more (+22.2% font bytes) for 1.006 [CODE-30]. Cost: Not estimated.

## The review's recommendation

The review's (8.5): 1.006 at runtime.

## What the ruling sets

S12.2 ships the family with its licence lines in the same PR [CODE-12] and applies the cache policy to both opt-in fonts. Cost: S12.2: 1 session.

## What the 2026-10-23 rulings change for it

- Nothing ruled on 2026-10-23 bears on it.

## The brief's evidence

- Neither family has a reading or legibility study, so it is a design choice (R4-09) [CODE-30].

## Caveats the brief listed

- Switching family later changes the font for everyone who picked it [CODE-30].

## When it is ruled

At S12.0, after its brief is updated with anything measured since S0.2. The ruling is a new dated file that names this one.
