/**
 * The periodic table's element dialog from the keyboard (code review M14, June 2026).
 *
 * The dialog's inner box stopped every keydown, so with focus inside it (after a click on
 * 'Næsta frumefni', say) Escape and the arrow keys did nothing. The arrows must still move
 * one element per press: the dialog and the window both listen while it is open.
 */
import { expect, test, type Page } from '@playwright/test';
import { publishedBook } from './helpers/content-fixtures';

/** Chemistry, the published book, has the periodic table (book.ts features.periodicTable) */
const BOOK = publishedBook();

/** The element's Icelandic name, as its table cell labels it ('Vetni (H), sætistala 1') */
const nameOf = async (page: Page, atomicNumber: number) =>
	((await page.locator(`[data-atomic-number="${atomicNumber}"]`).getAttribute('aria-label')) ?? '').split(' (')[0];

test.describe('The periodic table dialog, keyboard only (M14)', () => {
	test.skip(!BOOK, 'no published book is synced');

	test('with focus inside the dialog, the arrows move one element and Escape closes it', async ({ page }) => {
		await page.goto(`/${BOOK}/lotukerfi/`);
		await page.waitForLoadState('networkidle');
		await page.locator('[data-atomic-number="1"]').click();

		const dialog = page.getByRole('dialog');
		const title = dialog.locator('#element-modal-title');
		await expect(dialog).toBeVisible();

		await dialog.getByRole('button', { name: 'Næsta frumefni' }).click();
		await expect(title).toHaveText(await nameOf(page, 2));

		await page.keyboard.press('ArrowRight');
		await expect(title).toHaveText(await nameOf(page, 3));
		await page.keyboard.press('ArrowLeft');
		await expect(title).toHaveText(await nameOf(page, 2));

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
	});
});
