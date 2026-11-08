/**
 * Ctrl+P on a section page prints the book's text whole (app.css's @media print block; the
 * worklist's bl-print-glossary-terms). Before the fix the block hid every [role="button"], which
 * took the in-text glossary terms with it, since the tooltip action gives each term that role (17
 * of §1.2's 18 on efni's ② preview), and every <aside>, which took the book's notes and examples
 * with the app's own chrome. The /print/* PDF routes use static/styles/print.css and are not this.
 */
import { test, expect, type Page } from '@playwright/test';
import { publishedBook, tocSectionUrls } from './helpers/content-fixtures';
import { seedSettings } from './helpers/seedSettings';

const BOOK = publishedBook();

/** Reader URL of a module section of the published book by its number ('1.2'), or null */
function sectionUrl(number: string): string | null {
	if (!BOOK) return null;
	const [chapter, section] = number.split('.');
	const file = tocSectionUrls(BOOK).find((u) => new RegExp(`/${chapter}-${section}-[^/]+\\.html$`).test(u));
	const m = file?.match(/\/chapters\/([^/]+)\/([^/]+)\.html$/);
	return m ? `/${BOOK}/kafli/${m[1]}/${m[2]}/` : null;
}

const URL_1_2 = sectionUrl('1.2');

/** Whether each element the selector finds renders under the media in effect: a box, not display: none */
const rendering = (page: Page, selector: string) =>
	page.evaluate(
		(sel) =>
			Array.from(document.querySelectorAll<HTMLElement>(sel), (el) => ({
				what: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${el.textContent?.trim().slice(0, 30) ?? ''}`,
				shown: getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0
			})),
		selector
	);

/** Opens the section and waits until the tooltip action has marked its terms with role="button" */
async function openWithTerms(page: Page, url: string) {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
	await expect(page.locator('article.cnx-module dfn.term[role="button"]').first()).toBeAttached({ timeout: 15000 });
}

async function expectBookTextPrinted(page: Page) {
	const terms = await rendering(page, 'article.cnx-module dfn.term');
	const asides = await rendering(page, 'article.cnx-module aside');
	expect(terms.length, "§1.2's glossary terms").toBeGreaterThan(5);
	expect(asides.length, "§1.2's notes").toBeGreaterThan(0);
	expect(terms.filter((t) => !t.shown).map((t) => t.what), 'terms hidden in print').toEqual([]);
	expect(asides.filter((a) => !a.shown).map((a) => a.what), 'asides hidden in print').toEqual([]);
}

test.describe('Ctrl+P on a section prints the glossary terms and the notes', () => {
	test.skip(!URL_1_2, 'No §1.2 synced');
	test.use({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });

	test('scrolled: every term and every aside of §1.2 renders in print', async ({ page }) => {
		await openWithTerms(page, URL_1_2!);
		await page.emulateMedia({ media: 'print' });
		await expectBookTextPrinted(page);
	});

	test('paged, after beforeprint: every term and every aside of §1.2 renders in print', async ({ page }) => {
		await seedSettings(page, { readingMode: 'paged' });
		await openWithTerms(page, URL_1_2!);
		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({ timeout: 15000 });
		await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
		await page.emulateMedia({ media: 'print' });
		await expectBookTextPrinted(page);
	});

	// fix/print-header: the block hid every <header>, the section's own included, so a printed
	// section had no title
	for (const mode of ['scrolled', 'paged'] as const) {
		test(`${mode}: the section's title prints, the app's header does not, and the objectives print once`, async ({
			page
		}) => {
			if (mode === 'paged') await seedSettings(page, { readingMode: 'paged' });
			await openWithTerms(page, URL_1_2!);
			if (mode === 'paged') {
				await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toBeVisible({ timeout: 15000 });
				await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
			}
			await page.emulateMedia({ media: 'print' });
			const titles = await rendering(page, 'article.cnx-module h1');
			expect(titles, "§1.2's title").toHaveLength(1);
			expect(titles[0].shown, `${titles[0].what} renders in print`).toBe(true);
			const printed = await page.evaluate(() => {
				const shown = (el: Element) => getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
				const app = document.querySelector('header.header');
				return {
					appHeader: app ? shown(app) : false,
					// The page's own objectives box, and the content's copy hidden beside it (hideStaticObjectives)
					objectives: Array.from(document.querySelectorAll('h2, h3')).filter(
						(h) => h.textContent?.trim() === 'Námsmarkmið' && shown(h)
					).length
				};
			});
			expect(printed).toEqual({ appHeader: false, objectives: 1 });
		});
	}

	// A control: the fix frees the book's text, not the app's chrome, which stays off paper
	test("the app's own asides, its nav and its buttons stay out of print", async ({ page }) => {
		await seedSettings(page, { sidebarOpen: true });
		await openWithTerms(page, URL_1_2!);
		await page.emulateMedia({ media: 'print' });
		const chrome = await page.evaluate(() => {
			const hidden = (el: Element | null) => !el || getComputedStyle(el).display === 'none';
			return {
				sidebar: hidden(document.querySelector('aside.sidebar')),
				notice: hidden(document.querySelector('aside.preview-banner')),
				nav: Array.from(document.querySelectorAll('nav')).every(hidden),
				buttons: Array.from(document.querySelectorAll('button')).every(hidden)
			};
		});
		expect(chrome).toEqual({ sidebar: true, notice: true, nav: true, buttons: true });
	});
});
