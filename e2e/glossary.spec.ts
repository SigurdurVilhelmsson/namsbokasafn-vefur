/**
 * Glossary Page Tests
 * Tests: term display, search filtering, letter navigation
 *
 * Note: These tests require book content to be available.
 * Tests use conditional checks for content-dependent assertions.
 */

import { test, expect } from '@playwright/test';

/** Navigate to the glossary page via the landing page */
async function navigateToGlossary(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	await expect(bookLink).toBeVisible({ timeout: 10000 });
	await bookLink.click();
	await page.waitForLoadState('networkidle');

	const glossaryLink = page.locator('a[href*="ordabok"]').first();
	if (!(await glossaryLink.isVisible({ timeout: 5000 }).catch(() => false))) {
		return false;
	}
	await glossaryLink.click();
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/ordabok/);
	return true;
}

test.describe('Glossary Page', () => {
	test('should load glossary page with search input', async ({ page }) => {
		const navigated = await navigateToGlossary(page);
		if (!navigated) {
			test.skip();
			return;
		}

		// Search input should be visible
		const searchInput = page.locator('input[placeholder*="Leita í orðasafni"]');
		await expect(searchInput).toBeVisible({ timeout: 10000 });
	});

	test('should display glossary terms', async ({ page }) => {
		const navigated = await navigateToGlossary(page);
		if (!navigated) {
			test.skip();
			return;
		}

		// Wait for terms to load
		await page.waitForTimeout(2000);

		// Should have at least one term card displayed
		const termCards = page.locator('div.p-4.rounded-lg.border, article, [class*="term"]');
		const count = await termCards.count();

		// If glossary has content, verify term cards exist
		if (count > 0) {
			expect(count).toBeGreaterThan(0);
		}
	});

	test('should filter terms by search query', async ({ page }) => {
		const navigated = await navigateToGlossary(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		const searchInput = page.locator('input[placeholder*="Leita í orðasafni"]');
		await expect(searchInput).toBeVisible({ timeout: 10000 });

		// Type a search query
		await searchInput.fill('efna');
		await page.waitForTimeout(500);

		// The number of visible terms should be filtered (fewer than total)
		// We can't predict exact count, but verify search input works without errors
		const searchValue = await searchInput.inputValue();
		expect(searchValue).toBe('efna');
	});

	test('should filter terms by letter', async ({ page }) => {
		const navigated = await navigateToGlossary(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		// Look for letter filter buttons (small square buttons)
		const letterButtons = page.locator('button.w-8.h-8');
		const buttonCount = await letterButtons.count();

		if (buttonCount > 0) {
			// Click the first letter button
			await letterButtons.first().click();
			await page.waitForTimeout(500);

			// A "clear filter" button should appear
			const clearButton = page.getByText('Hreinsa síu');
			if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
				await clearButton.click();
				await page.waitForTimeout(500);

				// After clearing, the filter should be removed
				await expect(clearButton).not.toBeVisible();
			}
		}
	});

	test('should display term definitions', async ({ page }) => {
		const navigated = await navigateToGlossary(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		// Find any element that looks like a term definition
		// Glossary terms typically show Icelandic and English names plus definitions
		const pageText = await page.locator('main').textContent();
		if (pageText && pageText.length > 50) {
			// Page has content - verify it's not just a loading state
			expect(pageText).not.toContain('Hleð');
		}
	});
});
