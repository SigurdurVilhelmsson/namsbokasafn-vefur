/**
 * The annotations panel ('Athugasemdir') from the keyboard (code review M13, June 2026).
 *
 * Its only Escape handler sat on a backdrop that never has focus, and the global Escape
 * shortcut clicks only overlays marked data-modal-overlay, so nothing closed it from the
 * keyboard. Opening it left focus on the page behind, and closing it with focus inside would
 * drop focus to <body>.
 */
import { expect, test, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const opener = (page: Page) => page.getByRole('button', { name: 'Opna athugasemdir' });
const panel = (page: Page) => page.getByRole('dialog', { name: 'Athugasemdir' });

async function openPanel(page: Page) {
	await page.goto(SECTION!);
	await page.waitForLoadState('networkidle');
	await opener(page).click();
	await expect(panel(page)).toBeVisible();
}

test.describe('The annotations panel, keyboard only (M13)', () => {
	test.skip(!SECTION, 'no published book is synced');

	test('Escape closes it with focus inside', async ({ page }) => {
		await openPanel(page);
		await panel(page).getByRole('button', { name: 'Loka' }).focus();
		await page.keyboard.press('Escape');
		await expect(panel(page)).toBeHidden();
	});

	test('opening it moves focus into it, and closing it returns focus to the button that opened it', async ({
		page
	}) => {
		await openPanel(page);
		await expect(panel(page).getByRole('button', { name: 'Loka' })).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(panel(page)).toBeHidden();
		await expect(opener(page)).toBeFocused();
	});
});
