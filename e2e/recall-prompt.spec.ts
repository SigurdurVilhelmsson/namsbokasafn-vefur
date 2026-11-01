/**
 * The section-end recall prompt on main (plan step S5.2; register PED-04, KEEP-05, UI-04;
 * call 2, decision D10). It replaces the 'Vel gert!' celebration, shows once per numbered
 * section, never on a rollup or the Formáli, and never because the section was marked read
 * by hand: under D10 it waits for the end of the section.
 */
import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, frontMatterSection, publishedBook, sectionOfType } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const recall = (page: Page) => page.getByRole('region', { name: 'Upprifjun' });
/** Shown only while the section is unread, so its absence shows read detection ran */
const bottomMarkRead = (page: Page) => page.getByRole('button', { name: 'Merkja kafla sem lesinn' });

async function open(page: Page, url: string) {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
}

/**
 * Bring the end-of-section marker into view until `check` passes. Scrolling to the page's
 * bottom once is not enough: lazy images keep loading and push the marker back out of view
 * (measured: the page grew from 4,927 to 5,361 px after the scroll).
 */
async function atEnd(page: Page, check: () => Promise<void>) {
	await expect(async () => {
		await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
		await check();
	}).toPass({ timeout: 20000 });
}

/** Hold the end in view until read detection (1.5 s) has marked the section read */
const reachEnd = (page: Page) => atEnd(page, () => expect(bottomMarkRead(page)).toHaveCount(0, { timeout: 2500 }));

test.describe('The recall prompt', () => {
	test.skip(!SECTION, 'No synced numbered section');

	test('a numbered section ends with it', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
	});

	for (const type of ['glossary', 'summary']) {
		test(`a rollup (${type}) ends without it`, async ({ page }) => {
			const url = sectionOfType(BOOK!, type);
			test.skip(!url, `No ${type} page in this content`);
			await open(page, url!);
			await reachEnd(page);
			await page.waitForTimeout(500);
			await expect(recall(page)).toHaveCount(0);
		});
	}

	test('the Formáli ends without it', async ({ page }) => {
		const url = frontMatterSection(BOOK!);
		test.skip(!url, 'No front matter in this content');
		await open(page, url!);
		await reachEnd(page);
		await page.waitForTimeout(500);
		await expect(recall(page)).toHaveCount(0);
	});

	test('marking read by hand opens nothing; the end of the section still does (D10)', async ({ page }) => {
		await open(page, SECTION!);
		await page.getByRole('button', { name: 'Merkja sem lesið' }).click();
		await expect(bottomMarkRead(page)).toHaveCount(0);
		await page.waitForTimeout(500);
		await expect(recall(page)).toHaveCount(0);

		await atEnd(page, () => expect(recall(page)).toBeVisible({ timeout: 2500 }));
	});

	test("'Sleppa' closes it in one tap, and it does not come back to that section", async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await page.getByRole('button', { name: 'Sleppa' }).click();
		await expect(recall(page)).toHaveCount(0);

		await page.reload();
		await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
		// Held at the end past read detection's 1.5 s, it still does not come back
		for (let i = 0; i < 3; i++) {
			await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
			await page.waitForTimeout(1000);
		}
		await expect(recall(page)).toHaveCount(0);
	});

	test('with it open, the next-section link works and the prompt does not follow', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
		const before = page.url();

		await page.getByRole('link', { name: /Næsti kafli/ }).click();
		await expect(page).not.toHaveURL(before);
		await expect(page.locator('.reading-content').first()).toBeVisible();
		await expect(recall(page)).toHaveCount(0);
	});
});
