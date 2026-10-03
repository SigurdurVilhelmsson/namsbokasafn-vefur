# Deployment

The production site is a static build served by nginx on a Linode Ubuntu
server. There are two ways to deploy; both run the same command,
`scripts/deploy.js`, which rsyncs the build into
`/var/www/namsbokasafn-vefur/build`.

| Method                                                         | When                                    |
| -------------------------------------------------------------- | --------------------------------------- |
| **GitHub Actions** (`deploy.yml`)                              | Normal releases — works from any device |
| **Manual deploy** (`scripts/deploy.js`) from a trusted machine | Fallback, or when GitHub is unavailable |

**CI (`ci.yml`) never deploys** — it only verifies pushes and PRs. The
deploy workflow runs on two triggers only:

- **Manual:** Actions → Deploy → "Run workflow" (pick the branch — `main`
  for production releases — and give the full SHA of the efni commit whose
  content to publish). Works from a phone.
- **Release tag:** pushing a tag like `v1.1.0` deploys that tag, with the efni
  commit in the `EFNI_PUBLISHED_REF` variable.

The workflow never publishes efni's default branch: with neither an efni SHA
nor `EFNI_PUBLISHED_REF` it stops before building. efni's `main` can be ahead
of what should go live (renamed pages whose redirects have not landed).

⚠️ The SHA picks a content **revision**, not which books: every run re-syncs
every book on the publication allowlist at that revision, then deploys with no
dry-run stop. While a book is under a hold (see `CLAUDE.md`, Current
Development Status), don't run the workflow. Nothing yet records which efni
commit the live content came from, so there is no known-safe SHA to pin
instead.

The workflow re-verifies the exact commit it ships (lint, type-check, unit
tests, build with content validation) before rsyncing, so what was tested
is byte-for-byte what goes live.

## One-time setup

### 1. On the server: a key that can only write the build directory

The deploy key is useless for anything except syncing the build output —
no shell, no other paths. As your normal user on the Linode:

```bash
# rrsync ships with rsync; put it on PATH if it isn't already
which rrsync || sudo sh -c 'gzip -dc /usr/share/doc/rsync/scripts/rrsync.gz > /usr/local/bin/rrsync && chmod +x /usr/local/bin/rrsync'

# Generate the deploy keypair (no passphrase; it lives only in GitHub)
ssh-keygen -t ed25519 -f ~/deploy_key -N '' -C 'github-deploy namsbokasafn-vefur'

# Authorize the PUBLIC key with a forced command locked to the build dir.
# "restrict" disables port/agent/X11 forwarding and PTY allocation.
echo "command=\"$(which rrsync || echo /usr/local/bin/rrsync) /var/www/namsbokasafn-vefur/build\",restrict $(cat ~/deploy_key.pub)" >> ~/.ssh/authorized_keys
```

Copy the contents of `~/deploy_key` (the private key) for step 2, then
delete both files from the server:

```bash
cat ~/deploy_key        # copy this into the GitHub secret
rm ~/deploy_key ~/deploy_key.pub
```

### 2. On GitHub: a protected `production` environment

Repo → Settings → Environments → New environment → `production`.
Recommended: add yourself under **Required reviewers**, so every deploy
(even tag-triggered) waits for your approval click.

In that environment add:

- **Secret** `DEPLOY_SSH_KEY` — the private key from step 1 (the whole
  file, including the BEGIN/END lines).

Repo → Settings → Secrets and variables → Actions → **Variables** tab:

- `DEPLOY_USER` — the server user the key was authorized for (e.g. `siggi`)
- `DEPLOY_HOST` — `kvenno.app`
- `DEPLOY_KNOWN_HOSTS` — the server's host keys, captured from your own
  machine (NOT generated inside the workflow, so a network MITM can't
  substitute a host): run `ssh-keyscan kvenno.app` and paste the output.
- `EFNI_PUBLISHED_REF` — the full 40-character SHA of the efni commit whose
  content tag runs publish. Change it only when you mean to release new
  content. Manual runs take the SHA as an input instead.

### 3. Verify

Only when no book is under a hold (see the warning above): run Actions → Deploy
→ "Run workflow" on `main` with the efni SHA, approve it, and check the run log
ends with "Deployed <sha>". Because of the forced command, even a
leaked key could only overwrite the static build directory — and the site
is restored by simply re-running the deploy.

## Release flow

1. Merge the release PR (e.g. `feature/reader-v1.1` → `main` with the
   version bump and CHANGELOG entry).
2. Tag and push: `git tag v1.1.0 && git push origin v1.1.0` — the deploy
   runs automatically (and waits for approval if configured). It publishes the
   efni commit in `EFNI_PUBLISHED_REF`; update that first if the release
   should carry new content.
3. If the release includes nginx changes, apply them on the server in the
   same window (see below) — the workflow does not touch nginx.

## Manual deployment (fallback)

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
