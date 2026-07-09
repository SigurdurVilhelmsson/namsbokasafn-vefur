# Deploy handoff — efnafraedi-2e appendix links clickable (#10 piece 2)

**Date:** 2026-07-09
**Type:** Content-only deploy (no vefur code change)
**Status:** ✅ Verified locally, ready for prod push (lead-side)

## What ships

efni's #10 piece 2 made all appendix cross-references in efnafraedi-2e **clickable
links** to the appendix landing pages (`/efnafraedi-2e/vidauki/{letter}`), instead of
inert text. 67 document-only appendix references across 172 re-rendered pages.

- efni code merge: `eee16cdf` (PR #255)
- efni re-render (published HTML): `5863338b`
- This is delivered to readers purely by **syncing the re-rendered content + rebuilding
  vefur** — no vefur source/route change (the `/[bookSlug]/vidauki/[appendixLetter]`
  route already existed and prerenders).

## Local verification (done 2026-07-09, this session)

Ran `sync-content → generate-toc → build`, then drove the built site in Playwright:

| Check                                        | Result                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| efnafraedi-2e appendix pages prerendered     | ✅ all 13 (A–M), incl. `vidauki/G`                                         |
| Appendix A → periodic table                  | ✅ `307` redirect to `/lotukerfi`                                          |
| Broken `/vidauki/*` links in build log       | ✅ none (build-log 404s are pre-existing unrelated content gaps)           |
| Compiled `5-exercises` page (review-flagged) | ✅ 7 links → `/vidauki/G`, all visible/clickable                           |
| Module `5-3-vermi` page                      | ✅ 3 links → `/vidauki/G`, all clickable                                   |
| Click-through → appendix G                   | ✅ lands on `/efnafraedi-2e/vidauki/G/`, real content (~11k chars), no 404 |
| Page JS errors                               | ✅ 0                                                                       |

**10/10 checks passed.** Note: this repo prerenders with `handleHttpError: 'warn'`
(`svelte.config.js`), so a broken link would _not_ fail the build — the browser
click-through is the real gate, and it passed.

## Deploy steps (lead, on the prod/deploy path)

Content-only; same sequence already run locally:

```bash
# from namsbokasafn-vefur
node scripts/sync-content.js --source ../namsbokasafn-efni
node scripts/generate-toc.js
npm run build
# then deploy build/ per deploy.yml (release tag / manual trigger) or manual rsync fallback
```

(Auto-sync GitHub Action is unconfigured — `VEFUR_DEPLOY_TOKEN` unset — so sync is manual.)

## Post-deploy spot-check (prod)

1. Open `/efnafraedi-2e/kafli/05/5-exercises` → the "Appendix G" references are **links**,
   and clicking one lands on `/efnafraedi-2e/vidauki/G/` with rendered appendix content.
2. Open a module page (`/efnafraedi-2e/kafli/05/5-3-vermi`) → same: appendix reference
   is a working link.

## Known non-blocking issue (filed, do NOT let it hold the deploy)

**Untranslated link _text_** — logged as efni roadmap **#21** (commit `b81ecb5e`).
~37 of ~67 efnafraedi-2e appendix references render the label in English
(`Appendix G`) vs ~30 correctly `viðauka G`. The link **targets all resolve correctly**
— this is a text-only translation-completeness leak in the MT source, on the
`mt-preview` baseline. It resolves per-module as `faithful` review lands (Pass-1 / B4
track), and is **not** a vefur bug and **not** a blocker for shipping the clickable-link
feature.
