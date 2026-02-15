/**
 * Theme & Settings Persistence Tests
 * Tests: theme toggle, dark mode persistence across page reload, font settings
 */

import { test, expect } from '@playwright/test';

test.describe('Theme Toggle', () => {
	test('should toggle dark mode on landing page', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		// Initially should be light mode (no 'dark' class on html)
		const isDarkInitially = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkInitially).toBe(false);

		// Click theme toggle
		const themeToggle = page.locator('button.theme-toggle');
		await expect(themeToggle).toBeVisible();
		await themeToggle.click();

		// Should now be dark mode
		const isDarkAfterToggle = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkAfterToggle).toBe(true);
	});

	test('should persist theme across page reload', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		// Toggle to dark mode
		const themeToggle = page.locator('button.theme-toggle');
		await themeToggle.click();

		// Verify dark class is set
		await expect(page.locator('html.dark')).toBeAttached();

		// Verify localStorage was updated
		const storedSettings = await page.evaluate(() =>
			localStorage.getItem('namsbokasafn:settings')
		);
		expect(storedSettings).toBeTruthy();
		const parsed = JSON.parse(storedSettings!);
		expect(parsed.theme).toBe('dark');

		// Reload the page
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		// Should still be dark mode after reload
		const isDarkAfterReload = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDarkAfterReload).toBe(true);
	});

	test('should persist theme when navigating between pages', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		// Toggle to dark mode
		const themeToggle = page.locator('button.theme-toggle');
		await themeToggle.click();
		await expect(page.locator('html.dark')).toBeAttached();

		// Navigate to a book
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		if (await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await bookLink.click();
			await page.waitForLoadState('networkidle');

			// Dark mode should persist on book page
			const isDark = await page.evaluate(() =>
				document.documentElement.classList.contains('dark')
			);
			expect(isDark).toBe(true);
		}
	});

	test('should have accessible theme toggle button', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		const themeToggle = page.locator('button[aria-label="Skipta um þema"]');
		await expect(themeToggle).toBeVisible();
		await expect(themeToggle).toBeEnabled();
	});
});

test.describe('Settings Persistence', () => {
	test('should store settings in localStorage', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		// Check that settings key exists after page load
		const hasSettings = await page.evaluate(() => {
			const stored = localStorage.getItem('namsbokasafn:settings');
			if (!stored) return false;
			const settings = JSON.parse(stored);
			return (
				typeof settings.theme === 'string' &&
				typeof settings.fontSize === 'string' &&
				typeof settings.fontFamily === 'string'
			);
		});
		expect(hasSettings).toBe(true);
	});

	test('should have default light theme on fresh visit', async ({ page }) => {
		// Clear storage before navigating
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Námsbókasafn', exact: true })).toBeVisible({
			timeout: 15000
		});

		const isDark = await page.evaluate(() =>
			document.documentElement.classList.contains('dark')
		);
		expect(isDark).toBe(false);
	});
});
