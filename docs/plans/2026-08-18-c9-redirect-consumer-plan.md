# §C9 redirect consumer — analysis and plan

**Written 2026-08-18**, in response to `docs/handoffs/2026-08-18-c9-slug-map-redirect-consumer.md`.
Everything below was measured — against this repo, against `../namsbokasafn-efni`, and against live
prod — not recalled. Where it contradicts the handoff, the measurement is cited.

---

## 0. State of the world, measured 2026-08-18

| Thing                                     | Measured                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `namsbokasafn.is` old ch10 URL            | `/content/efnafraedi-2e/chapters/10/10-5-fast-astand-efnis.html` → **200, 21674 B** |
| new ch10 URL                              | `…/10-5-fastur-efnishamur.html` → **200, 21731 B**                                  |
| control (nonsense `.html` under same dir) | **404, 162 B** — discriminates                                                      |
| slug map on prod                          | `…/slug-map.mt-preview.json` → **404** (not deployed)                               |
| prod vefur checkout                       | `856988b` = `origin/main`, 0 ahead / 0 behind, clean tree                           |
| prod efni checkout                        | `d3607c50` = `origin/main`, §C9 merged                                              |

**The duplicate is still live for readers.** efni's prune is merged on efni's `main` but has never
reached this site — prod serves the **2026-08-07** build. The "efni deployed to production" on
2026-08-18 was **Ritstjóri** (`ritstjorn.namsbokasafn.is` → 302 login); the reader site was untouched.

### The sequencing consequence — this is the most useful fact in this document

**The prune and the map arrive in the same sync.** `.github/workflows/deploy.yml:52-55` runs
`node scripts/sync-content.js --source ./namsbokasafn-efni` inside the deploy job. So:

- There is **no 404 window to race**. Today the old URL serves a stale page; after the next deploy it
  404s. Those are the only two states.
- If the redirect consumer merges **before** that deploy, one CI run carries prune + map + redirect
  **atomically** and readers never see a 404 at all.
- The handoff's "⚠️ Until it ships the old ch10 URL 404s" describes the _post-sync_ state only. It is
  not true today.

This reframes urgency: the redirect is **not independently urgent — it is coupled to the next deploy.**
Nothing has scheduled that deploy, so there is time. But whoever triggers it should know that
deploying without the consumer is what creates the 404.

---

## 1. 🔴 The blocker nobody had noticed

**`src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.ts` will silently swallow any
redirect you put in it.**

Line 47 opens `try {` _before_ `loadTableOfContents`. The catch at line ~122 reads:

```ts
} catch (e) {
    if (isHttpError(e)) throw e;
```

SvelteKit throws redirects as a **`Redirect`** object, which `isHttpError` does **not** match. So a
`throw redirect(301, …)` anywhere inside that `try` is caught, falls through, and is converted into
`error(404, 'Kafli fannst ekki eða gat ekki hlaðið efni.')`.

Consequences, all bad and all quiet:

- The prerenderer writes a file only for 200 and 3xx responses → **no stub is emitted**.
- `svelte.config.js:24` sets `handleHttpError: 'warn'` → **the build stays green**.
- nginx `try_files` misses → falls to `/200.html` → the same `load` re-runs client-side → same 404.

**The sibling route already has the fix.** `src/routes/[bookSlug]/vidauki/[appendixLetter]/+page.ts`
imports `isRedirect` and its catch reads `if (isHttpError(e) || isRedirect(e)) throw e;`. This exact
trap has been hit in this repo once already.

▶ **Fix this first, in its own commit, before writing any redirect logic.** Every design considered
would otherwise have shipped as a silent no-op that tests green.

---

## 2. What the handoff got wrong or left out

1. **"Route status codes are meaningless here" — half true, and it led to the wrong test strategy.**
   Status codes are indeed uniform (200 everywhere), but **sizes and `cache-control` discriminate
   perfectly**. Measured on prod:

   | URL                                                                                             | status | size          | `cache-control` |
   | ----------------------------------------------------------------------------------------------- | ------ | ------------- | --------------- |
   | `/efnafraedi-2e/kafli/10/10-5-fast-astand-efnis/`                                               | 200    | **314 522 B** | _(none)_        |
   | `/efnafraedi-2e/kafli/99/` (nonsense)                                                           | 200    | **3 012 B**   | `max-age=0`     |
   | `/efnafraedi-2e/vidauki/A/` (a redirect stub)                                                   | 200    | **126 B**     | _(none)_        |
   | Page URLs **are** testable. The fallback shell is exactly 3 012 B and carries `cache-control`;  |
   | real prerendered pages carry none. Test page routes directly — just assert on size, not status. |

2. **`hooks.server.ts` cannot work.** The handoff offers it as one of two shapes, saying it "catches
   every route uniformly." This is `@sveltejs/adapter-static` with `fallback: '200.html'` — **there is
   no server at runtime**. A `hooks.server.ts` runs during prerender only and never sees a visitor.
   The choice was never open; there is one shape.

3. **The mechanism is already live in production, so this is not new infrastructure.**
   `curl https://namsbokasafn.is/efnafraedi-2e/vidauki/A/` returns **200, 126 bytes**:

   ```html
   <script>
     location.href = "/efnafraedi-2e/lotukerfi";
   </script>
   <meta http-equiv="refresh" content="0;url=/efnafraedi-2e/lotukerfi" />
   ```

   That is SvelteKit's prerendered redirect stub, emitted from the one existing `redirect()` in the
   app, served by the currently-applied nginx. The delivery path is proven.

4. **`export const trailingSlash = 'always'` (`src/routes/+layout.ts:1`) is load-bearing and
   undocumented.** nginx has **no `try_files $uri.html`**. Stubs are only reachable as
   `<slug>/index.html` via `$uri/` + `index index.html`. Deleting that one line as "cleanup" would
   make every redirect silently unreachable **while the build stays green**.

5. **`entries()` must be changed, not just `load`.** Once efni prunes, the old slug leaves `toc.json`,
   so nothing generates the stub. A slug-map check placed only in `load`'s existing `if (!result)`
   404 branch is dead code — and today it is _doubly_ dead, because both files are still in
   `toc.json`, so `findSectionBySlug` **succeeds** for the old slug and the 404 branch never runs.
   The redirect check must sit **between** `loadTableOfContents` and `findSectionBySlug`.

6. **A sync must be scoped.** (From the efni session, not in the handoff.) `liffraedi-2e` is under a
   live [LEAD] publication hold — an unscoped `sync-content.js` publishes content the register
   records as known-bad, and **nothing in the tooling blocks it**. Always:
   `node scripts/sync-content.js --source ../namsbokasafn-efni efnafraedi-2e`

---

## 3. Recommended design — a checked-in constant, not a map reader

**New — `src/lib/data/sectionRedirects.ts`** (~30 lines):

```ts
export type SectionRedirect = {
  bookSlug: string;
  fromChapter: string;
  fromSlug: string;
  toChapter: string;
  toSlug: string;
};
export const SECTION_REDIRECTS: SectionRedirect[] = [
  // m68770 — efni slug-map.mt-preview.json, recorded 2026-08-18
  {
    bookSlug: "efnafraedi-2e",
    fromChapter: "10",
    fromSlug: "10-5-fast-astand-efnis",
    toChapter: "10",
    toSlug: "10-5-fastur-efnishamur",
  },
];
```

**Why a constant rather than reading `slug-map.*.json`:** `static/content/` is gitignored, so anything
derived from it is **absent in a clean checkout**. A checked-in constant is present in CI, in tests,
and on a machine that has never synced. Against that, a map reader would have to reconcile two tracks,
skip `to === from`, existence-check the target, and validate derived URL shapes (note
`handleEntryGeneratorMismatch` defaults to **throw** — a malformed derived entry fails the build) —
all machinery guarding against the map, for **one entry**, in a catalogue shrinking from five books to
two. Build the mechanism; don't build the pipeline yet.

**Edit — `[sectionSlug]/+page.ts`**, four changes:

1. Import `redirect, isRedirect`; add `|| isRedirect(e)` to the catch. _(§1 — do this first.)_
2. `entries()`: inside the existing `existsSync(tocPath)` guard, push `{ bookSlug, chapterSlug:
fromChapter, sectionSlug: fromSlug }` for each redirect. The prerenderer's `seen` set dedupes.
3. In `load`, **after** `loadTableOfContents`, **before** `findSectionBySlug`:
   ```ts
   const r = findSectionRedirect(bookSlug, chapterSlug, sectionSlug);
   if (r && exactSectionExists(toc, r.toChapter, r.toSlug)) {
     throw redirect(301, `/${bookSlug}/kafli/${r.toChapter}/${r.toSlug}/`);
   }
   ```
   **The trailing slash is mandatory** — the prerenderer copies `Location` verbatim, so a slash-less
   target costs the reader an extra nginx 301 hop.
4. `exactSectionExists` = exact match on `chapter.sections[].file` basename. Do **not** reuse
   `findSectionBySlug` — its `slug`-field / `1-1`→`1.1` / `\d+-exercises` fallbacks would report
   "live" for the wrong section.

**The target-existence guard is the whole safety argument.** efni's `to` is guaranteed to exist _in
efni's tree_, not in our merged destination: our own `resolveChapterDuplicates`
(`scripts/lib/overlay.js`) deletes whichever duplicate is absent from `faithful` **by filename**, and
that can be efni's `to`. If the target is not present we emit nothing and fall through to today's
behaviour — never a redirect onto a 404, never a loop.

### Recommended second guard — assert the destination's module id

Confirmed with the efni session, from `tools/lib/publication-reconcile.js:81-113`: **`from` and `to`
are always the same module by construction** — `to` is looked up _by_ `moduleId`, so a rename is only
recorded when one module's own filename changed. `data-module-id` is emitted at exactly one site
(`cnxml-render.js:814`, the `<article class="cnx-module">` wrapper), so a first-match regex is
unambiguous, and compiled rollups carry no such attribute and can never be a `to`.

**The "no rollup can ever be a `to`" clause was counted, not inferred** (efni re-checked it on
request, because the whole-branch review had already been burned by reasoning from a code comment):
`renderedModules` has **exactly one `.set(` call site** — `cnxml-render.js:3593`, inside the
real-module loop right after `writeOutput`. The seven rollup blocks (3659, 3722, 3832, 3881, 3963,
3980, 4026) synthesize ids like `${chapterStr}-key-terms` but **never write into `renderedModules`**.
So a fail-closed module-id check cannot no-op a legitimate redirect — it can only catch a genuine
mismatch.

So a cheap build-time assertion is available and worth having: **the destination HTML's
`data-module-id` must equal the `moduleId` recorded beside the redirect.** Add it to the
`validate-content.js` warn pass (§3) or to the build assertion in §6.4.

This is defence-in-depth across the repo boundary. efni's whole-branch review found a defect where a
filename handed between two modules made A's URL redirect to **B's** page — a live 200 serving the
wrong section. That class is now refused at the emitter (`publication-reconcile.js:89`,
`if (writtenThisPass.has(filename)) continue;`), but a destination check means a future recurrence
degrades to a no-op 404 here rather than a confident redirect to the wrong content.

⚠️ **Do not parse the map's `contract` string.** Per efni, the committed copy is already one revision
behind the code's constant and is silently rewritten on the next prune. It is prose for humans. Key on
`renames` only.

⚠️ **An absent map means "no redirects", not an error**, and the reconcile is **best-effort** — its
call site catches and logs `§C9 reconcile failed (render itself succeeded)` and the render still exits 0. Never treat a missing map or a missing entry as a repo-side failure.

This is a **soft redirect** (200 + meta-refresh), not a 301. Nothing in adapter-static can emit a real 301. That is acceptable and should be stated plainly rather than described as a 301.

---

## 4. Do NOT build

- **An nginx `return 301` as the working mechanism.** `deploy.yml` rsyncs `build/` over a
  directory-restricted `rrsync` key — it cannot touch nginx. The unapplied CSP `frame-src` is the
  standing proof that _merged ≠ applied_. Worse, `return 301` sits above `try_files` with no on-disk
  guard, so pre-sync it would redirect a live 314 KB page away.
  _(A commented-out 301 block **is** now in `nginx-config-example.conf` as a decided follow-up —
  see §7.2. The distinction is the point: it is an optional SEO upgrade, never the thing that makes
  the redirect work.)_
- **A `slug-map.*.json` reader / `toc.renames` pipeline.** See §3.
- **`hooks.server.ts`.** No server exists. (§2.2)
- **Appendix-route support.** efni offered to emit appendix renames; the answer is _not yet_.
  `/vidauki/<letter>` is **ordinal-derived** (`generate-toc.js:431-437`), so a title rename changes no
  URL. Nothing to redirect.
- **Anything for the service worker.** `vite.config.ts:65` sets `navigateFallback: null` and the
  precache manifest globs `client/**` only — no HTML is precached, so navigations always reach nginx.
- **Redirects for `edlisfraedi-2e` / `liffraedi-2e` / `orverufraedi`** — being dropped from preview.

---

## 5. ✅ Accepted risk: a rename silently destroys reader data

Not in the handoff, and arguably more reader-visible than the URL. `storeHelpers.ts:21-23`:

```ts
export function createSectionKey(bookSlug, chapterSlug, sectionSlug) {
  return `${bookSlug}/${chapterSlug}/${sectionSlug}`;
}
```

`sectionSlug` is the **raw URL param**. Nothing keys on the stable `moduleId`. A rename therefore
orphans every per-section record: read flags, `lastVisited`, scroll positions and bookmarks
(`reader.ts`), learning objectives (`objectives.ts`), reading-time analytics (`analytics.ts`) and
highlights (`annotation.ts:171`).

Two things worse than they first appear:

- **Highlights do not re-attach.** Their `TextRange` anchoring only positions a highlight _within_ a
  section already retrieved; retrieval is gated on the exact slug triple first, so zero annotations
  come back and the anchoring never runs. They vanish.
- **An orphaned bookmark becomes invisible AND unremovable.** `bokamerki/+page.svelte:68-69` does
  `if (!info) continue;` — once the stale file leaves `toc.json` the bookmark is silently dropped from
  the list, while the only delete path computes the _new_ key. It persists as unreachable garbage.
  The redirect actually makes this **less** detectable: the reader lands on a working page showing 0%.

The only migration that exists (`migrateRecordKeys`, `storeHelpers.ts:163-183`) handles book-prefix
legacy only — there is no section-slug path.

### ✅ DECIDED 2026-08-18 — accept the loss for this one section

Owner's call: **no migration.** One section, one book, a handful of students mid-August. Build no
`migrateRecordKeys` extension for now.

▶ **Revisit if a second rename lands**, and treat that as the trigger rather than a vague "later".
The closing move, when it comes, is a ~15-line one-shot migration keyed off `SECTION_REDIRECTS`
covering `reader.progress` / `bookmarks` / `scrollPositions`, `objectives` (note its 4-part key),
`annotation` and `analytics.sectionReadingTimes` — mind `quiz.ts:118-121`'s deliberate 1-slash
carve-out if quiz is ever included. `SECTION_REDIRECTS` is deliberately the right shape to feed it,
so accepting the loss now costs nothing later.

⚠️ Consequence to remember, because it is counter-intuitive: **the redirect makes the loss less
visible, not more.** The reader lands on a working page showing 0% rather than hitting an error that
would prompt them to say something.

---

## 6. Sequencing

1. **`isRedirect` fix alone**, own commit. (§1)
2. `sectionRedirects.ts` + `entries()` + `load` guard. Same PR.
3. Tests, each with a control that must still fail:
   - `findSectionRedirect` returns `null` for the **new** slug (catches a from/to swap → self-loop).
   - No entry has `fromSlug === toSlug`.
   - `load` throws a redirect whose `Location` ends `/10-5-fastur-efnishamur/`.
   - **Control:** the same `load` against a TOC lacking the target must **not** redirect.
4. **Build assertion — the one that protects everything else:**
   `build/efnafraedi-2e/kafli/10/10-5-fast-astand-efnis/index.html` exists, as **directory +
   `index.html`**, under 500 bytes. This is what turns §2.4 (a deleted `trailingSlash` line) red
   instead of silent.
5. Merge, then deploy. CI syncs content itself, so prune + map + redirect ship together.
6. Post-deploy verification, **both** slash forms, each with its control:
   - old URL → 200, ~130 B (the stub) — and the slash-less form → 301 then the stub
   - new URL → 200, ~314 KB
   - nonsense URL → 200, 3 012 B **with** `cache-control` — the control
   - `/content/efnafraedi-2e/chapters/10/10-5-fast-astand-efnis.html` → **404**, proving the prune shipped

---

## 7. Decisions

1. ✅ **localStorage migration (§5) — DECIDED 2026-08-18: accept the loss for this one section.**
   No migration. Revisit when a second rename lands.
2. ✅ **A real 301 for SEO — DECIDED 2026-08-18: write it into `nginx-config-example.conf` as a
   documented follow-up.** Done — the block sits with the other book-slug redirects, **commented
   out**, carrying its precondition. Both slugs are in the live sitemap and each self-canonicalises,
   which is why it is worth having.
   - Exact (`=`) matches, one **pair** per rename (with and without the trailing slash), because
     `trailingSlash: 'always'` makes the slash form canonical.
   - ⚠️ **It must never become load-bearing.** The soft redirect from §3 is the working mechanism and
     needs no nginx change; this is only the 200-plus-hop → true-301 upgrade. If nobody ever applies
     it, nothing breaks — which is the whole point, given the unapplied CSP `frame-src`.
   - ⚠️ **Do not apply before the prune has deployed.** `return 301` runs ahead of `try_files` with
     no on-disk guard, so while the old page is still published it would redirect a live ~314 KB
     page away. Gate on `/content/efnafraedi-2e/chapters/10/10-5-fast-astand-efnis.html` → 404.
   - Keep it in step with `src/lib/data/sectionRedirects.ts`; the two are the same list.

### Still open

3. **Stub cacheability.** The stub gets no `Cache-Control` and falls into `location /`, so browsers
   apply heuristic caching — the redirect is hard to revoke once a reader has hit it. Accept, or add a
   no-cache block next time nginx is touched? Low stakes at one entry; worth deciding before a
   redirect ever needs withdrawing.

---

## 8. Unrelated live bug found on the way

**`https://namsbokasafn.is/efnafraedi-2e/kafli/00/` returns `403 Forbidden` to real users.**

The chapter route emits no page for the front-matter directory, but the directory exists because its
child section pages do — so `try_files $uri/` matches, the index module finds no `index.html`,
autoindex is off, and the `/200.html` fallback is never reached. Control:
`/efnafraedi-2e/kafli/99/` (no directory) correctly returns the 3 012 B shell.

Orthogonal to this work and it does not affect it. Worth its own issue.
