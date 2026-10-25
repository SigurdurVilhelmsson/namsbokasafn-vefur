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

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const THEMES = ['light', 'dark'] as const;

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

/**
 * WCAG 2.x contrast of an element's text colour against the background it is painted on: the
 * element's own background and its ancestors', translucent layers composited over the next one.
 */
async function textContrast(page: Page, selector: string): Promise<number> {
	return page.locator(selector).first().evaluate((el) => {
		type RGBA = [number, number, number, number];
		const probe = document.createElement('canvas').getContext('2d')!;
		// Let the canvas normalise any CSS colour (rgb(), color(srgb …), color-mix() results).
		const parse = (css: string): RGBA => {
			probe.clearRect(0, 0, 1, 1);
			probe.fillStyle = '#000';
			probe.fillStyle = css;
			probe.fillRect(0, 0, 1, 1);
			const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
			return [r, g, b, a / 255];
		};
		const over = (top: RGBA, bottom: RGBA): RGBA => {
			const a = top[3] + bottom[3] * (1 - top[3]);
			if (a === 0) return [0, 0, 0, 0];
			const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
			return [mix(0), mix(1), mix(2), a];
		};
		let bg: RGBA = [0, 0, 0, 0];
		for (let n: Element | null = el; n && bg[3] < 1; n = n.parentElement) {
			bg = over(bg, parse(getComputedStyle(n).backgroundColor));
		}
		bg = over(bg, [255, 255, 255, 1]);
		const fg = over(parse(getComputedStyle(el).color), bg);
		const lum = ([r, g, b]: RGBA) => {
			const c = [r, g, b].map((v) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
		};
		const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	});
}

test.describe('Accent contrast the ratchet cannot see (D01)', () => {
	test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

	for (const theme of THEMES) {
		test.describe(`${theme} theme`, () => {
			test('the learning-objective number reaches 4.5:1 on its box', async ({ page }) => {
				test.skip(!SECTION, 'no published book is synced');
				await seedTheme(page, theme);
				await page.goto(SECTION!);
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
