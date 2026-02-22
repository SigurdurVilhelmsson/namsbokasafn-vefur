# Deployment

Deployment is handled by GitHub Actions CI. See [`.github/workflows/`](../../.github/workflows/) for the workflow configuration.

## How it works

On push to `main`:

1. Checks out this repo and `namsbokasafn-efni` (content repo)
2. Syncs content via `sync-content.js`
3. Runs lint, type-check, and unit tests
4. Builds with content validation (`@sveltejs/adapter-static`)
5. Runs Playwright E2E tests
6. Deploys static output to `/var/www/namsbokasafn-vefur/build` on the production server

## Manual deployment

```bash
npm run build
rsync -avz --delete build/ siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/
```

## Server details

- **Server:** Linode Ubuntu
- **Domain:** `namsbokasafn.is`
- **Nginx config:** `/etc/nginx/sites-available/namsbokasafn.is` (see `nginx-config-example.conf` in repo root)
- **SSL:** Let's Encrypt via certbot (auto-renewal)
- **No backend** — all state is client-side in localStorage

## Legacy reference

The original manual deployment guide (pre-CI, pre-SvelteKit migration) is archived at [`docs/archive/deployment-legacy.md`](../archive/deployment-legacy.md).
