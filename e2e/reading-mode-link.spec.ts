/**
 * The pager on main, dark (plan step S8.2; register PED-01, PED-35, CODE-22; decision D06;
 * rulings 2 and 3). A section pages only under a visit-only '?lestur=sidur' link or a mode
 * the reader picked; with neither it renders as on main, and the link never changes storage.
 * No rollup pages. 'Næsta' on the last page is the section's end and opens 'Upprifjun'.
 *
 * Every "no pager" assertion is followed, in the same test, by a load that shows the pager,
 * so an absent pager cannot pass because the pager was slow or broken. Seeds are written
 * once per test (a sessionStorage guard), so a reload reads what the app stored, not the
 * seed again. S8.3's seeded pagination spec folds this one in.
 */
import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook, sectionOfType } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const SUMMARY = BOOK ? sectionOfType(BOOK, 'summary') : null;

const KEY = 'namsbokasafn:settings';
/** What a fresh profile stores on its first load since S6.1: the marker, no choice */
const FRESH_PROFILE = '{"_version":1,"_born":1}';

const pager = (page: Page) => page.getByRole('navigation', { name: 'Síðuflakk' });
const label = (page: Page) => page.locator('.paged-nav-label');
const recall = (page: Page) => page.getByRole('region', { name: 'Upprifjun', exact: true });
/** Blocks the pager hid. The content itself carries no hidden attribute. */
const hiddenBlocks = (page: Page) => page.locator('article.cnx-module [hidden]');

const storedRaw = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY);
const stored = async (page: Page) => JSON.parse((await storedRaw(page)) ?? 'null');

/** Seed the settings once for this test; a later load or reload keeps what the app stored */
async function seed(page: Page, value: Record<string, unknown>) {
	await page.addInitScript(
		([key, json]) => {
			if (!sessionStorage.getItem('s82-seeded')) {
				localStorage.setItem(key, json);
				sessionStorage.setItem('s82-seeded', '1');
			}
		},
		[KEY, JSON.stringify(value)]
	);
}

async function open(page: Page, url: string) {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
}

/** Open a page that should page, and wait until its controls show and take keys */
async function openPaged(page: Page, url: string) {
	await open(page, url);
	await expect(pager(page)).toBeVisible({ timeout: 15000 });
	await expect(label(page)).toHaveText(/^Hluti 1 af \d+ · Síða 1 af \d+$/);
	await expect(hiddenBlocks(page).first()).toBeAttached();
	// The pager adds its key listener just after its controls render
	await page.waitForTimeout(300);
}

/**
 * Open a page that should not page. The pager would be up by now: it waits at most 1.5 s for
 * images after the fonts, and openPaged's loads show it within that.
 */
async function openScrolled(page: Page, url: string) {
	await open(page, url);
	await page.waitForTimeout(4000);
	await expect(pager(page)).toHaveCount(0);
	await expect(page.locator('[data-paged-section]')).toHaveCount(0);
	await expect(hiddenBlocks(page)).toHaveCount(0);
}

/** Press → on the page itself, not in a control */
async function pressRight(page: Page) {
	await page.locator('body').click({ position: { x: 5, y: 5 } });
	await page.keyboard.press('ArrowRight');
}

const withLink = (url: string, value: 'sidur' | 'skrun') => `${url}?lestur=${value}`;

test.describe('The pager through a ?lestur= link (S8.2)', () => {
	test.skip(!SECTION, 'No synced numbered section');

	test('a fresh profile without a link does not page and stores no mode; the link pages it', async ({
		page
	}) => {
		await openScrolled(page, SECTION!);
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);

		await openPaged(page, withLink(SECTION!, 'sidur'));
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);
	});

	test('under ?lestur=sidur, → turns the page, not the section, and ← turns it back', async ({ page }) => {
		await openPaged(page, withLink(SECTION!, 'sidur'));
		const path = new URL(page.url()).pathname;
		const first = await label(page).textContent();

		await pressRight(page);
		await expect(label(page)).not.toHaveText(first!);
		expect(new URL(page.url()).pathname).toBe(path);

		await page.keyboard.press('ArrowLeft');
		await expect(label(page)).toHaveText(first!);
		expect(new URL(page.url()).pathname).toBe(path);
	});

	test("the first page does not spend the recall prompt; the last 'Næsta' opens it", async ({ page }) => {
		await openPaged(page, withLink(SECTION!, 'sidur'));
		// Past the end marker's 1.5 s: it sits under the page controls, and must stand down
		await page.waitForTimeout(3000);
		await expect(recall(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toBeVisible();

		const next = page.getByRole('button', { name: 'Næsta síða' });
		for (let i = 0; i < 100 && (await recall(page).count()) === 0; i++) {
			await next.click();
		}
		await expect(recall(page)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Merkja kafla sem lesinn' })).toHaveCount(0);
	});

	test("?lestur=skrun overrides a stored 'paged' without changing storage", async ({ page }) => {
		const seeded = { _version: 1, _born: 1, readingMode: 'paged' };
		await seed(page, seeded);

		await openScrolled(page, withLink(SECTION!, 'skrun'));
		expect(await stored(page)).toEqual(seeded);

		// → is the section shortcut again
		const nextHref = await page.locator('a.nav-btn-next').getAttribute('href');
		await pressRight(page);
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref!.replace(/\/$/, ''));
		expect(await stored(page)).toEqual(seeded);

		// Without the link, the stored choice pages the section
		await openPaged(page, SECTION!);
		expect(await stored(page)).toEqual(seeded);
	});

	test("?lestur=sidur overrides a stored 'scrolled' without changing storage", async ({ page }) => {
		const seeded = { _version: 1, _born: 1, readingMode: 'scrolled' };
		await seed(page, seeded);

		await openPaged(page, withLink(SECTION!, 'sidur'));
		expect(await stored(page)).toEqual(seeded);

		await openScrolled(page, SECTION!);
		expect(await stored(page)).toEqual(seeded);
	});

	test('a rollup never pages, even under ?lestur=sidur, and → still changes section there', async ({
		page
	}) => {
		test.skip(!SUMMARY, 'No summary page in this content');
		await openPaged(page, withLink(SECTION!, 'sidur'));

		await openScrolled(page, withLink(SUMMARY!, 'sidur'));
		const nextHref = await page.locator('a.nav-btn-next').getAttribute('href');
		test.skip(!nextHref, 'The summary is the last section');
		await pressRight(page);
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref!.replace(/\/$/, ''));
		expect(await storedRaw(page)).toBe(FRESH_PROFILE);
	});
});
