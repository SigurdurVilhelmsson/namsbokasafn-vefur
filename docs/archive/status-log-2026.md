# Status log, July–November 2026

Moved out of `CLAUDE.md` on 2026-11-01, word for word, so that CLAUDE.md (loaded into every
Claude Code session) holds only what a session needs today. Nothing here is maintained:
it is the record as written at each date, and later entries supersede earlier ones.

- **Part A** is CLAUDE.md's former "Current Development Status" section: one dated entry per
  train, merge round or measurement, newest first, through train 7 and S5.2 (2026-11-01).
- **Part B** holds dated passages taken out of CLAUDE.md's rule sections in the same trim; the
  rules themselves stayed in CLAUDE.md.

From 2026-11-01 on, a train rewrites CLAUDE.md's short "Current Development Status" block and
puts its details (gates, counts, backup, live checks) in its PR body, not here.

## Part A — dated status entries (2026-07-25 → 2026-11-01)

### 2026-11-01 — train 7 deployed: seven small fixes are live; M4 lives on `feature/reader-m4`

Measured on 2026-11-01 against `main` = `e85457d` (#323) and the live site.

- **Prod runs build `1793518115596`**, deployed at 07:43 UTC (07:43:03 by the server's clock) from `main` `e85457d` with no content sync, replacing train 6's build `1793484688243`. Undeployed on `main`: only the PR that adds this entry (later that day also S5.1 and S5.2; see Next). It sent 323 files and deleted none, none under `content/`:
  - 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `personuvernd/index.html`, `sw.js` and `_app/version.json`;
  - `sitemap.xml`, sent only because its `<lastmod>` moved to 2026-11-01 (the same 367 URLs);
  - #321's two new pages, `feedback/index.html` and `for-teachers/index.html`;
  - 17 new `/_app/immutable/` files: 2 stylesheets, 4 chunks, 2 entry files and 9 page nodes.
- **What went live.** [USER] approved clearing the private worklist's quick-win and backlog groups on 2026-11-01 and asked for the quick wins on `main`, one PR each:
  - #322: at phone width the collapsed tools menu is `inert`, so its four invisible links no longer take Tab stops or reach screen readers. The menu can collapse with focus inside it: the 5-second auto-collapse waits while focus is on a link, and a scroll moves focus to the button first. The nav got the `id` the button's `aria-controls` already named.
  - #323: a long section title in the breadcrumb ends in an ellipsis at phone width, and its chevron stays on screen (`max-width` on the button, `min-w-0` on the title span). Before, §19.1's button ran to 522 px at 390 px.
  - #324: in the dark theme, figure images sit on a white card, so efni's transparent vector figures no longer draw black lines on the dark page (efni C140 ㊶). The figure lightbox still has no card.
  - #321: `/feedback` and `/for-teachers` are prerendered (June code review M19), so each page has its own HTML, title and description without JavaScript.
  - Not in the build:
    - #318: the README says the app needs no environment variables, `.env.production.example` is deleted, and the tutor host left the example CSP. The live CSP still allows the tutor and editorial hosts, which nothing calls; removing them is optional server work.
    - #319: the dead `scripts/check-status.mjs` is deleted (M22).
    - #320: the Markdown-era tagging tools are retired. `add-book` and `check-content` are Markdown-era too, and left for [USER] to decide.
- **The gates, run from the deploy lane by its checklist:**
  - `main`'s CI was green on `e85457d` (run 41284851656);
  - content validation found no issues, and the build had only train 6's warnings;
  - no `D20: proposed` strings and no sync stamp on either side;
  - all 2,481 chemistry content files byte-identical to the server;
  - the dry run's 323 paths, listed by a separate `rsync --dry-run --itemize-changes` as on train 6, were the ones above;
  - the sitemap has the live site's 367 URLs;
  - a second dry run just before `--apply` gave the same 323 and 0.
- **Backup and rollback:** the previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-11-01-v1793484688243` (3,746 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-11-01-v1793484688243/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 304 files and delete none. The train's 19 new files (17 `_app/` files and the two new pages) would stay.
- **Verified live:**
  - the version equals the lane's build;
  - every `/_app/immutable/` file that nine pages name loads: the catalogue, chemistry's home, §1.1, the three frozen books' homes, `/feedback/`, `/for-teachers/` and `/personuvernd/` (24 to 42 per page, 0 missing; a made-up path answers 404);
  - organic answers 404;
  - in headless Chromium, with every request outside namsbokasafn.is blocked and recorded, on 8 pages at 390 and 1280 px: 0 page errors and 0 failed requests to the site. The only request to another host was `gc.zgo.at/count.js`.
  - one check per fix:
    - `/feedback/` and `/for-teachers/` answer with their own `<title>` in the raw HTML;
    - on §1.1 at 375 px, the collapsed menu is `inert` and Shift+Tab from its button skips the links; open, the same key reaches one;
    - §19.1's breadcrumb ends at 343 px of 375, with an ellipsis;
    - on §5.3 a figure image's background is white in dark and transparent in light.
- **Also on 2026-11-01:**
  - The vefur S tag was re-made at 00:00:56 UTC (the 2026-10-31 entry has the details).
  - #315, the 2026-10-31 entry, merged at [USER]'s word. Its first e2e job hung for 5 h 50 min in "Install Playwright browsers"; a cancel and re-run passed, as under "CI" above.
  - **D05 is carried out with M4 on a feature branch** ([USER]; `docs/decisions/2026-11-01-reader-d05-m4-on-a-feature-branch.md`, #317). D05's one January train stands. M4's step PRs merge into `feature/reader-m4`, which merges into `main` at S4.5, so trains like this one carry none of M4.
  - **S4.1 merged into `feature/reader-m4`** (#316, `7630856`), not into `main`:
    - predict-first on /minniskort and in /nam's review phase ("Man það" / "Man það ekki" before the answer shows);
    - the card is a region named "Spurning", then "Svar";
    - three new strings marked `D20: proposed` on that branch;
    - `flashcards.spec.ts` at 5 of 5 with 0 skips.
    - Measured on its build: after a keyboard prediction, focus falls to `<body>`. S4.2 fixes that.
  - Issue #197 was closed as fixed by #200; no issue is open.
  - The private worklist was cleared: 17 rows closed (superseded, folded into other rows, or parked as ideas), with their notes moved to rows that stay visible.
- 🔑 **Two PRs that add a test at the same spot in one spec conflict.** #322 and #323 each inserted a test before the same line of `e2e/phone-layout.spec.ts`. Simulating all seven merges in order with `git merge-tree` before merging anything showed that conflict and no other. #323 was rebased onto `main` once #322 had merged, kept both tests, and merged after its own CI passed.
- **npm audit:** no package changed since train 6 (`package.json` and the lockfile are the same as on `db1653c`), so it stands as recorded on 2026-10-31: production tree 0, full tree 26.
- **Next:**
  - _(Updated later on 2026-11-01.)_ M4's code is complete on `feature/reader-m4`: S4.1 (#316), S4.2 (#326), S4.3 (#328) and S4.4 (#329), with `main` merged in by #327. Before its January train (S4.5): [USER]'s D20 check of its 10 markers and a look at the 'Rétt' rating, which S4.2 turned from amber to blue, then batch D's P0.3 items on a build. Then M5 on `main`.
  - _(Later still on 2026-11-01.)_ M5 started on `main`, not deployed: S5.1, the recall store with a guard that every section-keyed store follows renames (#331, `9a4c678`), and S5.2, the section-end recall prompt in place of 'Vel gert!' with `readerPolicy.ts` and D10's trigger (#332, `b770eff`). The next train would ship S5.2: let S5.3 (the prompt's accessibility) land first, and [USER] check its `D20: proposed` strings.
  - For [USER]: the phone and screen-reader checks (S1.3's last box, S0.4, and equations), a glance at GoatCounter's dashboard, the May 2027 exam dates, and #320's question.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-31 — train 6 deployed: S3.3 is live; vefur is tagged `s-2026-11-01`

> ⚠️ **Superseded on one point — read the 2026-11-01 entry above first.** Train 7 deployed `main` `e85457d`, so prod runs build `1793518115596`, and "Undeployed on `main`: only the PR that adds this entry" no longer holds. The rest of this entry stands.

Measured on 2026-10-31 against `main` = `db1653c` (#314) and the live site.

- **Prod runs build `1793484688243`**, deployed at 22:16 UTC (the server's clock) from `main` `db1653c` with no content sync, replacing train 5's build `1793025632459`. Undeployed on `main`: only the PR that adds this entry. It sent 367 files and deleted none, none under `content/`: 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sitemap.xml`, `sw.js`, `_app/version.json`, the new `personuvernd/index.html` and 63 new `/_app/immutable/` files (4 stylesheets, 25 chunks, 2 entry files, 32 page nodes: one more than before, for the privacy page). `sitemap.xml` went because it gained `/personuvernd/` (366 → 367 URLs; no other URL changed).
- **What went live:**
  - S3.3 (#312; the 2026-10-27 entry has the details): the page-view event to the editorial server is gone; `/personuvernd/`, "Tilkynna villu" and the /feedback prefill; the sidebar's "Um vefinn" block and its "Námsgreining" link.
  - #314: D20 batch 4 checked ([USER] approved all 12 strings as written on 2026-10-27 and merged #314 on 2026-10-28 at 16:20 UTC as `db1653c`), plus one new sentence on the privacy page, after "Skrárnar eru geymdar í um 90 daga.": "Þær eru notaðar til að gæta öryggis vefsins og koma auga á misnotkun, til að finna og laga villur og til að fylgjast með álagi á vefþjóninn."
  - GoatCounter's individual-pageview setting is off ([USER], 2026-10-27), as the page assumes; a comment in the page records it.
- **[USER] ruled train 6's scope on 2026-10-31: S3.3 and #314 only.** The rest of Claude's 2026-10-26 proposal (SF.1, SF.2, SF.3, SF.5, S5.1, S8.1) was not built and did not ship.
- **The gates, run from the deploy lane by its checklist:**
  - `main`'s CI was green on `db1653c` (run 40725012514);
  - content validation found no issues, and the build had only the three warnings trains 1–5 had (workbox's "glob pattern", Vite's `configLoader` notice and the bundler's 20 `node:fs` notices);
  - no `D20: proposed` strings and no sync stamp on either side;
  - all 2,481 chemistry content files byte-identical to the server;
  - the sitemap differs from the live one by `/personuvernd/` alone;
  - a second dry run just before `--apply` gave the same 367 and 0.
  - ⚠️ `deploy.js` prints only counts. The path list above came from a separate `rsync --dry-run --itemize-changes` with the rules and flags the script prints. In that output a file sent to the server is itemized `<f…`, not `>f…`.
- **Backup and rollback:** the previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-31-v1793025632459` (3,682 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-31-v1793025632459/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 303 files and delete none; the train's 64 new files (63 `_app/` files and `personuvernd/index.html`) would stay.
- **Verified live:**
  - the version equals the lane's build;
  - every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1, the three frozen books' homes and `/personuvernd/` name loads (25 to 42 per page, 0 missing; a made-up path answers 404);
  - organic answers 404, and the live sitemap has 367 URLs;
  - **D03 on the live site:** chemistry's home loads 31 JS files, and none names the editorial host or `sendBeacon` (1 did on train 5's build, measured the same evening);
  - in headless Chromium, with every request outside namsbokasafn.is blocked and recorded, at 390 and 1280 px on the catalogue, chemistry's home, §1.1, `/personuvernd/`, `/feedback/`, `/greining/` and physics's home: 0 page errors, 0 failed requests to the site, and the only request to another host was `gc.zgo.at/count.js`;
  - on §1.2, "Tilkynna villu" opens `/feedback/?tegund=translation_error&bok=efnafraedi-2e&kafli=01&hluti=1-2-efnishamur-og-flokkun-efnis` with the chapter, the section and "Villa í þýðingu" filled in. §1.1 has no notice: it is a reviewed section.
- 🔑 **Since train 6 nothing on the site sends the page-view event**, except a tab left open on an earlier chemistry build, until it reloads. The paused books never sent it (the 2026-10-27 entry's correction).
- **vefur is tagged for S:** an annotated `s-2026-11-01` on `db1653c` ([USER], 2026-10-31), with the message "S (1 November 2026): vefur main as deployed in train 6, build 1793484688243.", pushed by its own refspec at 00:00:56 UTC on 1 November (its tagger date). ⚠️ It was first pushed at 22:20 UTC on 31 October, 90 minutes before S. [USER] spotted it, and at their word it was deleted from GitHub and locally at 22:22 UTC, then re-made after midnight with the same message, once `main` (still `db1653c`) and the live build (still `1793484688243`) were checked. A tag named for a date waits for that date, in UTC. There are no branch-tip tags: the two reader branches are frozen, and v1.1's tip already has `reader-v1.1-port-source`. efni tags its own `main` `s-2026-11-01` after its 00:00 UTC content check on 1 November, and its branch tips under the sibling prefix `s-2026-11-01-tip/`, because git cannot hold both `s-2026-11-01` and `s-2026-11-01/<x>`.
- **Synced with efni** at [USER]'s request (2026-10-31):
  - efni re-measured the paused-books correction and accepted it. Its pre-S plan (`docs/plans/2026-10-26-pre-s-week-plan.md`, §7, line 258) still says G1.19 stops the frozen books' beacon; efni will fix that line in a docs branch after the tag if [USER] agrees.
  - G1.19 has been live on Ritstjóri since 2026-10-28.
  - Nothing efni merged from 2026-10-26 to 10-31 changes what vefur serves. Re-measured here: of 140 files changed, the only `books/` files are 16 under `efnafraedi-2e/ai-review/`, which is not synced, and no handoff changed.
  - The ② re-render and the redirect recompute stay after S, with no date.
- **npm audit, 2026-10-31 (on `db1653c`):** production tree 0. The full tree is 26 packages (5 low, 21 moderate, 0 high), up from 3 low on 2026-10-26, all in development tools. They come from five advisories:
  - SvelteKit's two (low, known; fixed only in SvelteKit 3, #293 left open);
  - three new ones: `deepmerge` 4.2.0–4.3.1 (low, through SvelteKit), `glob` 9.0.0–14.0.1 (moderate, through workbox-build) and `minimatch` <11.0.1 (moderate, through eslint, typescript-eslint and workbox-build).
  - npm's only offered fixes are major downgrades (eslint 4.0.0, `@vite-pwa/sveltekit` 0.0.1), so nothing is fixable inside the current versions. An override would force a new major onto packages that pin an older one (the `brace-expansion` lesson above); not tried. They don't block a deploy: the production tree is what ships.
- **The deploy lane** is at `db1653c`. Its `.env.production` still has the dead `VITE_API_URL` line.
- **Next, by the plan:** M4 (S4.1, predict-first). Under D05, no train runs from the merge of S4.1 until January. On 2026-11-01 [USER] chose to keep M4 on a feature branch, `feature/reader-m4`, so trains can still run from `main` (`docs/decisions/2026-11-01-reader-d05-m4-on-a-feature-branch.md`); S4.1 is PR #316 into it. Also for [USER]: the real-phone check of the sidebar's focus order (S1.3's last box), S0.4, and the May 2027 exam dates (before S9.0).
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-27 — S3.3 merged (#312), not deployed; D20 batch 4 and three questions wait for [USER]

> ⚠️ **Superseded on two points — read the 2026-10-31 entry above first.**
>
> - Train 6 deployed `main` `db1653c` on 2026-10-31, so S3.3 is live and "Prod still runs train 5's build" no longer holds. Its 🔴 "`main` is not train-ready" bullet is lifted: #314 removed the 12 markers.
> - Its "For [USER], before train 6" questions are answered: D20 batch 4 approved as written, GoatCounter's individual-pageview setting off, the access-log sentence added (#314), the correction sent to efni (2026-10-31), and train 6's scope ruled.
>
> The rest of this entry stands.

Measured on 2026-10-26 against `main` = `02ca01b` (#312) and the live site.

- **Prod still runs train 5's build `1793025632459`** (`main` `590de02`). Undeployed on `main`: #311 (docs), #312 and the PR that adds this entry. 🔴 **`main` is not train-ready:** #312's 12 `D20: proposed` markers stop the deploy lane's checklist at step 2 until [USER] checks D20 batch 4 and a PR removes them.
- **#312 is plan step S3.3** (decisions D03 and D20; register KEEP-01, PED-39, PED-15, PED-14). Merged at 22:39:01 UTC as `02ca01b` (parents `9c4f96e` and `c39683b`; 4 commits, 24 files). `main`'s tree equals the `git merge-tree` simulation made before the merge (control: `9c4f96e`'s tree differs). In short:
  - **D03, in code:** `src/lib/utils/api.ts` is deleted (`trackPageView` and three helpers nothing called), with `API_BASE_URL` and `apiUrl` in `config.ts` and the book layout's page-view effect. No code reads `VITE_API_URL` any more, so the deploy lane's `.env.production` line is dead (`docs/guides/deployment.md` says so). The editorial host left `connect-src` in all 10 CSP blocks of `nginx-config-example.conf`, which is a recommendation: the live nginx is unchanged.
  - **`/personuvernd/`, "Gögnin þín og persónuvernd" (new):** prerendered and in the sitemap (366 → 367 URLs), linked from the sidebar's new "Um vefinn" block, the catalogue footer, /feedback and /for-teachers. Written from the request log below: what the browser stores; what leaves the device (requests to the site's own server, whose access log keeps about 90 days; GoatCounter's page count and what count.js sends; feedback the student sends); that exports stay on the device; the erase and what it leaves behind; private windows; that it is not legal advice.
  - **"Tilkynna villu"** in the MT notice links `/feedback/?tegund=translation_error&bok=…&kafli=…&hluti=…`, built from the section's route params. `readFeedbackPrefill()` (`src/lib/utils/feedbackPrefill.ts`) reads them in `onMount` and keeps only a book the form offers, a known type and capped slugs; "Til baka" then returns to the section. **No free-text parameter:** GoatCounter's count.js sends `location.search`, so text put in the URL would leave the device.
  - /feedback says, above the send button, that the form opens the student's e-mail and that we then see their address. The sidebar's Námsverkfæri gains "Námsgreining": no page linked `/greining/`, where the erase button is.
  - **The data rule** is under "Notes for Code Reviewers" above, in [USER]'s approved wording (version (b), 2026-10-26). `src/lib/utils/dataRule.test.ts` fails on `sendBeacon`, the editorial host, `/api/analytics`, `apiUrl(`, `VITE_API_URL`, `keepalive`, `XMLHttpRequest` or `$env/*/public` anywhere in `src` or `static` (synced content excluded). It failed with the old `api.ts` put back.
- **The request log** (Playwright, every request a browser made). The build used the deploy lane's `.env.production`, which still sets `VITE_API_URL`, so it tested the removal; a build without it sends nothing either way. A copy of the live content; a fake non-localhost host mapped to 127.0.0.1, because count.js skips the count on localhost; GoatCounter's `/count` and the editorial endpoint answered locally with 204, never sent. Route: catalogue, chemistry home, §1.2 (full load), §1.3 (client-side), "Tilkynna villu" (client-side), then /greining, /prof, /ordabok, /feedback and /personuvernd (full loads).
  - #312's build: 381 requests, 365 to the site. To other hosts only `gc.zgo.at/count.js` and `POST …goatcounter.com/count`, 8 each: one per full load, none on the client-side moves.
  - The live site, the control: 355 and 335, the same GoatCounter pair, plus `POST ritstjorn.namsbokasafn.is/api/analytics/event` on every book page, the client-side move included.
  - Bundles: 0 files with the editorial host or `sendBeacon` in #312's build; 1 of each in train 5's.
- ⚠️ **Correction: the three paused books never sent the page-view event.** On 2026-10-26 Claude told [USER] and the efni session that their kept 2026-08-19 pages still send it until efni's G1.19, and the privacy page carried a dated note saying so until `c39683b`. That was wrong. That build was made without `VITE_API_URL`: its config chunk (`/_app/immutable/chunks/DPIVvOBq2.js`) is `var l="";`, and the beacon function starts `if(!Wa)return;`. None of its 34 chunks names the editorial host. On the live site physics sent 0 events over a full load and two in-app moves; the control, chemistry's home on the current build, sent 1. Claude had gone by `sendBeacon` appearing in the bundle. Once train 6 ships nothing sends the event, except a tab left open on an earlier chemistry build, until it reloads. efni has not been told yet (a question below).
- **CI:** #312's head `c39683b` (run 40410312197): 997 unit tests; e2e 163 passed, 31 skipped, 0 failed in 8.4 min. `main` `02ca01b` (run 40414060041): all three jobs green, 997 unit tests, e2e 163 passed in 6.0 min.
- **Pre-PR review:** four lenses (code correctness; every claim on the privacy page; the Icelandic, UX and accessibility; test validity), then a skeptic per finding: 26 findings (20 serious, 6 nits). All 11 that reached a skeptic were confirmed, 3 at a lower severity, and all 26 were fixed in `a5c5dea` except those under "Known, not fixed". A second pass re-checked the rewritten page against the request logs, count.js, GoatCounter's privacy policy and the live nginx config, and found 6 more, fixed in `c39683b`.
- **Known, not fixed** (in #312's body):
  - The service worker's expiry records (IndexedDB `workbox-expiration`, up to 500 pages and 100 figures), the precache and the browser's HTTP cache survive the erase. The page says so and points to clearing site data in the browser.
  - Physics embeds (latent): efni `main`'s physics content embeds YouTube and PhET with no click-to-load step, which would send the reader's IP address to Google and PhET once physics is synced. It needs a decision and a privacy-page update before then, with the CSP `frame-src` item.
  - README and `.env.production.example` still name `VITE_TTS_PROXY_URL`, and the example CSP still allows `tutor.namsbokasafn.is`. Nothing reads or calls either.
  - The data rule names recall entries, which `main` does not have yet (kept as approved).
- **For [USER], before train 6:**
  - **D20 batch 4:** 12 markers (`git grep -n 'D20: proposed' -- src`), one of which covers the whole privacy page (`src/routes/personuvernd/+page.svelte`); #312's body tabulates the others. "Námsgreining" in the sidebar can be dropped in this check.
  - **Is GoatCounter's individual-pageview setting on?** It is off by default, and the page assumes it is off.
  - **Should the privacy page say what the access log is used for?** `scripts/setup-goaccess.sh` builds a password-protected traffic report from it, with IP addresses anonymised.
  - **Should efni get the correction above?** Its pre-S plan carries the wrong claim.
  - **Also still for [USER]:** the real-phone check of the sidebar's focus order (S1.3's last box), S0.4 before 1 November, listening to the timer pill on the live site while a phase runs, and the May 2027 exam dates (before S9.0).
- **Train 6 is a proposal, not confirmed:** S3.3 with fixes and invisible work only (SF.1, SF.2, SF.3, SF.5, S5.1, S8.1) before S (1 November), then M4, because D05 means no train after S4.1 merges until January. [USER] has not ruled on it.
- **npm audit:** #312 changed no package.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-26 (afternoon) — train 5 deployed: S3.1 (#308) and S3.2 (#309) are live; D20 batch 3 checked (#310)

> ⚠️ **Superseded on two points — read the 2026-10-27 entry above first.**
>
> - #312 (S3.3) merged after it and is not deployed, so "Undeployed on `main`: only the PR that adds this entry" no longer holds. Prod still runs build `1793025632459`.
> - Its Next bullet's S3.3 is merged, with the D03 wording approved; the [USER] items left are listed in the 2026-10-27 entry.
>
> The rest of this entry stands.

Measured on 2026-10-26 against `main` = `590de02` (#310) and the live site.

- **Prod runs build `1793025632459`**, deployed at 16:12:36 UTC (the server's clock) from `main` `590de02` with no content sync, replacing train 4's build `1793012580618`. This is the plan's train 3 (S3.4); S3.3 is not done, and S3.4 ships without it. Undeployed on `main`: only the PR that adds this entry. It sent 337 files and deleted none, none under `content/`: 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sw.js`, `_app/version.json` and 35 new `/_app/immutable/` files (1 stylesheet, 12 chunks, 2 entry files, 20 page nodes). `sitemap.xml` was not sent: it is byte-identical to the live one (same 366 URLs and `<lastmod>` date).
- **#308 is plan step S3.1** (register PED-12, PED-13, KEEP-08): practice review keeps the whole question and its maths. Merged at 13:20:25 UTC as `cfa2842` (parents `e278f4c` and `7d99fa2`; 3 commits, 12 files). `main`'s tree equals the `git merge-tree` simulation made before the merge (control: `e278f4c`'s tree differs). In short:
  - `practiceReveal.ts` walks back from the answer to the problem's `p.para-title`, matched by class because the heading's wording varies (16 ways in efni `main`'s content, 12 in the live sync), or to the previous answer or its self-assessment row. It keeps equations, images and tables, and stores the question and the answer's body (without its "Svar:") as text and as trimmed HTML.
  - `utils/practiceSnapshot.ts` filters that HTML through an allow-list: paragraphs, line breaks and `div`s, emphasis, underline, sup/sub, tables, lists, same-site images and MathML. It drops MathJax's SVG and shows the assistive `<math>` beside it, which was hidden only by its inline style. It also drops the page's own controls (the equations' "LaTeX", "🔗" and "⊕" buttons, the English gloss) and unwraps everything else.
  - `quiz.ts`: `contentHtml` and `answerHtml`, and `recordPracticeProblem()`, which creates a record or replaces its snapshot while keeping its progress, so the broken copies in students' browsers heal on the next reveal.
  - `PracticeSnapshot.svelte` shows the snapshot in /prof's AdaptiveQuiz and /nam's PracticePhase and ReviewPhase.
- **Counted with the real `equations` and `practiceReveal` actions** over all 292 Check-your-learning problems, on three copies of the content, with the same result on each: the review's copy (this machine's ② preview), the live content (the deploy lane) and efni `main` `b019d25f6`.
  - Before (`main` `e278f4c`): 47 questions stored empty and 19 cut short (66 broken); 57 problems showing a power of ten as plain digits ("1022"), and 4 that lost one with the cut question; all 292 answers starting "Svar:".
  - After: 0, 0, 0 and 0. All 58 problems with a power of ten keep every one of their 95 powers as an element.
  - On the live content the stored HTML is 170,013 characters for all 292 problems, and the largest problem is 4,840 (174,331 and 4,827 on the review's copy; 173,415 and 4,823 on efni `main`).
  - The counter is not in the repo. Don't use the review's `profTextAll.mjs` (in `~/.cache/reader-review/review-scratch/ped-stem/scripts/`, not in the repo) for this: it carries its own copy of the old walk.
- **#309 is plan step S3.2** (register PED-14, PED-29). Merged at 14:13:59 UTC as `aba7e76` (parents `cfa2842` and `e9da5a1`; 2 commits, 10 files). `main`'s tree equals the simulation (control: `cfa2842`'s tree differs).
  - /greining's "Hreinsa gögn" confirmed erasing all study data but reset only the analytics store. It is now "Hreinsa tölfræði", and its confirm names what it clears and what stays.
  - The new "Eyða öllum gögnum á þessu tæki" runs three steps in order. `deleteLocalCaches()` deletes the downloaded books and the browsing caches; the precache stays, and it never throws. `clearAllStorage()` then suspends every store write until the reload. Last, `location.reload()`. Downloaded books go too, and the confirm says so.
  - /prof no longer claims to adapt the next question: it is "Próf", as in the nav. `git grep -n -i -E 'aðlög|nuverandi' -- src` finds nothing (9 hits before).
  - Both red buttons on /greining are `red-700`. The ratchet's two light-theme entries for the old button are gone, so `e2e/a11y-baseline.json` is down from 6 entries to 4.
- 🔑 **Rules these PRs leave for later code:**
  - **A store's `onStorageChange` callback receives `'null'` when another tab removes its key** (or calls `localStorage.clear()`), and must turn it into the store's defaults. All eight stores do, through `validateStoreData` (by design, analytics keeps this tab's open session and offline keeps this tab's download progress). Before, removals were ignored, so another tab wrote its old state back after an erase whenever the erasing tab's reload did not boot (offline).
  - **`clearAllStorage()` blocks every `safeSetItem` until the page reloads.** Call it only right before a reload.
  - **A stored practice snapshot is filtered again when shown, and appended as nodes.** Never pass it to `{@html}`.
- **D20's third batch is checked.** [USER] approved all eleven S3.2 strings as written on 2026-10-26, keeping "á þessu tæki" and "Próf". #310 removed the markers: merged at 14:38:59 UTC as `590de02`, 11 deleted comment lines and no string changes; tree equals the simulation. `git grep -n 'D20: proposed' -- src` finds nothing.
- **CI:**
  - #308's head `7d99fa2`: 967 unit tests; e2e 150 passed, 31 skipped, 0 failed (PR run 40327825721, 8.0 min). `main` `cfa2842` (run 40329729337): green, e2e the same.
  - #309's head `e9da5a1`: 976 unit tests; e2e 154 passed, 31 skipped, 0 failed (PR run 40335471789, 8.5 min). `main` `aba7e76` (run 40337720156): green, e2e the same.
  - #310 (PR run 40337825178) and `main` `590de02` (run 40341571223): green, e2e 154 passed, 31 skipped, 0 failed.
- **Pre-PR reviews** (three lenses each, then a skeptic per finding). Each new test for a fix fails with the fix removed.
  - **S3.1:** 4 findings: 3 confirmed, all low and fixed (underlines kept, the question's paragraphs separated in its text, a store-test gap); 1 refuted.
  - **S3.2:** 9 findings: 4 confirmed, all low and fixed (a Cache Storage failure stopped the erase silently; writes in the moment before the reload and from other tabs; words the UI doesn't use; an overstated help line); 2 refuted; 3 not verified, one of which became a test.
- **The gates, run from the deploy lane by its checklist:**
  - `main`'s CI was green on `590de02`;
  - content validation found no issues, with only the warnings train 4 had;
  - no `D20: proposed` strings and no sync stamp on either side;
  - all 2,481 chemistry content files byte-identical to the server;
  - a second dry run just before `--apply` gave the same 337 and 0.
- **Backup and rollback:** the previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-26-v1793012580618` (3,647 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-26-v1793012580618/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 302 files and delete none; the train's 35 new `_app/` files would stay, unused.
- **Verified live:**
  - the version equals the lane's build;
  - every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1 and the three frozen books' homes name loads (27 to 43 per page, 0 missing; a made-up path answers 404);
  - organic answers 404;
  - in headless Chromium with every request outside namsbokasafn.is blocked: 0 page errors and 0 failed requests to the site on 7 pages at 390 and 1280 px.
- **S3.4's check, a repaired problem on /prof on the live site**, in a fresh browser profile. Before `--apply` the same script's checks failed on the live site: both records were stored without HTML, §4.4's question was stored without its text, §3.1's 10<sup>22</sup> was flattened, /prof was not "Próf", and /greining had neither new button. It then stopped at the erase, which the old page has no button for. After it, all nine checks pass:
  - revealing §4.4's Freon problem and §3.1's gold-atoms answer stores both with HTML;
  - /prof shows §4.4's question whole, with its equation as MathML, no buttons, and an answer without "Svar:";
  - /prof shows §3.1's 10<sup>22</sup> as an element;
  - /prof says "Próf", and /greining shows both new buttons;
  - the erase leaves no seeded key and no `offline-book:` cache.
- ⚠️ **The live chemistry is the 2026-08 sync, so its wording differs from efni `main`'s**: §3.1's gold-atoms problem says "Au-frumeindir" and §4.4's Freon problem "prósentuheimtur", where efni `main` and the CI e2e have "Au-atóm" and "prósentunýtni" (efni's §4.4 still says "prósentuheimtur" elsewhere on the page). A check run against the live site must use the live wording.
- **Known, not fixed** (in #308's and #309's bodies):
  - links inside a stored problem are unwrapped: 23 of them, 14 in-page anchors and 9 to other pages (7 to appendices, 1 to §1.4's table, 1 to §17.2's figure), which would have worked on /prof;
  - PED-13's step 2, fetching the section's HTML by the stored address, is not built;
  - the service worker's cache-expiry records (IndexedDB `workbox-expiration`) survive the erase;
  - another tab's open reading session survives it;
  - a download running in another tab keeps writing to its cache;
  - efni content: Check-your-learning answers that hold only "Svar:" show an empty answer. There are 6 on the live site (4-1 ×2, 4-2 ×2, 7-2, 15-3) and 2 on efni `main` (7-2, 15-3).
- **npm audit:** no package changes since `eab25c7` (production tree 0; full tree 3, all low).
- **Next, by the plan:** S3.3 (the page-view ruling in code, a privacy page and "Tilkynna villu"), which needs [USER]'s D03 data-rule wording. For [USER]: that wording, the real-phone check of the sidebar's focus order (S1.3's last box), S0.4 before 1 November, and listening to the timer pill on the live site while a phase runs.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-26 — train 4 deployed: S2.1's accent tokens (#304) and S2.2's focus ring (#306) are live

> ⚠️ **Superseded on three points — read the 2026-10-26 (afternoon) entry above first.**
>
> - Train 5 deployed `main` `590de02`, so prod runs build `1793025632459`, and "Undeployed on `main`: only the PR that adds this entry" no longer holds.
> - Its Next bullet's S3.1 and S3.2 are done and live.
> - M3's train has run (train 5, the plan's train 3) without S3.3.
>
> The rest of this entry stands.

Measured on 2026-10-26 against `main` = `eab25c7` (#306) and the live site.

- **Prod runs build `1793012580618`**, deployed at 11:15:30 UTC (the server's clock) from `main` `eab25c7` with no content sync, replacing train 3's build `1792945782503`. It is the plan's "train 2" (M2's train); this file's trains 2 and 3 were extra code-only trains. Undeployed on `main`: only the PR that adds this entry. It sent 351 files and deleted none, none under `content/`: 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sw.js`, `_app/version.json`, `sitemap.xml` and 48 new `/_app/immutable/` files (17 stylesheets, 7 chunks, 2 entry files, 22 page nodes). `sitemap.xml` went because every `<lastmod>` moved to 2026-10-26; its 366 URLs equal the live ones.
- **[USER] signed off S2.3's look on 2026-10-26** (plan S2.3, chunk 1): all 12 checks on the sign-off page OK (S2.3's own four and #304's eight design calls), with no notes and no token changes; the Settings switches, the update banner and the quiz's "Að læra" hue from their description. That lifted the night entry's stop on #304, and this entry removes that bullet.
- **What went live**, site-wide in both themes, light the most (tokens and rules in "Accent Color Convention" above):
  - ink instead of white on every amber fill, in both themes;
  - bronze instead of amber for amber text and icons, in light;
  - a hint grey with more contrast, in both themes;
  - links in running text underlined at rest;
  - one focus ring, bronze in light and amber in dark, over a solid gap; in-text glossary terms, the three search fields and the feedback form, which showed none, now show it.
- **#306 is plan step S2.2** (decision D01, register UI-07), merged at 11:01:32 UTC as `eab25c7` (parents `0aad47e` and `14b0d45`; 4 commits, 13 files). `main`'s tree equals the `git merge-tree` simulation made before the merge (control: `0aad47e`'s tree differs). Measured on screen by the new `e2e/focus-ring.spec.ts`, the light ring went from 2.66–2.92:1 against the page and 2.22–2.41:1 against its own halo to 5.75:1 on the gap and 5.24–5.75:1 on the page (dark: 8.66:1 and 7.95–8.66:1). Its pre-merge review (three lenses, a skeptic per finding) returned 9 findings: 4 confirmed, all low; 2 refuted; 3 not verified. One of those three, on periodic-table cells, was a regression of #306; it was measured and fixed before the merge with the confirmed ones (`14b0d45`, details in #306's body).
- **CI:** on #306's head `14b0d45` (run 40309760126), 934 unit tests; e2e 148 passed, 31 skipped, 0 failed in 8.0 min. The branch's first CI run (40303933513, dispatched on `8573c43` before the PR was opened) failed a Settings check that passed locally: the dialog moves focus to "Loka" 50 ms after it opens, which on the runner landed mid-test, and `442a86e` makes the spec wait for it. On `main` `eab25c7` (run 40311928222) all three jobs passed: 934 unit tests; e2e 148 passed, 31 skipped, 0 failed in 8.5 min; the whole-book offline test took 3.5 min.
- **The gates, run from the deploy lane by its checklist:** `main`'s CI was green on `eab25c7`; content validation found no issues, and the build had only the warnings trains 1–3 also had (workbox's "glob pattern", Vite's `configLoader` notice and the bundler's 20 `node:fs` "externalized for browser compatibility" notices); no `D20: proposed` strings; no sync stamp on either side; all 2,481 chemistry content files byte-identical to the server; a second dry run just before `--apply` gave the same 351 and 0. The previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-26-v1792945782503` (3,599 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-26-v1792945782503/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 303 files and delete none; the train's 48 new `_app/` files would stay, unused.
- **Verified live:** the version equals the lane's build; every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1 and the three frozen books' homes name loads (26 to 41 per page, 0 missing; a made-up path answers 404); organic answers 404. In headless Chromium with every request outside namsbokasafn.is blocked: 0 page errors and 0 failed requests to the site on the catalogue, chemistry's home, §1.1, `/greining`, `/lotukerfi`, `/feedback` and frozen physics, at 390 and 1280 px. On `/lotukerfi` an arrow-keyed cell is raised (z-index 10) with the ring on the three sides sampled (top, right and bottom), and the selected category chip shows the ring.
- **S2.3 chunk 2, the ring on a live glossary term:** §1.1's first term ("efnafræði"), focused from the keyboard at 1280 and 390 px in both themes, draws a solid 2 px `--focus-ring` outline 2 px out over a 2 px `--focus-gap`, and all 187 pixels along its top edge are the ring colour. Light: 5.75:1 on the gap and 5.24:1 on the page. Dark: 8.66:1 on both. The control, run just before `--apply`, found outline `none` and no `--focus-gap`, and all four checks failed. ⚠️ Measure the page colour along the whole edge (the most common colour in that row), not at one pixel: at 1280 px the line of text above sits close to the ring, and a single pixel there landed on a letter.
- **Measured: train 4 does not restyle a hard load of a frozen book**, as the night entry expected. `/edlisfraedi-2e/` links 8 stylesheets (7 hashed `/_app/immutable/` files and `/styles/content.css`) and none defines `--focus-gap` (chemistry's home: 1 of 8), so its pages keep the 2026-08-19 bundles, white on amber and the old ring included. The ratchet scans only chemistry.
- **Known, not fixed** (in #306's body): a control whose own rule sets a box-shadow keeps it in the gap band (the timer pill, the phone tools button and its menu links, a flashcard), and the ring still clears 3:1 there. In dark, periodic-table cells keep their pastel fills, so outside the ring they sit at 1.10–1.23:1; the ring is 8.66:1 on its gap.
- **npm audit, 2026-10-26 (on `eab25c7`):** production tree 0; full tree 3, all low, unchanged: kit's two advisories, also flagged through `adapter-static` and `@vite-pwa/sveltekit`.
- **Next, by the plan:** M3 (S3.1 the practice review keeps the whole question, S3.2 "Hreinsa gögn", S3.3 the page-view ruling in code, then its train). For [USER]: the real-phone check of the sidebar's focus order (S1.3's last box), S0.4 before 1 November, and listening to the timer pill on the live site while a phase runs.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-25 (night) — S2.1's accent tokens merged (#304); `main` is not train-ready until S2.3

> ⚠️ **Superseded on three points — read the 2026-10-26 entry above first.**
>
> - Train 4 deployed `main` `eab25c7`, so #304 is live and "Prod still runs build `1792945782503`" no longer holds. Its stop bullet ("`main` is not train-ready until S2.3") is removed; the list of visible changes moved to the 2026-10-26 entry.
> - S2.2 is done and live (#306): the deferred focus-ring item and `tokens.test.ts`'s known failure are gone.
> - Its Next bullet (S2.2, S2.3 and train 4) is done, and the frozen-book expectation is now measured.
>
> The rest of this entry stands.

Measured on 2026-10-25 against `main` = `12a08f2` (#304) and the live site.

- **Prod still runs build `1792945782503`** (train 3, `main` `4667e2c`; `/_app/version.json` at 21:28 UTC). Undeployed on `main`: #303 (this file only), #304 and the PR that adds this entry.
- **#304 is plan step S2.1** (decision D01, register UI-02), merged at 21:20:03 UTC as `12a08f2` (parents `71aee24` and `51da220`; 9 commits, 58 files). `main`'s tree equals the `git merge-tree` simulation made before the merge (control: `71aee24`'s tree differs). The tokens and their rules are in "Accent Color Convention" above, which #304 rewrote. In short:
  - `--on-accent` (ink) goes on the fill, and `--accent-fill-hover` is the fill's hover.
  - `--accent-strong` is for amber used as text or an icon: in light, `#c78c20`'s 2.31–2.92:1 becomes 4.55:1 or more on all five surfaces.
  - `--text-tertiary` is raised to 4.5:1 on all five surfaces, and `--text-disabled` is for disabled controls only.
  - `--border-input` is defined and tested but not yet applied.
  - `--accent-hover` is deleted, and the unused `--header-banner-text` became `--on-accent`.
- **It fixes the evening entry's two light-theme failures:** an objective button's number (2.71 → 5.35:1) and the open breadcrumb list's current entry (2.43 → about 4.8:1). For the breadcrumb, axe and token arithmetic give 2.43 and 4.81. The new spec gives 2.42 and 4.78, because it composites the 10% tint at 8-bit alpha. The ratchet sees neither: axe skips one-character text, and the list is closed during its scans. So the new `e2e/accent-contrast.spec.ts` measures them directly in both themes, together with a primary button at rest and under the pointer, and it fails on measured text whose opacity is below 1. On `main`'s build before #304 it failed with the old ratios (2.71, 2.42 and 2.92 in light; the button's 2.08 in dark). On #304 all 6 tests pass.
- **The ratchets:** `e2e/a11y-baseline.json` went from 81 entries to 6, with none added; 14 of its 20 scans are now empty (1 before). The six left are light-theme colour contrast outside the accent, each at 390 and 1280 px: the catalogue's subject-accordion titles, a `text-red-600` button on `/greining` and a section's grey-500 reading-time label. `tokens.test.ts` lists only the light focus ring as a known failure (S2.2's). `accentText.test.ts` is at 0, and it also holds amber-as-text, faded ink on the fill and `var(--accent-hover)` at 0.
- **CI:** green on #304's head `51da220` (run 40228609880). lint-and-test passed 921 unit tests. e2e passed 142, skipped 31 and failed 0 in 8.4 min; the whole-book offline test took 3.5 min. On `main` `12a08f2` (run 40234998178) all three jobs passed: e2e had the same 142 passed, 31 skipped and 0 failed, in 7.4 min, and the offline test took 2.7 min. Locally, the full e2e timed the offline test out at its 15-minute limit under load; run alone, it passed in 10.0 min.
- **An adversarial review workflow** (five lenses, plus a skeptic per finding) found 14 serious findings. None was refuted and one was downgraded to a nit; each is fixed in #304 or listed in its body. #304 changed no Icelandic string (so no `D20: proposed` markers) and no package file.
- **For S2.3:** before and after screenshots of the same content, in both themes at 390 and 1280 px, are on the dev machine in `~/.cache/vefur-a11y/s21-shots/{before,after}` (44 each). #304's body lists the design calls to sign off:
  - decorative icons turn bronze;
  - Settings' "Miðlungs" and the selected "Aa" use bronze;
  - the update banner's "Uppfæra núna" becomes a neutral button;
  - a switch that is on gets an ink knob;
  - links in running text are underlined at rest;
  - the adaptive quiz's "Að læra" hue changes;
  - for-teachers' chemistry tile gets a new gradient;
  - in dark, amber text and icons are unchanged (`--accent-strong` is the same `#e8a838` there), except four links that rested on `#f0bc5a`. But dark also gets ink instead of white on every amber fill (2.08 → 8.66:1), a lighter hint grey (`#6a6560` → `#98938d`), ink knobs and the underlines, so S2.3 checks dark too.
- **Deferred, each named in #304:**
  - `--border-input` on text fields and switch tracks (22 sites, at 1.11–2.56:1 today);
  - Tailwind grey hints (`text-gray-400/500`), including the selection popup's close icon;
  - the focus ring and the `--focus-ring` / `--accent-light` pair (S2.2);
  - the 8 amber text uses in `static/styles/print.css`;
  - the semantic colours outside the accent.
- **Expected, not measured: the train that ships #304 will not restyle a hard load of a frozen book.** As with #294 and #296–#299, its pages keep the 2026-08-19 bundles, white on amber included. The ratchet scans only chemistry.
- **Next, by the plan:** S2.2 (the focus ring), then S2.3 ([USER]'s sign-off) and its train (train 4 here, the plan's "train 2"). For [USER]: the real-phone check of the sidebar's focus order (S1.3's last box), S0.4 before 1 November, and listening to the timer pill on the live site while a phase runs.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-25 (evening) — train 3 deployed: the four label-in-name fixes and "lokið" are live

> ⚠️ **Superseded on three points — read the 2026-10-25 (night) entry above first.**
>
> - #304 merged after this entry and is not deployed, so "Nothing on `main` is undeployed" no longer holds. 🔴 `main` is not train-ready until S2.3. _(Lifted: train 4 shipped #304 on 2026-10-26.)_
> - The two light-theme contrast failures under "Found on the way" (2.43:1 and 2.71:1) are fixed on `main` by #304 but not live.
> - The Next bullet's M2 step S2.1 is merged; S2.2 and S2.3 remain.
>
> The rest of this entry stands.

Measured on 2026-10-25 against `main` = `4667e2c` (#302) and the live site.

- **Prod runs build `1792945782503`**, deployed at 16:39:31 UTC (the server's clock) from `main` `4667e2c` with no content sync, replacing train 2's build `1792933002544`. Nothing on `main` is undeployed. It sent 315 files and deleted none, none under `content/`: 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sw.js`, `_app/version.json` and 13 new `/_app/immutable/` files (4 chunks, 2 entry files, 7 page nodes). `sitemap.xml` was not sent: it is byte-identical to the live one.
- **The gates, run from the deploy lane by its checklist:** `main`'s CI was green on `4667e2c`; the build and content validation were clean apart from the warnings trains 1 and 2 also had (workbox's "glob pattern" and Vite's `configLoader` notice); no `D20: proposed` strings; no sync stamp on either side; all 2,481 chemistry content files byte-identical to the server; the sitemap's 366 URLs equal the live ones; a second dry run just before `--apply` gave the same 315 and 0. The previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-25-v1792933002544` (3,586 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-25-v1792933002544/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 302 files and delete none; the train's 13 new `_app/` files would stay, unused.
- **What went live: all four label-in-name failures that #280's axe 4.14 found are fixed** (WCAG 2.5.3, Level A), each in its own PR, red without its fix and green with it. The baseline went 107 → 101 → 97 → 93 → 81, and no `label-content-name-mismatch` entry is left:
  - **#296, the header search button:** named "Leita, Ctrl+K" (it showed "Ctrl+K" at 1280 px), 6 entries.
  - **#297, the section breadcrumb:** the `aria-label` is gone, so the name is its visible text ("Kafli 1 › 1.1 Efnafræði í samhengi"). "Velja undirkafla" is its description, through `aria-describedby` on a span with the `hidden` attribute beside the button: an `sr-only` span was also an extra text node in Chromium's accessibility tree (measured), so a stray line in browse mode, and inside the button it would join the name. 4 entries.
  - **#298, the learning-objective buttons:** each name holds its number ("Merkja markmið 1 sem …", "Afmerkja markmið 1"), which also tells the buttons apart. 4 entries.
  - **#299, the timer pill:** no `aria-label`; a visually hidden "Opna tímamæli," comes first inside the button, so the name comes from its content ("Opna tímamæli, 24:13 Vinna"). The name ticks with the clock. From the screen readers' and browsers' source and published tests, not measured with a screen reader here: Chromium fires no MSAA name-change event for a name from content, so NVDA in Chrome and Edge should not re-read it each second (one report says it reads the first change once; it would re-read an `aria-label`), but NVDA in Firefox, and probably Narrator, may, while the pill has focus and a phase runs. [USER] chose this (option (b)) over a minutes-only pill ("⏱ 24 mín", option (c)), which stays open for S9.5. 12 entries; `greining 390 dark` is now empty.
- **"lokið" wording ([USER], 2026-10-25):** the section page's buttons are "Merkja markmið N sem lokið" / "Afmerkja markmið N" (#300; #298 had "klárað"), and `/markmid`'s are "Merkja sem lokið" / "Afmerkja sem lokið", with its help text "… merktu viðeigandi markmið sem lokið" (#300, #301; it said "kláruð" and "ókláruð").
- **D20's second batch is checked.** [USER] approved its strings on 2026-10-25 (the search button's name, both pages' objective names and `/markmid`'s help text), and #302 removed the four markers.
- **Verified live:** the version equals the lane's build; every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1 and the three frozen books' homes name loads (26 to 41 per page, 0 missing; a made-up path answers 404); organic answers 404. In headless Chromium with every request outside namsbokasafn.is blocked, at 390 and 1280 px: the four new names and the breadcrumb's description, and `/markmid`'s help text, with 0 page errors.
- **These fixes do not reach a hard load of a frozen book,** as with #294: its pages keep the 2026-08-19 bundles, so `/edlisfraedi-2e/` still serves `aria-label="Leita"` and `aria-label="Opna tímamæli"` (chemistry's home serves "Leita, Ctrl+K"). The ratchet scans only chemistry.
- **Found on the way, older than these PRs, and on the private worklist:** at 390 px a long breadcrumb title is clipped, not ellipsised, and its chevron goes off-screen; in the light theme the open breadcrumb list's current entry has 2.43:1 contrast and an objective button's number 2.71:1 (axe reports the latter only for two-digit numbers, so the ratchet never sees it; both belong with S2.1); the breadcrumb list's keyboard model does not match its `aria-haspopup="listbox"`; the objective toggles could take one fixed name plus `aria-pressed`, on both pages. And at 390 px the collapsed tools menu's four links (Lotukerfi, Próf, Orðasafn, Minniskort), at opacity 0, are the next Tab stops after "Fyrri kafli" (measured on the live build).
- 🔑 **A stacked PR now retargets to `main` by itself.** First seen on #297 → #298 → #299: GitHub logged `automatic_base_change_succeeded` 2 s after each parent merged (#298 at 15:11:07Z, #299 at 15:11:42Z), and the child then listed only its own commit. `main`'s tree after the three merges equalled the `git merge-tree` simulation. Still check `gh pr view <N> --json baseRefName,mergeable` before merging a child, and fall back to the 2026-10-24 entry's `PATCH` if it has not moved. CI still runs only for PRs into `main` or `feature/**`, and a retarget starts no run, so a stacked head's checks come from `gh workflow run ci.yml --ref <branch>`. `gh pr ready <N>` works here, unlike `gh pr edit`.
- **npm audit, 2026-10-25 (on `4667e2c`):** production tree 0; full tree 3, all low, unchanged: kit's two advisories, also flagged through `adapter-static` and `@vite-pwa/sveltekit`.
- **Next, by the plan:** [USER]'s real-phone check of the sidebar's focus order (S1.3's last box), S0.4 before 1 November, then M2 (S2.1). Separately, listen to the timer pill on the live site while a phase runs, ideally with NVDA in Firefox: S0.4's trial build predates #299.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-25 (afternoon) — train 2 deployed: search downloads nothing until it is opened

> ⚠️ **Superseded on two points — read the 2026-10-25 (evening) entry above first.** Train 3 deployed `main` `4667e2c`, so prod runs build `1792945782503` and "the four label-in-name fixes" are done and live. And a stacked PR retargeting itself has now been seen (#298, #299). The rest of this entry stands.

Measured on 2026-10-25 against `main` = `9950f13` (#294) and the live site.

- **Prod runs build `1792933002544`**, deployed at about 13:14 UTC from `main` `9950f13` with no content sync, replacing train 1's build `1792871972257`. Nothing on `main` is undeployed. It sent 362 files and deleted none, none under `content/`: the same pages as train 1 (273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sitemap.xml`, `sw.js`, `_app/version.json`) plus 59 new `/_app/immutable/` files. The 42 more than train 1's 320 come from #287's svelte 5.57.2 and vite 8.3.5, which recompiled all 31 page nodes, 26 of 37 chunks and both entry files; none of the 22 CSS files changed.
- **The gates, run from the deploy lane by its checklist:** the build and content validation were clean (the build's one workbox "glob pattern" warning was in train 1's log too); no `D20: proposed` strings; no sync stamp on either side; all 2,481 chemistry content files byte-identical to the server; the sitemap's 366 URLs equal the live ones; a second dry run just before `--apply` gave the same 362 and 0; `main`'s CI was green on `9950f13`. The previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-25-v1792871972257` (3,527 files, identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-25-v1792871972257/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 303 files and delete none; the train's 59 new `_app/` files would stay, unused.
- **What went live, #294: the search box builds its index only when it is opened.** Before, `SearchModal` (which the header renders on every book page) built it in `onMount`, so every hard load of a book page fetched all 216 chemistry sections, one at a time, whether or not the reader searched: 8.8 MB and about 12 s, measured against the live site in desktop Chromium with the service worker blocked. The index is now built when search opens, six files at a time (2.5 s for the same files), in table-of-contents order, so results rank as before. `pool()` moved unchanged from `src/lib/stores/offline.ts` to `src/lib/utils/pool.ts`, where the offline download and the search index share it. Two consequences:
  - A reader who never searches downloads none of it, but one who does still downloads the 8.8 MB, now at the first search, which is slow on mobile data. A prebuilt text-only index (about 0.72 MB gzipped for chemistry, in one request) would fix that; it is an idea, not on the plan.
  - The old crawl put every section's text in the service worker's `book-content` cache on the first visit, so unopened sections happened to read offline. They no longer do: reading offline is what "Sækja" is for.
- **#294's tests:** `e2e/search-index.spec.ts` fails on the old code (124 section files fetched in the 3 s before search was opened) and checks that each section is fetched once, more than one at a time, and that search finds a section by its title; `src/lib/utils/pool.test.ts` fails on a one-at-a-time and on an unbounded `pool()`. Not in #294: `buildIndex` leaves `isBuilding` set if a build rejects, and the search worker is still created when the module loads.
- **Also deployed:** #287's svelte, vite and lucide (above, and the morning entry), and #291, #292 and #289, which change only build and test tools.
- **Verified live:** the version equals the lane's build; every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1 and the three frozen books' homes name loads (26 to 41 per page, 0 missing; a made-up path answers 404); organic answers 404. Then in headless Chromium, with analytics requests stubbed:
  - **the search fix:** chemistry's home fetched 0 section files in the 4 s after load, and §1.1 only its own 4 figures. Opening search then fetched all 216 sections, each once, at most 6 at a time (8.96 MB; the index was ready 4.6 s after the click), and "Efnafræði samhengi" found §1.1 first.
  - **no new errors:** 0 page errors, 0 failed requests and 0 responses of 400 or more on the catalogue, chemistry's home, §1.1, `/greining` and frozen physics, at 390 and 1280 px. The catalogue's `hydration_mismatch` showed once at each width, as in train 1. Settings opens and Escape closes it, and → on §1.1 moves to §1.2.
  - **the offline download** of physics through the moved `pool()`: 64 of 64 files, at most 4 at a time. They read offline from the downloaded copy (the control, a chemistry figure never downloaded, failed), and "Eyða niðurhali" removed them. The active worker is the new `sw.js`, with 112 precache entries.
- **#294 does not reach a hard load of a frozen book.** Its pages keep the 2026-08-19 bundles, which still build the search index on mount: physics fetched 14 section files within 3 s of load. The frozen books are small (physics 14, biology 17, microbiology 20 sections), and this lasts until they are deployed again. A frozen book reached client-side from the catalogue runs the new code and fetched none.
- **Merged on 2026-10-25 after the morning entry,** each with green CI on its PR and on `main`: #290 (that entry); #291 (`serialize-javascript` 7.0.5 → 7.1.4) and #292 (`fast-uri` 3.1.8 → 3.1.9), Dependabot security fixes that each change three lines of the lockfile in the dev tree; #289 (`@playwright/test` 1.63.0 → 1.64.1, Chromium 156), merged after an `@dependabot rebase` because its base predated #287, with the accessibility baseline unchanged (all 20 scans clean, 0 `a11y-baseline` lines); and #294.
- 🔑 **Correction to the morning entry: #286 skips SvelteKit 3 for version updates only.** The repository's first Dependabot alerts appeared at 09:29 UTC (#1–#7), and Dependabot now opens a security-fix PR for each vulnerable package, outside the groups, which the `update-types` ignore does not stop. So #293 (`@sveltejs/kit` 3.0.0) arrived anyway. It cannot install (`adapter-static` 3.0.10 peers kit 2: ERESOLVE, as #281 did), and its two advisories need `use:enhance` with form actions or `setHeaders`, which `src/` does not use (0 of each, and no server routes). [USER] chose on 2026-10-25 to leave #293 and alerts #1–#2 open. `@dependabot ignore this major version` on #293 would close it and stop further kit 3 PRs until it is reopened or kit is upgraded by hand.
- **npm audit, 2026-10-25 (after #291 and #292):** production tree 0; full tree 3, all low: kit's two advisories, also flagged through `adapter-static` and `@vite-pwa/sveltekit`. Both are fixed only in SvelteKit 3.
- **Merged branches deleting themselves has now been seen** on #290, #291, #292, #289 and #294, each branch gone within seconds of its merge. A stacked PR retargeting itself has still not been seen; check `baseRefName` on the next stack.
- **Next, by the plan:** [USER]'s real-phone check of the sidebar's focus order (S1.3's last box), S0.4 (before 1 November), the four label-in-name fixes (one PR each), then M2 (S2.1).
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-25 — Dependabot round merged; merged branches now delete themselves

> ⚠️ **Superseded on three points — read the 2026-10-25 (evening) and (afternoon) entries above first.** Train 2 deployed `main` `9950f13`, so its "Not deployed" bullet no longer holds. #286 skips SvelteKit 3 for version updates only: a Dependabot security-fix PR for kit 3 (#293) arrived anyway. A stacked PR retargeting itself, which its 🔑 bullet says has not been seen, was seen on #298 and #299. And its Open (#289, merged) and Next (the search fix and the label-in-name fixes, both done; M2 remains) bullets are past. The rest of this entry stands.

Measured on 2026-10-25 against `main` = `ae703cc` (#287) and the live site.

- **Merged, each with green CI on its PR and on `main`:** #267 (setup-node 7.1.0) and #268 (upload-artifact 7.0.2), CI only; #266 and #288 (lucide 1.48 → 1.61; all 69 icons we import are drawn identically); #280 (axe-core 4.14.0, with 26 new baseline entries, below); #286 (Dependabot skips SvelteKit 3 and adapter-static 4, below); and #287, the development group's 12 updates.
- **Not deployed:** `main`'s shipped code now differs from prod (build `1792871972257`) by svelte 5.57.2, vite 8.3.5 and lucide 1.61. Nothing visible changes; it rides train 2.
- **axe-core 4.14 runs `label-content-name-mismatch` by default** (WCAG 2.5.3 Label in Name, Level A). It finds four elements on the live site whose accessible name does not contain their visible text: the timer pill ("Opna tímamæli", showing "⏱ 25:00"), the header search button ("Leita", showing "Ctrl+K" at 1280 px), the section breadcrumb ("Velja undirkafla", showing "Kafli 1 › 1.1 …") and the five learning-objective buttons (all "Merkja markmið sem kláruð", showing "1" to "5"). #280 records them as 26 baseline entries (81 → 107; none re-keyed or gone). Each fix gets its own PR, which removes its entries.
- **SvelteKit 3 is skipped for now** (#286, `.github/dependabot.yml`): `@vite-pwa/sveltekit` 1.1.0, the latest release, peers `@sveltejs/kit` `^1.3.1 || ^2.0.1`, so the development group's `npm ci` failed with ERESOLVE (#281, which Dependabot then closed and replaced with #287). The comment beside the ignore says when to lift it and what the migration must also do.
- **npm audit, 2026-10-25:** production tree 0; full tree 5, down from 11, with 0 high (1 moderate: `fast-uri`; 4 low: kit's two, also flagged through `adapter-static` and `@vite-pwa/sveltekit`, and `serialize-javascript`). Kit's two are fixed only in SvelteKit 3.
- 🔑 **Merged branches now delete themselves** (`delete_branch_on_merge`, turned on 2026-10-25). By GitHub's documented behaviour, deleting a merged PR's branch points any PR based on it at the merged PR's base, so a stacked PR should retarget to `main` by itself when its parent merges. That replaces the hand retarget in the 2026-10-24 entry's stacked-PR bullet; it has not been seen here yet, so check `gh pr view <N> --json baseRefName` before merging the next stacked PR. CI still runs only for PRs into `main` or `feature/**`, and a retarget starts no run. 23 merged branches were deleted the same day. GitHub keeps `main`, `archive/react-v1`, `feature/reader-v1.1` and `feature/reader-v1.2`, plus open PRs' branches.
- **Open:** Dependabot #289 (`@playwright/test` 1.64.1), in a PR of its own on purpose: a new Chromium can change the ratchet's baseline.
- **Next:** the search-box fix (2026-10-24 evening entry), then the four label-in-name fixes and M2.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-24 (evening) — train 1 deployed: M1's fixes are live

> ⚠️ **Superseded on two points — read the 2026-10-25 entries above first.** `main` has moved on since (first with the Dependabot round, `ae703cc`), so "nothing on `main` is undeployed" describes only this entry's date. And its 🔑 "Next fix" is done: #294 builds the search index only when search opens (live since train 2), so a `networkidle` wait on a book page no longer times out on the crawl. The rest of this entry stands.

Measured on 2026-10-24 against `main` = `e6b203b` (#283) and the live site.

- **Prod runs build `1792871972257`**, deployed at 20:56 UTC from `main` `e6b203b` with no content sync, replacing build `1791155794060` (#263, 2026-10-04), so nothing on `main` is undeployed. It is the first train from the deploy lane, run step by step from its checklist (`docs/guides/deployment.md`, "The deploy lane"). It sent 320 files and deleted none: 273 chemistry pages, 25 print pages, `200.html`, `index.html`, `sitemap.xml`, `sw.js`, 17 `_app/` files and #272's `styles/print.css`, none under `content/`.
- **The gates:** no `D20: proposed` strings; no sync stamp on either side; all 2,481 chemistry content files byte-identical to the server; the sitemap's 366 URLs equal the live ones; a second dry run just before `--apply` gave the same 320 and 0. The previous build is backed up on the server at `~/backups/namsbokasafn-build-2026-10-24-v1791155794060` (3,511 files, checksums identical to the live build when copied). To roll back: `ssh siggi@kvenno.app 'rsync -a ~/backups/namsbokasafn-build-2026-10-24-v1791155794060/ /var/www/namsbokasafn-vefur/build/'`. Its dry run (`-n`) would copy back 304 files and delete none; the train's 16 new `_app/` files would stay, unused.
- **What went live:** #278 (Settings and search close without moving the page, the closed phone sidebar is out of the Tab order, and the `/greining` tabs have names and arrow keys) and #279 (the "Merkja kafla sem lesinn" button at 5.36:1, labelled groups and pressed states in Settings, its switches named by their visible labels instead of on/off `aria-label`s, the `--focus-ring` colour on the "Leturgerð" radios, and three reworded strings). #272's "Vélþýtt" badge rule is live too, but no deployed figure carries `data-figure-review` (0 of the 166 content files with a `<figure>`), so the badge shows on no page until the chemistry sync. #277 adds tests, their tooling (a dev-only dependency) and the config and docs for them; #264, #270, #271, #273, #275, #276 and #282 are docs (#276 also adds `scripts/backup-live-build.sh`), and #283 changes only code comments.
- **D20's first batch is checked.** [USER] approved the three strings (the bionic switch's label and its description, and OpenDyslexic's description) on 2026-10-24, word for word as #279 merged them, and #283 removed the two markers. [USER] also confirmed the dark `--focus-ring`, `#e8a838` (D01 ruled only the light ring); a comment beside the token in `src/app.css` records it.
- **Verified live:** the version; every `/_app/immutable/` file that the catalogue, chemistry's home, §1.1 and the three frozen books' homes name loads (26 to 41 per page, 0 missing); organic answers 404. In headless Chromium at 390 and 1280 px, with analytics requests stubbed: 0 page errors on `/`, chemistry's home, §1.1 and `/greining`; Settings shows the three new strings and the "Línubil" and "Línubreidd" groups; the read button is `bg-emerald-700`. The console had the catalogue's known `hydration_mismatch`, and, on some pages the service worker controls (never on one it did not), Chromium's "A preload … is not used because it is a cross-world service worker resource mismatch". That warning was not compared with the previous build, which survives only as the backup; the worker's code is unchanged apart from its precache list, so it is probably not new.
- **Ahead of the plan:** train 1 ran on 2026-10-24, about two weeks before the plan's "about 6 November". S1.3 needs only S1.2 and S0.5, so S0.4 did not gate it; the plan's dates are unchanged. As before, the build sends the page-view event (D03) until S3.3 removes it.
- **Still open from S1.3:** [USER]'s real-phone check of the sidebar's focus order. Its box in the plan is ticked after that.
- 🔑 **Next fix ([USER], 2026-10-24): the search box downloads the whole book on every page load.** `Header.svelte` always mounts `SearchModal`, whose `onMount` calls `initSearch()` whenever there is a `bookSlug`. So on every hard load of a book page, `searchIndex.ts` fetches every section in the book's `toc.json`, one at a time, whether or not the reader opens search. For chemistry that is 216 files and 39.7 MB of HTML, which nginx gzips to about a fifth (0.20 over a 12-file sample): about 8 MB on a first visit. Once the service worker controls the page, its content route (NetworkFirst with `cache: 'no-cache'`) revalidates each file, so every later hard load still sends 216 requests, answered 304. This predates train 1 and is not in the review's register. The dialog's own `$effect` already builds the index when search opens. Until the fix, a `networkidle` wait on a book page can time out on this crawl, so browser checks should wait for `load`.
- **Then, by the plan:** S0.4, [USER]'s real-phone and screen-reader QA on S0.3's build (before 1 November, when [USER]'s time goes mostly to efni), then M2 (S2.1, the accent tokens; D01 ruled).
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-24 — M1's code merged (#276–#279); none of it deployed

> ⚠️ **Superseded on the operational points — read the 2026-10-24 (evening) entry above first.** Train 1 deployed `main` `e6b203b` on 2026-10-24, ahead of the plan's "about 6 November": prod runs build `1792871972257`, #278 and #279 are live (and #272's badge rule, which no deployed figure triggers yet), [USER] has checked the three strings and confirmed the dark `--focus-ring`, #283 removed the two `D20: proposed` markers, and the deploy lane is at `e6b203b`. Of this entry's "Next" bullet, S0.4 and M2 remain. Its 🔑 stacked-PR bullet no longer holds: since 2026-10-25 merged branches delete themselves and a stacked PR retargets to `main` by itself (2026-10-25 evening entry); the `PATCH` is the fallback. The rest of this entry stands.

Measured on 2026-10-24 against `main` = `1e6a178` (#279) and the live site.

- **Merged in this order on 2026-10-24:** #276 (S0.3's note, the deploy-lane checklist in `docs/guides/deployment.md` and `scripts/backup-live-build.sh`), #277 (S1.1, the accessibility ratchet), #278 (S1.2: Settings and search close without moving the page, the closed phone sidebar is out of the Tab order, and the `/greining` tabs have names and arrow keys) and #279 (S1.3's code: a readable "Merkja kafla sem lesinn" button, named groups and pressed states in Settings, the `--focus-ring` token and three reworded labels). CI passed on all four merge commits; the last e2e run had 134 passed, 31 skipped and 0 failed.
- **Prod still runs build `1791155794060`** (#263). #272, #278 and #279 change what readers see and are not live; #277 adds only tests and test tooling, and #276 is docs and a script.
- **The three reworded labels are marked by two `D20: proposed` comments** (`git grep -n 'D20: proposed' -- src`). Step 2 of the lane's checklist stops a train until [USER] has checked them and a PR has removed the markers.
- **The deploy lane is still at `62ea95e`**; the checklist's first step pulls `main`.
- 🔑 **A stacked PR does not retarget itself here.** GitHub moves a PR to `main` only when its base branch is deleted, and this repo keeps merged branches, so merging the next PR of a stack while its base is the merged branch lands it on that branch, not on `main`. Point it at `main` first with `gh api -X PATCH repos/<owner>/<repo>/pulls/<N> -f base=main` (`gh pr edit` fails here with a classic-Projects GraphQL error), wait until `gh pr view <N> --json mergeable` reads `MERGEABLE`, then merge. CI runs only for PRs into `main` or `feature/**`, so a stacked PR's checks come from `gh workflow run ci.yml --ref <branch>`.
- **npm audit, 2026-10-24:** production tree 0; full tree 11 (3 high: `vite`, `undici`, `source-map-js`; 4 moderate: `vitest`, two `@vitest/*` packages and `fast-uri`; 4 low: `serialize-javascript`, and `@sveltejs/kit` below 3.0.0 with the two packages flagged through it). None came from these merges: the lockfile gained only `@axe-core/playwright` and `axe-core`. `main`'s last CI run before them (2026-10-23) counted 5; the rest were published since. SvelteKit's two advisories do not apply here (one needs `use:enhance` form actions, the other `setHeaders` with an untrusted `cache-control` on a prerendered page, and `src/` has neither), and their fix is SvelteKit 3: Dependabot's #281 carries it, with `adapter-static` 4, and fails CI. Every other package has a fix inside its current major. #280 moves `@axe-core/playwright` to 4.14.0 on its own, as #277 set up, because a new axe can change the ratchet's baseline.
- **Next, by the plan:** [USER] checks the three labels and confirms the dark `--focus-ring` (`#e8a838`, today's dark accent: D01 set only the light ring, and its evidence says the dark one already passes), then S0.4 (real-phone and screen-reader QA on S0.3's build), then train 1 (about 6 November 2026), then M2.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-23 — reader review: S0.1, S0.2, S0.3 and S0.5 done; #272 merged but not deployed

> ⚠️ **Superseded on the operational points — read the 2026-10-24 entry above first.** #276–#279 have merged since (`main` = `1e6a178`) and none is deployed, so #272 is no longer the only change waiting for a train. The rest of this entry stands.

Measured on 2026-10-23 against `main` = `62ea95e` (#275) and the live site.

- **Prod still runs build `1791155794060`** (#263), but `main` is no longer fully deployed: **#272, a "Vélþýtt" badge on figures with unapproved text** (`src/app.css`, `static/styles/print.css` and an e2e spec), merged on 2026-10-17 and is not live. #270, #271, #273 and #275 are docs only.
- 🔴 **Don't deploy from the main working checkout on this machine.** Its `static/content/efnafraedi-2e` is efni's ② preview (`content/c2-whole-book-reinject` at `48dbbb7a2`, synced on 2026-10-09 for [USER]'s terminology review), not the live content. Deploy from the deploy lane (S0.5, below); the content-checksum check under Deployment would show the difference.
- **The reader v1.1/v1.2 review is the plan for both reader branches** (#270): the report, a 72-step plan (M0–M14) with tick boxes, and a 110-issue register, in `docs/plans/2026-10-15-reader-v1.1-v1.2-review{,-plan,-register}.md`. The plan follows the report's recommended route, strategy C: v1.1 is not merged. It stays frozen at `dde768e` (tag `reader-v1.1-port-source`) as the porting source, and each piece moves to `main` as a small PR, shipped on code-only trains (one deploy carrying the PRs merged since the last). The pager lands dark, so no reader's mode changes until [USER] rules, and M11 tags v1.1.0 on `main` instead of at a branch merge. The roadmap's branch rule (#271, [CODE-04]): never merge v1.2 into main or main into v1.2, and take no P0 file from v1.2. So the June roadmap's "when the release branches merge" (Earlier, below) no longer describes the route.
- **S0.1** (#271): efni has the content requests H1–H6 in `docs/handoffs/2026-10-16-reader-branches-requests-for-efni.md`, logged in its register as §C201.
- **S0.2: the first decision records, in `docs/decisions/`** (a new folder). 28 dated files from [USER]'s decision session of 2026-10-23: 16 rulings (D01–D10, D18–D20, KEEP-01, and calls 1 and 2, which [USER] ruled early) and 12 deferrals, each naming its decision session (S9.0, S10.2 or S12.0). Calls 3 and 4 are still open. The briefs are in `docs/plans/2026-10-20-reader-decision-briefs.md`, and the April reader plan, which the design principle above cites, has a dated evidence erratum. 🔴 **Never edit a decision file:** a change is a new dated file that names the one it replaces. Before a plan step starts, its "Decide first" must be on file here.
- **Three rulings change work here before their steps run:**
  - **D03: a production build still sends a page-view event to efni's editorial server** (`trackPageView` in `src/lib/utils/api.ts`, called from `src/routes/[bookSlug]/+layout.svelte`, sent by `sendBeacon` to `VITE_API_URL` + `/api/analytics/event`). This file did not mention it before. S3.3 removes it in code, never by leaving out `.env.production`, and adds a data rule to this file; until that deploy the event is live. GoatCounter stays; it sets no cookies.
  - **D20: new and changed Icelandic UI strings merge marked 'proposed'**, and [USER] checks them in one batch before the train that ships them. The first batch is due before train 1 (S1.3, the week of 2 November 2026).
  - **KEEP-01: the design principle at the top of this file is reworded** (keep the interventions; make them skippable, faded and measured), in [USER]'s approved wording of 2026-10-23. It no longer says the interventions are "backed by the testing-effect literature": the citation audit found that true of answered retrieval only.
- **S0.3, the trial merge, is measured** (`docs/plans/2026-10-23-trial-merge-measurements.md`). Merging main `62ea95e` into v1.1 `dde768e` gives one textual conflict; svelte-check is 0/0 and 863 unit tests pass; under the paged default only #249's 3 flashcard tests fail (CODE-01), and the e2e skip set equals main's on the same content. The merge is a local commit on no branch, never pushed. Its build waits for S0.4 in the worktree `~/.cache/reader-review/s03/merge/`; keep the three S0.3 worktrees until S0.4 is done. That build carries one local QA aid (`c8d71bb`): a phone reaches WSL here only over plain `http://` through a port forward, and there the browser has no `crypto.randomUUID()`, which `generateId()` calls with no fallback, so saving a recall entry failed (measured). The note has the commands and the measurements.
- **S0.5, the deploy lane, exists:** `~/dev/repos/namsbokasafn-vefur-deploy`, a clone of `main` with the live server's content and `provenance/`, copied read-only, and the main checkout's `.env.production` (so its builds still send the page-view event until S3.3). Measured there on `62ea95e`: all 2,481 chemistry files in the build have the server's sha256, the dry run would send 318 files (none under `content/`) and delete none, and the sitemap has the live 366 URLs. Every train runs from it, by the checklist in `docs/guides/deployment.md`, "The deploy lane".
- **Next, by the plan:** S0.4, [USER]'s real-phone and screen-reader QA on S0.3's build. Then M1, the accessibility quick wins; train 1 is about 6 November 2026.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-04 (late) — deploys stop changing unchanged files' ETags (#263), deployed

> ⚠️ **Superseded on one operational point — read the 2026-10-23 entry above first.** `main` now holds a merged change that is not deployed (#272). Prod still runs build `1791155794060`, and the rest of this entry stands.

Measured on 2026-10-04 against `main` = `1f14e6d` (#263) and the live site.

- **#263: `deploy.js` runs rsync with `--checksum --no-times`** (rules under Deployment). **Prod runs build `1791155794060`** (deployed ~23:21 UTC from `main` `1f14e6d` by `scripts/deploy.js`, no content sync): 314 files sent, 0 deleted; gates: sitemap 366 = 366, all 2,481 chemistry content files byte-identical to the server beforehand. Backup: `~/backups/namsbokasafn-build-2026-10-04-v1791149163717` (3,499 files, checksums identical). Nothing on `main` is undeployed.
- **Verified live:** 4 unchanged files (a figure, a chapter page, `glossary.json`, `fonts/OFL.txt`) kept their exact ETag and `Last-Modified` across the deploy, and a conditional GET of the figure answers 304; a changed page (`/efnafraedi-2e/`) got a new `Last-Modified`; 0 missing `_app` assets on the catalogue, chemistry and the three frozen books; organic 404. Worklist `sync-etag-churn` is done. ⚠️ When comparing content checksums with the server, sort both lists with `LC_ALL=C`: the two machines collate differently, and an unsorted diff looked like ~2,000 mismatches when all 2,481 files matched.
- **Scope:** `content/` and unchanged static files only. Prerendered pages still change bytes every build (SvelteKit's version is a timestamp). A `kit.version.name` derived from the git commit would make a content-only redeploy byte-stable; not decided, not on the worklist.
- **Reviewed by a 4-lens workflow** (rsync semantics against the server's own 3.2.7, HTTP caching in a real browser, mutation testing, docs). No blocker. It caught a new test that **could not fail**: the fixture wrote the build in the same wall-clock second as the deploy, and rsync's quick check compares whole seconds, so dropping `--checksum` passed. ⚠️ **A real-rsync fixture needs fixed, distinct mtimes** (`utimesSync`), not "written just now".
- **Leads for other sessions, unconfirmed:** `Skeleton.svelte:85` prerenders `width: {Math.random()}%`, a candidate for the catalogue `hydration_mismatch` (noted on `bl-catalogue-hydration`); live figures carry two `Cache-Control` headers (`max-age=86400` and `public, must-revalidate`), harmless as measured.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**

### 2026-10-04 (evening) — service-worker cache and offline download live (#260)

> ⚠️ **Superseded on the operational points — read the (late) entry above first.** Prod now runs build
> `1791155794060` (#263). Everything else here still stands.

Measured on 2026-10-04 against `main` = `99e13b4` (#260) and the live site.

- **Prod runs build `1791149163717`** (deployed ~21:28 UTC from `main` `99e13b4` by `scripts/deploy.js`, no content sync): 2,908 files sent, 1 deleted — the old workbox runtime `workbox-049f39f7.js`, replaced by `workbox-1f0b60bb.js` (the new worker uses StaleWhileRevalidate). Gates: sitemap 366 = 366; chemistry content 2,479 files byte-identical, and only the two expected differences (`toc.json`, by its new `offline` key alone, and the new `offline-manifest.json`). The previous build is backed up at `~/backups/namsbokasafn-build-2026-10-04-v1791122020354` (3,477 files, checksums identical). Nothing on `main` is undeployed.
- **What went live (#260):** figures are StaleWhileRevalidate (fresh from the SECOND view after a content deploy) instead of CacheFirst for 30 days; "download for offline" keeps the whole book (it kept 200 of chemistry's 1,147 figures while saying "Sótt") in `offline-book:<slug>`, shows the real size (~329.2 MB for chemistry) and refuses to run under an older service worker. Rules under "Service worker caching and offline download"; plan in `docs/plans/2026-10-04-sw-cache-and-offline-download.md`.
- **Verified live, in a real browser:** the new `sw.js` and `/sw-offline-book.js` (JavaScript); the active worker answers the capability check; chemistry shows "(~329.2 MB)"; frozen physics, reached client-side so the new code runs, downloads 64/64 files through the TOC fallback, reads every one offline (control: a never-downloaded chemistry figure fails offline), and "Eyða" empties its cache; 0 missing `_app` assets on frozen physics, biology, microbiology and chemistry; organic 404.
- **CI:** the whole-book download test (`e2e/offline-download.spec.ts`) passed on efni `main`'s chemistry in 32 s; the e2e job took 6m03s (tests 3.9 min). CI e2e skips stay at 31.
- ⏳ **[USER]'s QA:** a real iPad — download chemistry, flight mode, read from the open tab, and again after a week; and on a device still on the old worker, tap "Sækja" before accepting the update prompt and expect the refusal message.
- ⚠️ **Unexplained, not caused by #260 as far as measured:** the catalogue `/` logs one Svelte `hydration_mismatch` in the console (0 on the chemistry and physics book homes). #260 did not touch that page; it was not checked against the previous build.
- **Worklist follow-ups:** `sync-etag-churn` (every deploy changes every ETag, so revalidation after a deploy re-downloads each viewed file once; fixed for `content/` and unchanged static files by #263, deployed 2026-10-04 23:21 UTC; prerendered pages still change every build, see Deployment) and `bl-offline-cold-start` (a downloaded book reads offline only from an open tab).
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.** When it lifts, chemistry's offline download becomes ~1 GB until efni's recompose rasterises the heavy figures.
- **npm audit, 2026-10-04 (evening):** production tree and full tree both 0 (control: 1 critical).

### 2026-10-04 — #246–#258 merged and deployed; reader v1.1 pushed

> ⚠️ **Superseded on the operational points — read the evening entry above first.** Prod now runs
> build `1791149163717` (#260). The chemistry hold and the rest of this entry still stand.

Measured on 2026-10-04 against `main` = `9dacdca` (#258), efni `main` = `08014ad4b` and the live site.

- **Prod runs build `1791122020354`** (deployed ~13:55 UTC from `main` `9dacdca` by `scripts/deploy.js`, no content sync): 2,906 files sent, 0 deleted; sitemap 366 = 366 URLs and all 2,480 chemistry content files byte-identical to the server beforehand. Nothing on `main` is undeployed. The previous build is backed up on the server (`~/backups/namsbokasafn-build-2026-10-04-v1791112632269`, checksums verified). Verified live: version, `/kafli/00/` 200, organic 404, 0 missing assets (frozen physics included), `/prof` with no page errors, and — in a real browser — a read mark and bookmark seeded under the old §10.5 slug moved to the renamed one.
- **The first deploy that day** (build `1791112632269`, ~11:20 UTC from `03e3b32`, #246–#256) is backed up at `~/backups/namsbokasafn-build-2026-10-04-v1791030534964`. Verified live then: the four redirect stubs, one description per page, the slash-terminated sitemap, 0 missing assets on 5 pages (frozen physics and biology included), and the phone tools menu and Settings in a real browser.
- **Saved reader state follows a renamed section** (#258; rules under "A rename retires a reader URL"). Its 3 e2e tests skip in CI (CI skips 28 → 31): CI's chemistry has no active row (see the redirect bullet below) and CI never syncs physics.
- **What went live (#246–#256):** the phone fixes (the tools menu that never opened, Settings hidden below 1024px, assistive-MathML page overflow, the tools menu swallowing taps, the timer pill over the tools button) and a working ←/→ section shortcut (#246); quick wins (#248); flashcard and glossary e2e coverage (#249: those 11 tests had skipped on every run, and CI skips fell 39 → 28); the sync stamp (#250, #252; see Build Scripts); the 403 fix for `/kafli/`, `/kafli/00/`, `/svarlykill/` and `/vidauki/` (#251); SEO (#253); the "Svar:" fallback removal (#254); appendix letters up to Z and the dead cross-reference preview removed (#255); `--prune` (#256).
- ⚠️ **The next deploy's sitemap diff is normal again** (both sides now carry the trailing slash), but **no book has a sync stamp until its next sync**, so the stamp comparison in the deploy guide starts working only then.
- **Reader v1.1** (`feature/reader-v1.1` at `dde768e`, pushed, CI green): all nine automated-QA paging failures fixed, plus [USER]'s rulings of 2026-10-04: scroll past the learning objectives on arrival, chapter rollups always scroll, and "Næsta" on the last page finishes the section even when sub-sections were skipped. Next: [USER]'s human QA (real phone, real screen reader) and the remaining judgment calls. ⚠️ When `main` is next merged in, the rewritten flashcard flip test (#249) expects tap-to-flip; v1.1's predict-first cards need it adapted.
- 🔴 **Chemistry's two EXISTING redirect rows point at retired targets in efni `main`:** `10-5-fastur-efnishamur` is now `10-5-fast-efni`, and `20-3-aldehyd-keton-karboxylsyrur-og-estrar` is now `20-3-aldehyd-ketonar-karboxylsyrur-og-esterar`. CI shows it (their 8 redirect tests skip there). The at-sync redirect recompute must re-point both rows, not only add new ones.
- **efni was told** (`docs/handoffs/2026-10-04-assistive-mathml-and-image-dimensions-for-efni.md`, plus messages to the live efni session): the assistive-MathML style has no containing block, and content images carry no width/height, which is why reader v1.1 eager-loads images.
- **Still held:** the chemistry sync ([USER], 2026-09-28). 🔴 **Do not run `sync-content.js`.**
- **npm audit, 2026-10-04:** production tree and full tree both 0 (control: 1 critical).

### 2026-10-03 — organic is off the live site; main deployed; efni told

> ⚠️ **Superseded on the operational points — read the 2026-10-04 entry above first.** Prod now runs
> the 2026-10-04 build. The chemistry hold and the "do not run `sync-content.js`" rule still stand.
> The rest of this entry is accurate for its date.

Measured on 2026-10-03 against `main` = `ebea9d0` (#243), efni `main` = `0c2f06d01` and the live site.

- **Prod runs build `1791030534964`** (deployed 12:33 UTC from `main` `34e15a4`, no content sync), the first deploy since 2026-08-19 and the first through `scripts/deploy.js`. Everything merged since — #211 through #242 — is live, including the `data-en` consumer and gloss span (#224, #227), the key-terms `<dt>` gloss (#241), `content.css` (#233) and the KaTeX font removal (#214). The dry run's 212 deletions were exactly organic's 149 files and 63 KaTeX fonts; 0 from chemistry or the paused books. The 2026-08-19 build is backed up on the server (`~/backups/namsbokasafn-build-2026-08-19-v1787150207749`, verified identical).
- **Organic is off the live site.** [USER] applied the nginx withdrawal at 12:20 UTC (#234 + #239; staged by Claude as `~/organic-withdrawal/apply.sh` with a `rollback.sh`), and the deploy carried the app retirement (#240). Every item on efni's 2026-09-23 acceptance list passes: landing 404 + notice, every other organic URL 404 with headers intact, 0 in sitemap and front page, chemistry and the paused books unchanged.
- **The deploy shipped no chemistry content change** — 2,480 files byte-identical to the server, after the content-checksum gate under Deployment caught two older local files.
- **efni has been told:** `docs/handoffs/2026-10-03-organic-down-and-answers-for-efni.md` (#243). The live efni session re-measured it and recorded it in efni's register (§C190 ① done, ③ answered, ② efni's removal commit unblocked and [USER]'s call) in a local efni commit.
- **Answered by [USER] on 2026-10-03:** PDFs are to be published (#242 made the generator refuse error pages first); reader v1.1/v1.2 are still planned; re-request the Codex reviews; `<dt data-en>` (i); both Cloudflare tokens were revoked (closes the 2026-07-25 question); retire `deploy.yml` (done); show a "Vélþýtt" badge on machine-translated figures; send `Cache-Control: no-cache` on redirect stubs; `npm run format` formats only JSON/Markdown/CSS/HTML (done).
- **Chemistry release:** [USER] is waiting on a colleague to say which chapters are in active use this semester. Then either all chapters are released at once, or all but those in active use, which follow in mid-December. The second needs a way to hold back chapters at sync time.
- **Chemistry's old reviewed pages (`05-publication/faithful/`): retire them** ([USER]), on condition the clean-break backup exists. It does: efni moved the four faithful `.is.md` files aside on purpose (runbook Phase 0.4, 2026-08-23) and keeps byte-identical copies in `books/efnafraedi-2e/reference-translations/pre-remt-editorial-2026-08-23/`. The retirement is efni's, on [USER]'s go-ahead there.
- **Still held:** the chemistry sync ([USER], 2026-09-28; see the 2026-10-01 entry). 🔴 **Do not run `sync-content.js`.**
- **npm audit, 2026-10-03:** production tree and full tree both 0 (control: 1 critical).

### 2026-10-01 — prod still runs the 2026-08-19 build; both allowlisted books are on hold

> ⚠️ **Superseded on the operational points — read the 2026-10-03 entry above first.** Prod now runs
> the 2026-10-03 build, organic is off the live site, the deploy-procedure PR landed (#238) and the
> first `scripts/deploy.js` deploy has run. The chemistry hold and the "do not run `sync-content.js`"
> rule still stand. The rest of this entry is accurate for its date.

Measured on 2026-10-01 against `main` = `6a9cf5c` (#234), efni `main` = `25f8b15`, GitHub and the live site.

- **Prod runs the build of 2026-08-19** (`/_app/version.json` `1787150207749` = 2026-08-19T14:36:47Z). The 22 first-parent merges since — `516f223` #211 through `6a9cf5c` #234 — are **not live**, among them the `data-en` consumer (#224, #227), the KaTeX font removal (#214; prod still serves the fonts) and the `.smallcaps`/`.cnx-callout` rules in `content.css` (#233).
- **Organic (`lifraen-efnafraedi`) is to be withdrawn — [USER] ruling 2026-09-23 — and only organic:** the three books held back 2026-08-22 (`edlisfraedi-2e`, `liffraedi-2e`, `orverufraedi`) stay frozen as-is. #234 (nginx 404 + notice) merged 2026-09-24 but is **not applied on the server**: `/lifraen-efnafraedi/` still answers 200 with the real book. The app-side removal (retired-books carve-out, catalogue, sitemap, tests, the 3 organic redirect rows) has **not started** — organic is still in `PUBLISHED_BOOKS` and no branch exists _(done 2026-10-03, see above)_. The scope ruling has **not been relayed to efni**.
- **The chemistry sync is HELD by [USER] (2026-09-28, the ⏹ SYNC PRECONDITION in efni's register):** after efni's ② whole-book re-render, recompute the redirect rows from the final titles, land them in `sectionRedirects.ts`, then sync. 0 of the 20 rows in efni's 2026-09-27 list are on `main` — correct, because they are recomputed at sync time; that list says vefur's 2 existing chemistry rows stay correct. efni's chemistry `mt-preview` last changed 2026-09-22; a sync today would rename about 50 live chemistry section URLs with no redirects.
- **efni handoffs addressed to vefur since 2026-09-02**, in efni `docs/handoffs/`: `2026-09-05-vefur-ch03-publish-redirects.md` (its chemistry part superseded 09-17, its organic redirect edit by the 09-23 removal); the chemistry redirect handoffs `2026-09-17-vefur-chemistry-ch03-ch04-redirects.md`, `2026-09-19-vefur-chemistry-ch05-redirect.md`, `2026-09-19-vefur-chemistry-ch06-redirect.md`, `2026-09-20-vefur-chemistry-autorun-redirects.md` and `2026-09-27-vefur-chemistry-redirects-after-title-rulings.md` (all folded into the at-sync recompute); and `2026-09-23-vefur-remove-organic-and-retire-withdrawn-books.md` (scope narrowed to organic by the ruling above). ⚠️ One more sits in the **singular** `docs/handoff/`: `2026-09-02-vefur-term-english-contract.md` (vefur's half is merged, not deployed) — a glob over `docs/handoffs/` misses it.
- 🔴 **Do not run `sync-content.js`.** A bare run syncs both allowlisted books — the held chemistry and organic, which is being withdrawn — and naming either one breaks its hold; the allowlist enforces neither. _(2026-10-03: organic is now retired and refused by the sync; chemistry's hold still stands, so the rule does too.)_
- 🔴 **Do not deploy with the documented manual rsync or with `deploy.yml` until the deploy-procedure PR lands.** _(Landed as #238; the first `scripts/deploy.js` deploy ran 2026-10-03.)_ The `deploy-excludes.js` freeze has never run against prod: its only executor is `deploy.yml`, and the manual rsync in `README.md` and `docs/guides/deployment.md` omits it. `deploy.yml` has never completed a deploy, and it runs a bare sync of efni's default branch. Any `--delete` deploy removes the hashed `_app/immutable/` CSS/JS that the frozen books' kept pages still load.
  - _Once that PR lands:_ _(`deploy.yml` was retired on 2026-10-03.)_ the **manual path** is `node scripts/deploy.js` (see Deployment) — read the dry run's deletion list before `--apply`; a renamed section shows up there as a deleted page. **`deploy.yml` stays off-limits while the holds above stand:** pinning efni picks a content revision, but every run still re-syncs both allowlisted books (organic included until it leaves `PUBLISHED_BOOKS`) and applies with no dry-run stop.
- **npm audit, 2026-10-01:** production tree 0 at every severity; full tree 4 — `brace-expansion`, `devalue` and `undici` (high), `fast-uri` (moderate), all fixable. Open Dependabot PR #236 moves `devalue` and `undici`, not the other two.
- **Audit tally:** 145 items re-measured — 84 open, 38 waiting, 16 done, 7 moot — plus 46 raised by its verifiers. The working list is a private tracker, deliberately not linked from this public repo.

### 2026-09-05 — the publication hold became code, and the data-en contract landed vefur-side

> ⚠️ **Superseded on the operational points — read the 2026-10-01 entry above first.** On
> 2026-10-01 `main` was `6a9cf5c`, and #224/#227 were merged but **not deployed** — prod still
> runs the 2026-08-19 build. The "full retirement of the withheld books' live URLs" call below was
> **ruled** by [USER] on 2026-09-23: organic is to be withdrawn, the three August books stay frozen as-is.
> The gate is still SHUT (0 `termEnglish` in efni's `generate-glossary.js` and `generate-index.js`);
> the glossary figure still holds at 853/867, but efni `main`'s index is already down to 763/827
> `termEn` (chemistry 699/763). The `<dt data-en>` (i)-vs-(ii) call was ruled **(i)** on 2026-10-03.

Five merges in one session (#223–#227). `main` = `4752f22` plus #227 pending.

- **The publication hold is enforced by code** (#223) and **frozen against the deploy** (#226). Both are documented under Build Scripts; the durable trap is that #223 _armed_ the deletion #226 defuses — stopping a book being synced is not the same as protecting what is already live.
- **All three consumers of the inline gloss read `data-en`** (#224), and the **visible span + `showTermEnglish`** (#227) followed. Rules under Glossary System above.
- **The relay to efni is committed**, not messaged → `docs/handoffs/2026-09-05-data-en-consumer-shipped-for-efni.md` (#225). 🔴 **The gate efni is waiting on is still SHUT**: `tools/generate-glossary.js` and `tools/generate-index.js` both scrape the marker and neither knows `termEnglish` (0 hits each, against a control of 9 in `cnxml-render.js`). A flip today silently empties 853/867 glossary `english` values and 813/827 index `termEn` values. **Do not tell efni it is clear to retire `annotateInlineTerms`.**
- ⏳ **Still open, and both are [USER]/[LEAD] calls:** full retirement of the withheld books' live URLs (needs nginx work for real 404s — the freeze deliberately stops short), and the `<dt data-en>` (i)-vs-(ii) decision. Evidence favours (i); a comment in `renderGlosses()` marks the one selector that would change. _(Ruled (i) 2026-10-03 and built; see Glossary System.)_

**Three method lessons this session, each paid for:**

- 🔴 **A CONTROL CAUGHT MY OWN HARNESS TWICE, NOT THE CODE.** The rsync freeze proof first reported "KEPT" in _both_ arms — because `rsync` is not installed in the web container and neither arm ran. Then two of three new `textAnchor` tests passed with _and_ without the fix, asserting a round trip the unfiltered code also satisfied. **A test that cannot fail is not evidence**; run every new assertion against the pre-change tree and keep a control that passes both ways.
- ⚠️ **rsync's size+mtime quick check silently skips a transfer.** Fixture files of equal size written in the same second look un-updated. Give them different sizes.
- ⚠️ **Reading `$?` after a pipe gives you the LAST command's status.** Cost one wrong "the auditor is live" reading before it was caught — the same trap efni's register already records.

⚠️ **The Codex review bot was rate-limited on all five PRs** ("You have reached your Codex usage limits"), so none of this session's code received an automated second opinion. If that bot is treated as a gate, it did not run — the evidence is the CI runs plus the measurements in each PR body.

### 2026-08-22 — dependency queue cleared; Node floor raised; docs re-verified

- **Housekeeping (#213, #214).** Repo root went from 27 tracked entries to 21: `Screenshots/`
  (9 PNGs, 1.1 MB, unreferenced, documenting a 2025 UI) and two 2-byte `place` files deleted;
  `AUDIT-REPORT.md`, `IMPROVEMENT-PLAN.md`, `CNXML_TAG_ANALYSIS.md` and `UI_UX_IMPROVEMENT_PLAN.md`
  moved to `docs/archive/`; 60 unused KaTeX fonts removed (see Fonts above).
- **`docs/archive/` is now in `.prettierignore`.** lint-staged had reformatted the archived
  files on the way in — 118 lines in one — turning clean renames into churn and burying a
  one-line link fix. Archives exist to stop being maintained, not to start being reformatted.
- ⚠️ **`git add -A` in a `--amend` swept two unrelated things into #213**: the `tailwind-4`
  skill restructure (`.claude/skills/tailwind-4.md` → `tailwind-4/SKILL.md`) and
  `.codegraph/.gitignore`. Neither is harmful — the `.codegraph` file is a self-ignoring
  stub that is _meant_ to be tracked — but the commit message describes neither. **Stage
  explicit paths when amending.**
- ⚠️ **Prod still serves the removed KaTeX fonts** until the next deploy; the rsync's
  `--delete` clears them then. Nothing breaks meanwhile. _(Cleared by the 2026-10-03 deploy: 63
  files deleted.)_

- **Dependabot queue is empty.** #202 (lucide `^1.31.0`, production group) and #205 (dev group,
  14 updates + the Node floor) merged. ⚠️ **A `@dependabot rebase` can move the VERSION, not just
  the base** — #202 was titled 1.27→1.29 and landed **1.31.0**, so any manual verification done
  before the rebase no longer describes what merges. Re-read the head's `package.json` and re-run
  the check that justified merging.
- **Node floor is now `>=22.22.2` / `.nvmrc 22`** — see dependency rule 3. Verified before raising:
  prod runs v22.23.1, CI pins `'22'` in all four job declarations, **0 of 406** installed packages
  with an `engines.node` field exclude it (control: Node 18 is excluded by 74), and the suite was
  run at the boundary on v22.22.2 exactly.
- **CI e2e can hang ~60 min at `npx playwright install --with-deps`** (apt lock). Logs are
  unreadable mid-run but **step status is**:
  `gh api repos/<owner>/<repo>/actions/jobs/<jobId> --jq '.steps[]|"\(.status) \(.name)"'`.
  Cancel + re-run distinguishes a transient stall from a regression — the re-run cleared the same
  step in <40s.
- **Docs audited against the tree** (74-agent sweep, adversarially verified). Corrected here: the
  Node references, the `security`-job bullet (the "one unfixable advisory" claim was wrong on every
  count), and the missing section-redirects documentation.
- **`overrides` re-pinned — PR #217, merged 2026-08-23; both audits now 0 at every severity.**
  brace-expansion `^2.1.2`→`^2.1.4` and `>=5.0.8`→`^5.0.9` (the latter also adds a `<6.0.0`
  ceiling, deliberately), fast-uri `^3.1.4`→`^3.1.5`, and the **`undici` override deleted** — it
  was forcing jsdom's `^8.9.0` back down to 7.28.0, i.e. the override itself was what put the
  tree inside the advisory range. Lockfile moved exactly those four packages and nothing else
  (`typescript` and `@sveltejs/kit` verified unmoved). Exercised with lint / check / test (553
  pass) / `build` / `npm ci` from a clean tree, not just the audit. Green on the PR and on `main`
  after merge. The false "unfixable advisory" comment in `ci.yml` was rewritten; the step stays
  `continue-on-error`. See the `security`-job bullets above for the durable rules.
- ✅ **The three unexamined overrides were examined 2026-09-04 — and the defect was in a FOURTH,
  the one this entry called freshly settled.** Verdicts, each from the consumer's own declared
  range in the lockfile: `@babel/core` **deleted** (sole non-peer consumer `workbox-build`
  declares `^7.24.4`; strict no-op, version unmoved at 7.29.7); `serialize-javascript` **deleted**
  (byte-identical to `@rollup/plugin-terser`'s own `^7.0.3`; no-op); `cookie` **KEPT** — it is the
  _inverse_ of the undici defect, because `@sveltejs/kit` declares `^0.6.0` and is therefore
  **behind** the override, so deleting it would drop cookie to 0.6.x and take the audit 3 → 7.
- 🔑 **`fast-uri` was the live instance, re-pinned to `^3.1.5` on 2026-08-22 and inside advisory
  range 3.0.0–3.1.5 by 2026-09.** Its consumer `ajv` declares only `^3.0.1`, so **the override was
  what held the tree inside the range** — deleted, and it re-resolves to 3.1.7. ▶ **The durable
  lesson is not "check the three named overrides" but "pinning to today's newest version is not a
  durable fix"** — that is what created both the undici and the fast-uri instances. Re-read every
  override's consumer range whenever the audit moves; a re-pin dated last month is not evidence.
- ⚠️ **THREE books are held back from publication, not one — and the sync now enforces it.**
  Superseded 2026-09-04; the old wording named `liffraedi-2e` alone, so a session following it
  _correctly_ would avoid biology and then publish physics and microbiology. See the publication
  allowlist bullet under Build Scripts.

### 2026-08-19 — §C9 redirects shipped and DEPLOYED; the ch10 duplicate is gone from prod

- **Deployed and verified live.** `/kafli/10/10-5-fast-astand-efnis/` and
  `/kafli/20/20-3-aldehyd-ketonar-…/` now serve redirect stubs; both targets serve real
  pages. This clears the "live on namsbokasafn.is and this PR does not fix it" warning that
  stood in the 2026-07-27 entry below — efni pruned the stale ch10 page, and the sync,
  build and deploy have all happened.
- **A SECOND rename was found on the way out, and nothing warned about it.** efni's C56
  re-render (`c17bb7cf`, 2026-08-12) renamed chemistry ch20 §20.3 _and_ four physics ch04
  sections. C56 predates §C9 prune-on-rename, so no slug map was written and
  `renamesFromMap` had nothing to read. Sync, TOC and build were all green while a live,
  sitemap-listed URL was queued to 404. **PRs #208 (ch20) and #209 (physics ×4)** cover all
  five in `sectionRedirects.ts`.
- **🔑 The backstop for any rename older than §C9 is diffing the DEPLOYED `toc.json` /
  sitemap against a freshly built one — run it before every content deploy.** Stronger
  still, before _syncing_: compare vefur's published `chapters/` against efni's
  `05-publication/mt-preview/chapters/` and pair the orphans on `data-module-id` (same id
  ⇒ rename, no match ⇒ deletion). **efni structurally cannot run that check** — it cannot
  see what is deployed — so if it is not in vefur's routine it exists nowhere.
- **⏰ The physics redirects are inert until `edlisfraedi-2e` is synced** (`load` gates on
  `exactSectionExists`), which is the ordering that gives readers no 404 window. Landing
  them first was deliberate; do not reorder.
- **`sync-content.js` now passes `--delete-excluded`.** Plain `--delete` _protects_ files
  matching an `--exclude` — the pattern means "ignore this path", not "remove it" — so
  editor artifacts that arrived before `SYNC_EXCLUDES` existed survived every sync, shipped
  into `build/`, and were served publicly. Cleans a book's junk on that book's next sync
  only, so leftovers persist for books you do not sync.
- Also fixed: the Formáli back button pointed at `/kafli/00`, which is an nginx **403** (a
  real directory with no `index.html`); front matter now returns to the book home.
- ⚠️ **A bare `sync-content.js` with no book argument syncs ALL books** — it can trip
  another book's pending renames, and biology sits under an efni-side `[LEAD]` hold that
  nothing in either repo enforces. Always pass the book slug. _(Superseded 2026-09-04 by #223: a
  bare run now syncs only the allowlisted books, which enforces the 2026-08-22 hold — see Build
  Scripts.)_
- Still open, efni-side: `index.json` derives slugs from vefur's gitignored `toc.json`, so
  the subject index is structurally one sync stale (efni PR #406 fixes it); `glossary.json`
  still carries pre-review terminology for the reviewed §1.1.

### 2026-07-27 — overlay keyed on module identity (issue #197 / efni C9)

> ⚠️ **Superseded on the operational points — read the 2026-08-19 entry above first.** The ch10
> duplicate is **fixed and deployed**; efni pruned the stale page and the old URL now redirects.
> The "Remaining, vefur-side: redirects" item is **done** (`sectionRedirects.ts`, PRs #206–#209).
> The two `liffraedi-2e` ch03 renames named below **shipped**: synced 2026-07-26 and live. Their
> old URLs (`3-1-myndun-lifraenna-storsameinda`, `3-4-protein`) now answer the SPA shell — soft-404s,
> with no redirect rows (re-measured 2026-10-01). The book has been held back from publication
> since 2026-08-22 (see the publication allowlist under Build Scripts). The ch10 intro re-render
> named below is done too: the live intro links `10-5-fastur-efnishamur`. The rest of this entry is
> accurate for its date.

- **PR #200** replaces filename-keyed overlay decisions with module identity — see "The
  overlay identifies a section by MODULE ID, not filename" above. Also fixes a second, silent
  bug found on the way (a rename froze a fully-reviewed chapter's rollups and MT banner), and
  folds in `--source` → `--efni-path` forwarding. Design + plan in
  `docs/superpowers/specs/2026-07-26-overlay-module-identity-design.md` and the sibling plan.
- **⚠️ The bug was NOT hypothetical — it is live on namsbokasafn.is and this PR does not clear
  it.** `efnafraedi-2e` ch10 publishes module `m68770` twice
  (`10-5-fast-astand-efnis.html` + `10-5-fastur-efnishamur.html`). **Both are in efni's
  `mt-preview`** — a re-render corrected the title and the old file was never pruned — so no
  overlay is involved and no vefur change can adjudicate them. After this ships, a sync
  _reports_ it as an unresolved conflict; that is the intended behaviour.
- **Remaining, efni-side (⏰ before fall semester):** prune-on-rename in the render pipeline;
  delete the stale `10-5-fast-astand-efnis.html`; re-render the ch10 intro, whose
  `chapter-outline` nav points at a slug that 404s once the stale file goes.
- **Remaining, vefur-side:** redirects for renamed slugs. Deleting a superseded page 404s its
  old URL; a redirect needs an old-slug → new-slug map persisted across syncs, because after
  this fix the old filename no longer exists to derive one from. Two mt-preview→mt-preview
  renames already queued on `liffraedi-2e` ch03 argue for it independently.
- The overlay-rename path itself has **still never fired** — a dry run across all five books
  reports zero superseded pages. It fires on the first genuine Pass-1 title correction.

### 2026-07-25 — repo went public; CI restored; main green

- **Repository is PUBLIC.** Pre-publication audit + remediation done in both repos.
  History was **rewritten** on 2026-07-25 (`git-filter-repo`) to strip
  `.claude/settings.local.json`, which had carried two live Cloudflare API tokens at
  `origin/main` HEAD for ~5 months. Tokens revoked. **Any clone predating
  `20e8690` must re-clone or hard-reset** — old refs are gone:
  `git fetch origin && git reset --hard origin/main && git reflog expire --expire=now --all && git gc --prune=now`.
  Residual, accepted: ~146 GitHub `refs/pull/*` refs still carry the dead tokens —
  GitHub-owned, unremovable by us, harmless post-revocation.
- **`.claude/*.local.json` is gitignored at repo level.** Claude Code writes
  credentials into permission-allowlist strings where they don't look like secrets.
  Never rely on a global `~/.config/git/ignore` — it doesn't travel with a clone.
- **CI is green on `main`** (`security`, `lint-and-test`, `e2e`) after the billing
  outage was resolved. See the CI section above for the duration-is-the-diagnostic
  rule and the audit split.
- **Licensing corrected**: `LICENSE` / `CONTENT-LICENSE.md` no longer make a blanket
  CC BY 4.0 claim (they now carry the per-book table), credits are method-based, and
  bundled fonts have their licences shipped. See Attribution & Licensing above.
- Sister-repo state: efni is public too, `main` green except **C2** — two Playwright
  specs red since 2026-07-12 (synthetic segment IDs 404'd by the SR-OOS-2 backstop).
  Tracked in efni's follow-up campaign register; no vefur action. _(By 2026-10-01 efni `main`
  was green: Tests run 36854186194 passed both its `e2e` and `test` jobs.)_

### Earlier (June 2026)

- **`main`**: fully remediated per the June 2026 audit (`docs/code-review-2026-06.md`) — all high-severity findings closed; practice-problem tracking wired to the quiz store; CI gates `feature/**` branches. Content-pipeline overlay work also landed on main June 15–17 (faithful-on-mt-preview overlay + MT banner, rollup gating by chapter completeness / `rollups-complete` marker, long-form section-slug routing); mechanics are documented in the Build Scripts and Routing sections above.
- **`feature/reader-v1.1`** (→ v1.1.0): reader plan P0 — narrow measure default, predict-first ratings, free-recall prompt (`recall` store, `RecallPrompt`), hybrid pagination (`utils/paginate.ts`, `PagedReaderControls`, `readingMode` setting). Gated on manual QA batches D–E (`docs/manual-qa-2026-06.md`).
- **`feature/reader-v1.2`** (→ v1.2.0, after v1.1.0): reader plan P1 — Kvörðun calibration tab (`CalibrationTab`), pre-questions (`PreQuestionPrompt`), one-tap cloze cards (`utils/cloze.ts`), Atkinson Hyperlegible + theme/typography corrections. Gated on QA batch G.
- **Planned**: reader plan P2.1–P2.3 (progress label, spaced-review surfacing, recall-review tab); P3 AI tutor deferred pending classroom feedback.
- Authoritative plan/status: `docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md` (update it when the release branches merge).

## Part B — original wording of passages changed in CLAUDE.md's rule sections (2026-11-01)

Each block is the text as it stood before the trim, under the heading it sat in. The current wording is in CLAUDE.md.

### From “State Management” (old lines 55–55)

- `recall.ts`: Free-recall entries written after completing a section. On main since plan step S5.1 (ported from v1.1 `dde768e`, each entry validated, moved by section renames); nothing writes it until S5.2 ports the prompt

### From “Routing (SvelteKit file-based)” (old lines 67–67)

- `/feedback` - User feedback form

### From “Fonts” (old lines 183–191)

`client/**/*.{js,css,html,ico,png,svg,woff,woff2}`, and `static/` is copied into the client
output, so an unused font is not merely dead weight in the repo — every PWA install downloads
and stores it. 60 unused KaTeX fonts (a leftover from the pre-SvelteKit markdown reader) cost
**40 precache entries and 547 KiB** until they were removed 2026-08-22. Maths here is
pre-rendered **MathJax SVG** (`equations.ts` reads `.mathjax-display`); it needs no font files.
**Before deleting an asset you believe is unused, verify at RUNTIME with a control** — grep
cannot see a URL assembled at runtime. A Playwright probe over four pages recorded 0 requests
for them against a control of 10 real font requests; a zero with no control would only have
meant the probe was broken.

### From “Deployment” (old lines 297–297)

- 🔴 **Before a deploy WITHOUT a sync, checksum every published book's content against the server.** (The first deploy after the offline-download change shows `toc.json` changed — a new `offline` key only — and `offline-manifest.json` new: expected once; `docs/guides/deployment.md` § "Before you deploy", step 5, has the check.) On 2026-10-03 the sitemap diff passed (exactly organic's 26 URLs), yet this machine's `static/content/efnafraedi-2e/{index.json,slug-map.mt-preview.json}` were the 2026-08-18 versions while prod had been built on the server from a 2026-08-19 sync: deploying them would have reverted 5 subject-index entries to the pre-rename §20.3 title. The URL set cannot show that. Compare `sha256sum` of every shippable file under `build/content/<book>/` (editor-artifact patterns excluded) with `/var/www/namsbokasafn-vefur/build/content/<book>/` over SSH; any difference must be explained. Compare the two `sync-stamp.json` files first (a different efni `commit`, or `dirty: true` on either side, is a stop), but never instead: a hand-edited file keeps its stamp. That day the live copies were copied into local `static/content` — aligning to prod, not a sync — after which all 2,480 matched.

### From “CI — read this before trusting or blaming a red check” (old lines 302–304)

CI was **billing-blocked 2026-07-17 → 2026-07-25** (every job died in ~3s on every
branch). It is **working again**, and `main` is fully green.


### From “CI — read this before trusting or blaming a red check” (old lines 306–307)

  provisioned — no `Current runner version:` line in the log. Anything that runs for
  minutes is a real result. Check duration before diagnosing content.

### From “CI — read this before trusting or blaming a red check” (old lines 323–333)

  **But do READ the output; it is not expected to stay clean — and this file has already
  been wrong about it once.** This sentence claimed **0 at every severity** as of
  2026-08-22; by 2026-09-04 the full tree measured **3** (1 low, 2 high — `browserslist`,
  `postcss-selector-parser`, `fast-uri`) and nothing had reported it, because the
  informational step is `continue-on-error` and nobody read it. Back to **0 at every
  severity** on 2026-09-04 — and it drifted again: on 2026-10-01 the full tree had **4** (3 high:
  `brace-expansion`, `devalue`, `undici`; 1 moderate: `fast-uri`), all fixable, while the
  production tree was at 0. **Back to 0 at every severity on 2026-10-03** (control: the
  `minimist@1.2.0` project below gave 1 critical, exit 1): Dependabot #236 moved `devalue` and
  `undici`, and a lockfile-only refresh moved `brace-expansion` 2.1.4→2.1.7 / 5.0.9→5.0.12 and
  `fast-uri` 3.1.7→3.1.8 **inside** the existing overrides, with no override touched. ⚠️ **A zero is not by

### From “CI — read this before trusting or blaming a red check” (old lines 345–346)

  if the consumer has moved past the override, delete it. Re-pinned 2026-08-22:
  brace-expansion `^2.1.4` / `^5.0.9`, fast-uri `^3.1.5`, undici override **removed**.

### From “Security Headers” (old lines 406–412)

applied by hand on the server and CI never touches it, so the two drift. Measured 2026-08-22 on
the live host: **0** occurrences of `frame-src` across **10** `Content-Security-Policy` headers
(that 10 is the control proving the grep matches), so **PhET and YouTube embeds would be blocked on
namsbokasafn.is** — `default-src 'self'` catches frames when `frame-src` is absent. Re-measured
2026-10-03, after the organic withdrawal edit: still 0 `frame-src` across the 10 headers, but the gap is latent — no served page contains an embed (0
`<iframe>` across all five books); efni's only embed-bearing pages are 2 physics ch04 files, and
physics is withheld.

### From “Security Headers” (old lines 414–417)

file and test it, with the live file as the control, before staging it on the server.
Fixing it means editing all 10 blocks, because an `add_header` inside a `location` replaces the
server-level header wholesale rather than inheriting it. Verify against the server, never against
this file: `ssh <host> 'grep -c frame-src /etc/nginx/sites-available/namsbokasafn.is'`.

### From “After syncing new content” (old lines 445–445)

**`Sync complete: N succeeded, 0 failed` therefore does not cover the TOC.** Confirm the `Regenerating toc.json...` line appeared _and_ that no `Warning: Failed to regenerate` did — or check the file's mtime. Same family as the sync's conflict warnings: warn-only, exit code stays green. _(Traced 2026-08-07 during the orverufraedi delivery, after the `deleting toc.json` line was nearly treated as a reason to abort.)_

### From “Build Scripts” (old lines 521–521)

- **A bare run syncs every allowlisted book** and names the ones it skipped. 🔴 **On 2026-10-03 that is NOT safe, and no code stops it:** the one allowlisted book, `efnafraedi-2e`, is under a [USER] hold the allowlist does not encode (2026-09-28: redirect rows first, after efni's ② re-render), so run no sync at all for now. Naming a held-back book is an **error**, not a silent skip, because someone typed that slug on purpose. `--allow-withheld` overrides, loudly, for the day the hold lifts.

### From “Build Scripts” (old lines 524–524)

- 🔴 **THE DEPLOY WOULD HAVE DELETED THEM, AND THE ALLOWLIST IS WHAT MADE THAT TRUE.** Once a held-back book is no longer in the build, the deploy's `rsync --delete` removes its live pages. **`scripts/deploy-excludes.js` is the freeze** — it derives the exclude patterns that `scripts/deploy.js` passes on both deploy paths, and `--delete` _protects_ anything matching an exclude (the same mechanic `downloads/` has always relied on). The list is **derived**, never restated: the complement of the allowlist over efni's source tree **plus `KNOWN_BOOKS`** (every book `book.ts` registers; a test keeps them equal), so a book cannot be both unsynced and unprotected. The `KNOWN_BOOKS` half was added after review proved, with a real rsync, that a deploy pinned to an older efni commit — or reading a checkout where a frozen book has no rendered chapters — dropped that book from the list and deleted its live pages with exit 0. Taking a book off the server is a decision, never a side effect of one efni tree's contents. Patterns are **unanchored** (`slug/`), so one per book covers `build/<slug>/`, `build/print/<slug>/` and `build/content/<slug>/` — and keeps covering a per-book route added later. **It first ran against prod on 2026-10-03**, through `scripts/deploy.js` (the first deploy since 2026-08-19, and the first by that script): the three paused books were neither sent nor deleted, and their pages still load the 2026-08-19 build's `_app/immutable/` bundles (0 missing assets across the pages checked).

### From “Build Scripts” (old lines 526–527)

  - **Proved with a control, not from the manual:** against a fixture server holding all five books, the freeze keeps all three withheld books across pages/print/content while the two published books still update; the same rsync _without_ the list deletes all three. `scripts/deploy.test.js` now runs this kind of check under `npm test` against a real rsync, with a control arm. When you change the fixture, give files **different sizes** on each side, or rsync's size+mtime quick-check silently skips the transfer and the test proves nothing (this binds the plain `-a` control arms; the deploy arm compares checksums).
  - **The sitemap drops them only in a fresh clone.** `generate-sitemap.js` lists every `static/content` book that has a `toc.json` — there is no allowlist filter, only a retired-book one (`scripts/lib/sitemap.js`) — and the stale sweep above leaves withheld books in place, so a build from an existing checkout still advertises them. The live `sitemap.xml` (the 2026-10-03 build, made from a checkout that holds all five books) lists 27 physics, 32 biology and 35 microbiology URLs, and 0 for the retired organic. Dropping the paused books is still the intended shape of a pause — stop advertising, don't 404 — but it is not what ships today.

