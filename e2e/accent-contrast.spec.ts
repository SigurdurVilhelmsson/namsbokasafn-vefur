/**
 * Contrast of the accent tokens where the accessibility ratchet cannot see it (plan step S2.1,
 * decision D01, register UI-02).
 *
 * The ratchet scans five surfaces at rest, so it misses:
 *   - the learning-objective number, amber text on the objectives box: axe skips one-character
 *     text, so it reports the failure only for two-digit numbers;
 *   - the breadcrumb list, which is closed while the page is scanned;
 *   - a primary button under the pointer: no scan forces :hover.
 * Each test measures that place directly, in both themes.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';
import { textContrast } from './helpers/contrast';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const THEMES = ['light', 'dark'] as const;

/** The seeded theme took effect, so a test measures the colours it names. */
async function expectTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
	const html = page.locator('html');
	if (theme === 'dark') await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
	else await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
}

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

test.describe('Accent contrast the ratchet cannot see (D01)', () => {
	test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

	for (const theme of THEMES) {
		test.describe(`${theme} theme`, () => {
			test('the learning-objective number reaches 4.5:1 on its box', async ({ page }) => {
				test.skip(!SECTION, 'no published book is synced');
				await seedTheme(page, theme);
				await page.goto(SECTION!);
				await expectTheme(page, theme);
				const number = page.getByRole('button', { name: /^Merkja markmið 1 sem/ }).locator('span');
				test.skip((await number.count()) === 0, 'this section has no learning objectives');
				await expect(number).toHaveText('1');
				const ratio = await textContrast(page, 'button[aria-label^="Merkja markmið 1 sem"] span');
				expect(ratio, `objective number at ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
			});

			test('the open breadcrumb list has no colour-contrast failure', async ({ page }) => {
				test.skip(!SECTION, 'no published book is synced');
				await seedTheme(page, theme);
				await page.goto(SECTION!);
				// The list opens from a Svelte handler: click only once the page has hydrated.
				await page.waitForLoadState('networkidle');
				await expectTheme(page, theme);
				await page.locator('.breadcrumb-btn').click();
				await expect(page.getByRole('listbox', { name: 'Undirkaflar' })).toBeVisible();
				const current = await textContrast(page, '.breadcrumb-option.current .truncate');
				expect(current, `current section at ${current.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
				const { violations } = await new AxeBuilder({ page })
					.include('.breadcrumb-dropdown')
					.withRules(['color-contrast'])
					.analyze();
				expect(violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
			});

			test('a primary button keeps 4.5:1 under the pointer', async ({ page }) => {
				await seedTheme(page, theme);
				await page.goto('/');
				await expectTheme(page, theme);
				const button = page.locator('.btn-primary').first();
				test.skip((await button.count()) === 0, 'the catalogue has no primary button');
				const rest = await textContrast(page, '.btn-primary');
				await button.hover();
				const hovered = await textContrast(page, '.btn-primary');
				expect(rest, `at rest ${rest.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
				expect(hovered, `hovered ${hovered.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
			});
		});
	}
});
