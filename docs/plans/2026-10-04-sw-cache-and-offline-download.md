# Service-worker figure cache and offline download — plan (2026-10-04)

Worklist task `sync-sw-cache`, widened by [USER] on 2026-10-04 to include the offline download.
Design chosen by a three-design / three-judge panel, then trimmed; this file is the synthesis.

## What is wrong today (measured 2026-10-04, built site under `vite preview`, real Chromium)

| Defect                                                                                                                                                                                                                                       | Evidence                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Figures are `CacheFirst` for 30 days, so a figure re-rendered under the same file name (efni's recompose does exactly that) reaches a reader up to 30 days late.                                                                             | `vite.config.ts` image route                                        |
| "Sækja fyrir ónettengda notkun" on chemistry keeps **200 of 1,147** figures and still says "Sótt". The download's `fetch()` goes through the service-worker route, whose `ExpirationPlugin` (`maxEntries: 200`) evicts as the download runs. | probe: chemistry 200/1,147; control physics 48/48                   |
| A downloaded book stops working offline after 30 days: `ExpirationPlugin.cachedResponseWillBeUsed` returns null once the stored `Date` is older than `maxAgeSeconds`.                                                                        | `workbox-expiration/ExpirationPlugin.js:70-97`                      |
| The size estimate is invented (10 KB per page + 2 × 50 KB images per section).                                                                                                                                                               | chemistry "~22.7 MB" vs 322 MB fetched; physics "~1.5 MB" vs 8.6 MB |
| The download misses front matter, appendices and answer keys (35 chemistry pages).                                                                                                                                                           | `getBookContentUrls` walks `toc.chapters` only                      |
| No byte bound on the browsing image cache; efni's heavy tail once reached 56–66 MB per SVG.                                                                                                                                                  | efni §C168                                                          |

Two facts constrain every fix:

- **nginx changes every ETag on every deploy** — `Last-Modified` is the deploy time even for byte-identical files, because the build resets mtimes. Any revalidation after a deploy is a full 200, not a 304.
- **The browser HTTP cache answers for 24 h** (`Cache-Control: max-age=86400`), so a service-worker fetch without `cache: 'no-cache'` cannot see a change for up to a day — including the existing `NetworkFirst` HTML route, whose comment claims "immediately".

## Design

1. **`src/lib/sw/runtimeCaching.ts`** owns both routes and two small plugins; `vite.config.ts` imports it.
   - Images: **`StaleWhileRevalidate`**, `fetchOptions: { cache: 'no-cache' }`, cache `book-images` (name kept — see below), `maxEntries: 100`, `maxAgeSeconds: 7 d`, `purgeOnQuotaError`, plus a **size gate** (`cacheWillUpdate`): only a 200, never `text/html` (nginx's `/200.html` SPA fallback answers a missing figure with 200), at most 1 MiB decoded. Ceiling: 100 MiB.
   - Pages/JSON: `NetworkFirst` as before, now with `cache: 'no-cache'`, `ignoreVary`, `purgeOnQuotaError`, statuses `[200]`.
   - **Offline fallback** to the copy in `offline-book:<slug>`: on pages, `cachedResponseWillBeUsed` after `ExpirationPlugin` (NetworkFirst reads the cache only when the network failed); on figures, **`handlerDidError`** only — cache miss plus network failure. _(Changed after review: `cachedResponseWillBeUsed` on the StaleWhileRevalidate route counts as a cache hit, so an online reader with a downloaded book was served the downloaded copy instead of a re-rendered figure — forever for one over the size gate. Measured, then pinned by an e2e test with a control.)_
   - ⚠️ Every function in that file is serialized into `build/sw.js` by `fn.toString()`: arrow functions only, literals inline, no outer identifiers. Unit tests rebuild each function from its source text and call it, and an e2e test reads the emitted `sw.js`.
2. **Downloaded books** live in **`offline-book:<slug>`**, one cache per book, no `ExpirationPlugin`, written only by page code. The download fetches `<url>?nb-offline=1`, which no `$`-anchored route matches, so it never passes through the browsing caches.
3. **`offline-manifest.json`** per book, written by `process-content.js` (`scripts/lib/offline-manifest.js`): every `.html` under `chapters/` (front matter, appendices and answer keys included), `glossary.json`, `index.json`, and every local `<img src>` they reference, each with disk bytes and a 16-hex sha256. `toc.offline = { version, files, bytes }` carries the summary, so the estimate is real disk bytes.
4. **`offline.ts`**: before anything, ask the ACTIVE service worker whether it serves downloaded books (`static/sw-offline-book.js` answers a message; an older worker does not, and a download made under it would say "Sótt" yet never open offline). One download at a time per tab, a Web Lock across tabs. One sync routine for first download, resume and update (fetches only files that are new or whose hash changed, deletes removed ones), a held-state record written **last** into the book's cache, a size check of each body against the manifest, and a final check that the `toc.json` fetched LAST still has the manifest's version (a deploy that lands mid-download leaves the book incomplete, never complete, and the next run fetches the new manifest). `navigator.storage.persist()` and a quota check run first.
   - **Frozen books** (physics, biology, microbiology) keep a live `toc.json` with no `offline` field, because the deploy freezes them. They fall back to a runtime file list (`getBookContentUrls`, now including front matter, appendices and answer keys, plus the `<img>` walk) with no size shown.
   - **Legacy records** (`version: '1.0'`, written by the old code) are never shown as "Sótt": they become "Fyrra niðurhal var ófullkomið — sæktu bókina aftur".
5. **`DownloadBookButton.svelte`** states: not downloaded (with the real size), downloading, complete ("Sótt"), outdated ("Ný útgáfa — Uppfæra"), incomplete ("N skrár vantar — Ljúka niðurhali"), legacy.

### Why the cache name `book-images` is kept

A hard load of a frozen book's page runs the **old** `offline.ts` (the frozen pages load the old build's `_app/immutable/` bundles) under the **new** service worker. The old code writes into `book-images` by name. Kept, those writes land in a capped 7-day cache and age out; renamed, they would land in an orphan cache that nothing ever expires.

## Trade-offs to know before diagnosing a deploy

- 🔴 **One stale view.** With `StaleWhileRevalidate`, the first view of a figure cached in the last 7 days shows the **old** bytes after a content deploy; the second view is fresh. Opening yesterday's section right after the chemistry sync and seeing the old figure is expected, not a failed deploy. Readers also get nothing new until they accept the service-worker update prompt.
- **Request chatter.** With `cache: 'no-cache'`, every figure view fires a background conditional request — a 304 normally, a full 200 after a deploy because of the ETag churn. Dropping `no-cache` on the image route would trade that for a worst case of 24 h + one view.
- Each figure over 1 MiB is never stored by the service worker while browsing: 60 in chemistry as deployed (83.7 MB), **163 on efni `main` (799 MB)**. The browser's HTTP cache still holds it, and a downloaded book still holds it.
- **Download size:** chemistry is 345 MB as deployed but **~1 GB on efni `main`** (single SVGs up to 66 MB) until efni's recompose rasterises the heavy tail. The estimate now shows that honestly; it is a reason to land efni's recompose before, or with, the chemistry sync.

- **Stalled network, downloaded book.** A figure fetch whose response headers take over 4 s is aborted and the downloaded copy shown — only for figures with a downloaded copy. Live time-to-first-byte for the largest chemistry SVG (3.1 MB, 990 KB gzipped) measured **0.15–0.25 s**, the same as a 60 KB one (nginx's gzip streams), so 4 s has about 25× headroom. On a link whose first byte ALWAYS takes over 4 s, a downloaded book's figures stay at their downloaded version (the aborted response never refreshes the browsing cache) until "Uppfæra".
- **ETag churn costs a full re-download per deploy.** With `cache: 'no-cache'`, every page and figure a reader views after a deploy is fetched again in full (200, not 304), because the deploy changes every ETag. The `sync-etag-churn` worklist task removes that.

## Out of scope (named, on the worklist)

- **Offline cold start.** `navigateFallback: null` plus `globIgnores: ['**/prerendered/**']` precaches no HTML page, so a hard load of a section URL offline fails whatever is downloaded. A downloaded book is readable offline from an open tab (client-side navigation).
- **First visit.** A tab no service worker controls yet can download (the active worker is checked), but cannot read offline until the page is opened again; the button says so.
- **ETag churn.** A post-build step that restores `build/content/**` mtimes from `static/content/**` would make unchanged files answer 304 across deploys. Detector: `curl -sI` one figure before and after a deploy with no content change; `last-modified` must not move. _Done another way (`fix/deploy-etag-churn`): `deploy.js` runs rsync with `--checksum --no-times`, which covers every file, not only `content/`, and needs no one-off deploy to realign mtimes._

## Tests

- Vitest: the serialized plugins (rebuilt from source text), the routes' bypass, the manifest builder, `planSync`/`deriveStatus`, the store migration.
- Playwright against the production build (`e2e/offline.spec.ts`, `e2e/offline-download.spec.ts`), each run red on `main` first:
  freshness (route swap), size gate, full download survives offline (fixture derived at run time, skipped with ≤ 200 figures; its own file, no retries, no trace — ~1 GB on CI), real estimate, legacy record not "Sótt", emitted `sw.js`; after review, "online, the network copy beats a downloaded one", whose control (the old plugin restored) fails with the 14-byte stand-in served instead of the 1,684,336-byte figure.

## Manual QA for [USER]

Download chemistry on a real iPad, read a few sections offline (open tab, flight mode), come back after a week and check it still reads offline or says honestly what is missing.
