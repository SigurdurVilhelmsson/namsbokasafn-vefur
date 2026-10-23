# Trial merge of main into reader v1.1: measurements (S0.3)

- **Date:** 2026-10-23 (UTC evening)
- **Plan step:** S0.3 of `docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`
- **Register:** CODE-03, CODE-01, CODE-02 (`docs/plans/2026-10-15-reader-v1.1-v1.2-review-register.md`)
- **Status:** measured. The merge itself is a throwaway: a local commit on no branch, never pushed. Only this note lands.

## The result in brief

- **The merge has one textual conflict**, in `e2e/helpers/content-fixtures.ts`, where both sides only added helpers. Keeping both sides resolves it. The three other files both sides changed merge automatically, and main's edits to them are separate from v1.1's.
- **svelte-check and lint are clean** on the merged tree, as on main and on v1.1: 0 errors and 0 warnings.
- **Unit tests: 863, all passing, in 53 files.** That is main's 837 plus v1.1's 26, as the review predicted. Every test file from both parents is there, and each file has the same number of tests as in its parent.
- **End-to-end tests, under v1.1's paged default: 136 tests, 117 passed, 16 skipped, 3 failed, none flaky.** The 3 failures are the predicted ones: #249's flashcard tests that look for the card as a button (CODE-01). No other test fails. All 19 pagination tests ran and passed.
- **The skip set is the same as main's on the same content**, test for test (16). CI skips 15 more on main (31). Each of those 15 runs here because this machine's content differs from CI's, and all 15 pass on the merged tree.
- **The two failures the plan thought likeliest did not happen.** #258's rename tests passed, two of them on paged section pages. #260's offline specs passed too, but none of them opens a section page, so they never exercised the pager.
- **CODE-02 holds**, and no test shows it: on the merged tree the recall store is the one section-keyed store that the rename migration leaves out.
- **For S8.4's contingency session there are no failures beyond #249's** on this content. One risk is left: CI's content was not tested, and 21 of the tests CI runs on main used the frozen physics book here instead of chemistry (see "What this run cannot show").
- **The trial build for S0.4 carries one QA aid.** A phone reaches this machine over plain `http://`, which is not a secure context, so the browser has no `crypto.randomUUID()`. Measured on the trial build through a network address, saving a recall entry then failed, so S0.4 could not have tested it. The S0.4 build adds one local commit that gives the app's ID helper a fallback. It sends no page-view event. A phone also needs a port forward to reach it (see "The build for S0.4").

## What was merged

|                                                       | Commit    | Tree      |
| ----------------------------------------------------- | --------- | --------- |
| v1.1, the port source (tag `reader-v1.1-port-source`) | `dde768e` | `92237ef` |
| main, merged into it                                  | `62ea95e` | `beedd04` |
| the trial merge (local only, no branch)               | `e3beae4` | `ca9cd95` |
| the S0.4 build: the trial merge plus one QA aid       | `c8d71bb` | `561ea23` |
| merge base                                            | `fcf2ba7` |           |

**Main moved since the plan was written.** The plan says to merge `3dbf50b`, main on 2026-10-15. This run merged `62ea95e`, main on 2026-10-23, so the QA build carries everything main has. The only code between the two is #272 (`src/app.css`, `static/styles/print.css` and `e2e/figure-review-badge.spec.ts`). It adds 7 e2e tests and no unit tests. So the unit-test expectation (863) is unchanged, and main's e2e count is 117 instead of the review's 110. The rest is documentation (#270, #271, #273, #275).

**The conflict.** `e2e/helpers/content-fixtures.ts` had one conflict hunk. v1.1 added `rollupSection`, main added `glossaryTerms`, `bookWithFrontMatter`, `offlineFileSet` and `bookWithMostImages` with their types, and the merge base side was empty. The resolution keeps v1.1's block, then main's, unchanged. In the three-way view (`merge.conflictstyle=diff3`) v1.1's block already ends with `rollupSection`'s closing brace, so nothing had to be restored. The file then exports 9 functions: the base's 4, v1.1's 1 and main's 4. The merged imports already include `readFileSync`, `statSync` and `dirname`, which main's helpers need. The merge commit skipped the pre-commit hook, so no formatter touched the merged tree.

**The automatic merges.** Besides `content-fixtures.ts`, three files changed on both sides, and git merged them:

- `src/lib/stores/index.ts`: v1.1 exports `readingMode` and `ReadingMode`, while main removed the `reference` store and changed two offline exports. These are separate lines. svelte-check's 0 errors show that no import points at a removed export.
- The section page and the flashcard page (`minniskort`): main's edits are `<head>` tags only (#253, slash-terminated canonical URLs and one description). v1.1's edits are in the body. `seo-head.spec.ts` checks both pages, and it passes on the merged tree.

**The merged tree is paged by default:** `src/lib/stores/settings.ts:77` reads `readingMode: 'paged'`.

## How it was measured

**Three trees, made the same way.** Each tree is a git worktree under `~/.cache/reader-review/s03/`, outside the 4.9 GB in-memory `/tmp`: main `62ea95e` as the control, v1.1 `dde768e`, and the merge `e3beae4`. Each had its own `npm ci`. Node 22.22.2 and npm 10.9.7. Both branches pin the same tool versions in the lockfile: Playwright 1.63.0, Vitest 5.0.2, Svelte 5.57.1, SvelteKit 2.70.3 and svelte-check 4.7.6. So the trees differ only in their code.

**The same content in each.** Each tree got a byte-identical copy of the main checkout's `static/content` and `static/provenance` (3,249 files, with matching sha256 manifests). This is **not the live content and not CI's content**:

- Chemistry (`efnafraedi-2e`) is efni's ② preview: `content/c2-whole-book-reinject` at `48dbbb7a2`, layer `mt-preview`, synced 2026-10-09 for the terminology review. Its words are not under test.
- It also holds the three frozen books (physics, biology, microbiology) and the retired organic book.
- CI syncs efni `main`'s chemistry and nothing else.

**The commands, the same in every tree:**

```bash
export TMPDIR=~/.cache/pw-tmp
npm run lint
npm run check
npx vitest run --reporter=default --reporter=json --outputFile.json=<tree>-vitest.json
CI=1 PLAYWRIGHT_JSON_OUTPUT_FILE=<tree>-e2e.json npx playwright test --reporter=list,json
```

The runs went one after another, never in parallel. `CI=1` gives the configuration CI uses: one worker, two retries, and a fresh server. Locally, `playwright.config.ts` otherwise reuses any server already on port 4173, which could test the wrong tree without saying so. Before each e2e run the script checked that the port was free. Afterwards each tree's build version matched the minute its run started (main 20:32:53, v1.1 20:46:30, merge 20:57:33 UTC). Main's bundle has no pager code (0 files with `data-paged-section`), and the v1.1 and merged bundles do.

**What "main's 31" is.** It is the skip set of CI's e2e job on #275 (run 40016053291). That run tested commit `20e9019`, whose tree is `beedd04`, the same as `62ea95e`'s, with efni at `a4715ca55`. It reports 117 tests: 86 passed and 31 skipped. The 31 are glossary gating 2, index gating 2, section redirects 24 and section-rename migration 3, the same groups as at `3dbf50b`.

## Results

### Static checks

|                 | main                            | v1.1              | merge             |
| --------------- | ------------------------------- | ----------------- | ----------------- |
| `npm run lint`  | exit 0, no output               | exit 0, no output | exit 0, no output |
| `npm run check` | 976 files, 0 errors, 0 warnings | 964 files, 0 / 0  | 982 files, 0 / 0  |

Content validation, which runs inside `npm run build`, gives the same 59 warnings on all three trees. 58 are "Section renamed but not redirected" for the ② preview's chemistry renames, the reason the chemistry sync is held. The other is organic's glossary. They come from the content, not from the code.

### Unit tests

|        | main | v1.1 | merge   |
| ------ | ---- | ---- | ------- |
| Tests  | 837  | 730  | **863** |
| Passed | 837  | 730  | 863     |
| Files  | 51   | 46   | 53      |

The merge base has 44 test files. v1.1 adds 2 (`src/lib/stores/recall.test.ts`, `src/lib/utils/paginate.test.ts`), and main adds 7. The merged tree has all 53, and each passes. Each file runs the same number of tests as in the parent it came from.

### End-to-end tests

|          | main     | v1.1     | merge    |
| -------- | -------- | -------- | -------- |
| Tests    | 117      | 111      | 136      |
| Passed   | 101      | 84       | 117      |
| Skipped  | 16       | 27       | 16       |
| Failed   | 0        | 0        | **3**    |
| Flaky    | 0        | 0        | 0        |
| Run time | 13.6 min | 11.0 min | 17.9 min |

The merged tree runs main's 117 tests plus v1.1's 19 pagination tests. v1.1's 11 old flashcard and glossary tests are gone, because #249 replaced them with the 9 tests main runs now.

The whole-book offline download (`e2e/offline-download.spec.ts`) took 7.3 minutes in main's run and 4.4 in the merged tree's. It fetches the book's offline set, which here is 1,400 files and 473.6 MB (the build's `Offline:` line), not the whole chemistry folder: that holds 2,507 files, and 1,101 of the ones the set leaves out are images. Size does not explain the time. CI's run on the same tree fetches efni `main`'s 1,400 files, 1,016.4 MB, in 1.4 minutes, and the whole suite took 4.2 minutes there against main's 13.6 here. This run did not measure why the local runs were slower, or why the two differ.

**Which mode each spec ran in:** all of main's specs ran with the paged default, except `phone-layout.spec.ts` and `section-shortcuts.spec.ts`. Those two already store `'scrolled'` (they came in with #246). So this run is close to S8.4's "full e2e with 'paged' seeded for every spec", but the mode came from the default, not from a seed.

### The three failures

All three are in `e2e/flashcards.spec.ts`, failed on all three attempts (one run, two retries), and stop at the same place:

| Test                                                    | Line |
| ------------------------------------------------------- | ---- |
| 'Æfa starts a session on a card of the deck'            | :73  |
| 'flipping a card shows its answer and the four ratings' | :79  |
| 'rating a card moves on and is saved across a reload'   | :91  |

```text
Error: expect(locator).toBeVisible() failed
Locator: getByRole('button', { name: /^Spurning/ })
  at currentCard (e2e/flashcards.spec.ts:54)
```

The page snapshot Playwright saved at the failure shows why. The study session starts ('Kort 1 af 2'), but the card is not a button. It renders as the text 'Spurning', the question, 'Reyndu fyrst að rifja upp svarið — manstu það?', and two buttons, 'Man það' and 'Man það ekki'. That is v1.1's predict-first card, and #249's tests find the card as a button and flip it by clicking. The two deck-list tests (:62, :67) pass. This is CODE-01 exactly. Its fix (rewrite the spec around predict-first and give the card an accessible name) belongs to S4.1, which ports predict-first and rewrites #249's test in the same PR.

### Skips, and how they relate to CI's 31

**The merged tree skips the same 16 tests as main, by name.** All are in `section-redirects.spec.ts`: 4 tests for each of the four physics redirect rows. The rows' targets are not in this content (physics is frozen at an older sync), so the rows are inert.

**v1.1 skips 27:** the same 16, plus the 11 old flashcard and glossary tests (6 and 5) that skip on v1.1 here as in CI. This matches the review's account of v1.1's 39 skips in CI (31 − 3 + 11), adjusted for this content.

**The 15 tests CI skips on main and this machine runs** all pass on main and on the merged tree:

| Tests                                                                                                                              | Why they run here                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `glossary-gating.spec.ts` 2, `index-gating.spec.ts` 2                                                                              | The frozen books are here, so `bookWithout()` finds a book with no glossary or no index. CI has only chemistry, which has both.                                                                                                                                                                                |
| `section-redirects.spec.ts` 8: the two chemistry rows, `10-5-fast-astand-efnis` and `20-3-aldehyd-ketonar-karboxylsyrur-og-estrar` | The ② preview publishes both targets (`10-5-fastur-efnishamur`, `20-3-aldehyd-keton-karboxylsyrur-og-estrar`). efni `a4715ca55`, CI's content, renamed them again (to `10-5-fast-efni` and `20-3-aldehyd-ketonar-karboxylsyrur-og-esterar`), so in CI both rows are inert.                                     |
| `section-rename-migration.spec.ts` 3                                                                                               | Two of them (:36, :122) need an active row, one whose target is published: here chemistry's 10-5 row, because the ② preview publishes its target. The third (:91) needs an inert row whose old page is still published: here physics' 4-1 row, present only because the frozen books are here. CI has neither. |

No test skips here that runs in CI. So every test CI runs on main ran here on the merged tree, and all of them passed except the 3 flashcard tests. That holds test by test in the code. By name, 83 of CI's 86 match: three `seo-head.spec.ts` titles name their book, and here they ran on physics (`/edlisfraedi-2e/`, `/edlisfraedi-2e/leyfi/` and `/edlisfraedi-2e/minniskort/`). A test can also keep its name and check a different book; see "What this run cannot show".

## The review's predictions against the measurements

| Prediction (source)                                                                                                                    | Measured                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One textual conflict, `content-fixtures.ts`; `stores/index.ts`, the section page and the minniskort page merge automatically (CODE-03) | As predicted                                                                                                                                                                           |
| About 863 unit tests: main's 837 plus v1.1's 26 (CODE-03, S0.3)                                                                        | 863, all passing                                                                                                                                                                       |
| Every test file from both parents present and passing (CODE-03)                                                                        | 53 of 53                                                                                                                                                                               |
| svelte-check: 0 errors, and no warning main lacks (CODE-03)                                                                            | 0 errors and 0 warnings on all three trees                                                                                                                                             |
| e2e skip set equal to main's 31 (CODE-03)                                                                                              | Equal to main's on the same content (16, by name); the other 15 are explained by content, above                                                                                        |
| All 19 pagination tests run (CODE-03, S0.3)                                                                                            | 19 ran, 19 passed                                                                                                                                                                      |
| At least 3 of #249's 5 flashcard tests fail, in `currentCard()` (CODE-01, S0.3)                                                        | Exactly 3 (:73, :79, :91), all at `currentCard()` (:54); the other 2 pass                                                                                                              |
| The likeliest other failures: #260's offline-download spec (S0.3)                                                                      | Passed: all 1,400 files of the offline set (473.6 MB) downloaded and read offline. It never opens a section page, so it did not exercise the pager, and neither does `offline.spec.ts` |
| The likeliest other failures: #258's rename tests on paged sections (S0.3)                                                             | Ran and passed: :36 (chemistry's active 10-5 row) and :91 (physics' inert 4-1 row) on paged section pages, and :122 on /prof                                                           |
| The recall store is left out of the rename migration (CODE-02)                                                                         | Confirmed by a source scan (below); no test shows it                                                                                                                                   |

## What no test shows

**CODE-02, by source scan.** The scan looks for every store module in `src/lib/stores/` (tests and `index.ts` excluded) that mentions `sectionSlug`, `createSectionKey` or `sectionKey`, and asks whether it defines `renameSections` and is listed in `sectionRenameMigration.ts`. On main: 5 such modules (`analytics`, `annotation`, `objectives`, `quiz`, `reader`), all covered. On the merged tree: the same 5, plus `recall.ts`, which has no `renameSections` and is not in the list. The review's fix (a `renameSections`, a line in `migrateRenamedSections()`, and a guard test that does this scan) belongs to S5.1, which ports the recall store with its migration line.

**Behaviour the tests do not check.** This run measures test results only. The review also lists v1.1 behaviours found by reading the code that no test checks at runtime, such as page growth after 'Sýna svar' and the arrival scroll passing the MT notice. This run does not re-measure them. S0.4's QA and the plan's M8 and M9 steps cover them.

## What this run cannot show

- **CI's content, and which book a test uses.** The merged tree was never tested on CI's content, because no branch from this step may be pushed. The e2e fixture helpers also take the first synced book in sorted order: here the frozen physics book (`edlisfraedi-2e`), in CI chemistry. So 21 of the 86 tests CI runs on main checked physics here:
  - flashcards 5 and glossary 4
  - the two gating "shows" tests
  - `seo-head.spec.ts` 3
  - `book-index-redirects.spec.ts` 3 (all but `/kafli/00/`)
  - `offline.spec.ts` 4 (:49, :74, :124, :189)

  Two pagination tests did too, the summary and key-terms rollups (the exercises one used chemistry). In CI all of these run on efni `main`'s chemistry. Main passes there and here, so a failure that only CI shows would need v1.1's code to meet something in that chemistry that the content each test used here lacks. That cannot be ruled out from here. S8.4 judges the port by CI, as CODE-03 asks.

- **Paged reading from a downloaded book.** No e2e test opens a section page offline or from a downloaded copy, in either mode.
- **Real devices.** Desktop Chromium only, with Playwright's phone emulation where a spec asks for it. Real phones are S0.4's job.

## For S8.4's contingency session

- **Failures beyond #249's:** none on this content, so S8.4's "fix each failure that S0.3's note listed beyond #249's" has nothing to fix.
- **Not S8.4's work:** CODE-01's flashcard spec rewrite lands with predict-first in S4.1, and CODE-02's recall migration with the recall store in S5.1 (or both in one merge, if [USER] chooses that route; see S4.1).
- **S8.4's check:** CI on main with the pager ported, its skip set compared with main's 31 by name (M8's exit criteria), and the risk above, since this run never tested CI's content or CI's choice of books.

## The build for S0.4

- **Where:** `~/.cache/reader-review/s03/merge/build/`, version `1792793182618`, built with `npm run build` (validation included) from `c8d71bb`: the trial merge `e3beae4` plus one local QA aid, described next. The test results above are for `e3beae4`.
- **The QA aid, and why S0.4 needs it.** A phone reaches this machine over plain `http://` on a network address, and that is not a secure context, so the browser offers no `crypto.randomUUID()`. The app's `generateId()` (`src/lib/utils/storeHelpers.ts`) calls it with no fallback. Four stores call it when they create an entry: recall, highlights and notes, quiz attempts and study analytics. Measured in Chromium on the unpatched build, through WSL's network address:
  - arriving at a section threw `crypto.randomUUID is not a function`
  - after paging to the end with 'Næsta síða' and pressing 'Vista upprifjun', nothing was stored and 'Vistað' never showed

  Through `localhost`, the control, the same steps stored the entry and showed 'Vistað'. `c8d71bb` makes `generateId()` fall back to `crypto.getRandomValues()`, which works without a secure context. On the patched build the network-address run stored the entry, showed 'Vistað' and threw no error, and the 863 unit tests still pass. The live site is served over HTTPS, so its readers never meet this. Main has the same `generateId()`, so any local preview opened on a phone would hit it.

- **Still missing over plain `http://`:** the service worker and offline storage. Offline download does not work on the phone, and the book home logs `caches is not defined` from the download button. S0.4's checks (selecting text, swiping in a table, Space, the screen reader, the cards and the recall prompt) do not need them.
- **Content:** the ② preview, so judge mechanics only, as S0.4 says.
- **No page-view event.** The worktree has no `.env.production` (it is gitignored), so `VITE_API_URL` is empty and `trackEvent` returns at once. The bundle has 0 occurrences of the editorial server's host name. Control: the main checkout's last production build (2026-10-17), made with `.env.production`, has 1.
- **Serve it** from the merged worktree:

  ```bash
  cd ~/.cache/reader-review/s03/merge && npm run preview -- --host --port 4173
  ```

- **A phone cannot reach it directly.** WSL on this machine uses NAT networking (`wslinfo --networking-mode` prints `nat`), so `--host` listens on an address only Windows can see. Forward the port from PowerShell run as administrator. Every PowerShell command below needs that, including running the forward again and removing it:

  ```powershell
  $ip = (wsl hostname -I).Trim().Split(' ')[0]
  netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=4173 connectaddress=$ip connectport=4173
  New-NetFirewallRule -DisplayName 'vefur trial 4173' -Direction Inbound -Protocol TCP -LocalPort 4173 -Action Allow
  ```

  Then open `http://<the PC's Wi-Fi address>:4173/` on the phone or the iPad (`ipconfig` shows the address). WSL's address changes when WSL restarts; if the page stops loading, run the first two lines again. Both entries survive a reboot, and the firewall rule applies on every network, so remove them when S0.4 is done:

  ```powershell
  netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=4173
  Remove-NetFirewallRule -DisplayName 'vefur trial 4173'
  ```

  Check that both are gone: `netsh interface portproxy show all` no longer lists port 4173, and `Get-NetFirewallRule -DisplayName 'vefur trial 4173'` finds no rule.

- **Keep the worktrees until S0.4 is done.** Then remove all three from the main checkout:

  ```bash
  git worktree remove --force ~/.cache/reader-review/s03/main
  git worktree remove --force ~/.cache/reader-review/s03/v11
  git worktree remove --force ~/.cache/reader-review/s03/merge
  ```

  `e3beae4` and `c8d71bb` are on no branch, so git discards them in a later garbage collection. Nothing from them was ever pushed.
