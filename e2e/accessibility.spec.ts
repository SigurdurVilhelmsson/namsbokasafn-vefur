/**
 * Basic Accessibility Tests
 * Tests: heading hierarchy, aria-labels, keyboard navigation, landmarks
 *
 * These verify fundamental a11y requirements across key pages.
 *
 * The "Accessibility ratchet" block at the end runs axe-core on five surfaces against
 * e2e/a11y-baseline.json (plan step S1.1); see e2e/helpers/axe.ts.
 */

import { test, expect, type Page } from '@playwright/test';
import { fieldsLabelledOnlyByPlaceholder, scanSurface, settle } from './helpers/axe';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

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
		// Case-insensitive: the hero title is "Þýddar námsbækur í opnum aðgangi"
		expect(h1Text?.toLowerCase()).toContain('námsbækur');
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
		// level: 1 — chapter cards also render headings containing "efnafræði"
		const heading = page.getByRole('heading', { level: 1, name: /Efnafræði/i });
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
		// A client-side navigation: wait for the book page itself, or the
		// link lookup below runs on the landing page
		await expect(page).toHaveURL(/\/efnafraedi-2e\//);

		const sectionLink = page.locator('a[href*="/kafli/"]').first();
		await expect(sectionLink).toBeVisible({ timeout: 10000 });

		await sectionLink.click();
		await page.waitForLoadState('networkidle');

		// Content should be in an article element
		const article = page.locator('article').first();
		await expect(article).toBeVisible({ timeout: 15000 });
	});

	test('should have heading in section content', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
		await bookLink.click();
		// A client-side navigation: wait for the book page itself, or the
		// link lookup below runs on the landing page
		await expect(page).toHaveURL(/\/efnafraedi-2e\//);

		const sectionLink = page.locator('a[href*="/kafli/"]').first();
		await expect(sectionLink).toBeVisible({ timeout: 10000 });

		await sectionLink.click();
		await page.waitForLoadState('networkidle');

		// Article should have at least one heading
		const article = page.locator('article').first();
		await expect(article).toBeVisible({ timeout: 15000 });

		const headings = article.locator('h1, h2, h3, h4');
		const count = await headings.count();
		expect(count).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------------------
// Accessibility ratchet (plan step S1.1, register UI-24)
// ---------------------------------------------------------------------------------------

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const VIEWPORTS = [
	{ width: 390, height: 844 },
	{ width: 1280, height: 800 }
];
const THEMES = ['light', 'dark'] as const;

/**
 * The book text is efni's rendered HTML, and it differs between CI and a checkout, so the
 * scans leave it out; content.css is a cross-repo contract checked in efni.
 */
const BOOK_TEXT = '.reading-content';

interface Surface {
	name: string;
	path: string | null;
	open?: (page: Page) => Promise<void>;
	include?: string;
}

async function openDialog(page: Page, button: string): Promise<void> {
	await page.getByRole('button', { name: button, exact: true }).filter({ visible: true }).first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
}

const SURFACES: Surface[] = [
	{ name: 'catalogue', path: '/' },
	{ name: 'book-home', path: BOOK && `/${BOOK}/` },
	{ name: 'section', path: SECTION },
	{
		name: 'settings',
		path: SECTION,
		open: (page) => openDialog(page, 'Stillingar'),
		include: '[role="dialog"]'
	},
	{ name: 'greining', path: BOOK && `/${BOOK}/greining/` }
];

async function seedTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
	await page.addInitScript((t) => {
		const key = 'namsbokasafn:settings';
		let stored: Record<string, unknown>;
		try {
			stored = JSON.parse(localStorage.getItem(key) || '{}');
		} catch {
			stored = {};
		}
		localStorage.setItem(key, JSON.stringify({ ...stored, theme: t }));
	}, theme);
}

test.describe('Accessibility ratchet (axe, WCAG 2.1 A and AA)', () => {
	// No service worker: its "ready for offline use" toast comes and goes with timing.
	test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

	for (const theme of THEMES) {
		for (const viewport of VIEWPORTS) {
			test.describe(`${theme} theme at ${viewport.width} px`, () => {
				test.use({ viewport });

				for (const surface of SURFACES) {
					test(`${surface.name}: no failure outside the baseline`, async ({ page }) => {
						test.skip(!surface.path, 'no published book is synced');
						await seedTheme(page, theme);
						await page.goto(surface.path!);
						await page.waitForLoadState('networkidle');
						// The seeded theme took effect, so the scan measures the colours it names.
						if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
						else await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/);
						if (surface.open) await surface.open(page);
						await settle(page);
						await scanSurface(page, {
							name: `${surface.name} ${viewport.width} ${theme}`,
							include: surface.include,
							exclude: [BOOK_TEXT]
						});
					});
				}
			});
		}
	}

	// Scoped scans skip page-level rules, so the one-h1 rule is checked directly.
	for (const viewport of VIEWPORTS) {
		test(`every page has exactly one visible h1 at ${viewport.width} px`, async ({ page }) => {
			await page.setViewportSize(viewport);
			for (const surface of SURFACES.filter((s) => !s.open && s.path)) {
				await page.goto(surface.path!);
				await page.waitForLoadState('networkidle');
				const h1 = page.locator('h1').filter({ visible: true });
				await expect(h1, `${surface.name} (${surface.path})`).toHaveCount(1);
			}
		});
	}

	// axe's label rule accepts a placeholder as a field's name; it vanishes once text is typed.
	test('every text field is named by more than its placeholder', async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		const unnamed: string[] = [];
		for (const surface of SURFACES.filter((s) => s.path)) {
			await page.goto(surface.path!);
			await page.waitForLoadState('networkidle');
			if (surface.open) await surface.open(page);
			for (const f of await fieldsLabelledOnlyByPlaceholder(page, surface.include ?? 'body')) {
				unnamed.push(`${surface.name}: ${f}`);
			}
		}
		await page.goto(SECTION!);
		await page.waitForLoadState('networkidle');
		await openDialog(page, 'Leita');
		for (const f of await fieldsLabelledOnlyByPlaceholder(page, '[role="dialog"]')) unnamed.push(`search: ${f}`);
		expect(unnamed).toEqual([]);
	});
});
