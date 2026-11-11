/**
 * Offline cold start, against the production build: a page LOAD offline (a new tab,
 * a reload, the installed app opening) of a downloaded book. Until 2026-11 only a tab
 * already open could read a downloaded book; a load failed with the browser's own
 * offline page, because the worker precached no HTML page (navigateFallback: null).
 *
 * Now a page load goes to the network as before, and only when the network fails does
 * the worker answer with the precached SPA shell (/200.html), whose loaders read the
 * book from offline-book:<slug> (src/lib/sw/runtimeCaching.ts, the navigation route).
 *
 * Fixtures come from the synced content (CLAUDE.md: e2e fixtures must be derived).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { syncedBooks } from './helpers/content-fixtures';
import { openControlled } from './helpers/service-worker';

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'content');

interface Section {
	/** Reader URL, e.g. /efnafraedi-2e/kafli/01/1-1-x/ */
	url: string;
	/** Content URL of its HTML, as the offline manifest lists it */
	file: string;
	/** "1.1 Title", as the page's <title> starts */
	title: string;
	/** The first 40 characters of its first plain-text paragraph */
	snippet: string;
}

/** The first two numbered sections of the book's first chapter, read from the synced files. */
function twoSections(slug: string): { chapterTitle: string; sections: Section[] } {
	const toc = JSON.parse(readFileSync(join(CONTENT_DIR, slug, 'toc.json'), 'utf-8'));
	const chapter = toc.chapters[0];
	const folder = String(chapter.number).padStart(2, '0');
	const sections = chapter.sections
		.filter((s: { number?: string }) => s.number)
		.slice(0, 2)
		.map((s: { number: string; title: string; file: string }) => {
			const file = `/content/${slug}/chapters/${folder}/${s.file}`;
			const html = readFileSync(join(CONTENT_DIR, '..', file), 'utf-8');
			const paragraph = /<p\b[^>]*>([^<&]{40,})<\/p>/.exec(html);
			if (!paragraph) throw new Error(`${file} has no plain-text paragraph to look for`);
			return {
				url: `/${slug}/kafli/${folder}/${s.file.replace(/\.html$/, '')}/`,
				file,
				title: `${s.number} ${s.title}`,
				snippet: paragraph[1].slice(0, 40)
			};
		});
	return { chapterTitle: chapter.title, sections };
}

/**
 * Download one section of the book through the app's own download (the button, the
 * capability check, the held-state record, toc.json fetched last), with the offline
 * manifest cut down to that section's page: the real book is ~1 GB, and what is
 * stored and how is exactly what a full download stores for those files.
 */
async function downloadOnly(page: Page, slug: string, file: string): Promise<void> {
	await page.context().route(
		(u) => u.pathname === `/content/${slug}/offline-manifest.json`,
		async (route) => {
			const response = await route.fetch();
			const manifest = await response.json();
			manifest.files = manifest.files.filter((f: { p: string }) => f.p === file);
			manifest.bytes = manifest.files.reduce((sum: number, f: { b: number }) => sum + f.b, 0);
			if (manifest.files.length !== 1) throw new Error(`${file} is not in the offline manifest`);
			await route.fulfill({ response, json: manifest });
		}
	);
	await openControlled(page, `/${slug}/`);
	await page.getByRole('button', { name: /Sækja fyrir ónettengda notkun/ }).click();
	await expect
		.poll(
			() =>
				page.evaluate(
					(s) => JSON.parse(localStorage.getItem('namsbokasafn:offline') || '{}').books?.[s] ?? null,
					slug
				),
			{ timeout: 30_000 }
		)
		.toMatchObject({ downloaded: true, missing: 0 });
}

test.describe('Offline cold start', () => {
	test('a downloaded book opens in a new tab offline: a section and the book home', async ({
		page,
		context
	}) => {
		const slug = syncedBooks()[0];
		const { chapterTitle, sections } = twoSections(slug);
		const [downloaded, notDownloaded] = sections;
		test.skip(!notDownloaded, `${slug} needs two numbered sections in its first chapter`);

		await downloadOnly(page, slug, downloaded.file);
		// What a cold start reads must come from the download: drop what browsing cached
		// (the book home put toc.json in book-content).
		await page.evaluate(() => caches.delete('book-content'));
		await context.setOffline(true);

		// A new tab is a page load, not a client-side navigation. (On the old worker it
		// failed here with net::ERR_INTERNET_DISCONNECTED.)
		const cold = await context.newPage();
		const response = await cold.goto(downloaded.url);
		expect(response?.status()).toBe(200);
		expect(response?.fromServiceWorker()).toBe(true);
		await expect(cold.locator('.reading-content')).toContainText(downloaded.snippet, { timeout: 20_000 });
		await expect(cold).toHaveTitle(new RegExp(`^${downloaded.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

		// Stop the worker, so the next page load starts it from disk with no state in
		// memory, as when the installed app is opened.
		const cdp = await context.newCDPSession(page);
		await cdp.send('ServiceWorker.enable');
		await cdp.send('ServiceWorker.stopAllWorkers');
		const home = await context.newPage();
		await home.goto(`/${slug}/`);
		await expect(home.locator('.chapter-card-title').first()).toHaveText(chapterTitle, { timeout: 20_000 });

		// Control: a section the download does not hold is NOT readable, so the network
		// really is down and the text above came from the download. The shell still
		// boots and says why.
		const missing = await context.newPage();
		await missing.goto(notDownloaded.url);
		await expect(missing.getByRole('heading', { level: 1, name: 'Engin nettenging' })).toBeVisible({
			timeout: 20_000
		});
		await expect(missing.locator('.reading-content')).toHaveCount(0);
	});

	test('online, a page load still gets the prerendered page; redirects and errors pass through', async ({
		page
	}) => {
		const slug = syncedBooks()[0];
		const [section] = twoSections(slug).sections;
		await openControlled(page, `/${slug}/`);

		const response = await page.goto(section.url);
		// The worker answered, so the navigation route is in the path...
		expect(response?.fromServiceWorker()).toBe(true);
		// ...and what it answered is the prerendered page, not the shell: the section is
		// in the HTML before any script runs.
		const html = (await response?.text()) ?? '';
		expect(html).toContain(`<title>${section.title}`);
		expect(html).toContain(section.snippet);

		// A redirect the server answers (here the trailing-slash one) is followed as before.
		const redirected = await page.goto(section.url.replace(/\/$/, ''));
		expect(redirected?.request().redirectedFrom()).not.toBeNull();
		expect(new URL(page.url()).pathname).toBe(section.url);
		expect(await redirected?.text()).toContain(section.snippet);

		// An answer the server gives is passed on, never replaced by the shell.
		const notFound = await page.goto(`/${slug}/kafli/01/no-such-section/`);
		expect(notFound?.fromServiceWorker()).toBe(true);
		expect(notFound?.status()).toBe(404);
	});

	test('the emitted service worker precaches the shell and serves it only when a page load fails', async ({
		request
	}) => {
		const sw = await (await request.get('/sw.js')).text();
		// The precache entry buildSW injects, with a revision that changes every build (kit.spa).
		const shellEntry = /\{[^{}]*"url":\s*"200\.html"[^{}]*\}/.exec(sw)?.[0] ?? '';
		expect(shellEntry).toMatch(/"revision":\s*"[0-9a-f]{32}"/);
		// ...and the app's own scripts, which globStrict: false would let a broken glob drop
		// with only a warning (kit.spa adds the shell entry either way).
		expect(sw).toMatch(/"url":\s*"_app\/immutable\/[^"]+\.js"/);
		// No navigateFallback: that NavigationRoute would serve the shell online too. The
		// page-load route itself (NetworkOnly with PrecacheFallbackPlugin) is unit-tested in
		// src/lib/sw/routes.test.ts, and the tests above load pages through it.
		expect(sw).not.toContain('NavigationRoute');
		// The precache install fetches it, so the server must answer it as a page.
		const shell = await request.get('/200.html');
		expect(shell.status()).toBe(200);
		expect(shell.headers()['content-type']).toContain('text/html');
	});
});
