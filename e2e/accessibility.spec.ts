/**
 * Basic Accessibility Tests
 * Tests: heading hierarchy, aria-labels, keyboard navigation, landmarks
 *
 * These verify fundamental a11y requirements across key pages.
 *
 * The "Accessibility ratchet" block runs axe-core on five surfaces against
 * e2e/a11y-baseline.json (plan step S1.1); see e2e/helpers/axe.ts. The block after it
 * scans the book home's PDF button, which no build without PDFs renders.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { WCAG_TAGS, fieldsLabelledOnlyByPlaceholder, scanSurface, settle } from './helpers/axe';
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
		await openDialog(page, 'Leita, Ctrl+K');
		for (const f of await fieldsLabelledOnlyByPlaceholder(page, '[role="dialog"]')) unnamed.push(`search: ${f}`);
		expect(unnamed).toEqual([]);
	});
});

// ---------------------------------------------------------------------------------------
// The PDF download buttons, which the ratchet's surfaces never render
// ---------------------------------------------------------------------------------------

/**
 * PdfDownloadButton shows only when /downloads/<book>/manifest.json lists its file, and CI has
 * no PDFs, so the surfaces above never contain one of its three variants: 'Sækja bók sem PDF'
 * on the book home (primary), and 'Sækja kafla N sem PDF' on the chapter page (compact) and in
 * the section page's toolbar (icon). Every page under /<book>/ gets the manifest from the book
 * layout's universal load, with SvelteKit's fetch. A prerender with no manifest gets a 404,
 * whose body the load never reads, so nothing is inlined in the page: hydration runs the load
 * again in the browser and fetches the file over the network, where page.route() answers it.
 * No file under static/downloads/ is needed. A build made WITH PDFs inlines the real manifest
 * and never asks, so the buttons render from that one: the names' sizes are matched as a pattern.
 */
const PDF_CHAPTER = (() => {
	const m = SECTION?.match(/\/kafli\/(\d+)\//);
	return m ? Number(m[1]) : null;
})();

const PDF_MANIFEST = BOOK && {
	generatedAt: '2026-11-04T00:00:00.000Z',
	bookSlug: BOOK,
	// scripts/generate-pdfs.js names the whole book `<slug>-bok.pdf`; 48,234,496 bytes is "46 MB".
	full: { file: `${BOOK}-bok.pdf`, sizeBytes: 48_234_496, pageCount: 1200 },
	// The chapter the section scan opens, which both chapter variants look up by chapterNum. A
	// chapter is `<slug>-kafli-NN.pdf`; 3,250,586 bytes is "3,1 MB".
	chapters:
		PDF_CHAPTER === null
			? []
			: [
					{
						chapterNum: PDF_CHAPTER,
						title: `Kafli ${PDF_CHAPTER}`,
						file: `${BOOK}-kafli-${String(PDF_CHAPTER).padStart(2, '0')}.pdf`,
						sizeBytes: 3_250_586,
						pageCount: 64,
						startPage: 1
					}
				]
};

const PDF_SIZE = String.raw`\(\d+(,\d)? (B|KB|MB)\)`;

interface PdfButton {
	variant: 'primary' | 'compact' | 'icon';
	where: string;
	path: string | null;
	/** The link's accessible name, size included. */
	name: RegExp;
	/** The button's container, which axe scans. */
	scope: string;
	/**
	 * axe rules that must have measured the button and passed it, so an empty or wrong scope
	 * cannot pass. An icon-only link has no text, so axe measures no colour for it (WCAG
	 * 1.4.11's non-text contrast is outside axe): its name is what axe can check.
	 */
	measured: string[];
}

const PDF_BUTTONS: PdfButton[] = [
	{
		variant: 'primary',
		where: 'book home',
		path: BOOK && `/${BOOK}/`,
		name: new RegExp(`^Sækja bók sem PDF ${PDF_SIZE}$`),
		scope: '.book-home-actions',
		measured: ['color-contrast', 'link-name']
	},
	{
		variant: 'compact',
		where: 'chapter page',
		path: SECTION && SECTION.replace(/[^/]+\/$/, ''),
		name: new RegExp(`^Sækja kafla ${PDF_CHAPTER} sem PDF ${PDF_SIZE}$`),
		scope: '.chapter-view div:has(> a.pdf-btn-compact)',
		measured: ['color-contrast', 'link-name']
	},
	{
		variant: 'icon',
		where: 'section page',
		path: SECTION,
		name: new RegExp(`^Sækja kafla ${PDF_CHAPTER} sem PDF ${PDF_SIZE}$`),
		// The toolbar beside the reading time: print, PDF, share, notes and bookmark.
		scope: 'div:has(> a.pdf-btn-icon)',
		measured: ['link-name']
	}
];

test.describe('PDF download buttons (axe, WCAG 2.1 A and AA)', () => {
	// No service worker: page.route() does not see requests a service worker makes.
	test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

	// The scan also runs label-content-name-mismatch (WCAG 2.5.3, the visible text must be in
	// the name), which the compact button failed while it showed its size without the name's
	// parentheses. It is not in `measured`: it applies only while a button has an aria-label.
	for (const pdf of PDF_BUTTONS) {
		for (const theme of THEMES) {
			for (const viewport of VIEWPORTS) {
				test(`${pdf.where} (${pdf.variant}), ${theme} theme at ${viewport.width} px: the button and its container have no failure`, async ({
					page
				}) => {
					test.skip(!pdf.path, 'no published book is synced');
					await page.setViewportSize(viewport);
					await page.route(`**/downloads/${BOOK}/manifest.json`, (route) => route.fulfill({ json: PDF_MANIFEST }));
					await seedTheme(page, theme);
					await page.goto(pdf.path!);
					await page.waitForLoadState('networkidle');
					if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
					else await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/);

					// The name carries the size, as generate-pdfs.js's manifest gives it ("46 MB" and
					// "3,1 MB" from the fixture; whatever size a build with real PDFs inlined). The icon
					// variant has no text: its name is its aria-label (its title says the same).
					const button = page.locator(`a.pdf-btn-${pdf.variant}`);
					await expect(button).toBeVisible();
					await expect(button).toHaveRole('link');
					await expect(button).toHaveAccessibleName(pdf.name);
					await expect(button).toHaveAttribute('href', new RegExp(`^/downloads/${BOOK}/[a-zA-Z0-9._-]+\\.pdf$`));

					await settle(page);
					const results = await new AxeBuilder({ page }).include(pdf.scope).withTags(WCAG_TAGS).analyze();
					const failures = results.violations.flatMap((v) =>
						v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}\n    ${n.failureSummary ?? ''}`)
					);
					expect(failures, failures.join('\n')).toEqual([]);
					// Not a vacuous pass: axe measured the button itself (its element or its text), the
					// one PDF button in the scope.
					for (const rule of pdf.measured) {
						const passed = results.passes
							.find((r) => r.id === rule)
							?.nodes.some((n) => n.target.join(' ').includes('pdf-btn') || n.html.includes('pdf-btn'));
						expect(passed, `axe's ${rule} rule measured the ${pdf.variant} PDF button and passed it`).toBe(true);
					}
				});
			}
		}
	}
});
