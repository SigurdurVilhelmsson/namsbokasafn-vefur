/**
 * Basic Accessibility Tests
 * Tests: heading hierarchy, aria-labels, keyboard navigation, landmarks
 *
 * These verify fundamental a11y requirements across key pages.
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page Accessibility', () => {
	test('should have proper heading hierarchy', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Should have exactly one h1
		const h1Count = await page.locator('h1').count();
		expect(h1Count).toBe(1);

		// h1 should contain the hero title
		const h1Text = await page.locator('h1').textContent();
		expect(h1Text).toContain('Námsbækur');
	});

	test('should have lang attribute set to Icelandic', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const lang = await page.locator('html').getAttribute('lang');
		expect(lang).toBe('is');
	});

	test('should have descriptive meta description', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const metaDescription = page.locator('meta[name="description"]');
		await expect(metaDescription).toBeAttached();
		const content = await metaDescription.getAttribute('content');
		expect(content).toBeTruthy();
		expect(content!.length).toBeGreaterThan(10);
	});

	test('should have accessible brand link', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const brandLink = page.locator('a[aria-label="Námsbókasafn forsíða"]');
		await expect(brandLink).toBeVisible();
	});

	test('should have accessible theme toggle', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		const themeToggle = page.locator('button[aria-label="Skipta um þema"]');
		await expect(themeToggle).toBeVisible();

		// Should be focusable via keyboard
		await themeToggle.focus();
		const isFocused = await themeToggle.evaluate(
			(el) => document.activeElement === el
		);
		expect(isFocused).toBe(true);
	});

	test('external links should have rel="noopener noreferrer"', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// Check all external links
		const externalLinks = page.locator('a[target="_blank"]');
		const count = await externalLinks.count();

		for (let i = 0; i < count; i++) {
			const rel = await externalLinks.nth(i).getAttribute('rel');
			expect(rel).toContain('noopener');
		}
	});

	test('should respect prefers-reduced-motion', async ({ page }) => {
		// Emulate reduced motion preference
		await page.emulateMedia({ reducedMotion: 'reduce' });

		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: /Námsbækur/i })).toBeVisible({
			timeout: 15000
		});

		// With reduced motion, animations should be disabled
		// Check that book cards don't have animation delays
		const bookCard = page.locator('article.book-card').first();
		if (await bookCard.isVisible({ timeout: 5000 }).catch(() => false)) {
			const animationDuration = await bookCard.evaluate((el) => {
				return window.getComputedStyle(el).animationDuration;
			});
			// With reduced motion, duration should be 0s or minimal
			expect(animationDuration === '0s' || animationDuration === '0.01s').toBe(true);
		}
	});
});

test.describe('Book Page Accessibility', () => {
	test('should have proper heading on book page', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await expect(bookLink).toBeVisible({ timeout: 10000 });
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Book page should have a heading with the book title
		const heading = page.getByRole('heading', { name: /Efnafræði/i });
		await expect(heading).toBeVisible({ timeout: 10000 });
	});

	test('should have navigation landmarks', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await expect(bookLink).toBeVisible({ timeout: 10000 });
		await bookLink.click();
		await page.waitForLoadState('networkidle');

		// Should have a header element
		const header = page.locator('header');
		await expect(header).toBeVisible({ timeout: 10000 });

		// Should have a main content area
		const main = page.locator('main');
		await expect(main).toBeVisible({ timeout: 10000 });
	});

	test('should have keyboard-navigable chapter links', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await expect(bookLink).toBeVisible({ timeout: 10000 });
		await bookLink.click();
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		// Chapter links should be present and keyboard-accessible
		const chapterLinks = page.locator('a[href*="/kafli/"]');
		const count = await chapterLinks.count();

		if (count > 0) {
			// First chapter link should be focusable
			const firstLink = chapterLinks.first();
			await firstLink.focus();
			const isFocused = await firstLink.evaluate(
				(el) => document.activeElement === el
			);
			expect(isFocused).toBe(true);
		}
	});
});

test.describe('Section Page Accessibility', () => {
	test('should have article element for content', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		const sectionLink = page.locator('a[href*="/kafli/"]').first();
		if (!(await sectionLink.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await sectionLink.click();
		await page.waitForLoadState('networkidle');

		// Content should be in an article element
		const article = page.locator('article');
		await expect(article).toBeVisible({ timeout: 15000 });
	});

	test('should have heading in section content', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(2000);

		const sectionLink = page.locator('a[href*="/kafli/"]').first();
		if (!(await sectionLink.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await sectionLink.click();
		await page.waitForLoadState('networkidle');

		// Article should have at least one heading
		const article = page.locator('article');
		await expect(article).toBeVisible({ timeout: 15000 });

		const headings = article.locator('h1, h2, h3, h4');
		const count = await headings.count();
		expect(count).toBeGreaterThan(0);
	});
});
