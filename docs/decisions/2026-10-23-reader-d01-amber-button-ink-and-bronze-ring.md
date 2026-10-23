# D01 · Text on the amber buttons, and the focus-ring colour

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Ink on amber, bronze ring.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D01 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S2.1 (also S2.2 and S2.3)
- **Register:** UI-02, UI-07
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

White text on the amber fill fails WCAG AA (2.92:1 light, 2.08:1 dark; 4.5:1 needed), and the light focus ring is under 3:1. In light mode: dark ink on the unchanged amber, or white on a darker bronze fill? And a bronze or an ink ring?

## Ruling

**(a) Ink on amber, bronze ring.** Ink text: #1b2838 light (5.12:1), #16161c dark (8.66:1). The light hover turns lighter, #dd9f2c (6.45:1), as ink on today's #a87518 is 3.71:1. Light ring bronze #8a5d0e on a white gap (5.75:1).

- Cost: S2.1–S2.3: 1 + 0.75 + 0.75 sessions, not split by option.
- The review's recommendation: 'Ink, bronze ring' (report 8.5, D01 row), one rule for both themes, as KEEP-07 proposes (report 6.1). This ruling follows it.

## What follows

- Unblocks M2: S2.1 (tokens), S2.2 (the ring), S2.3 ([USER]'s sign-off, train 2). Rule 2 (report 9.5) keeps new features from students until they land.

## The brief's evidence

- White on amber is site-wide on main (.btn-accent, main:src/app.css:401-402); v1.1 adds 'Vista upprifjun' and the active 'Síðuskipt', and makes the amber 'Þröngt' the default [UI-02].
- The light ring (main:src/app.css:427-431) fails WCAG 1.4.11 on every control, and .glossary-term:focus removes it in the text (:1228-1233); dark passes [UI-07] (R4-18).
- --text-primary cannot be the ink: dark #e8e4de is 1.64:1 on the amber [UI-02].
- Colour tokens and the focus ring are a shared contract with the design track (main:docs/design/design-coordination-2026-06.md:36) [UI-02].

## Measured for the brief (main `0cdeab0`)

- origin/main:src/app.css: light accent #c78c20 (:60), hover #a87518 (:61); dark #e8a838 (:103), #f0bc5a (:104). #8a5d0e and #dd9f2c are in no src file (git grep; control #c78c20: 8 files).
- The WCAG 2.x contrast formula (appendix script `d01-contrast.py`) reproduces every ratio here. Light rings on the five surfaces: today 2.31–2.92 from the tokens (2.54–2.92 on screen [UI-07]; 1.97–2.41 against its own halo), bronze 4.55–5.75, ink 11.82–14.92.
- git grep: 14 lines in 10 files pair bg-[var(--accent-color)] with text-white; a scan of origin/main's CSS (scratch script, not committed): 22 same-block rules in 17 files, as UI-02 says.

## Caveats the brief listed

- Sources differ on hexes, all passing: light ring #8a5d0e (UI-07, report 6.1) or #a87518 (UI-02's fix, 3.19–4.02:1); ink #1b2838 (UI-02) or #16161c (KEEP-07, 6.18:1).
- UI-02 and report 6.1 also ask whether the raised hint grey may sit near secondary (5.19 against 5.45); the D01 row omits it. No source gives a bronze hover.

## Options not chosen

- (b) Ink on amber, ink ring
- (c) White on bronze, bronze ring
- (d) White on bronze, ink ring
