# D11 · Keys and oversized worked examples

- **Date:** 2026-10-23
- **Status:** Deferred. [USER] rules it at S9.0, the decision session for D11–D13 and D21 at the start of M9.
- **Decided by:** step S0.2, which defers it to S9.0 as the plan sets
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D11 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S9.1
- **Register:** CODE-06, PED-02, PED-26
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

How should paged mode handle a worked example taller than the screen? And may Space and PageDown scroll a tall page before turning it?

## Options in the brief

- **(a) Split at safe boundaries.** [PED-02] Cost: Not estimated.
- **(b) Let the unit scroll.** [PED-02] Cost: Not estimated.
- **(c) Trial the 'Lausn' break.** One break before the check-your-learning part, as an experiment [PED-02]. Cost: Not estimated.
- **(d) Keys: scroll before turning.** Changes the reader plan's keyboard spec (line 170) [CODE-06]. Cost: Inside S9.1.
- **(e) Keys: turn as specified.** [CODE-06] Cost: None.

## The review's recommendation

The review's (8.5): keys scroll first (d); trial the 'Lausn' break on §3.1 in batch E, else let the unit scroll. The reviewers recommended (a) or (b), with the break only as an experiment (6.2).

## What the ruling sets

S9.1 applies the policy and restates acceptance criterion 1. Cost: S9.1: 1.5 sessions.

## What the 2026-10-23 rulings change for it

- S9.0 rules D11–D13 and D21, and checks D06's condition (D06's file).

## The brief's evidence

- By the code, Space and PageDown skip the unseen rest of a tall page, whatever the example policy [CODE-06].

## Caveats the brief listed

- On a phone the break still leaves a part taller than the page [PED-02].

## When it is ruled

At S9.0, after its brief is updated with what M8 measured. The ruling is a new dated file that names this one.
