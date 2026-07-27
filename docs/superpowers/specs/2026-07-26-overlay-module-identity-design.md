# Overlay by module identity, not filename — design

**Date:** 2026-07-26
**Tracks:** vefur issue [#197](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/issues/197) · efni campaign register item **C9** (`namsbokasafn-efni/docs/plans/2026-07-21-post-item17-followup-campaign.md`)
**Deadline:** before the fall semester (lead commitment, set 2026-07-26)

## Problem

The `mt-preview` → `faithful` content overlay is keyed on **filename**. A section's
rendered filename is derived from its title, so a review that corrects a title
**renames the file**. Filename-keyed logic then misbehaves in three distinct ways.

### 1. A renamed module is published twice

`sync-content.js` mirrors `mt-preview` with `--delete`, then copies `faithful` on top
**without** `--delete` (deliberate: a partial overlay must never wipe baseline chapters).
When the two tracks emit different filenames for the same module, the overlay **adds**
instead of replacing. The destination holds both files; `generate-toc.js:499`
`readdirSync`es that destination, so **both become TOC entries** — one under the corrected
title with no banner, one under the old mistranslated title still flagged
machine-translated. The stale page stays reachable and indexable.

`isReviewedModule` (`generate-toc.js:266-279`) tests
`existsSync(faithful/chapters/<ch>/<contentFile>)`, also by filename, which is why only
one of the pair loses the banner.

**Has not fired via the overlay yet** — it needs a faithful build whose title differs from
mt-preview's. It fires on the first genuine Pass-1 title correction, imminent on
`liffraedi-2e` ch03 (MT rendered "Lipids" as `Fitusýrur`, i.e. fatty acids).

### 2. A renamed module silently freezes the whole chapter's review state

`chapterFullyFaithful` (`overlay.js:88`) asks `mtModules.every((f) => faithfulFiles.has(f))`
— filename set membership. One renamed title makes a chapter that **is** fully reviewed
read as incomplete. Consequences: its rollups (summary / key-terms / key-equations /
exercises / answer-key) never switch to faithful, and the machine-translation banner never
clears. No duplicate, no error, no warning — just a permanently stuck banner. Same root
cause, and easier to miss than the duplicate.

### 3. The duplicate symptom is already live in production

Verified 2026-07-26 against `https://namsbokasafn.is/content/efnafraedi-2e/toc.json`:
chapter 10 carries **two "10.5" entries**.

| file                          | title             | rendered                                                |
| ----------------------------- | ----------------- | ------------------------------------------------------- |
| `10-5-fast-astand-efnis.html` | Fast ástand efnis | 2026-07-10 (`485e266c`)                                 |
| `10-5-fastur-efnishamur.html` | Fastur efnishamur | 2026-07-14 (`dac08993`, "B4-D11 term translation live") |

Both carry `data-module-id="m68770"`. **Both live in efni's `mt-preview`** — a re-render
corrected the title and the old file was never pruned, so vefur's `--delete` baseline
mirror faithfully reproduces efni's duplicate. This is the only such pair across all five
books' publication trees (checked by grouping `data-module-id` per chapter directory).

Two consequences that shape the design:

- The register's prescribed fix — "sync deletes the baseline file the faithful overlay
  supersedes" — **would not fix chapter 10**, because neither file comes from `faithful`.
- **Vefur has no content-derived authority to pick a winner between two baseline files.**
  The obvious tiebreaker was tested and is wrong: ch10's intro `chapter-outline` nav still
  links the _stale_ slug, because the intro was rendered 07-10 and the rename landed
  07-14. `mtime`/git order are not content properties and are not reproducible across a
  fresh clone or an rsync.

The repair for ch10 is efni's (prune stale renders on rename; delete the dead file;
re-render the ch10 intro whose nav points at a slug that will 404). **Vefur's job here is
detection, not repair.**

## Facts established by survey

- `data-module-id` sits on `<article class="cnx-module">`, **at most one per file**
  (checked across every rendered HTML file in all five books).
- It is present on **every reading module, front-matter page, and appendix page**.
- It is absent on most chapter aggregation rollups — `summary`, `exercises`,
  `answer-key`, per-type exercise pages. Some aggregation pages carry a
  _synthetic_, chapter-scoped id instead of a real module id: `key-terms` (25
  files across the synced content), `key-equations` (18 files), and one
  `summary` (`edlisfraedi-2e/chapters/04/4-summary.html`, id `04-summary`).
  `key-terms` is not the only exception — the synthetic id looks like
  inconsistent emission from the rendering pipeline, not a rule tied to page
  type.
- Aggregation and appendix filenames are chapter- or letter-derived, not title-derived, so
  they are not rename-prone; reading-module, front-matter and appendix **slugs are
  title-derived** and are.
- efnafraedi's appendix directory is `chapters/appendices/`, which the existing
  `/^\d{2}$/` directory filters in both scripts skip entirely.

## Design

All identity logic goes in `scripts/lib/overlay.js` — the shared lib whose header already
states its purpose is that `sync-content.js` and `generate-toc.js` "can never disagree".
`overlay.js` stays **decision-only** — it reads the filesystem but never mutates it; the
deletion lives in `sync-content.js`.

### `overlay.js` — new exports

```js
/** First data-module-id in a rendered page, or null. At most one per file. */
export function moduleIdOf(filePath): string | null

/**
 * Stable identity for a file within its directory — what "the same section"
 * means when the filename is not stable.
 *   aggregation page          -> `agg:<filename>`
 *   has a data-module-id      -> `module:<id>`
 *   otherwise                 -> `file:<filename>`
 */
export function fileIdentity(dir, filename): string

/** Map<filename, identity> for every .html in dir. Memoized by resolved path. */
export function chapterIdentityIndex(dir): Map<string, string>

/** Drop the memo — for tests, and after a directory is mutated in-process. */
export function resetIdentityCache(): void
```

Namespacing the identity matters: it guarantees `key-terms`' synthetic `03-key-terms` can
never collide with a real module id or with a filename.

Aggregation pages key on filename by construction, so their synthetic ids are never read —
and since filenames are unique within a directory, an aggregation page can never form a
duplicate group. Duplicate groups therefore only ever arise among reading, front-matter
and appendix modules.

Memoization is needed because `isReviewedModule` is called once per file and itself calls
`chapterFullyFaithful`, which reads two directories — naive re-reading is O(n²) file reads
on a 252-file book. The cache is keyed on the resolved directory path; the only in-process
mutation is sync's own prune sweep, which calls `resetIdentityCache()` after deleting.

### `overlay.js` — `chapterFullyFaithful` rewritten

Compare **identity sets** instead of filename sets: build the faithful chapter's identity
set, then require every mt-preview reading module's identity to be in it. Existing
behaviour is otherwise preserved — a chapter present only in faithful still returns `true`,
a genuinely incomplete chapter still returns `false`.

This alone fixes problem 2.

### `overlay.js` — `resolveChapterDuplicates`

```js
/**
 * Which of a synced directory's files are duplicates, and which of them the
 * faithful overlay authorises us to drop.
 *
 * @param dir           a synced chapter/front-matter/appendix directory
 * @param faithfulDir   the corresponding faithful source directory; null or a
 *                      non-existent path when the book has no overlay
 * @returns {{ superseded: string[], conflicts: Array<{identity: string, files: string[]}> }}
 */
export function resolveChapterDuplicates(dir, faithfulDir)
```

Group `dir`'s `.html` files by `fileIdentity`. For each group of more than one:

- **exactly one member also exists in `faithfulDir`** (by filename) → that member is the
  authorised winner; the rest go in `superseded`.
- **anything else** — no member in faithful, or two or more members in faithful → the whole
  group goes in `conflicts`. Nothing is dropped.

A missing `faithfulDir` is normal (mt-preview-only books) and makes every duplicate group a
conflict, which is correct: with no overlay there is no authority.

**A baseline rollup can never be deleted by this.** Aggregation pages key on filename, and
filenames are unique within a directory, so a rollup is never part of a duplicate group.
That matters because when `faithfulFileWins` filters a faithful rollup out (the chapter is
not fully faithful), the destination keeps the complete mt-preview rollup whose filename
_also_ exists in `faithfulDir` — under a filename-keyed rule that file would look like a
loser and be deleted. Identity keying makes the case unreachable.

The authorised winner is always present in `dir`: `faithfulFileWins` returns `true`
unconditionally for non-aggregation files, so a faithful reading, front-matter or appendix
module is always copied to the destination.

One function, both callers, same verdict — by construction the two scripts cannot disagree.

### `sync-content.js` — post-overlay prune sweep

A new exported `pruneSupersededFiles(bookDest, faithfulPath, bookSlug)` (`bookSlug` is used only to
name the book in the conflict warning message):

- Runs **after** the overlay and **before** the `generate-toc.js` regeneration, in **both**
  the rsync path (`syncBook`) and the cp-fallback path (`syncBookFallback`) — so the TOC is
  always generated from an already-pruned destination.
- Runs **whether or not the book has a faithful overlay** — ch10's duplicate needs no
  overlay to exist, and a mt-preview-only book can carry the same defect. When there is no
  overlay, `faithfulPath` is `null` and every duplicate group reports as a conflict.
- Iterates **every** subdirectory of `bookDest/chapters/` — `00`, `01…NN`, and
  `appendices` / `appendix` / `99` — not just `/^\d{2}$/`.
- Deletes each `superseded` file and logs the deletion with its chapter-relative path (not
  its module id — the id appears in the conflict block below, not the deletion log line).
- For each conflict, prints a delimited `⚠️` block naming book, directory, module id and
  the competing filenames, and states the repair belongs in namsbokasafn-efni (prune the
  stale render). Not fatal; both files stay.
- Calls `resetIdentityCache()` after mutating, so a later read of the same directory in the
  same process sees the truth. (`generate-toc.js` runs as a separate process via
  `execFileSync`, so it is unaffected either way.)
- Skipped under `--dry-run`, matching the overlay step.
- **Failures are contained per book.** The call is wrapped in a try/catch in _both_ sync
  paths; a throw logs, marks that book failed, and lets the loop continue to the next one.
  Without this, an `rmSync` failure on the rsync path — the default whenever rsync is
  installed — propagates uncaught out of `main()` and kills the process, leaving every
  remaining book unsynced and skipping the provenance sync, the post-sync audit and the
  summary. `rmSync` also takes `{ force: true }`, so a file that vanished between
  `readdirSync` and the delete no-ops instead of throwing.
- **Unresolved conflicts are counted and re-reported at the end of the run**, after the
  `Sync complete: N succeeded, M failed` line. A mid-run warning is easy to miss in a long
  log, and being loud is the entire value of the no-authority case. A conflict does **not**
  change the exit status — it is a content defect in efni, not a sync failure, and failing
  the sync would block a deploy over something vefur cannot fix. A genuine I/O error is
  different: it fails its book and so does affect the exit code, like any other book-level
  failure.

`sync-content.js` gains the `import.meta.url === pathToFileURL(process.argv[1]).href` guard
around `main()` and a named export for the sweep, so the deletion loop is unit-testable.
This mirrors the existing precedent in `scripts/process-content.js:194`.

### `generate-toc.js` — backstop at all three enumeration sites

`generate-toc.js` runs standalone (`node scripts/generate-toc.js`) and against destinations
synced by older versions of the script, so it cannot assume the sweep ran.

At each of `generateToc` (chapter loop, currently line 499), `scanFrontMatter`
(`chapters/00`) and `scanAppendices` (appendix directory): call
`resolveChapterDuplicates`, exclude `superseded` filenames from the entry list, and warn on
`conflicts` while keeping every entry. Accumulate conflicts and print a summary block at
the end of the run so they do not scroll away behind per-chapter output.

Dropping a `superseded` file from `toc.json` also makes it unreachable through the reader
and absent from the sitemap, because `findSectionBySlug` and `generate-sitemap.js` both
resolve against `toc.json`.

`isReviewedModule` needs **no change**: after the sweep the served file _is_ the faithful
filename, so its `existsSync` check is correct again.

## Known edge case — the two callers can consult the faithful tree under different preconditions (not fixed, not observed)

`generate-toc.js`'s `usablePages` builds its faithful comparison directory unconditionally
from `<efniPath>/books/<slug>/05-publication/faithful/chapters/<dirName>` and hands it to
`resolveChapterDuplicates`, which only checks that the path exists. `sync-content.js` is more
selective: it only treats `faithful` as an overlay when `getPublicationLayers` recognises it,
and `variantWithChapters` requires the faithful `chapters/` tree to contain **at least one**
subdirectory matching `/^\d{2}$/`. `00` and `99` satisfy that test, so a faithful tree
containing either is recognised as an overlay and the disagreement below does not arise. Only
a faithful tree whose sole `chapters/` subdirectory is non-numeric — `appendices/` or
`appendix/` — escapes the check.

So a faithful tree holding **only** `chapters/appendices/` (or `chapters/appendix/`) — nothing
numbered — is invisible to `sync-content.js`: `variantWithChapters` returns `null`, the book
syncs with no overlay, and that appendix directory's faithful content is never copied into the
destination. `generate-toc.js` has no such gate: it reads straight from
`<efniPath>/.../faithful/chapters/appendices` regardless of what sync decided.

Reaching a wrong TOC verdict from this needs two things to coincide, not just the tree shape
above: (1) the synced destination's appendix directory must already hold a duplicate — two
files sharing one module id, the same failure class as chapter 10's mt-preview duplicate,
which needs no overlay at all to occur — and (2) exactly one of those two filenames must also
exist, by exact name, in efni's faithful appendix directory, even though that faithful content
was never copied into the destination because sync did not recognise the tree as an overlay.
Only then does `usablePages` pick a "winner" and drop the other appendix page from
`toc.json`, on the authority of a faithful file the sync run never applied.

This is a constructed scenario, not an observed one: every other shape tried (faithful-only
book, mt-only book, a chapter present in one track but not the other, a chapter missing from
faithful entirely, no efni tree at all) gives both callers the same answer, several checked
against real synced content. This specific stacked condition — a numbered-appendix-only
faithful tree combined with an mt-preview appendix duplicate that also collides by filename
with a faithful appendix file — was not found in any of the five books' publication trees at
the time of writing, and is not fixed in code. Recorded here so a future reader does not have
to rederive the reachability conditions from scratch.

## Out of scope — deliberate

- **Redirects for renamed slugs.** Deleting a superseded baseline file makes its URL 404.
  That is accepted (the register says renames "only 404 the old URL rather than
  duplicating"). A redirect needs an old-slug → new-slug map persisted across syncs, since
  after this fix the old filename no longer exists to derive one from. Separate item.
- **Any tiebreak between two baseline files.** Vefur has no authority; see problem 3.
  Choosing silently would ship an arbitrary pick between two different human-visible
  translations and mask efni's render-prune bug.
- **Failing the build on a conflict.** Would block a sync/deploy on a content-repo defect
  weeks before the fall semester.
- **A third warning surface in `audit-content.js`.** Sync already prints the warning at the
  moment the duplicate is observed, and generate-toc prints a summary.
- **Repairing chapter 10.** efni-side: prune-on-rename in the render pipeline, delete
  `books/efnafraedi-2e/05-publication/mt-preview/chapters/10/10-5-fast-astand-efnis.html`,
  and re-render the ch10 intro so its nav stops pointing at the dead slug.

## Testing

New file `scripts/lib/overlay.test.js` — `overlay.js` has no tests today. Vitest already
globs `scripts/**/*.{test,spec}.{js,ts}`.

Fixtures are synthetic trees built with `mkdtempSync`, **never derived from
`static/content/`** — per the standing rule that gating fixtures must not bake in a fact
about efni's content that expires.

| #   | Behaviour                                                                     | Expectation                                                    |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | `moduleIdOf` on a rendered module                                             | returns the id                                                 |
| 2   | `moduleIdOf` on a rollup with no id                                           | returns `null`                                                 |
| 3   | `fileIdentity` — reading module                                               | `module:<id>`                                                  |
| 4   | `fileIdentity` — a rollup, with or without an id                              | `agg:<filename>`                                               |
| 4b  | `fileIdentity` — a non-aggregation page carrying no module id                 | `file:<filename>`                                              |
| 5   | `fileIdentity` — aggregation page carrying a synthetic id (e.g. `key-terms`)  | `agg:<filename>` (aggregation branch wins)                     |
| 6   | `chapterFullyFaithful` — chapter complete but one module renamed              | **`true`** (regression for the stuck banner)                   |
| 7   | `chapterFullyFaithful` — a module genuinely missing from faithful             | `false`                                                        |
| 8   | `chapterFullyFaithful` — chapter present only in faithful                     | `true`                                                         |
| 9   | `resolveChapterDuplicates` — faithful rename                                  | stale baseline in `superseded`, no conflict                    |
| 10  | `resolveChapterDuplicates` — two baseline files, no faithful                  | one conflict, `superseded` empty                               |
| 11  | `resolveChapterDuplicates` — two duplicates both present in faithful          | conflict, nothing superseded                                   |
| 12  | `resolveChapterDuplicates` — chapter with no duplicates                       | both lists empty                                               |
| 13  | `resolveChapterDuplicates` — two rollups (unique filenames)                   | never a duplicate group                                        |
| 14  | `pruneSupersededFiles` — faithful rename across chapter / `00` / `appendices` | deletes exactly the superseded files, leaves conflicts on disk |

Whole-suite gates: `npm test`, `npm run check`, `npm run lint`.

## Verification beyond unit tests

A real `sync-content.js` run against a synthetic source tree (a temp fake efni repo holding
one throwaway book with a renamed faithful module _and_ a two-baseline duplicate), asserting
the destination ends with one file per module for the rename and a printed conflict for the
duplicate. Removed afterwards; `static/content/` is gitignored and sync prunes unknown book
directories on the next run.

## Deliverables

1. `scripts/lib/overlay.js` — identity helpers, identity-based `chapterFullyFaithful`,
   `resolveChapterDuplicates`.
2. `scripts/sync-content.js` — `pruneSupersededFiles` sweep, `main()` guard, export.
3. `scripts/generate-toc.js` — backstop at the three enumeration sites plus a conflict
   summary.
4. `scripts/lib/overlay.test.js` — the table above.
5. Write-up, not code: the chapter 10 finding recorded on issue #197 as a distinct item,
   and the pipeline's prune-on-rename gap handed to efni's register for an efni session.
