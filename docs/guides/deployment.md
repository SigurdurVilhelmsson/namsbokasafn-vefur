# Deployment

The production site is a static build served by nginx on a Linode Ubuntu
server. There are two ways to deploy; both end with the same rsync into
`/var/www/namsbokasafn-vefur/build`.

| Method                                  | When                                    |
| --------------------------------------- | --------------------------------------- |
| **GitHub Actions** (`deploy.yml`)       | Normal releases — works from any device |
| **Manual rsync** from a trusted machine | Fallback, or when GitHub is unavailable |

**CI (`ci.yml`) never deploys** — it only verifies pushes and PRs. The
deploy workflow runs on two triggers only:

- **Manual:** Actions → Deploy → "Run workflow" (pick the branch — `main`
  for production releases). Works from a phone.
- **Release tag:** pushing a tag like `v1.1.0` deploys that tag.

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

### 3. Verify

Run Actions → Deploy → "Run workflow" on `main`, approve it, and check the
run log ends with "Deployed <sha>". Because of the forced command, even a
leaked key could only overwrite the static build directory — and the site
is restored by simply re-running the deploy.

## Release flow

1. Merge the release PR (e.g. `feature/reader-v1.1` → `main` with the
   version bump and CHANGELOG entry).
2. Tag and push: `git tag v1.1.0 && git push origin v1.1.0` — the deploy
   runs automatically (and waits for approval if configured).
3. If the release includes nginx changes, apply them on the server in the
   same window (see below) — the workflow does not touch nginx.

## Manual deployment (fallback)

```bash
npm run build
rsync -avz --delete build/ siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/
```

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
