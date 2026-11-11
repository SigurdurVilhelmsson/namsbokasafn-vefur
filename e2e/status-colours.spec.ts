/**
 * Status colours on the section toolbar, the section's objectives and /markmid (plan step
 * SF.1, register UI-16): text passes axe's color-contrast in both themes, and every icon
 * and the coverage bar reach 3:1 against what is behind them (WCAG 1.4.11, which axe does
 * not measure). The states a reader makes are scanned too: read, bookmarked, an objective
 * completed and rated, the share button's "copied".
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';
import { settle } from './helpers/axe';

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

/** Marks the element so axe can be scoped to it, and returns the selector. */
async function scope(locator: Locator, name: string): Promise<string> {
	await locator.evaluate((el, n) => el.setAttribute('data-e2e-scope', n), name);
	return `[data-e2e-scope="${name}"]`;
}

/**
 * axe's color-contrast failures inside `selectors`. One include() per selector: an ARRAY passed
 * to include() is a path through frames, which matches nothing here and scans nothing.
 * Throws if axe measured no text at all, so an empty scope cannot pass.
 */
async function contrastFailures(page: Page, selectors: string[]): Promise<string[]> {
	await page.mouse.move(0, 0); // no hover state in the scan
	const builder = new AxeBuilder({ page }).withRules(['color-contrast']);
	for (const selector of selectors) builder.include(selector);
	const results = await builder.analyze();
	const measured = [...results.passes, ...results.violations, ...results.incomplete].reduce((n, r) => n + r.nodes.length, 0);
	if (measured === 0) throw new Error(`axe measured no text in ${selectors.join(', ')}`);
	return results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary ?? ''}`));
}

/**
 * The contrast of `fg` (a colour read from `fgOf`) against the backgrounds painted behind
 * `element`, composited the way the browser paints them. Colours go through a canvas, so
 * oklch and the like come back as sRGB.
 */
async function contrastOf(element: Locator, fgOf: 'color' | 'background-color'): Promise<number> {
	return element.evaluate((el, which) => {
		const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
		const rgba = (css: string): [number, number, number, number] => {
			ctx.clearRect(0, 0, 1, 1);
			ctx.fillStyle = '#000';
			ctx.fillStyle = css;
			ctx.fillRect(0, 0, 1, 1);
			const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
			return [r, g, b, a / 255];
		};
		const over = (top: number[], bottom: number[]) => top.slice(0, 3).map((c, i) => c * top[3] + bottom[i] * (1 - top[3]));
		// What is painted behind `start`: its ancestors' backgrounds, composited from the root down.
		const behind = (start: Element | null): number[] => {
			const layers: number[][] = [];
			for (let node = start; node; node = node.parentElement) {
				const c = rgba(getComputedStyle(node).backgroundColor);
				if (c[3] > 0) layers.push(c);
				if (c[3] >= 1) break;
			}
			return layers.reverse().reduce((acc, layer) => over(layer, acc), [255, 255, 255]);
		};
		const lum = ([r, g, b]: number[]) => {
			const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
			return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
		};
		const target = which === 'color' ? (el.querySelector('svg') ?? el) : el;
		const bg = behind(which === 'color' ? el : el.parentElement);
		const fg = over(rgba(getComputedStyle(target)[which === 'color' ? 'color' : 'backgroundColor']), bg);
		const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
		return (hi + 0.05) / (lo + 0.05);
	}, fgOf);
}

for (const theme of THEMES) {
	test.describe(`Status colours, ${theme} theme`, () => {
		test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });
		test.beforeEach(async ({ page, context }) => {
			test.skip(!SECTION, 'no published book is synced');
			await context.grantPermissions(['clipboard-read', 'clipboard-write']);
			await seedTheme(page, theme);
			// The toolbar's PDF icon renders only with a list that names this chapter.
			const chapter = Number(SECTION!.match(/\/kafli\/(\d+)\//)![1]);
			await page.route(`**/downloads/${BOOK}/manifest.json`, (route) =>
				route.fulfill({
					json: {
						generatedAt: '2026-11-11T00:00:00.000Z',
						bookSlug: BOOK,
						full: { file: `${BOOK}-bok.pdf`, sizeBytes: 1, pageCount: 1 },
						chapters: [
							{ chapterNum: chapter, title: '', file: `${BOOK}-kafli-${String(chapter).padStart(2, '0')}.pdf`, sizeBytes: 1, pageCount: 1 }
						]
					}
				})
			);
		});

		test('the section toolbar and objectives: text passes axe, icons reach 3:1, before and after a reader acts', async ({ page }) => {
			await page.goto(SECTION!);
			const print = page.getByRole('button', { name: 'Prenta kafla' });
			await expect(print).toBeVisible();
			const objectives = page.getByRole('heading', { name: 'Námsmarkmið', level: 3 }).locator('../..');
			await expect(objectives).toBeVisible();
			const selectors = [await scope(print.locator('../..'), 'toolbar-row'), await scope(objectives, 'objectives')];
			await settle(page);

			const icons = (bookmarkName: string) => [
				print,
				page.getByRole('link', { name: /^Sækja kafla \d+ sem PDF/ }),
				page.getByRole('button', { name: 'Opna athugasemdir' }),
				page.getByRole('button', { name: bookmarkName })
			];
			const iconFailures = async (list: Locator[]) => {
				const out: string[] = [];
				for (const icon of list) {
					const ratio = await contrastOf(icon, 'color');
					if (ratio < 3) out.push(`${await icon.getAttribute('aria-label')}: ${ratio.toFixed(2)}:1`);
				}
				return out;
			};

			expect(await contrastFailures(page, selectors), 'before').toEqual([]);
			expect(await iconFailures([...icons('Bæta við bókamerki'), page.getByRole('button', { name: 'Deila kafla' })]), 'icons before').toEqual([]);

			await page.getByRole('button', { name: 'Merkja markmið 1 sem lokið' }).click();
			await page.getByRole('button', { name: 'Bæta við bókamerki' }).click();
			await page.getByRole('button', { name: 'Merkja sem lesið' }).click();
			await expect(page.getByText('Lesið', { exact: true })).toBeVisible();
			await settle(page);
			expect(await contrastFailures(page, selectors), 'after').toEqual([]);
			expect(
				await iconFailures([...icons('Fjarlægja bókamerki'), page.getByRole('button', { name: 'Afmerkja markmið 1' })]),
				'icons after'
			).toEqual([]);

			await page.getByRole('button', { name: 'Deila kafla' }).click();
			const copied = page.getByRole('button', { name: 'Hlekkur afritaður' });
			await expect(copied).toBeVisible();
			expect(await iconFailures([copied]), 'the share button once copied').toEqual([]);
		});

		test('/markmid: text passes axe, the marker and the coverage bar reach 3:1', async ({ page }) => {
			await page.goto(SECTION!);
			await page.getByRole('button', { name: 'Merkja markmið 1 sem lokið' }).click();
			await page.goto(`/${BOOK}/markmid`);
			const marker = page.getByRole('button', { name: 'Afmerkja sem lokið' }).first();
			await expect(marker).toBeVisible();
			// Rate it 1, so the low-confidence box shows too.
			await page.getByRole('button', { name: '1', exact: true }).first().click();
			await expect(page.getByRole('heading', { name: 'Þarfnast endurskoðunar' })).toBeVisible();
			await settle(page);

			expect(await contrastFailures(page, ['main'])).toEqual([]);
			expect(await contrastOf(marker, 'color'), "the completed marker's check").toBeGreaterThanOrEqual(3);
			const bar = page.locator('main .h-2.rounded-full > div[style*="width"]');
			await expect(bar).toHaveCount(1);
			expect(await contrastOf(bar, 'background-color'), 'the coverage bar against its track').toBeGreaterThanOrEqual(3);
		});
	});
}
