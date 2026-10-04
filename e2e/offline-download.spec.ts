/**
 * Download a whole book for offline reading, against the production build.
 *
 * Run red against the old code (2026-10-04): chemistry kept 200 of 1,147 figures
 * while the button said "Sótt" (956 files unavailable offline).
 * See docs/plans/2026-10-04-sw-cache-and-offline-download.md.
 *
 * Its own file because a whole-book download is large: chemistry is 345 MB as
 * deployed (2026-10-04) and ~1 GB on efni main, which is what CI syncs. One attempt
 * only, and no trace (a trace would record every downloaded body).
 *
 * It runs in a PERSISTENT profile on disk, like a reader's browser. Playwright's
 * default context is ephemeral (incognito-like): Chromium keeps its storage in
 * memory with a capped quota (2 GiB measured locally, 10 GiB for a profile on disk),
 * and in CI on 2026-10-04 the same ~1 GB download passed once and failed once with
 * QuotaExceededError ("Ekki nóg geymslupláss á tækinu.") on identical content.
 */

import { rmSync } from 'node:fs';
import { test, expect, chromium } from '@playwright/test';
import { bookWithMostImages, offlineFileSet } from './helpers/content-fixtures';
import { openControlled } from './helpers/service-worker';

test.use({ trace: 'off' });
test.describe.configure({ retries: 0 });

// eslint-disable-next-line no-empty-pattern -- Playwright needs the destructuring; no fixtures used
test('a downloaded book serves every page and figure offline', async ({}, testInfo) => {
	const fixture = bookWithMostImages();
	// The old cache kept 200 figures; a book with fewer cannot tell the difference.
	test.skip(!fixture || fixture.count <= 200, 'needs a book with more than 200 figures');
	// Measured 2026-10-04: 345 MB downloads in ~60 s locally; allow for ~1 GB on CI.
	test.setTimeout(15 * 60_000);
	const slug = fixture!.slug;
	const files = offlineFileSet(slug);

	const profile = testInfo.outputPath('profile');
	const context = await chromium.launchPersistentContext(profile, {
		baseURL: testInfo.project.use.baseURL
	});
	const page = context.pages()[0] ?? (await context.newPage());
	try {
		await openControlled(page, `/${slug}/`);
		await page.getByRole('button', { name: /Sækja fyrir ónettengda notkun/ }).click();
		// Ends either way: the record gets a downloadedAt, or an error is shown (every error
		// state offers "Reyna aftur"). Stop at the first, so a failure is quick and named.
		const record = () =>
			page.evaluate((s) => JSON.parse(localStorage.getItem('namsbokasafn:offline') || '{}').books?.[s] ?? null, slug);
		const retry = page.getByRole('button', { name: 'Reyna aftur' });
		await expect
			.poll(async () => ((await record())?.downloadedAt || (await retry.count()) > 0 ? 'ended' : null), {
				timeout: 14 * 60_000,
				intervals: [2_000]
			})
			.toBe('ended');
		expect(await retry.count(), await page.locator('.download-book').innerText()).toBe(0);
		expect(await record()).toMatchObject({ downloaded: true, missing: 0 });

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
	} finally {
		// Deleted even on failure, so a ~1 GB profile never lands in the uploaded artifacts.
		await context.close();
		rmSync(profile, { recursive: true, force: true });
	}
});
