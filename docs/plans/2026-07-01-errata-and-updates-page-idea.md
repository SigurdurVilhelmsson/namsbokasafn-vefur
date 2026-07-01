# Errata / Updates page — idea (not started)

> **Status:** Captured 2026-07-01 from reviewer feedback. **Not a PDF task** — a website
> feature. Needs a proper brainstorm/spec before building. Related to the content-version
> transparency theme (PDF build date + MT watermark, see the PDF redesign plan Task 1.8).

## Why

Students and teachers need to trust the editing/error-checking process. Because this project is
in **active development and full localization** (not a mature, stable book), content changes
constantly: machine-translated sections become proofread (`reviewed`), and corrections land. A
public, **dated** record of what changed makes that process transparent and lets a teacher say
"this chapter was proofread in <month>".

## How OpenStax does it (reference)

- Every book has an **Errata** page on openstax.org. Readers **submit** suspected errors via a
  form; OpenStax editors **vet** each, then publish a list of accepted corrections (date, page/
  location, description, status: submitted → reviewed → corrected).
- Corrections are **batched** and applied to the web view and PDFs in **periodic releases** (a
  few times a year). Their books are mature, so this is minor-correction maintenance, not active
  development.

## How our context differs

- We are **localizing + proofreading a book in full**, so "updates" are large (whole sections
  going MT → faithful) plus genuine errata. An **"Updates / changelog"** framing fits us better
  than a pure "errata" list — though we want both: a changelog of proofreading/corrections **and**
  an errata-submission path (the site already has `/feedback`).

## Rough shape (to refine in a brainstorm)

- A per-book route, e.g. `/[bookSlug]/uppfaerslur` (updates) or `/[bookSlug]/breytingar`.
- A **dated list**: "2026-07 — Kafli 1 yfirlesinn og staðfærður", "2026-06 — leiðrétting á jöfnu í
  kafla 3.2", etc. Newest first.
- Link the existing `/feedback` form as the errata-submission path.
- Surface the same info the reader already has per section (`reviewed`) as an at-a-glance
  "proofreading progress" summary.

## Open questions

- **Data source:** a hand-curated changelog (editors write entries — most meaningful) vs derived
  from content git history vs derived from `reviewed`-flag transitions over time (needs history).
- **Where authored:** content/proofreading changes originate in the sister repo
  **namsbokasafn-efni** — the changelog probably lives there and syncs, like content. Cross-repo.
- **Granularity & cadence:** per-section? per-chapter? how often updated?
- **Errata intake:** reuse `/feedback`, or a dedicated errata form with location fields?

## Next step

Brainstorm/spec this separately (likely mostly efni-side for the data). Not blocking PDF work.
