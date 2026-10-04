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

import { test, expect, type Page } from '@playwright/test';
import { bookWithMostImages, offlineFileSet, syncedBooks } from './helpers/content-fixtures';

/** Same formatting as `formatBytes` in src/lib/stores/offline.ts. */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Open `url` and wait until the service worker controls the page. */
async function openControlled(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.evaluate(() => navigator.serviceWorker.ready);
	if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
		await page.reload();
		await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
			timeout: 30_000
		});
	}
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

	test('the emitted service worker revalidates figures and falls back to downloaded books', async ({
		request
	}) => {
		const sw = await (await request.get('/sw.js')).text();
		const start = sw.search(/png\|jpg/);
		expect(start).toBeGreaterThan(-1);
		const imageRoute = sw.slice(start, sw.indexOf('registerRoute', start + 1) >>> 0);
		expect(imageRoute).toContain('StaleWhileRevalidate');
		expect(imageRoute).toContain('no-cache');
		// The downloaded-book fallback must run AFTER expiration, or an expired entry
		// hides the downloaded copy.
		expect(imageRoute.indexOf('ExpirationPlugin')).toBeGreaterThan(-1);
		expect(imageRoute.indexOf('offline-book:')).toBeGreaterThan(imageRoute.indexOf('ExpirationPlugin'));
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

	test('a downloaded book serves every page and figure offline', async ({ page, context }) => {
		const fixture = bookWithMostImages();
		// The old cache kept 200 figures; a book with fewer cannot tell the difference.
		test.skip(!fixture || fixture.count <= 200, 'needs a book with more than 200 figures');
		// Measured 2026-10-04: chemistry (1,147 figures, ~345 MB) downloads in ~110 s locally.
		test.setTimeout(8 * 60_000);
		const slug = fixture!.slug;
		const files = offlineFileSet(slug);

		await openControlled(page, `/${slug}/`);
		await page.getByRole('button', { name: /Sækja fyrir ónettengda notkun/ }).click();
		await page.waitForFunction(
			(s) => JSON.parse(localStorage.getItem('namsbokasafn:offline') || '{}').books?.[s]?.downloaded === true,
			slug,
			{ timeout: 7 * 60_000, polling: 2_000 }
		);

		await context.setOffline(true);
		const failures = await page.evaluate(async (urls) => {
			const failed: string[] = [];
			for (const u of urls) {
				try {
					if (!(await fetch(u)).ok) failed.push(u);
				} catch {
					failed.push(u);
				}
			}
			return failed;
		}, [...files.pages, ...files.images]);
		expect(failures.slice(0, 5), `${failures.length} files unavailable offline`).toEqual([]);

		// Control: a figure the download never fetched must fail offline, or the
		// zero above could come from a network that never went down.
		if (files.unreferencedImage) {
			const reachable = await page.evaluate(
				async (u) => fetch(u).then((r) => r.ok, () => false),
				files.unreferencedImage
			);
			expect(reachable).toBe(false);
		}
	});
});
