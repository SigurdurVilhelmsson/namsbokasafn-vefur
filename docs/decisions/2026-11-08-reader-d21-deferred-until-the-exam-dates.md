# D21 · The crossover's term, margin and consent

- **Date:** 2026-11-08
- **Status:** Deferred. [USER] rules it at S9.0, resumed once [USER] has the May 2027 exam dates, before S10.1.
- **Decided by:** [USER], in step S9.0's decision session
- **Names:** `2026-10-23-reader-d21-crossover-term-margin-and-consent-deferred.md` (D21), whose deferral to S9.0 this file carries on; and `2026-10-23-reader-d06-early-pager-opt-in-on-a-condition.md` (D06), whose check at S9.0 moves with D21 (below).
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D21 (S9.0 prep, measured on the live build `1794077349564`, 2026-11-07 and 2026-11-08)
- **Gates:** S10.1
- **Register:** PED-35, PED-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-11-08.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

When does the in-class paged-versus-scrolled crossover run, what rule and margin decide 'not worse', and is consent needed?

## Why it waits

The term needs the May 2027 exam dates, which only [USER] has (the brief's S9.0 prep block). The other S9.0 rulings are on file the same day: D11, D12, D13 and the `?lestur=` link rule (`docs/decisions/2026-11-08-reader-*.md`).

## What waits with it

- **D06's condition.** D06 (b), the early opt-in, holds only if the crossover still fits before the May 2027 exams, checked "at S9.0, where D21 sets the crossover's term" (D06's file). That check moves with D21 to the resumed session. Until then the plan runs as (b), as D06's file says; if the crossover does not fit before the exams, (b) lapses and D06 is ruled again there.
- **S10.1**, whose "Decide first" lists D21 with D-CALL1 and D09. S9.1–S9.5 do not need D21.

## Options in the brief

- **(a) The first term M9 is ready.** Mid-April 2027 at 1.5 sessions a week; autumn 2027 at one (plan M10). Cost: S10.1 (0.75) and S10.2 (0.5 plus the lessons).
- **(b) A later term [USER] names.** Call 3 waits. Cost: The same steps, later.

## The review's recommendation

The review's (8.5): the first term M9 is ready. PED-35 and S10.1 add: fix the rule and margin in writing first (e.g. paged at most 1 of 3 main-idea items worse on average); get consent if results will be published.

- One class with three main-idea items can expose large harms, not prove equivalence [PED-35].

## The brief's evidence (S9.0 prep)

- The site cannot tell a link visit from a plain one. GoatCounter's `count.js` takes the path from the page's canonical link when there is one, and section pages carry one without the query, so a `?lestur=sidur` visit counts as a visit to the plain address. The site loads `count.js` once per full page load and calls it nowhere else, so moves between sections inside the app are not counted at all.
- The counts-only export (D09, S5.5) holds four counts per book, `recallShown`, `recallSaved`, `recallSkipped` and `recallAbandoned`; nothing in the reader records which mode a section was read in. Under D03 nothing else leaves the device, so as built the reader gives a crossover none of its outcomes.
- The link rule, ruled sticky as built the same day (`2026-11-08-reader-lestur-link-rule-sticky-as-built.md`): a reader who moves on from one section to the next inside the app keeps the link's mode, while a reload of a later section, or the address 'Deila' copies there, opens it in the reader's own mode [PED-35].
- Timing: the plan put M8 on the live site, dark, "about late February 2027 at 1.5 sessions a week, early April at one". It went live on 2026-11-07 (train 11); S8.1–S8.4 merged on 2026-11-03 and 2026-11-04. The plan's remaining estimates stand: M9 about 6.75 sessions (4–5 more under D06's early opt-in), S10.1 0.75 and S10.2 0.5 plus the lessons. Its dates for M9 and the crossover were set when M8 was expected in late February.

## When it is ruled

At S9.0, resumed once [USER] has the May 2027 exam dates, before S10.1. The ruling is a new dated file that names this one and records D06's check.
