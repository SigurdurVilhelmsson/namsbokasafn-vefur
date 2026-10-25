/**
 * The search index is built when the reader opens search, never on page load.
 *
 * Until 2026-10-25, SearchModal (which Header always mounts) built it in `onMount`, so
 * every hard load of a book page fetched every section of the book, one at a time,
 * whether or not the reader searched. For chemistry that was 216 files and 8.8 MB on
 * the wire, about 12 s against the live site. The index is now built when search opens,
 * a few files at a time (2.5 s for the same files at six).
 */

import { test, expect, type Page, type Request } from '@playwright/test';
import { publishedBook, firstModuleSectionTitle, tocSectionUrls } from './helpers/content-fixtures';

const BOOK = publishedBook();

// The first navigation is never controlled by the service worker; blocking it also keeps
// its precache install out of the request log.
test.use({ serviceWorkers: 'block' });

interface SectionRequests {
	/** Path of each section request, with the time it started. */
	started: { path: string; at: number }[];
	finished: number;
	/** Most section requests open at once. */
	maxInFlight: number;
}

/** Record every request for a section file of `slug`. Register before `goto`. */
function watchSectionRequests(page: Page, slug: string): SectionRequests {
	const prefix = `/content/${slug}/chapters/`;
	const log: SectionRequests = { started: [], finished: 0, maxInFlight: 0 };
	let inFlight = 0;
	const isSection = (req: Request) => new URL(req.url()).pathname.startsWith(prefix);
	page.on('request', (req) => {
		if (!isSection(req)) return;
		log.started.push({ path: decodeURIComponent(new URL(req.url()).pathname), at: Date.now() });
		inFlight++;
		log.maxInFlight = Math.max(log.maxInFlight, inFlight);
	});
	const done = (req: Request) => {
		if (!isSection(req)) return;
		inFlight--;
		log.finished++;
	};
	page.on('requestfinished', done);
	page.on('requestfailed', done);
	return log;
}

/** Open search from the header button and return when the click that opened it was made. */
async function openSearch(page: Page): Promise<number> {
	const dialog = page.getByRole('dialog', { name: 'Leita í bókinni' });
	let clickedAt = 0;
	// A click before hydration does nothing, so retry until the dialog is there.
	await expect(async () => {
		clickedAt = Date.now();
		await page.getByRole('button', { name: 'Leita, Ctrl+K', exact: true }).click();
		await expect(dialog).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15000 });
	return clickedAt;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('Search index', () => {
	test.skip(!BOOK, 'No published book is synced');

	test('a book page fetches no section until search opens, then each section once, several at a time', async ({
		page
	}) => {
		const expected = tocSectionUrls(BOOK!);
		expect(expected.length, 'sections in the table of contents').toBeGreaterThan(1);

		const requests = watchSectionRequests(page, BOOK!);
		await page.goto(`/${BOOK}/`, { waitUntil: 'load' });
		// The old crawl started at hydration. Leave it time to show before opening search.
		await page.waitForTimeout(3000);

		const openedAt = await openSearch(page);
		expect(
			requests.started.filter((r) => r.at < openedAt).map((r) => r.path),
			'section files fetched before search was opened'
		).toEqual([]);

		// Opening search builds the index: every section, once.
		await expect
			.poll(() => requests.finished, { timeout: 60000, message: 'section requests finished' })
			.toBe(expected.length);
		expect(requests.started.map((r) => r.path).sort()).toEqual([...expected].sort());
		expect(requests.maxInFlight, 'section requests open at once').toBeGreaterThan(1);
	});

	test('search finds a section by its title', async ({ page }) => {
		const title = firstModuleSectionTitle(BOOK!);
		test.skip(!title, 'No module section with a title');
		// One-letter words are not matched (minMatchCharLength 2), so query the longer ones.
		const query = title!
			.split(/\s+/)
			.filter((w) => w.length >= 3)
			.slice(0, 3)
			.join(' ');

		await page.goto(`/${BOOK}/`, { waitUntil: 'load' });
		await openSearch(page);
		await page.locator('#search-input').fill(query);

		const dialog = page.getByRole('dialog', { name: 'Leita í bókinni' });
		await expect(
			dialog.getByRole('button', { name: new RegExp(escapeRegExp(title!)) }).first(),
			`a result for "${title}" (query "${query}")`
		).toBeVisible({ timeout: 60000 });
	});
});
