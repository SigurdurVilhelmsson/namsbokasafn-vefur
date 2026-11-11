// @vitest-environment node
/**
 * `npm run dev` has its own service worker (vite.config.ts, `devOptions.enabled`): the
 * unplugin-pwa dev plugin bundles src/lib/sw/worker.ts the first time the page asks for /sw.js.
 * The SPA shell precache (`kit.spa`, the offline cold start) belongs to the build alone. In dev
 * it either threw, when no build had run yet (it reads .svelte-kit/output/client/_app/version.json),
 * or put /200.html in the precache, which the dev server answers with a 404, so the dev worker's
 * install failed and no worker ran under `npm run dev`.
 *
 * This resolves the real vite.config.ts as `vite dev` does, without starting a server, and asks
 * the dev plugin for the worker as the dev server does (its `options`, `resolveId` and `load`
 * hooks). Like `npm run dev`, it writes the dev worker to a temporary folder.
 */

import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { resolveConfig, type Plugin } from 'vite';
import { APP_SHELL_FILE, CONTENT_CACHE, OFFLINE_CAPS_MESSAGE } from './runtimeCaching';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The worker the page registers (vite.config.ts `filename`). */
const DEV_WORKER = '/sw.js';

type Hook = (this: unknown, ...args: unknown[]) => Promise<unknown>;
const handler = (hook: unknown) => (typeof hook === 'function' ? hook : (hook as { handler: Hook }).handler) as Hook;

/** The URLs in the worker's precacheAndRoute([...]) call (the first `(` followed by `[`). */
function precachedUrls(worker: string): string[] {
	const call = worker.match(/precacheAndRoute\((\[[\s\S]*?\])\s*,/);
	return call ? (JSON.parse(call[1]) as { url: string }[]).map((entry) => entry.url) : [];
}

describe('the dev service worker (npm run dev)', () => {
	it('is built from the worker source, with its routes, and without the SPA shell', async () => {
		const config = await resolveConfig(
			{ configFile: `${ROOT}vite.config.ts`, logLevel: 'silent' },
			'serve',
			'development'
		);
		const dev = config.plugins.find((p: Plugin) => p.name === 'unplugin-pwa:dev');
		expect(dev, 'the unplugin-pwa dev plugin').toBeDefined();

		await handler(dev!.options).call({}, {});
		const id = await handler(dev!.resolveId).call({}, DEV_WORKER);
		expect(id).toBe(DEV_WORKER);
		// Throws ENOENT on .svelte-kit/output/client/_app/version.json when `kit.spa` reaches
		// the dev worker and no build has run.
		const worker = (await handler(dev!.load).call({}, id)) as string;

		expect(worker).toContain(`"${CONTENT_CACHE}"`);
		expect(worker).toContain(`"${OFFLINE_CAPS_MESSAGE}"`);
		// The dev server has no /200.html (it answers 308, then 404), so a precached shell fails
		// the install. The page-load route still names it: with nothing precached its fallback
		// finds nothing, as with no route.
		const precached = precachedUrls(worker);
		expect(precached.length, 'the precache list was read').toBeGreaterThan(0);
		expect(precached).not.toContain(APP_SHELL_FILE);
	}, 120_000);
});
