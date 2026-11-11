/**
 * The PDF list (/downloads/<book>/manifest.json) never holds up a page.
 *
 * The book layout used to await it in its load, so a hard load of any book page waited
 * for it before showing anything. The live site has no PDFs yet and answers the address
 * with its 200 SPA shell, so every reader paid that round trip for nothing (measured
 * 2026-11-11: holding the response 3 s on the live site moved the section's text from
 * ~650 ms to ~3,630 ms). A build made WITH static/downloads/ carries the list inline and
 * never asks, so the hold test skips there by name; CI, like production, has no PDFs.
 */
import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const CHAPTER = SECTION ? Number(SECTION.match(/\/kafli\/(\d+)\//)![1]) : null;
const MANIFEST = `**/downloads/${BOOK}/manifest.json`;

/** The section's own text: getByRole skips hidden elements, such as the page-data block */
const sectionText = (page: Page) => page.locator('article.cnx-module').getByRole('paragraph').first();

test.describe('The PDF list never holds up the page', () => {
	// No service worker: page.route() does not see requests a service worker makes.
	test.use({ serviceWorkers: 'block' });

	let inline = false;
	const INLINE = 'this build carries the PDF list inline (static/downloads/ exists), so the page never asks for it';

	test.beforeEach(async ({ request }) => {
		test.skip(!SECTION, 'no published book is synced');
		inline = (await (await request.get(SECTION!)).text()).includes(`data-url="/downloads/${BOOK}/manifest.json"`);
	});

	test("a section's text appears while the PDF list is still on its way", async ({ page }) => {
		test.skip(inline, INLINE);
		let asked = false;
		let release!: () => void;
		const released = new Promise<void>((resolve) => (release = resolve));
		await page.route(MANIFEST, async (route) => {
			asked = true;
			await released;
			await route.fulfill({ status: 404, body: 'Not Found' }).catch(() => {});
		});
		try {
			await page.goto(SECTION!);
			await expect(sectionText(page)).toBeVisible({ timeout: 15_000 });
			expect(asked, 'the page asked for the PDF list (so the hold applied)').toBe(true);
		} finally {
			release();
		}
	});

	test('the PDF buttons still appear once a list arrives', async ({ page }) => {
		await page.route(MANIFEST, async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1_500));
			await route.fulfill({
				json: {
					generatedAt: '2026-11-11T00:00:00.000Z',
					bookSlug: BOOK,
					full: { file: `${BOOK}-bok.pdf`, sizeBytes: 48_234_496, pageCount: 1200 },
					chapters: [
						{
							chapterNum: CHAPTER,
							title: `Kafli ${CHAPTER}`,
							file: `${BOOK}-kafli-${String(CHAPTER).padStart(2, '0')}.pdf`,
							sizeBytes: 3_250_586,
							pageCount: 64,
							startPage: 1
						}
					]
				}
			});
		});
		await page.goto(SECTION!);
		const button = page.locator('a.pdf-btn-icon');
		await expect(button).toBeVisible({ timeout: 15_000 });
		await expect(button).toHaveAttribute('href', `/downloads/${BOOK}/${BOOK}-kafli-${String(CHAPTER).padStart(2, '0')}.pdf`);
	});

	test("the live server's answer to a missing list (its 200 SPA shell) shows no button and no error", async ({ page }) => {
		test.skip(inline, INLINE);
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		let answered = false;
		await page.route(MANIFEST, async (route) => {
			await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body>shell</body></html>' });
			answered = true;
		});
		await page.goto(SECTION!);
		await expect(sectionText(page)).toBeVisible({ timeout: 15_000 });
		await expect.poll(() => answered, { timeout: 15_000 }).toBe(true);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('a.pdf-btn-icon')).toHaveCount(0);
		expect(errors).toEqual([]);
	});
});
