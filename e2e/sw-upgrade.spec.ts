/**
 * A reader's installed worker from an OLDER build hands over to this build's
 * worker, and what they downloaded under the old one still opens offline.
 *
 * Runs only with OLD_BUILD=<dir of an older build> (for the SvelteKit 3 train:
 * the deployed kit 2 build), so CI skips it. Both builds are served at one origin
 * by a server that answers as nginx does (helpers/static-site-server.ts): first
 * the old one, then a "deploy" swaps in this checkout's `build/` (NEW_BUILD=<dir>
 * overrides it), keeping the old `/_app/immutable/` files as the deploy does.
 *
 * The download is the old build's own code on a trimmed file list (chapter 5 and
 * the book-wide files, ~18 MB), served in place of `offline-manifest.json`.
 * Two ways a reader moves to the new worker: "Uppfæra núna", or closing every tab.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticSite, type StaticSiteServer } from './helpers/static-site-server';
import { openControlled } from './helpers/service-worker';

const OLD_BUILD = process.env.OLD_BUILD;
const NEW_BUILD = process.env.NEW_BUILD ?? join(process.cwd(), 'build');
const SLUG = 'efnafraedi-2e';
const DOWNLOADED = `/${SLUG}/kafli/05/5-3-vermi/`;
const BROWSED = `/${SLUG}/kafli/01/1-1-efnafraedi-i-samhengi/`;
const NEVER_OPENED = `/${SLUG}/kafli/02/2-1-fyrstu-hugmyndir-i-atomkenningunni/`;
const SHELL_ENTRY = /\{\s*"?url"?:\s*"200\.html",\s*"?revision"?:\s*"([0-9a-f]{32})"/;
const OFFLINE_MANIFEST = `/content/${SLUG}/offline-manifest.json`;

function trimmedManifest(build: string): string {
	const full = JSON.parse(readFileSync(join(build, OFFLINE_MANIFEST), 'utf8'));
	const files = full.files.filter((f: { p: string }) => f.p.includes('/chapters/05/') || !f.p.includes('/chapters/'));
	return JSON.stringify({ ...full, files, bytes: files.reduce((a: number, f: { b: number }) => a + f.b, 0) });
}

function shellRevision(build: string): string {
	return SHELL_ENTRY.exec(readFileSync(join(build, 'sw.js'), 'utf8'))![1];
}

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

/** Cache name -> entry count */
async function cacheCounts(page: Page): Promise<Record<string, number>> {
	return page.evaluate(async () => {
		const out: Record<string, number> = {};
		for (const name of await caches.keys()) out[name] = (await (await caches.open(name)).keys()).length;
		return out;
	});
}

/** Under the old build: a controlled page, the trimmed book downloaded, a section browsed */
async function readerOnOldBuild(context: BrowserContext, site: StaticSiteServer): Promise<Page> {
	const page = await context.newPage();
	await openControlled(page, `${site.origin}/${SLUG}/`);
	expect(await shellRevisions(page)).toEqual([shellRevision(OLD_BUILD!)]);
	await page.getByRole('button', { name: /Sækja fyrir ónettengda notkun/ }).click();
	const record = () =>
		page.evaluate((s) => JSON.parse(localStorage.getItem('namsbokasafn:offline') || '{}').books?.[s] ?? null, SLUG);
	await expect.poll(async () => (await record())?.downloadedAt ?? null, { timeout: 120_000 }).not.toBeNull();
	expect(await record()).toMatchObject({ downloaded: true, missing: 0 });
	// Browse a section outside the download, so the figure route has expiry records.
	await page.goto(`${site.origin}${BROWSED}`);
	await page.waitForFunction(
		() => [...document.images].some((i) => i.src.includes('/content/') && i.complete && i.naturalWidth > 0),
		null,
		{ timeout: 30_000 }
	);
	return page;
}

/** Offline, a new tab opens the downloaded section, and a never-opened one says so */
async function offlineChecks(context: BrowserContext, site: StaticSiteServer) {
	await context.setOffline(true);
	const tab = await context.newPage();
	await tab.goto(`${site.origin}${DOWNLOADED}`);
	// getByRole skips hidden elements; the article's first <p> can be a hidden one.
	await expect(tab.locator('article.cnx-module').getByRole('paragraph').first()).toBeVisible({ timeout: 30_000 });
	await tab.goto(`${site.origin}${NEVER_OPENED}`);
	await expect(tab.getByText('Engin nettenging').first()).toBeVisible({ timeout: 30_000 });
	await tab.close();
	await context.setOffline(false);
}

test.describe('Worker upgrade from an older build', () => {
	test.skip(!OLD_BUILD, 'set OLD_BUILD to an older build directory to run');
	test.setTimeout(240_000);
	let site: StaticSiteServer;

	test.beforeEach(async () => {
		expect(existsSync(join(OLD_BUILD!, 'sw.js')), `${OLD_BUILD}/sw.js`).toBe(true);
		expect(existsSync(join(NEW_BUILD, 'sw.js')), `${NEW_BUILD}/sw.js`).toBe(true);
		expect(shellRevision(OLD_BUILD!)).not.toBe(shellRevision(NEW_BUILD));
		site = await startStaticSite(OLD_BUILD!);
		site.override(OFFLINE_MANIFEST, trimmedManifest(OLD_BUILD!), 'application/json');
	});
	test.afterEach(async () => site?.close());

	test("'Uppfæra núna' hands over, and the download still opens offline", async ({ context }, testInfo) => {
		const errors: string[] = [];
		context.on('weberror', (e) => errors.push(e.error().message));
		const page = await readerOnOldBuild(context, site);
		const before = await cacheCounts(page);

		site.swap(NEW_BUILD);
		await page.evaluate(async () => {
			(window as unknown as { __beforeUpdate: boolean }).__beforeUpdate = true;
			await (await navigator.serviceWorker.getRegistration())!.update();
		});
		const update = page.getByTestId('pwa-update-button');
		await expect(update).toBeVisible({ timeout: 60_000 });
		await update.click();
		await expect
			.poll(
				() =>
					page
						.evaluate(async () => ({
							waiting: !!(await navigator.serviceWorker.getRegistration())?.waiting,
							controlled: !!navigator.serviceWorker.controller,
							reloaded: !(window as unknown as { __beforeUpdate?: boolean }).__beforeUpdate
						}))
						.catch(() => null),
				{ timeout: 60_000 }
			)
			.toEqual({ waiting: false, controlled: true, reloaded: true });
		expect(await shellRevisions(page)).toEqual([shellRevision(NEW_BUILD)]);
		const after = await cacheCounts(page);
		await testInfo.attach('caches', { body: JSON.stringify({ before, after }, null, 1), contentType: 'application/json' });
		console.log('caches before', JSON.stringify(before), '\ncaches after', JSON.stringify(after));
		expect(after[`offline-book:${SLUG}`]).toBe(before[`offline-book:${SLUG}`]);

		await offlineChecks(context, site);
		expect(errors).toEqual([]);
	});

	test('closing every tab hands over too, and the download still opens offline', async ({ context }) => {
		const page = await readerOnOldBuild(context, site);
		const before = await cacheCounts(page);

		site.swap(NEW_BUILD);
		await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
		await expect
			.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), {
				timeout: 60_000
			})
			.toBe(true);
		for (const p of context.pages()) await p.close();

		const reopened = await context.newPage();
		await reopened.goto(`${site.origin}/${SLUG}/`);
		await expect
			.poll(() => shellRevisions(reopened), { timeout: 60_000 })
			.toEqual([shellRevision(NEW_BUILD)]);
		expect(await reopened.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)).toBe(false);
		expect((await cacheCounts(reopened))[`offline-book:${SLUG}`]).toBe(before[`offline-book:${SLUG}`]);
		await reopened.close();

		await offlineChecks(context, site);
	});
});
