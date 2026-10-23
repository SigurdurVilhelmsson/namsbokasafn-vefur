# CALL2 · Recall per section or sub-section

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Per section, as built.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, CALL2 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S11.4
- **Register:** PED-16, PED-04, PED-19, PED-24, PED-17
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Does recall come once per section, or after each sub-section? (Extra: an authored sub-section check question, needing efni questions, H10.)

## Ruling

**(a) Per section, as built.** A separate type gate keeps it off rollups, introductions and the Formáli [PED-04].

- Cost: An erratum to plan line 189 and criterion 6.
- The review recommends (a), made stronger rather than more frequent: the gated, accessible section-end prompt plus the compare step against the section's Samantekt in cleared chapters (D19). If [USER] wants interim recall too, (c), so one class's counters show its uptake first; if (a) stands, record the erratum. Rule at S10.2, after 4–6 weeks of counters. This ruling follows it.

## What follows

- S11.4 applies it: the erratum for (a), S11.7 first for (b) or (c). M5's prompt ships regardless.
- The 'stronger' half of the recommendation, the compare step against the section's Samantekt, needs D19 (b), ruled the same day; it is S5.5's first cut.

## Ruled early

- The brief asked for this call at S10.2, after 4–6 weeks of counters. [USER] ruled it in S0.2 instead, as S0.2 allows; S10.2 and M10 now rule call 3 only (and D25).

## The erratum S11.4 writes

(a) contradicts three lines of the April reader plan, `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md` (line numbers as on main `0cdeab0`), which still describe recall per sub-section:

- line 189: 'The free-recall prompt (P0.2) fires on **sub-section** completion, not whole-section.'
- line 275, success criterion 6: '… free-recall prompt fires per sub-section.'
- line 282, the recommended order: 'P0.4 (rewires P0.2's trigger to per-sub-section)'.

S11.4 writes the dated erratum for them, as the plan says. Until then, this file is the correction.

## The brief's evidence

- Plan line 189 and criterion 6 ask for per sub-section; the build prompts once per section, its per-unit hook unwired [PED-16].
- Interim tests helped recall of later sections (R2-03, abstract, lab); identical weekly prompts lost their effect while faded ones kept it (R5-05, full text, university), though fading did not change STEM scaffolding (R5-02, abstract).
- Between studies, free recall was the weakest classroom quiz format and feedback raised effects (R2-01, full text); a standard made middle-schoolers' self-scores more accurate (R2-18, abstract).
- Units exist only in paged mode; 172 of 428 already hold a Check-your-learning question [PED-16].

## Measured for the brief (main `0cdeab0`)

- git show dde768e:…/[sectionSlug]/+page.svelte → :171-180 prompt on first completion, no type gate; :442 omits onsubsectioncomplete, which the pager calls at :217.
- sed -n '189p;275p' of the reader plan on origin/main and dde768e → both say per sub-section.
- node + jsdom, dde768e's buildUnits over local preview chapters → 428 units, 172 with a Check-your-learning answer; 157 of 400+ words, not last, 125 after the cap (also under the footnote/title guards).

## Caveats the brief listed

- The 'stronger' half needs D19's compare step, a stretch item cut first (S5.5); counters show uptake, not efficacy (report 8.2).
- S10.2: mid-April 2027 at 1.5 sessions a week, autumn 2027 at one (M10).

## Options not chosen

- (b) Per sub-section, guarded
- (c) (a) plus a one-class pilot of (b)
