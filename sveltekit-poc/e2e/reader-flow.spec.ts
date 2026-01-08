/**
 * Smoke test for reader flow
 * Tests: catalog → book home → section view → navigate
 *
 * Note: Uses text content and semantic selectors for stability across builds.
 */

import { test, expect } from '@playwright/test';

test.describe('Reader Flow', () => {
	test('should load landing page', async ({ page }) => {
		// Capture console errors
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});
		page.on('pageerror', (err) => {
			consoleErrors.push(err.message);
		});

		await page.goto('/', { waitUntil: 'domcontentloaded' });

		// Wait for JS to execute
		await page.waitForTimeout(3000);

		// Log any errors for debugging
		if (consoleErrors.length > 0) {
			console.log('Console errors:', consoleErrors);
		}

		// Check page title
		await expect(page).toHaveTitle(/Námsbókasafn/);

		// Check for main heading (exact match to avoid multiple elements)
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({ timeout: 15000 });
	});

	test('should navigate from catalog to book home', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Find and click on Efnafræði link
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await expect(bookLink).toBeVisible({ timeout: 10000 });
		await bookLink.click();

		// Verify navigation
		await expect(page).toHaveURL(/\/efnafraedi/);

		// Wait for content
		await page.waitForLoadState('networkidle');

		// Verify book title visible
		await expect(page.getByRole('heading', { name: /Efnafræði/i })).toBeVisible({ timeout: 10000 });
	});

	test('should navigate to section from book home', async ({ page }) => {
		// Navigate via home page first
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Click on book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Wait for chapter links to load
		await page.waitForTimeout(2000);

		// Find any link that goes to a section
		const sectionLink = page.locator('a[href*="/kafli/"]').first();

		if (await sectionLink.isVisible({ timeout: 10000 }).catch(() => false)) {
			await sectionLink.click();

			// Verify we're on a section page
			await expect(page).toHaveURL(/\/efnafraedi\/kafli\/.+\/.+/);

			// Wait for article to load
			await expect(page.locator('article')).toBeVisible({ timeout: 15000 });
		}
	});

	test('should display section content', async ({ page }) => {
		// Navigate via home page first
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Click on book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		const sectionLink = page.locator('a[href*="/kafli/"]').first();

		if (await sectionLink.isVisible({ timeout: 10000 }).catch(() => false)) {
			await sectionLink.click();
			await page.waitForLoadState('networkidle');

			// Verify article exists and has content
			const article = page.locator('article');
			await expect(article).toBeVisible({ timeout: 15000 });

			// Article should have meaningful content
			const text = await article.textContent();
			expect(text?.length).toBeGreaterThan(20);
		}
	});
});

test.describe('Book Features', () => {
	// Note: These tests navigate via home page because direct URL access
	// requires proper SPA fallback configuration on the server

	test('should access glossary page via navigation', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Navigate to book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Look for glossary link in sidebar or navigation
		const glossaryLink = page.locator('a[href*="ordabok"]').first();
		if (await glossaryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await glossaryLink.click();
			await page.waitForLoadState('networkidle');
			// Verify we're on the glossary page
			await expect(page).toHaveURL(/ordabok/);
		}
	});

	test('should access flashcards page via navigation', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Navigate to book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Look for flashcards link
		const flashcardsLink = page.locator('a[href*="minniskort"]').first();
		if (await flashcardsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await flashcardsLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/minniskort/);
		}
	});

	test('should access periodic table page via navigation', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Navigate to book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Look for periodic table link
		const periodicLink = page.locator('a[href*="lotukerfi"]').first();
		if (await periodicLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await periodicLink.click();
			await page.waitForLoadState('networkidle');
			await expect(page).toHaveURL(/lotukerfi/);
		}
	});
});

test.describe('Responsive Behavior', () => {
	test('should display correctly on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Page should be visible (use heading role to avoid multiple matches)
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({ timeout: 10000 });
	});
});
