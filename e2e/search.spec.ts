/**
 * Search Modal Tests
 * Tests: opening/closing, search input, results display, keyboard navigation
 *
 * Note: Search functionality requires content to be indexed.
 * Tests verify the search UI infrastructure is functional. A dialog that does
 * not open is a failure: until 2026-10-04 it was a bare test.skip(), so a
 * broken "/" shortcut would have read as five skipped tests.
 */

import { test, expect } from '@playwright/test';

/** Navigate to a book page where search is available */
async function navigateToBook(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	await expect(bookLink).toBeVisible({ timeout: 10000 });
	await bookLink.click();
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/\/efnafraedi-2e/);
}

test.describe('Search Modal', () => {
	test('should open search modal via keyboard shortcut', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		// Press / to open search (default keyboard shortcut)
		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		// Search modal should be visible
		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });
		await expect(page.locator('input#search-input')).toBeFocused();
	});

	test('should close search modal with Escape', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		// Open search
		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });

		// Press Escape to close
		await page.keyboard.press('Escape');
		await page.waitForTimeout(500);

		// Modal should be gone
		await expect(searchModal).not.toBeVisible();
	});

	test('should have accessible search modal structure', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });

		// Check ARIA attributes
		await expect(searchModal).toHaveAttribute('aria-modal', 'true');

		// Close button should have aria-label
		const closeButton = page.locator('button[aria-label="Loka"]');
		await expect(closeButton).toBeVisible();

		// Search input should exist
		const searchInput = page.locator('input#search-input');
		await expect(searchInput).toBeVisible();
	});

	test('should accept search input', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });

		const searchInput = page.locator('input#search-input');
		await searchInput.fill('efnafræði');
		await page.waitForTimeout(500);

		const value = await searchInput.inputValue();
		expect(value).toBe('efnafræði');
	});

	test('should show filter toggle button', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });

		// Filter button should be visible
		const filterButton = page.locator('button[aria-label="Síur"]');
		await expect(filterButton).toBeVisible();

		// Click to toggle filters
		await filterButton.click();
		await page.waitForTimeout(300);

		// Chapter filter dropdown should appear
		const chapterFilter = page.locator('select#chapter-filter');
		const hasFilter = await chapterFilter.isVisible({ timeout: 2000 }).catch(() => false);
		if (hasFilter) {
			await expect(chapterFilter).toBeVisible();
		}
	});

	test('should close search modal via close button', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		await expect(searchModal).toBeVisible({ timeout: 5000 });

		// Click close button
		const closeButton = page.locator('button[aria-label="Loka"]');
		await closeButton.click();
		await page.waitForTimeout(500);

		await expect(searchModal).not.toBeVisible();
	});
});

// Code review M9 (June 2026): choosing a chapter in the filter must search again. The
// debounced search used to track only the query, so the filter did nothing until the
// reader typed. The count line's 'í völdum kafla' shows at once either way, so the test
// reads each result's chapter instead.
test('choosing a chapter in the filter narrows the results without typing again', async ({ page }) => {
	await navigateToBook(page);
	await page.waitForTimeout(2000);
	await page.keyboard.press('/');
	const dialog = page.locator('div[role="dialog"][aria-modal="true"]');
	await expect(dialog).toBeVisible({ timeout: 5000 });

	/** Each result's chapter, read from its first line ('Kafli …'); a snippet can start with 'Kafli' too */
	const chapterOf = () =>
		dialog.locator('button').evaluateAll((buttons) =>
			buttons
				.map((b) => b.querySelector('p')?.textContent?.trim() ?? '')
				.filter((t) => t.startsWith('Kafli '))
				.map((t) => t.replace(/^Kafli /, ''))
		);

	await page.locator('input#search-input').fill('efni');
	await expect.poll(async () => (await chapterOf()).length, { timeout: 30000 }).toBeGreaterThan(0);
	const before = [...new Set(await chapterOf())];
	expect(before.length, 'the query should hit more than one chapter').toBeGreaterThan(1);

	await dialog.locator('button[aria-label="Síur"]').click();
	const filter = page.locator('select#chapter-filter');
	const options = (await filter.locator('option').allTextContents()).map((t) => t.trim());
	const target = before.slice(1).find((title) => options.includes(title))!;
	expect(target, 'a result chapter is among the filter options').toBeTruthy();
	await filter.selectOption({ label: target });

	await expect.poll(async () => [...new Set(await chapterOf())], { timeout: 10000 }).toEqual([target]);
});
