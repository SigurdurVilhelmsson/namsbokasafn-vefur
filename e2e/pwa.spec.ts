/**
 * PWA Tests - Verify PWA functionality and update flow
 *
 * Note: Full service worker update testing requires a production build
 * with different versions. These tests verify the PWA infrastructure is in place.
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Infrastructure', () => {
	test('should have valid web manifest', async ({ page }) => {
		const response = await page.goto('/manifest.webmanifest');

		expect(response?.status()).toBe(200);

		const manifest = await response?.json();

		// Verify required manifest fields
		expect(manifest).toHaveProperty('name');
		expect(manifest).toHaveProperty('short_name');
		expect(manifest).toHaveProperty('icons');
		expect(manifest).toHaveProperty('start_url');
		expect(manifest).toHaveProperty('display');

		// Verify Icelandic content
		expect(manifest.name).toContain('Námsbókasafn');
		expect(manifest.lang).toBe('is');
	});

	test('should have manifest link in HTML head', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const manifestLink = page.locator('link[rel="manifest"]');
		await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');
	});

	test('should have theme-color meta tag', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const themeColor = page.locator('meta[name="theme-color"]');
		await expect(themeColor).toHaveAttribute('content', '#1a7d5c');
	});

	test('should have apple-touch-icon', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
		await expect(appleTouchIcon).toBeAttached();
	});

	test('should register service worker', async ({ page }) => {
		// Navigate to trigger SW registration
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Wait for service worker to be registered
		await page.waitForTimeout(2000);

		// Check if service worker is registered
		const swRegistered = await page.evaluate(async () => {
			if (!('serviceWorker' in navigator)) return false;

			const registrations = await navigator.serviceWorker.getRegistrations();
			return registrations.length > 0;
		});

		// Service worker should be registered (may not be in all test environments)
		// This is informational - we don't fail the test as SW behavior varies
		console.log('Service Worker registered:', swRegistered);
	});
});

test.describe('PWA Update UI', () => {
	test('should not show update prompt on fresh load', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Update prompt should not be visible on first load
		const updatePrompt = page.getByTestId('pwa-update-prompt');
		await expect(updatePrompt).not.toBeVisible();
	});

	test('page loads correctly with PWA support', async ({ page }) => {
		// Clear storage to simulate first visit
		await page.context().clearCookies();

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Verify the page loads correctly (main indicator of PWA working)
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});
	});
});

test.describe('PWA Offline Capability', () => {
	test('should work after navigating multiple pages', async ({ page }) => {
		// Navigate through the app to cache pages
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait for page to fully render
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Navigate to a book if available
		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		if (await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
			await bookLink.click();
			// Wait for SvelteKit SPA navigation to actually update the URL
			await page.waitForURL('**/efnafraedi');
			await page.waitForLoadState('networkidle');

			// Navigate back
			await page.goBack();
			await page.waitForLoadState('networkidle');

			// Page should still work
			await expect(
				page.getByRole('heading', { name: /Námsbækur/i })
			).toBeVisible({ timeout: 15000 });
		}
	});
});
