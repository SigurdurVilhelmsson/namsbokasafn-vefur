# Deployment

The production site is a static build served by nginx on a Linode Ubuntu
server. Deploys are **manual**, from a machine with SSH access to the server,
with one command, `scripts/deploy.js`, which rsyncs the build into
`/var/www/namsbokasafn-vefur/build`.

**CI (`ci.yml`) never deploys**; it only verifies pushes and PRs. The GitHub
Deploy workflow (`deploy.yml`) was **retired on 2026-10-03**. It never completed
a deploy (0 successful runs of 313; no deploy key or secrets were ever set up),
and every run would have re-synced every allowlisted book with no dry-run stop.

## Before you deploy

The 2026-10-03 deploy followed these steps; keep to them.

1. **Build** with `npm run build`. Sync content first only if you mean to
   publish new content (`node scripts/sync-content.js --source ../namsbokasafn-efni <book>`,
   and only when no hold stands; see `CLAUDE.md`, Current Development Status).
2. **Back up the live build** on the server, so it can be restored with one rsync:
   `cp -a /var/www/namsbokasafn-vefur/build ~/backups/namsbokasafn-build-<date>-v<version>`,
   then compare file counts and checksums with the live copy.
3. **Dry run** `scripts/deploy.js` (below) and read every deleted path.
4. **Diff the sitemaps**: `curl -s https://namsbokasafn.is/sitemap.xml` against
   `build/sitemap.xml`. Any URL that disappears must be expected.
5. **Without a sync, checksum the content too.** Compare `sha256sum` of every
   file under `build/content/<book>/` (editor backups excluded) with the server's
   copy. The sitemap cannot see content changes: on 2026-10-03 two local files
   were older than the live ones and would have rolled back a fix.
   Start with the sync stamp: `curl -s https://namsbokasafn.is/content/<book>/sync-stamp.json`
   against `build/content/<book>/sync-stamp.json`. A different efni `commit` means
   different content, so stop and find out why. The stamp does not replace the checksum:
   files edited by hand after a sync keep the same stamp. Books synced before
   2026-10-04 have no stamp until their next sync.
6. **Deploy** with `--apply`, then check `/_app/version.json` and the pages
   you changed.

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

⚠️ Do not deploy with a hand-written rsync. The rules only work when passed
with `--filter='merge FILE'` (an `--exclude-from` file silently ignores the `P`
rule, and the old assets are deleted), and `--delete-excluded` would delete
exactly what the excludes keep.

### Refreshing the PDFs

PDFs are regenerated only when content changes warrant it (needs Chromium;
set `PDF_CHROMIUM_PATH` to use a system browser):

```bash
npm run build:full       # pdfs + build
rsync -avz build/downloads/ siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/downloads/
```

Both deploy paths go through `scripts/deploy.js`, which excludes `downloads/`
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
