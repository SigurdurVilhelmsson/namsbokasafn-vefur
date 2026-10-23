# D02 · Existing readers' saved settings: chosen, or migrate once

- **Date:** 2026-10-23
- **Status:** Ruled: (a) Count as chosen.
- **Decided by:** [USER], in step S0.2's decision session
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D02 (measured on main `0cdeab0`, 2026-10-17)
- **Gates:** S6.1 (also S12.1 and S12.4)
- **Register:** CODE-05, UI-22, UI-31, PED-33
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-10-23.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

Each browser that has opened the site has saved all ten settings, chosen or not (its 'profile'). When S6.1 stores only real choices, do those saved values count as chosen, or are values equal to today's defaults forgotten once, so later defaults reach them too?

## Ruling

**(a) Count as chosen.** Existing readers keep every value. New defaults reach new profiles only: P0.1's 'Þröngt' (S12.1) and, if D15 rules it, an OS-following theme (S12.4).

- Cost: S6.1: 1 session, not split by option.
- The review's recommendation: 'As chosen' (report 8.5, D02 row). UI-31 and PED-33 agree for a stored 'medium': an auto-save cannot be told from a choice. This ruling follows it.

## What follows

- Unblocks S6.1 (M6: mid-January 2027 at 1.5 sessions a week, mid-to-late February at one); S12.1 and S12.4 also wait on it. No reader sees a change when the seam ships (M6 exit criteria); the options diverge when S12.1 and S12.4 change defaults.

## The brief's evidence

- On load, before any choice, the store saves its whole state, with no version or record of choices, and a valid saved value beats the default (main:src/lib/stores/settings.ts:103-111; main:src/lib/utils/storeValidation.ts:45-58) [CODE-05].
- As v1.1 is built, P0.1's narrow default reaches new profiles only; readers who never touched 'Línubreidd' keep 'Miðlungs' [UI-31, PED-33].
- Theme likewise: a profile that never chose dark has saved 'light', so following the OS reaches it only by a migration, which also overrides readers who chose light [UI-22].
- D02 does not set the reading mode: no profile stores one yet, and call 3 rules it through S6.1's profile-age marker (report 8.3) [CODE-05].

## Measured for the brief (main `0cdeab0`)

- A Node harness (scratch, not committed) loads the real settings.ts over a stub localStorage, calling no setter: a fresh main profile saves 10 keys, theme 'light', lineWidth 'medium'; dde768e then adds readingMode 'paged' and keeps 'medium'; a fresh dde768e profile saves 'narrow' and 'paged'.
- Same harness: a main profile that picks 'Miðlungs' and light by hand stores byte-identical data to one that only loaded the page.
- The root layout imports the store on every page (main:src/routes/+layout.svelte:7).

## Caveats the brief listed

- The sources raise line width (CODE-05, UI-31, PED-33) and theme (UI-22) separately, and [USER] could rule each; none says whether (b) covers every setting equal to its default.
- QA batch D expects a stored width to survive (dde768e docs/manual-qa-2026-06.md:152-154); under (b) a stored 'medium' turns 'narrow' at S12.1.

## Options not chosen

- (b) Migrate once
