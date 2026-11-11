/**
 * "Uppfæra núna" on a built site: a reader whose worker controls the page gets a new
 * build, sees the prompt, presses it, and the new worker takes over.
 *
 * The site is served from `build/` by a small server that answers as nginx does
 * (helpers/static-site-server.ts), not by the shared preview server, so changing
 * sw.js here reaches no other test. The "new build" is the same build with the app
 * shell's precache revision changed, which is what every real deploy changes
 * (`kit.spa`'s revision is the md5 of `_app/version.json`).
 *
 * PWA_UPDATE_BUILD=<dir> runs it against another build (e.g. a kit 2 build, as a
 * control); it defaults to this checkout's `build/`.
 */
import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticSite, type StaticSiteServer } from './helpers/static-site-server';
import { openControlled } from './helpers/service-worker';

const BUILD = process.env.PWA_UPDATE_BUILD ?? join(process.cwd(), 'build');
/** The shell's precache entry, in generateSW's minified form or buildSW's JSON form */
const SHELL_ENTRY = /(\{\s*"?url"?:\s*"200\.html",\s*"?revision"?:\s*")([0-9a-f]{32})(")/;

/** The precache revisions stored for /200.html, read from Cache Storage */
async function shellRevisions(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		const found: string[] = [];
		for (const name of await caches.keys()) {
			if (!name.includes('precache')) continue;
			for (const req of await (await caches.open(name)).keys()) {
				const url = new URL(req.url);
				if (url.pathname === '/200.html') found.push(url.searchParams.get('__WB_REVISION__') ?? '');
			}
		}
		return found;
	});
}

/** null while the page is between documents (the update reloads it) */
async function workerState(page: Page) {
	return page
		.evaluate(async () => {
			const reg = await navigator.serviceWorker.getRegistration();
			return {
				waiting: !!reg?.waiting,
				controlled: !!navigator.serviceWorker.controller,
				reloaded: !(window as unknown as { __beforeUpdate?: boolean }).__beforeUpdate
			};
		})
		.catch(() => null);
}

test.describe('PWA update on a built site', () => {
	let site: StaticSiteServer;

	test.beforeAll(async () => {
		test.skip(!existsSync(join(BUILD, 'sw.js')), `no built sw.js in ${BUILD}`);
		site = await startStaticSite(BUILD);
	});
	test.afterAll(async () => site?.close());

	test("'Uppfæra núna' makes the new build's worker take over", async ({ page }) => {
		const sw = readFileSync(join(BUILD, 'sw.js'), 'utf8');
		const match = SHELL_ENTRY.exec(sw);
		expect(match, 'sw.js precaches /200.html with a 32-hex revision').not.toBeNull();
		const oldRevision = match![2];
		const newRevision = oldRevision === 'f'.repeat(32) ? '0'.repeat(32) : 'f'.repeat(32);

		await openControlled(page, `${site.origin}/`);
		expect(await shellRevisions(page)).toEqual([oldRevision]);
		const update = page.getByTestId('pwa-update-button');
		await expect(update, 'no prompt before a new build exists').toHaveCount(0);

		// Deploy the "new build", then check for it as the app's hourly timer would.
		site.override('/sw.js', sw.replace(SHELL_ENTRY, `$1${newRevision}$3`));
		await page.evaluate(async () => {
			(window as unknown as { __beforeUpdate: boolean }).__beforeUpdate = true;
			await (await navigator.serviceWorker.getRegistration())!.update();
		});
		await expect(update).toBeVisible({ timeout: 30_000 });

		await update.click();
		await expect
			.poll(() => workerState(page), { timeout: 30_000 })
			.toEqual({ waiting: false, controlled: true, reloaded: true });
		await expect(update).toHaveCount(0);
		// The new worker's install stored the new shell; its activation dropped the old one.
		expect(await shellRevisions(page)).toEqual([newRevision]);
		// And the page's offline check gets its answer from the worker now in control.
		const caps = await page.evaluate(
			() =>
				new Promise((resolve) => {
					const channel = new MessageChannel();
					channel.port1.onmessage = (e) => resolve(e.data);
					navigator.serviceWorker.controller!.postMessage({ type: 'NB_OFFLINE_BOOK_CAPS' }, [channel.port2]);
					setTimeout(() => resolve(null), 5_000);
				})
		);
		expect(caps).toEqual({ offlineBook: 1 });
	});
});
