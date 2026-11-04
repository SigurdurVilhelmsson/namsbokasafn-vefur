# vefur's pager accepts either module-body wrapper (H7, vefur → efni)

**Written:** 2026-11-04 · **Answers:** H5 in the reader plan's "Handoffs to efni"
(`docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`) and the H5 section of
[`2026-10-16-reader-branches-requests-for-efni.md`](2026-10-16-reader-branches-requests-for-efni.md)
**vefur `main`:** `5f13c37` ([#377](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/pull/377), plan step S8.3) · **measured against efni `main` `d24681b8`**

> Every number here was measured on 2026-11-04 with the command shown. Re-derive before relying on one.

## 1. What is live on vefur's `main`

`src/lib/utils/paginate.ts` exports one selector for the module body:

```ts
export const MODULE_BODY_SELECTOR = "main, .cnx-body";
```

`buildUnits()` looks through any direct child of `article.cnx-module` that matches it, so the pager
pages the body's blocks whether they sit in today's `<main>` or in a wrapper with the class
`cnx-body`. The selector names a class, not an element, so efni may pick the element
(`<div class="cnx-body">`, `<section class="cnx-body">`, …). `<main>` stays accepted: the frozen
books and copies downloaded for offline reading keep it.

Unit tests (`src/lib/utils/paginate.test.ts`) give `<main>`, `div.cnx-body` and `section.cnx-body`
bodies identical units, and keep any other top-level `<div>` one block. The pagination e2e
(`e2e/pagination.spec.ts`) reads the same constant, and **fails loudly on an unknown wrapper**:
any direct child of the article that holds sub-sections and is neither a `<section>` nor
`MODULE_BODY_SELECTOR` throws "a module-body wrapper paginate.ts does not know".

## 2. The name

`cnx-body` is the plan's proposal (register UI-30); efni names the wrapper (H5).

- **If efni emits `class="cnx-body"`** on the wrapper, vefur needs no change.
- **If efni picks another name,** tell vefur before merging H5. The change here is that one constant;
  until it lands, vefur's pagination e2e fails in CI on the new content (the tripwire above), which is
  the intended alarm, not a bug.

## 3. Nothing else in vefur reads the element name

Search (`src/lib/utils/html.ts` strips every tag), reading time (`scripts/process-content.js`), the
content loader and print (`contentLoader.ts`, `printContent.ts` match the article), the glossary,
bionic reading, read detection, answer links, practice reveal, `textAnchor` (it restores highlights
by text, so a tag-only rename keeps them), `static/styles/content.css`, `print.css` and the
accessibility ratchet. The one style rule that matches `<main>`, a print layout reset in
`src/app.css` (width, margin and padding), has nothing to reset on a plain wrapper, so the switch
changes nothing in print either.
The rollups (`article.chapter-resource`) may switch too: they never page.

vefur's `content.css` needs no rule for the class. efni's CSS contract
(`tools/__tests__/css-contract.test.js`) fails on an emitted class with no rule here, so efni adds
the class to `STRUCTURAL_CLASSES`.

## 4. efni's own sites, as measured at `d24681b8`

So the switch can be done in one pass. Line numbers will drift; re-find them.

- `tools/cnxml-render.js` writes `<main>` at :1079/:1117 (the module) and :3193/:3229, :3432/:3479,
  :3528/:3620, :3754/:3798 (the rollups), plus a literal in the periodic-table replacement at
  :4269/:4283.
- It reads `<main>` back by regex at :3776 (the answer key) and :4256/:4284.
- `tools/validate-chapter.js` :866-871 reads it too.
- The goldens and fixtures that hold `<main>`, and `STRUCTURAL_CLASSES` above.

Re-measure (counting unit: published chemistry pages with a `<main>`):

```bash
grep -l '<main[ >]' books/efnafraedi-2e/05-publication/mt-preview/chapters/*/*.html | wc -l   # 251 today
grep -rl 'cnx-body' books/efnafraedi-2e/05-publication/ | wc -l                               # 0 today
```

## 5. Timing

H5 may merge in efni whenever it is ready. No reader is affected either way: the pager is on vefur's
`main` but not deployed (it reaches readers only through a `?lestur=sidur` link once deployed, D06),
and nothing else in vefur reads the element. The chemistry sync is held ([USER], 2026-09-28), so new
content reaches vefur only after vefur's next sync, by which time `5f13c37` is in every vefur build.
