# The `?lestur=` link rule · How long a link's reading mode lasts

- **Date:** 2026-11-08
- **Status:** Ruled: sticky, as built. A link's mode lasts until the reader leaves the section pages.
- **Decided by:** [USER], in step S9.0's decision session
- **Names:** no earlier decision file. It rules what [USER] chose for S8.2 on 2026-11-03 and kept on 2026-11-04 for S9.0 to rule with the crossover design (the plan's notes after S8.2 and S8.4).
- **Brief:** `docs/plans/2026-10-20-reader-decision-briefs.md`, D21's Evidence (S9.0 prep) and Measured 2026-11-08 blocks; the link rule has no brief of its own
- **Gates:** S9.3, S10.1
- **Register:** PED-35, PED-01
- **Plan:** `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`

> **Frozen record, dated 2026-11-08.** It records what was decided that day and why. Do not edit it: a later change is a new dated file in `docs/decisions/` that names this one.

## Question

How long does a `?lestur=sidur` or `?lestur=skrun` link's reading mode last: until the reader leaves the section pages, as built, or only on the section the link names?

## Ruling

**Sticky, as built.** A link is read once, in the browser, when a section page loads. Its mode then lasts through 'Fyrri', 'Næsta', → at a section's end, 'Næsti kafli' and the sidebar, until the reader leaves the section pages. It is never stored, and the address of a later section carries no link.

- Cost: None; no code changes.
- The briefs make no recommendation here. PED-35 proposed a parameter that "sets the reading mode for that visit without saving it", and S10.1's chunk assumed a link that covers one section (the plan's dated note under S10.1, 2026-11-08). "Visit-only" in PED-35 and in `readerPolicy.ts` means never stored, which still holds.

## What follows

- S9.3's in-view switch clears an active link (S8.4's note).
- S10.1 keeps one link per section and mode, for this reason: a reader who moves on from section A inside the app reads section B in A's mode, so B needs its own link, and the link sheet says to open B from it. The plan's S10.1 chunk states this reason from 2026-11-08.
- CODE-07 (leaving a paged section saves its scroll position as if it scrolled) reaches every section the mode is carried into, until S9.3 fixes it, before any classroom link.

## Known limits

- A reload of a later section, or the plain address 'Deila' copies there, opens it in the reader's own mode: scrolled for every reader today, since nothing can store a mode yet (D06). Nothing records which mode a section was read in (D21's evidence), so a student who reloads section B during a lesson reads the rest of B in their own mode, with no trace. A phone browser that reloads a tab left in the background would do the same; that was not tested.
- On the section the link opens, 'Deila' copies the address with the link, and with the page's hash after a page turn.

## The brief's evidence (D21, S9.0 prep)

- The link rule as built: a `?lestur=` link's mode lasts until the reader leaves the section pages ([USER], 2026-11-04: so until S9.0 rules it). S9.3's in-view switch must clear an active link whichever rule is chosen (S8.4's note) [PED-35].
- What the address and 'Deila' show once the link's mode carries on [PED-35]. On the section the link opens, the address keeps `?lestur=sidur`, and 'Deila' copies it, with the page's hash after a page turn. The sections the mode is carried into (by → after the last 'Næsta', or by 'Næsti kafli') are paged, but their address has no link: a reload there, or the plain address 'Deila' copies, opens the section in the reader's own mode. Today that is scrolled for every reader, since nothing can store a mode yet (D06), and a copied page's hash then opens at the top. So under the rule as built, the address and the screen disagree from the second section on. On a phone 'Deila' hands the share sheet the same address (`handleShare`); no phone was used.
- The site cannot tell a link visit from a plain one, and the counts-only export records no mode, so as built the reader gives a crossover none of its outcomes.

## Measured for the brief (the live build, 2026-11-08)

- `s90-linkaddress.mjs` (the briefs' appendix), 1280×800, a fresh profile per run: §1.1 with the link kept `?lestur=sidur` in the address; §1.2 (by → after the last 'Næsta' and 'Sleppa', or by 'Næsti kafli') and §1.3 (by 'Næsti kafli' again) were paged, with no query in their addresses, and 'Deila' copied the plain address; a reload of either showed no page bar; the address copied on §1.2's third page (`#sub-0-p-2`) opened scrolled at `scrollY` 0.

## Options not chosen

- Per section: the link covers only the section it names, and moving on gives the reader's own mode. A small code change.
- Sticky, in the address: keep it sticky and write `?lestur=` into each later section's address, so a reload and 'Deila' match the screen. More code.
