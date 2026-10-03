# Organic is off the live site, and four answers (vefur → efni)

**Written:** 2026-10-03 · **Answers:** efni's
[`docs/handoffs/2026-09-23-vefur-remove-organic-and-retire-withdrawn-books.md`](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni/blob/main/docs/handoffs/2026-09-23-vefur-remove-organic-and-retire-withdrawn-books.md),
the `<dt>` half of
[`docs/handoff/2026-09-02-vefur-term-english-contract.md`](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni/blob/main/docs/handoff/2026-09-02-vefur-term-english-contract.md),
and the service-worker question in
[`docs/superpowers/specs/2026-10-01-c140-c40-retire-and-pins-design.md`](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni/blob/main/docs/superpowers/specs/2026-10-01-c140-c40-retire-and-pins-design.md)
**vefur `main`:** `34e15a4` · **live build:** `1791030534964` (deployed 2026-10-03 12:33 UTC) ·
**measured against efni `main` `0c2f06d01`**

> A dated brief, not a live document. Every number was measured on 2026-10-03 with the command
> shown. Re-measure before relying on one. Status is owned by efni's register (§C190), not by
> this file.

## 1. §C190 ① is done: organic is down. ② is yours.

Two steps went live on 2026-10-03:

- **12:20 UTC: nginx.** The "Withdrawn book" blocks from vefur #234, plus #239, which added
  exact matches for `/content`, `/print` and `/downloads/lifraen-efnafraedi` without the trailing
  slash. [USER] applied them on the server.
- **12:33 UTC: the app.** #240 retires the book, and the deploy removed its 149 files from the
  server.

How the retirement works on vefur's side:

- `RETIRED_BOOKS` in `scripts/lib/published-books.js` takes organic off the allowlist.
- The deploy hides organic from the transfer (`H lifraen-efnafraedi/`) and deletes the server's
  copy, instead of freezing it like the three paused books.
- The reader keeps organic's `book.ts` entry in a separate `retiredBooks` list, so it never
  prerenders the book and never lists it. The entry stays because your
  `licence-vefur-contract.test.js` reads it.

Your handoff's acceptance list, each check with its control:

| Check                                                                                                                  | Result                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/content/lifraen-efnafraedi/chapters/03/3-1-virknihopar.html`                                                         | **404**, 162 B (was 200, 58,444 B)                                                                                                              |
| control: chemistry `/content/efnafraedi-2e/chapters/01/1-1-efnafraedi-i-samhengi.html`                                 | 200, 19,210 B                                                                                                                                   |
| controls: physics, biology and microbiology files from your table                                                      | 200 at 11,615 / 2,243 / 3,770 B, unchanged                                                                                                      |
| sitemap `grep -c lifraen-efnafraedi`                                                                                   | **0** (was 26). Chemistry 269, unchanged; 366 URLs in all                                                                                       |
| `/lifraen-efnafraedi` (also with `/` and `?x=1`)                                                                       | **HTTP 404 with the notice** page, 1,938 B, carrying [USER]'s approved sentence verbatim. Control: the chemistry home page does not contain it. |
| every other organic URL (reader pages, tools, `/content`, `/print`, `/downloads`, with and without the trailing slash) | plain **404**; all six security headers present on every one                                                                                    |
| front page, catalogue, book lists                                                                                      | 0 occurrences of `lifraen-efnafraedi`. Control: the chemistry link is present.                                                                  |
| a bare vefur sync does not bring organic back                                                                          | `selectBooks` refuses it by name and skips it in a bare run; unit tests in `scripts/sync-content.test.js`                                       |
| the next deploy does not bring it back                                                                                 | real-rsync tests in `scripts/deploy.test.js`. The control arm shows a leftover local copy being uploaded when the hide rule is missing.         |

Commands, so you can re-measure:

```
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://namsbokasafn.is/content/lifraen-efnafraedi/chapters/03/3-1-virknihopar.html
curl -s https://namsbokasafn.is/sitemap.xml | grep -c lifraen-efnafraedi
curl -s -o /dev/null -w '%{http_code}\n' https://namsbokasafn.is/lifraen-efnafraedi
```

**§C190 ③:** [USER] answered **yes** on 2026-10-03 to "Have the editors been told to stop organic
work, or lost organic access?" The answer covers the question as asked; it does not say which of
the two happened.

**So efni's removal commit (§C190 ②) is unblocked.** vefur needs nothing further from efni for
it.

- vefur's sync counts a book only while efni has published chapters for it. Once efni's tree
  holds none for organic, the next sync sweeps the leftover `static/content/lifraen-efnafraedi/`.
- The deploy keeps deleting organic, whatever efni's tree holds: its hide rule comes from
  `RETIRED_BOOKS`.
- If efni drops organic from `PROVENANCED` in `licence-vefur-contract.test.js`, tell vefur: the
  `book.ts` entry stays only for that test.

To reverse the retirement, vefur moves the entry back into `books`, takes the slug off
`RETIRED_BOOKS`, puts it back on the allowlist, removes the nginx blocks and re-syncs. The
nginx change has a rollback script on the server.

## 2. The 2026-09-23 scope ruling, relayed late

[USER] ruled on 2026-09-23: **organic only.** `edlisfraedi-2e`, `liffraedi-2e` and
`orverufraedi` stay frozen as they are.

- They are withheld from vefur's sync and protected from the deploy's `--delete`.
- They are still live, and still in the sitemap with 27, 32 and 35 URLs.
- Their pages still load the 2026-08-19 build's bundles. vefur's deploy keeps those on purpose
  (`P /_app/immutable/**`). Measured today: 0 missing assets on any page checked.

**vefur does not answer §C109 ① or ②.** Those questions stay open in efni.

## 3. `data-en` is live as of today, which corrects the 2026-09-05 note

vefur's 2026-09-05 note called its half of the contract "live". It was **merged, not
deployed**: production ran the 2026-08-19 build until 2026-10-03. Today's deploy put the
following on namsbokasafn.is:

- **#224:** all three vefur consumers read `data-en`.
- **#227:** the visible English span, with the reader setting _Enskt heiti hugtaka_.
- **#241:** the key-terms `<dt>` gloss (§4).

🔴 **The gate for retiring `annotateInlineTerms` is still SHUT, on efni's side.** Re-measured on
`0c2f06d01`, counting lines that contain `termEnglish`:

```
tools/generate-glossary.js   0
tools/generate-index.js      0
tools/cnxml-render.js        9   (control)
```

Both aggregators still scrape the inline marker. Turning the gloss off now would empty their
`english` and `termEn` values.

⚠️ **One vefur-side gap remains as well.** The `/print/*` routes, which produce the PDFs, render
content without mounting the gloss action. So a PDF shows the English only while the inline
gloss exists. vefur tracks this. Please don't switch `annotateEn` off before vefur says the
print path reads `data-en`.

## 4. `<dt data-en>`: ruled (i). efni needs no change.

[USER] ruled **(i)** on 2026-10-03. vefur reads the `data-en` that efni already emits on the
key-terms `<dt>`, so **efni does not need to wrap the term in `<dfn class="term">`**. Keep
emitting `data-en` on `<dt>` as now.

- **Merged and deployed:** #241. vefur widened only the **gloss** selector to `dt[data-en]`.
  The tooltip matcher still walks `<dfn>` only, because a `<dt>` tooltip would repeat the `<dd>`
  printed beneath it.
- **Replay of the real action** over your 21 chemistry key-terms pages on `0c2f06d01`
  (763 `<dt data-en>`):
  - **as published:** 48 glossed, 0 doubled, 0 tooltips;
  - **with the inline glosses stripped:** 747 glossed. The other 16 have English equal to the
    Icelandic, which vefur skips.
  - **control, the previous vefur code:** 0 and 0.

This settles the `<dt>` half of the contract. §3's gate still stands.

## 5. Your ㊵ question: yes, the service worker caches `/content/*.svg` for 30 days

Your spec's line 133 says "inferred from vefur's config; vefur's to confirm". Confirmed in
`vite.config.ts` and in the deployed `sw.js`:

- any `/content/**/*.{png,jpg,jpeg,gif,svg,webp}` uses **CacheFirst**;
- the cache is named `book-images`;
- entries expire after 30 days (`maxAgeSeconds` 2592000), with at most **200 entries**.

So a same-name recompose reaches a reader who installed the site as an app only after their
cached copy expires (30 days) or is pushed out by newer images. vefur tracks changing this (a
revalidating strategy for content images). Until then, plan recomposes as if they take up to
30 days to reach such readers.

Also on that spec: its line 98 says organic is still on vefur's allowlist. As of today it is not.

## 6. Two small things

- **Retire efni's "Sync Content to Vefur" Action** (`.github/workflows/sync-content.yml`). It
  cannot publish anything, even with `VEFUR_DEPLOY_TOKEN`, contrary to its own comment
  ("→ live on namsbokasafn.is"):
  - It syncs into vefur's `static/content/`, which is gitignored, so its "Check for changes" step
    always finds nothing to commit.
  - It has no deploy step.
  - Its `--book "$BOOK"` flag is ignored by vefur's parser; the slug only works because it is
    also read as a plain argument.
  - Its last three runs (2026-09-22) failed.
  - `gh secret list` shows 0 secrets on efni. That listing has no positive control: vefur also
    has 0.
  - Deploys go through vefur's `scripts/deploy.js`.
- **`tools/cnxml-render.js` help text:**
  - its usage examples (lines 15, 719–720 and 737–738) omit `--book`;
  - `requireBook()` (line 3890) makes `--book` mandatory;
  - copying an example verbatim exits with "Error: --book is required".

## Chemistry: no change

The chemistry hold stands, recorded 2026-09-28 in your register: after efni's ② re-render,
vefur recomputes the redirect rows, then syncs.

**Today's deploy published no chemistry content change.** Before it, vefur compared all 2,480
shippable files of `content/efnafraedi-2e/` with the server, and they were byte-identical. That
took one correction: this machine's `index.json` and `slug-map.mt-preview.json` were older (the
2026-08-18 versions) than the 2026-08-19 ones live. Shipping them would have rolled 5
subject-index entries back to the pre-rename §20.3 title, so the deploy used the live copies.
Nothing was synced from efni.
