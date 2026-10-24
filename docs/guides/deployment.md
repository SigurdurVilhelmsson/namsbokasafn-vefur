# Deployment

The production site is a static build served by nginx on a Linode Ubuntu
server. Deploys are **manual**, from a machine with SSH access to the server,
with one command, `scripts/deploy.js`, which rsyncs the build into
`/var/www/namsbokasafn-vefur/build`.

**CI (`ci.yml`) never deploys**; it only verifies pushes and PRs. The GitHub
Deploy workflow (`deploy.yml`) was **retired on 2026-10-03**. It never completed
a deploy (0 successful runs of 313; no deploy key or secrets were ever set up),
and every run would have re-synced every allowlisted book with no dry-run stop.

## The deploy lane: where every train runs

Since 2026-10-23 (plan step S0.5 of the reader review) every deploy of new
code runs from a **deploy lane**: a second clone of `main`, kept only for
deploying, whose `static/content/` is a copy of the live server's. Never deploy
from the main working checkout: its content is whatever was last synced there
for other work (on 2026-10-23, efni's ② preview), and a deploy would publish
it. Nothing is edited in the lane. It only pulls `main`.

- **Where:** `~/dev/repos/namsbokasafn-vefur-deploy`, beside the efni
  checkout, so `scripts/deploy.js` finds `../namsbokasafn-efni` with no
  `--source`.
- **Its content:** the four live books (`efnafraedi-2e` and the three frozen
  books) and `provenance/`, copied from the server's
  `/var/www/namsbokasafn-vefur/build/`. It is the server's content, so a deploy
  from the lane sends no content.
- **Its `.env.production`:** copied from the main checkout, so builds from the
  lane send the page-view event until decision D03's step (S3.3) removes it in
  code.
- **No sync runs in the lane.** A deploy from the lane publishes no new content,
  and a sync run in another checkout never reaches it (`sync-content.js` writes
  to its own checkout's `static/content`). Publishing new content has no written
  procedure yet: write one before the chemistry hold lifts (see `CLAUDE.md`,
  Current Development Status).

It was made like this (the two rsync calls only read from the server):

```bash
git clone git@github.com:SigurdurVilhelmsson/namsbokasafn-vefur ~/dev/repos/namsbokasafn-vefur-deploy
cd ~/dev/repos/namsbokasafn-vefur-deploy
npm ci
rsync -a siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/content/ static/content/
rsync -a siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/provenance/ static/provenance/
cp ../namsbokasafn-vefur/.env.production .
```

Measured on 2026-10-23, building `main` at `62ea95e` in the lane:

- All 2,481 chemistry files in `build/content/efnafraedi-2e/` have the
  server's sha256.
- The dry run would send 318 files and delete none. They are prerendered pages,
  `_app/` files, `sw.js`, `sitemap.xml` and #272's `styles/print.css`, and none
  is under `content/`.
- The sitemap has the live site's 366 URLs and differs only in `<lastmod>`.

As a control, the main checkout's chemistry (the ② preview) differed from the
server in 1,894 lines of the same checksum comparison.

### The checklist for a train

Run every step in the lane. Any difference you cannot explain stops the
deploy.

1. **Update and build:**

   ```bash
   cd ~/dev/repos/namsbokasafn-vefur-deploy
   git pull --ff-only
   npm ci
   npm run build
   ```

2. **Check that no UI text waits for its check** (decision D20). New or changed
   Icelandic strings merge marked `D20: proposed` and are checked as one batch
   before the train that ships them:

   ```bash
   git grep -n -A4 'D20: proposed' -- src; s=$?; if [ $s -eq 1 ]; then echo "no proposed strings"; else echo "STOP: strings marked 'D20: proposed' are unchecked, or git grep failed (status $s)"; fi
   ```

   Only `no proposed strings` passes. On `STOP`, check the listed strings as one
   batch, land any corrections and the markers' removal as a PR to main, then
   pull the lane again (never edit the lane).

3. **Compare the sync stamps** of each published book (`PUBLISHED_BOOKS` in
   `scripts/lib/published-books.js`; today `efnafraedi-2e` alone):

   ```bash
   curl -fsS https://namsbokasafn.is/content/efnafraedi-2e/sync-stamp.json
   cat build/content/efnafraedi-2e/sync-stamp.json
   ```

   On 2026-10-23 neither side has one (curl reports a 404 and the file is
   missing), so go straight to the checksums. Once both have one, a different
   efni `commit`, or `dirty: true` on either side, is a stop.

4. **Compare the published book's checksums** with the server's: every file
   except editor backups, with both lists sorted the same way. `LC_ALL=C`
   matters, because the server and this machine sort differently.

   ```bash
   book=efnafraedi-2e
   out=~/.cache/deploy-check && mkdir -p $out
   list='find . -type f ! -name .DS_Store ! -name "*.bak" ! -name "*~" ! -name "*.backup.*" ! -name "*.pre-fix-*" ! -name "*.orig" -print0 | LC_ALL=C sort -z | xargs -0 sha256sum'
   ssh siggi@kvenno.app "cd /var/www/namsbokasafn-vefur/build/content/$book && $list" > $out/live-$book.sha256
   (cd build/content/$book && eval "$list") > $out/lane-$book.sha256
   if [ -s $out/live-$book.sha256 ] && diff $out/live-$book.sha256 $out/lane-$book.sha256; then echo "all $(wc -l < $out/live-$book.sha256) files match"; else echo "STOP: the lists differ or are empty"; fi
   ```

   Only `all N files match` passes, with N the book's file count (2,481 for
   chemistry on 2026-10-23). `STOP`, any line from `diff`, or a `cd:` or
   `syntax error` line stops the deploy.

   Do not compare the frozen books. The deploy never sends them, and the build
   adds an `offline` key to each one's `toc.json` and writes an
   `offline-manifest.json` beside it, so they differ from the server by design.

5. **Dry run, and read it:**

   ```bash
   node scripts/deploy.js --target siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/ && echo "dry run complete"
   ```

   A dry run that reached the server ends with its summary line,
   `N files would be transferred, M would be deleted.`, and then
   `dry run complete`. Every build sends its prerendered pages and `_app/`
   files again, so N is never 0 (318 on 2026-10-23, 320 for train 1 on
   2026-10-24). If `dry run complete` is
   missing, or an `ssh:` or `rsync` error line or `rsync exited with status`
   appears, the dry run did not finish and its deletion count means nothing:
   stop, fix the cause and run it again.

   Then read every deleted path. A code-only train deletes only files that a
   merged PR removed from the build, and each one must be traced to its PR. Two
   kinds have happened: 63 KaTeX font files (2026-10-03, #214), and the
   service worker's runtime, which gets a new name whenever its code changes
   (`workbox-049f39f7.js` replaced by `workbox-1f0b60bb.js` on 2026-10-04,
   #260). A deleted page under a book, or any path under `content/`, stops the
   deploy: a renamed section shows up here as a deleted page.

   Then compare the sitemap's URLs with the live ones. Any URL that appears or
   disappears must be expected; a count alone would miss a URL that changes
   form (#253 changed 365 of 366 and the count stayed 366):

   ```bash
   diff <(curl -fsS https://namsbokasafn.is/sitemap.xml | grep -o '<loc>[^<]*' | LC_ALL=C sort) <(grep -o '<loc>[^<]*' build/sitemap.xml | LC_ALL=C sort) && echo "same $(grep -o '<loc>' build/sitemap.xml | wc -l) URLs"
   ```

   Expect `same N URLs`, with N the live count (366 on 2026-10-23).

6. **Back up the live build** on the server, then check the copy. The script
   runs on the server and writes only into `~/backups` there:

   ```bash
   ssh siggi@kvenno.app 'bash -s' < scripts/backup-live-build.sh
   ```

   Only `the backup matches the live build: <folder>` passes. The folder's name
   holds the date and the version of the live build it copies. To roll back,
   copy that folder over `/var/www/namsbokasafn-vefur/build` with one rsync,
   run on the server. Keep the trailing slash on the folder, or the backup lands
   inside `build/`, and add `-n` first to see what it would copy:

   ```bash
   ssh siggi@kvenno.app 'rsync -a ~/backups/<folder>/ /var/www/namsbokasafn-vefur/build/'
   ```

   Files the train added (new hashed `_app/` files) stay behind, unused. After
   train 1 the `-n` run would have copied back 304 files and deleted none.

7. **Deploy:** the same `deploy.js` command with `--apply`.

8. **Check the live site.** The version must equal the lane's build, every
   `/_app/immutable/` file that chemistry's and the frozen books' pages name
   must load, and organic must still answer 404:

   ```bash
   curl -fsS https://namsbokasafn.is/_app/version.json; echo; cat build/_app/version.json; echo
   site=https://namsbokasafn.is
   shell=$(curl -fsS "$site/200.html") || echo "STOP: /200.html did not load"
   for page in / /efnafraedi-2e/ /efnafraedi-2e/kafli/01/1-1-efnafraedi-i-samhengi/ /edlisfraedi-2e/ /liffraedi-2e/ /orverufraedi/; do
     if ! html=$(curl -fsS "$site$page"); then echo "$page: STOP, the page did not load"; continue; fi
     if [ "$html" = "$shell" ]; then echo "$page: STOP, only the app shell answered, so the page is gone"; continue; fi
     n=0; bad=0
     for a in $(printf '%s\n' "$html" | grep -oE "/_app/immutable/[^\"' )]+" | sort -u); do
       n=$((n + 1))
       [ "$(curl -s -o /dev/null -w '%{http_code}' "$site$a")" = 200 ] || { bad=$((bad + 1)); echo "  missing: $a"; }
     done
     echo "$page: $n files checked, $bad missing"
   done
   curl -s -o /dev/null -w 'organic: %{http_code} (must be 404)\n' "$site/lifraen-efnafraedi/"
   ```

   Each page must print `N files checked, 0 missing` with N above 20. On
   2026-10-23, before any deploy from the lane, the six pages checked 26 to 41
   files each, 0 missing, and organic answered 404. The controls work: a
   made-up `/_app/immutable/` path answers 404, and a page that does not exist
   prints the `STOP` line for the app shell. The check sees only the files each
   page's HTML names, not the ones the app loads later.

## Before you deploy

The 2026-10-03 deploy followed these steps; keep to them. For a train, the
lane checklist above puts them in order, with a runnable command for each
(step 2's backup is its step 6).

1. **Build** with `npm run build`. Sync content first only if you mean to
   publish new content (`node scripts/sync-content.js --source ../namsbokasafn-efni <book>`,
   and only when no hold stands; see `CLAUDE.md`, Current Development Status).
2. **Back up the live build** on the server, so it can be restored with one rsync:
   `cp -a /var/www/namsbokasafn-vefur/build ~/backups/namsbokasafn-build-<date>-v<version>`,
   then compare file counts and checksums with the live copy.
3. **Dry run** `scripts/deploy.js` (below) and read every deleted path.
4. **Diff the sitemaps**: `curl -s https://namsbokasafn.is/sitemap.xml` against
   `build/sitemap.xml`. Any URL that disappears must be expected. The sitemap lists
   every URL with its trailing slash since 2026-10-04 (it lacked them before), so the
   first deploy after that shows every URL changed: compare with the slashes stripped,
   e.g. `grep -o '<loc>[^<]*' | sed 's#/$##' | sort` on both sides.
5. **Without a sync, checksum the content too.** Compare `sha256sum` of every
   file under `build/content/<book>/` (editor backups excluded) with the server's
   copy. The sitemap cannot see content changes: on 2026-10-03 two local files
   were older than the live ones and would have rolled back a fix.
   Start with the sync stamp: `curl -fsS https://namsbokasafn.is/content/<book>/sync-stamp.json`
   (`-f`, so a missing stamp is an error, not nginx's 404 page) against
   `build/content/<book>/sync-stamp.json`. A different efni `commit`, or `dirty: true`
   on either side, means different content, so stop and find out why. The stamp does
   not replace the checksum: files edited by hand after a sync keep the same stamp.
   Content synced by a `sync-content.js` that predates the stamp has none, and nor
   does a withheld book while it is frozen; a missing stamp on either side shows up in
   the checksum.
   **The first deploy after the offline-download change** (`fix/sw-cache-offline-download`)
   shows every published book's `toc.json` changed and `offline-manifest.json` new.
   Both are written by `process-content.js`, not by a sync. Check that `toc.json`
   differs only by its new `offline` key:
   `curl -fsS https://namsbokasafn.is/content/<book>/toc.json -o /tmp/live-toc.json`, then
   `node -e "const f=(p)=>{const t=JSON.parse(require('fs').readFileSync(p,'utf8'));delete t.offline;return JSON.stringify(t)};console.log(f(process.argv[1])===f(process.argv[2])?'same apart from offline':'DIFFERENT')" build/content/<book>/toc.json /tmp/live-toc.json`.
6. **Deploy** with `--apply`, then check `/_app/version.json` and the pages
   you changed.
   A reader gets a new service worker only after accepting the update prompt, and a
   figure re-rendered under the same name shows its OLD bytes on the first view after
   that (StaleWhileRevalidate), the new ones from the second. Seeing the old figure
   once right after a content deploy is expected, not a failed deploy.

## Running the deploy

```bash
npm run build

# Dry run: prints the build date, the rules, and every file it would delete.
# Changes nothing.
node scripts/deploy.js --target siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/

# Read the deletions, then deploy for real
node scripts/deploy.js --target siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/ --apply
```

On the server itself, a local path works as the target
(`--target /var/www/namsbokasafn-vefur/build/`). SSH options go in rsync's own
`RSYNC_RSH` variable.

The script needs the efni checkout (`../namsbokasafn-efni`, or `--source`), and
refuses to run if it holds no books: the list of books to protect is derived
from it, plus every book vefur registers, so a frozen book stays protected even
when that efni checkout lacks it (the run prints a warning). It also refuses if
the build has no content for a book the allowlist publishes, since deploying
would delete that live book. It hands rsync these rules, and prints them on
every run:

- `P /_app/immutable/**` — keeps the hashed CSS/JS of earlier builds on the
  server while the new build's files upload. The frozen books' pages are never
  rebuilt, so they keep loading the assets of the build they were deployed
  with; nginx answers a missing one with 404. Old assets therefore pile up in
  `_app/immutable/` by design.
- `- downloads/` — `npm run build` does **not** generate the per-book PDFs
  (`static/downloads/` is gitignored and only produced by `npm run pdfs`), so
  without the exclude `--delete` would remove any PDFs on the server.
- `- <book>/` for every book the publication allowlist holds back: neither sent
  nor deleted, so the paused books stay live as they are.
- `H <book>/` for every **retired** book (`RETIRED_BOOKS` in
  `scripts/lib/published-books.js`; today `lifraen-efnafraedi`): never sent,
  although a build copies a local `static/content` copy into `build/content/`,
  and the server's copy is **deleted** on every surface. The dry run says so
  and lists those deletions; they are expected. Apply the nginx "Withdrawn
  book" blocks **before** the first deploy that carries a new retirement, or
  the deleted URLs answer 200 with the SPA shell instead of 404.
- `H *.backup.*` and the other editor-artifact patterns: never sent, although a
  build copies them out of `static/content`. They are hide rules, not
  excludes, so a copy already on the server is deleted — except inside a frozen
  book, `downloads/` or `_app/immutable/`, which the rules above leave as they
  are.

It sends a file only when its **bytes** differ from the server's copy
(`--checksum`), and never copies modification times (`--no-times`); the two
only work together. nginx builds each file's ETag and `Last-Modified` from its
mtime, and every build stamps every file with the build time, so before this
every deploy gave every file on the server a new mtime and a new ETag. Of the
2,908 files the old flags send for a fresh build of the 2026-10-04 commit, only
314 differ in bytes, and none of them is under `content/`. Now an unchanged
file keeps its mtime and its ETag, so a reader's next revalidation of it is a
304 instead of a full download, as long as the browser's HTTP cache still holds
it. **Prerendered pages are not covered:** their bytes change on every build
(they reference the new hashed `_app/` bundles, because SvelteKit's version is
a timestamp), so a page still downloads in full once after each deploy.

So **the dry run's transfer count is a real diff**: a deploy with no content
change sends nothing under `content/`, only prerendered pages, `_app/` files
and `sw.js` (314 files on 2026-10-04). The script warns if an unchanged file
would still get a new mtime, which would mean the flags have drifted. After
such a deploy, `curl -sI` an unchanged figure: `last-modified` must not have
moved. The count still does not say which side is newer: the checksum stays
(step 5 of "Before you deploy", step 4 of the lane checklist).

⚠️ Do not deploy with a hand-written rsync. The rules only work when passed
with `--filter='merge FILE'` (an `--exclude-from` file silently ignores the `P`
rule, and the old assets are deleted), and `--delete-excluded` would delete
exactly what the excludes keep. A plain `-a` would also bring back the ETag
churn above.

### Refreshing the PDFs

PDFs are regenerated only when content changes warrant it (needs Chromium;
set `PDF_CHROMIUM_PATH` to use a system browser):

```bash
npm run build:full       # pdfs + build
rsync -az --no-times --checksum build/downloads/ siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/downloads/
```

Every deploy goes through `scripts/deploy.js`, which excludes `downloads/`
and therefore never touches `/downloads/` — PDF refreshes are always this
manual step.

## Server details (manual, root-only — never automated)

- **Server:** Linode Ubuntu
- **Domain:** `namsbokasafn.is`
- **Nginx config:** `/etc/nginx/sites-available/namsbokasafn.is` — keep in
  sync with `nginx-config-example.conf` in the repo root; after editing:
  `sudo nginx -t && sudo systemctl reload nginx`
- **SSL:** Let's Encrypt via certbot (auto-renewal)
- **No backend** — all state is client-side in localStorage

## Legacy reference

The original manual deployment guide (pre-CI, pre-SvelteKit migration) is archived at [`docs/archive/deployment-legacy.md`](../archive/deployment-legacy.md).
