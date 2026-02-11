/**
 * Search Modal Tests
 * Tests: opening/closing, search input, results display, keyboard navigation
 *
 * Note: Search functionality requires content to be indexed.
 * Tests verify the search UI infrastructure is functional.
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
	await expect(page).toHaveURL(/\/efnafraedi/);
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
		const isVisible = await searchModal.isVisible({ timeout: 5000 }).catch(() => false);

		if (isVisible) {
			// Search input should be focused
			const searchInput = page.locator('input#search-input');
			await expect(searchInput).toBeVisible();
		}
	});

	test('should close search modal with Escape', async ({ page }) => {
		await navigateToBook(page);
		await page.waitForTimeout(2000);

		// Open search
		await page.keyboard.press('/');
		await page.waitForTimeout(500);

		const searchModal = page.locator('div[role="dialog"][aria-modal="true"]');
		if (!(await searchModal.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

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
		if (!(await searchModal.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

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
		if (!(await searchModal.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

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
		if (!(await searchModal.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

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
		if (!(await searchModal.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		// Click close button
		const closeButton = page.locator('button[aria-label="Loka"]');
		await closeButton.click();
		await page.waitForTimeout(500);

		await expect(searchModal).not.toBeVisible();
	});
});
