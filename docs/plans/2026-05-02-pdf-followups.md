# PDF feature follow-ups

Tracking items from the PDF-download work (commit `92936c1` on main, May 2026) and the broken-link investigation that came out of it.

## Open in this repo

### Re-tighten `handleMissingId` once renderer is fixed

`svelte.config.js` currently has `handleMissingId: 'warn'`. We added it because content has a few same-page anchors that point at ids living in a different chapter (chapter text → appendix figures). Once `namsbokasafn-efni` ships book-wide id resolution (see that repo's `docs/2026-05-02-cross-chapter-id-resolution.md`), revert the config back to default (`'fail'`) so future regressions are caught.

### Continuous page numbering in the merged book PDF

`scripts/generate-pdfs.js` builds the full-book PDF by merging per-chapter PDFs with `pdf-lib`. Each chapter PDF carries its own footer "page X of Y" baked in by Chromium at print time, so the merged book reads "1 / 60", then "1 / 50", etc. — restart per section.

Two viable approaches:

1. **Render the full book in one Playwright pass** instead of merging chapter PDFs. Removes the merge step entirely. Risk: a 1100-page render may stress Chromium memory, and the route would have to assemble all chapters' content in one Svelte page.
2. **Post-process with `pdf-lib`** to overlay continuous page numbers on the merged file (drop a transparent annotation layer on each page after merging). Keeps the per-chapter render fast.

Probably (2). The per-chapter PDFs would need their footer page-number text suppressed first (so the overlay isn't double-numbered) — easiest is to omit `displayHeaderFooter` entirely for chapter PDFs and bake all numbering with `pdf-lib`.

### Section-level PDFs (deferred from V1)

User decision in V1: full-chapter bundle only. If demand arises, a section-level PDF would reuse the same print route at a finer granularity:

- Add `src/routes/print/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte` that renders just one section block.
- Extend `scripts/generate-pdfs.js` to optionally generate per-section PDFs gated by a CLI flag (`--sections`) so the default fast path stays fast.
- Surface in `PdfDownloadButton` as a fourth target.

Not requested yet; mention if asked.

### Image compression / file-size

Per-chapter PDFs are 1–6 MB; full book is ~50 MB. Acceptable today; revisit if a teacher complains about mobile data. `pdf-lib` doesn't reduce image size — would need a Ghostscript or Pillow pass after generation.

### CI deploy step

`.github/workflows/ci.yml` still has no deploy job. The PDF feature works locally via `npm run build:full` and rsync to Linode. If/when CI gains a deploy job, add `npx playwright install --with-deps chromium` and `npm run pdfs` between sync-content and the deploy upload. PDFs are gitignored, so they must be generated fresh in CI.

## Open in `namsbokasafn-efni`

### Cross-chapter anchor resolution (renderer)

The largest remaining content-side bug. See `namsbokasafn-efni/docs/2026-05-02-cross-chapter-id-resolution.md` for the full diagnosis and proposed fix.
