# Handoff — §C9's redirect consumer is vefur's half, and efni's half has shipped

**Written 2026-08-18 from `namsbokasafn-efni` (PR #404).** This describes work to be done **here**,
in `namsbokasafn-vefur`. Everything below about efni was measured on that branch, not remembered.

---

## The problem, and what already changed

A Pass-1 review that corrects a section title **renames** the rendered file, because the title
drives the slug. Until now efni left the old page in place, so `efnafraedi-2e` chapter 10 published
module `m68770` twice and the TOC listed two "10.5" entries. A sync reported it as an unresolved
duplicate and kept both files, deliberately — vefur cannot adjudicate two `mt-preview` pages.

**Efni now prunes the superseded page and records the rename.** The duplicate is gone
(corpus-wide duplicate-module-id groups: 1 → 0). ⚠️ **So the old URL now 404s**, where before it
served a stale page. That is the accepted trade — the reader-visible duplicate mattered more — but
it is why this handoff exists.

---

## What efni delivers, exactly

**File:** `static/content/<bookSlug>/slug-map.<track>.json` after a sync.
In efni it lives at `books/<slug>/05-publication/<track>/slug-map.<track>.json`.

Today exactly one exists: `slug-map.mt-preview.json` for `efnafraedi-2e`, holding one entry.

```json
{
  "book": "efnafraedi-2e",
  "track": "mt-preview",
  "contract": "C9 — old→new so vefur can serve redirects. Every value is CURRENT: chains are collapsed on write, so a single lookup suffices and no transitive walk is needed. SCOPE: this map describes ONE track of ONE book. ...",
  "renames": {
    "chapters/10/10-5-fast-astand-efnis.html": {
      "to": "chapters/10/10-5-fastur-efnishamur.html",
      "moduleId": "m68770",
      "recordedAt": "2026-08-18"
    }
  }
}
```

### Deriving a URL from a key — mechanical, and verified against real content

Keys and values are **track-relative POSIX file paths**. The route is
`/:bookSlug/kafli/:chapterSlug/:sectionSlug`, so:

```
chapters/10/10-5-fast-astand-efnis.html   →   /efnafraedi-2e/kafli/10/10-5-fast-astand-efnis
             ^^                ^^^^^^^^^^        strip "chapters/", split on "/", drop ".html"
```

Confirmed against a real link in the shipped page (`10-0-introduction.html` contains
`href="/efnafraedi-2e/kafli/10/10-5-fastur-efnishamur"`). Chapter segment is the **bare** zero-padded
directory name (`10`, or the literal `appendices`) — the same value `getChapterFolder()` already
deals with. **Appendices have their own route (`/:bookSlug/vidauki/...`), so decide whether the map
should feed it too; efni can emit appendix renames and the key would read `appendices/<file>.html`.**

### The guarantees efni does make

- **Every `to` names a file that currently exists** _in that efni track_. Chains collapse on write
  (`A→B` then `B→C` rewrites A's entry to `A→C`; `A→B→A` deletes the entry), so **one lookup is
  enough — no transitive walk, no cycle handling.**
- The map **accumulates** and is committed. A rename from months ago still resolves.
- Writes are atomic (`.tmp` + rename).

### The guarantees efni does NOT make — read these before designing

1. 🔴 **The invariant is PER-TRACK, and you flatten both tracks into one directory.** That is why
   the filename is track-qualified — it was `slug-map.json` for a few hours and would have been
   copied over by whichever track synced last (`sync-content.js`'s overlay filter has no branch for
   a track-root file, so it falls through to `return true` and copies with `force: true`).
   ▶ **Read each track's map separately and reconcile them yourself.** A rename recorded in
   `mt-preview` and one in `faithful` are different facts about the same book.
2. 🔴 **"Every `to` exists" is true of efni's tree, not of your merged destination.** Your own
   `resolveChapterDuplicates` (`scripts/lib/overlay.js`) deletes the baseline-named page when a
   reviewed rename supersedes it. So a `to` efni wrote can be a file **you** removed. **Resolve
   against what is actually on disk, and fall through gracefully when the target is missing** —
   serving a 404 for the _new_ name is no worse than the current state, but a redirect loop is.
3. ⚠️ **Skip any entry where `to === from`.** Efni's chain-collapse should never emit one, and a
   fuzz + induction proof says no API call sequence can produce one — but a hand-edited or
   externally corrupted map could, and it is a redirect loop.
4. ⚠️ **An mt-preview→faithful rename of the same module records nothing.** Efni's reconciler only
   ever compares one track's directory against that render's own modules. Cross-track supersession
   is entirely yours.

---

## What to build here

**There is no redirect infrastructure today.** Measured: no `src/hooks.server.ts` (no hooks file at
all), and exactly one `redirect()` in the app — `src/routes/[bookSlug]/vidauki/[appendixLetter]/+page.ts`.

The section route that currently 404s is
`src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.ts`.

Two shapes, and the choice is genuinely open:

- **In the section route's `load`** — on a miss, consult the map and `redirect(301, …)`. Local,
  easy to test, and only pays the cost on a 404. Does not help any other route.
- **In a new `hooks.server.ts`** — catches every route uniformly. More infrastructure, and note the
  site is a **client-rendered SPA with an any-path fallback**, so verify carefully (see below).

⚠️ **Whichever you pick: `static/content/` is gitignored and synced, so the map is not present at
build time in a clean checkout.** Decide whether the consumer reads it at request time, or whether
`generate-toc.js` folds it into something already built. Do not assume it can be imported.

### Verifying it — the trap this repo has already been bitten by

**Route status codes are meaningless here.** A real page, a deleted page and nonsense all return
**200 with the same ~2,940-byte SPA shell**. So:

- Test by fetching `/content/<book>/chapters/<NN>/<file>.html`, never a page URL.
- For the redirect itself, assert on the **`Location` header and the 301**, not on the rendered page.
- **Pair every check with a control you expect to still fail** — a set of clean results is
  indistinguishable from fetching something empty. A live page is ~30 KB against ~160 bytes for a
  nonsense URL.

---

## Context you will want

- **Efni PR:** `SigurdurVilhelmsson/namsbokasafn-efni` #404. Design doc:
  `docs/superpowers/specs/2026-08-18-c9-prune-on-rename-design.md`. The register entry is §C9 in
  `docs/plans/2026-07-21-post-item17-followup-campaign.md`.
- **Your side of §C9 is already done** — PR #200 (overlay keys on `data-module-id`, not filename).
  This is the remaining piece named there as "Remaining, vefur-side: redirects for renamed slugs".
- **Two `liffraedi-2e` ch03 renames** were already queued on your side as an independent argument
  for this work, plus 2 nginx redirects in the lead queue.
- ⚠️ **`edlisfraedi-2e`, `liffraedi-2e` and `orverufraedi` are being DROPPED** from preview
  (efni register, [LEAD] re-scope 2026-08-15). Do not invest in redirects for them.
- ⚠️ **A sync conflict is warn-only and does not change `sync-content.js`'s exit code**, so a clean
  sync exit is not evidence there are no duplicates. Read the output.

## Known-unfixed, so you do not chase it

**Published HTML is not byte-reproducible across renders** (efni §C96). MathJax emits per-render SVG
id counters (`MJX-6-…` vs `MJX-35-…`) whose starting value depends on how many modules were rendered
earlier in the pass; glyph data is identical. **A content diff after a re-sync will show noise on
every math-bearing page** — normalise `MJX-\d+-` before comparing, or you will read a routine
re-render as a regression.

---

## Addendum — added in vefur 2026-08-18, after measuring prod and consulting the efni session

Not part of the original handoff. Recorded here because this doc is the first thing a future session
reads.

1. 🔴 **SCOPE ANY VERIFICATION SYNC TO ONE BOOK.**
   `node scripts/sync-content.js --source ../namsbokasafn-efni` with **no book argument syncs every
   book**, and `liffraedi-2e` is under a live [LEAD] publication hold in efni's register ("do not
   sync"): ch03+ch05 are corrected on disk but the whole book is queued for re-extraction + re-MT, so
   an unscoped sync publishes a page already recorded as known-bad. **Nothing in the tooling blocks
   this.** §C9 is a chemistry change — name the book:
   `node scripts/sync-content.js --source ../namsbokasafn-efni efnafraedi-2e`

2. **"Until it ships the old ch10 URL 404s" is true only of the post-sync state.** Measured on prod
   2026-08-18: both ch10 pages are still live (200/21674 B and 200/21731 B, with a nonsense control
   returning 404/162 B), and the slug map is not deployed. efni's prune has not reached this site.
   Because the prune and the map arrive in the **same** sync, there is no interim 404 window — and if
   the consumer merges first, one deploy carries prune + map + redirect atomically and readers never
   see a 404. efni has accepted this correction and is recording it in its register.

3. ⚠️ **"Route status codes are meaningless here" led to the wrong test strategy.** Status codes are
   uniform, but **size and `cache-control` discriminate perfectly**: a real prerendered page is
   ~314 KB with no `cache-control`; the fallback shell is exactly 3 012 B _with_ one; a redirect stub
   is ~126 B. Page URLs **are** testable — assert on size, not status.

4. ❌ **The `hooks.server.ts` option does not exist.** This is `adapter-static` with
   `fallback: '200.html'` — there is no server at runtime, so a `hooks.server.ts` runs during
   prerender only and never sees a visitor. There is one shape, not two.

5. **Appendix renames: not yet.** `/vidauki/<letter>` is ordinal-derived (`generate-toc.js:431-437`),
   so a title correction changes no URL. Nothing for the map to feed.

▶ Full analysis, design and sequencing: `docs/plans/2026-08-18-c9-redirect-consumer-plan.md`
