// @vitest-environment node
/**
 * `npm run dev` has its own service worker (vite.config.ts, `devOptions.enabled`):
 * vite-plugin-pwa writes dev-dist/sw.js from the same SvelteKitPWA options the first
 * time the page asks for /dev-sw.js?dev-sw. The SPA shell precache (`kit.spa`, the
 * offline cold start) belongs to the build alone. In dev it either threw, when no
 * build had run yet (it reads .svelte-kit/output/client/_app/version.json), or put
 * /200.html in the precache, which the dev server answers with a 404, so the dev
 * worker's install failed and no worker ran under `npm run dev`.
 *
 * This resolves the real vite.config.ts as `vite dev` does, without starting a
 * server, and asks for the dev worker as the browser does. Like `npm run dev`, it
 * writes dev-dist/ (gitignored).
 */

import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { resolveConfig, type Plugin } from 'vite';
import { APP_SHELL_FILE } from './runtimeCaching';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The request PWAUpdater's registration makes in dev (vite-plugin-pwa's DEV_SW_NAME). */
const DEV_WORKER_ID = '/dev-sw.js?dev-sw';

type LoadHook = (this: unknown, id: string) => Promise<string | undefined>;

/** The worker's precache list; workbox leaves the call out when it is empty. */
function precachedUrls(worker: string): string[] {
	const call = worker.match(/precacheAndRoute\((\[[\s\S]*?\])\s*,/);
	return call ? (JSON.parse(call[1]) as { url: string }[]).map((e) => e.url) : [];
}

describe('the dev service worker (npm run dev)', () => {
	it('is generated with the runtime routes and without the SPA shell', async () => {
		const config = await resolveConfig(
			{ configFile: `${ROOT}vite.config.ts`, logLevel: 'silent' },
			'serve',
			'development'
		);
		const devPlugin = config.plugins.find((p: Plugin) => p.name === 'vite-plugin-pwa:dev-sw');
		expect(devPlugin, 'vite-plugin-pwa dev plugin').toBeDefined();
		const hook = devPlugin!.load as unknown as LoadHook | { handler: LoadHook };
		const load = typeof hook === 'function' ? hook : hook.handler;

		// Throws ENOENT on .svelte-kit/output/client/_app/version.json when `kit.spa`
		// reaches the dev worker and no build has run.
		const worker = await load.call({}, DEV_WORKER_ID);

		expect(worker).toContain('"cacheName": "book-content"');
		// The dev server has no /200.html (it answers 308, then 404), so a precached
		// shell fails the install. The navigation route may still name it: with nothing
		// precached its fallback finds nothing, as with no route.
		expect(precachedUrls(worker!)).not.toContain(APP_SHELL_FILE);
	});
});
