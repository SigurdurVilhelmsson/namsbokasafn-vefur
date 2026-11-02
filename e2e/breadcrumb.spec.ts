/**
 * The section breadcrumb's list of sections is a disclosure of links (worklist
 * bl-breadcrumb-keyboard-model).
 *
 * It claimed to be a listbox (aria-haspopup="listbox", role="option") while working as a
 * list of links reached with Tab, with no arrow keys, and Escape closed it only while the
 * button had focus. Now: a plain list of links, the current one aria-current="page", and
 * Escape anywhere in it closes it and returns focus to the button.
 */
import { expect, test, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const button = (page: Page) => page.locator('.breadcrumb-btn');
const list = (page: Page) => page.getByRole('list', { name: 'Undirkaflar' });

test.describe('The section breadcrumb (disclosure)', () => {
	test.skip(!SECTION, 'no published book is synced');

	test('opens a list of links, with the current section marked', async ({ page }) => {
		await page.goto(SECTION!);
		await page.waitForLoadState('networkidle');
		await expect(button(page)).not.toHaveAttribute('aria-haspopup', /.+/);
		await button(page).click();
		await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
		await expect(list(page)).toBeVisible();
		await expect(page.locator('[role="option"], [role="listbox"]')).toHaveCount(0);
		await expect(list(page).locator('a[aria-current="page"]')).toHaveCount(1);
	});

	test('Escape on a link closes the list and returns focus to the button', async ({ page }) => {
		await page.goto(SECTION!);
		await page.waitForLoadState('networkidle');
		await button(page).click();
		await list(page).getByRole('link').first().focus();
		await page.keyboard.press('Escape');
		await expect(list(page)).toBeHidden();
		await expect(button(page)).toBeFocused();
		await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
	});
});
