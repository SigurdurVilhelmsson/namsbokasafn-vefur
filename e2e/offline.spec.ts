/**
 * Service-worker figure cache and offline download, against the production build.
 *
 * Each test here was run red against the code it replaces (2026-10-04): CacheFirst
 * served a re-rendered figure for 30 days, the download kept 200 of chemistry's
 * 1,147 figures while saying "Sótt", and the size estimate was invented.
 * See docs/plans/2026-10-04-sw-cache-and-offline-download.md.
 *
 * Fixtures come from the synced content (CLAUDE.md: e2e fixtures must be derived).
 */

import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { bookWithMostImages, offlineFileSet, syncedBooks } from './helpers/content-fixtures';
import { openControlled } from './helpers/service-worker';

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static');
const diskSize = (url: string) => statSync(join(STATIC_DIR, url)).size;

/** Same formatting as `formatBytes` in src/lib/stores/offline.ts. */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Fetch `url` from the page (so through the service worker); returns the body text. */
function fetchText(page: Page, url: string): Promise<string> {
	return page.evaluate(async (u) => (await fetch(u)).text(), url);
}

const NGINX_HEADERS = {
	'content-type': 'image/svg+xml',
	'cache-control': 'public, max-age=86400, must-revalidate'
};

const svg = (label: string, pad = 0) =>
	`<svg xmlns="http://www.w3.org/2000/svg"><text>${label}</text><!--${'x'.repeat(pad)}--></svg>`;

test.describe('Figure cache while browsing', () => {
	test('a figure re-rendered under the same URL is fresh by the second view', async ({
		page,
		context
	}) => {
		const slug = syncedBooks()[0];
		const figure = offlineFileSet(slug).images[0];
		test.skip(!figure, `${slug} references no image`);

		let version = 'A';
		await context.route(`**${figure}`, (route) =>
			route.fulfill({
				status: 200,
				headers: { ...NGINX_HEADERS, etag: `"${version}"` },
				body: svg(`figure-${version}`)
			})
		);
		await openControlled(page, `/${slug}/`);

		expect(await fetchText(page, figure)).toContain('figure-A');
		version = 'B';
		// One stale view is the accepted cost of StaleWhileRevalidate; the next must be fresh.
		await fetchText(page, figure);
		await expect.poll(() => fetchText(page, figure), { timeout: 10_000 }).toContain('figure-B');
	});

	test('a figure over 1 MiB is not kept in the browsing cache; a small one is', async ({
		page,
		context
	}) => {
		const slug = syncedBooks()[0];
		const dir = `/content/${slug}/chapters/01/images/media`;
		const big = `${dir}/__e2e-big.svg`;
		const small = `${dir}/__e2e-small.svg`;
		await context.route(`**${big}`, (route) =>
			route.fulfill({ status: 200, headers: NGINX_HEADERS, body: svg('big', 1024 * 1024 + 1) })
		);
		await context.route(`**${small}`, (route) =>
			route.fulfill({ status: 200, headers: NGINX_HEADERS, body: svg('small') })
		);
		await openControlled(page, `/${slug}/`);

		await fetchText(page, big);
		await fetchText(page, small);
		const cached = (u: string) =>
			page.evaluate(async (url) => !!(await caches.match(url, { cacheName: 'book-images' })), u);
		// Control: the small one IS cached, so a "not cached" below is not a broken probe.
		await expect.poll(() => cached(small), { timeout: 10_000 }).toBe(true);
		expect(await cached(big)).toBe(false);
	});

	test('a downloaded copy is used only offline: online, the network copy wins', async ({
		page,
		context
	}) => {
		// Over the size gate, so the browsing cache never holds it: the case where a
		// downloaded copy used to win on EVERY online view (review, 2026-10-04).
		const isBig = (u: string) => diskSize(u) > 1024 * 1024;
		const slug = syncedBooks().find((b) => offlineFileSet(b).images.some(isBig));
		test.skip(!slug, 'no synced book has a figure over 1 MiB');
		const big = offlineFileSet(slug!).images.find(isBig);
		const realSize = diskSize(big!);

		await openControlled(page, `/${slug}/`);
		// Plant a stand-in "downloaded" copy, as the download would have stored it.
		await page.evaluate(
			async ([url, name]) => (await caches.open(name)).put(url, new Response('DOWNLOADED-OLD')),
			[big!, `offline-book:${slug}`]
		);
		const sizeVia = () => page.evaluate(async (u) => (await (await fetch(u)).blob()).size, big!);

		for (let i = 0; i < 3; i++) expect(await sizeVia()).toBe(realSize);
		await context.setOffline(true);
		expect(await sizeVia()).toBe('DOWNLOADED-OLD'.length);
	});

	test('the emitted service worker revalidates figures and falls back to downloaded books', async ({
		request
	}) => {
		const sw = await (await request.get('/sw.js')).text();
		const start = sw.search(/png\|jpg/);
		expect(start).toBeGreaterThan(-1);
		const imageRoute = sw.slice(start, sw.indexOf('registerRoute', start + 1) >>> 0);
		expect(sw.search(/html\|md\|json/)).toBeGreaterThan(-1);
		expect(imageRoute).toContain('StaleWhileRevalidate');
		expect(imageRoute).toContain('no-cache');
		// The downloaded-book fallback must run AFTER expiration, or an expired entry
		// hides the downloaded copy.
		expect(imageRoute).toContain('handlerDidError');
		expect(imageRoute).toContain('offline-book:');
		// ...and never from a cache-hit hook, which would beat the network online.
		expect(imageRoute).not.toContain('cachedResponseWillBeUsed');
		// Pages: the fallback must run AFTER expiration, or an expired entry hides it.
		const contentRoute = sw.slice(sw.search(/html\|md\|json/), start);
		expect(contentRoute.indexOf('offline-book:')).toBeGreaterThan(contentRoute.indexOf('ExpirationPlugin'));
	});
});

test.describe('Download for offline reading', () => {
	test('the size shown before downloading is the real size of the book', async ({ page }) => {
		const fixture = bookWithMostImages();
		test.skip(!fixture, 'no synced book');
		const { bytes } = offlineFileSet(fixture!.slug);

		await page.goto(`/${fixture!.slug}/`);
		await expect(page.getByRole('button', { name: /Sækja fyrir ónettengda notkun/ })).toContainText(
			`~${formatBytes(bytes)}`,
			{ timeout: 20_000 }
		);
	});

	test('a download made by the old code is not reported as complete', async ({ page }) => {
		const slug = syncedBooks()[0];
		await page.addInitScript((s) => {
			localStorage.setItem(
				'namsbokasafn:offline',
				JSON.stringify({
					books: {
						[s]: { downloaded: true, downloadedAt: '2026-01-01T00:00:00.000Z', version: '1.0', sizeBytes: 1 }
					}
				})
			);
		}, slug);
		await page.goto(`/${slug}/`);
		await expect(page.getByRole('button', { name: /Sækja aftur/ })).toBeVisible({ timeout: 20_000 });
		await expect(page.getByText(/^Sótt/)).toHaveCount(0);
	});

});
