/**
 * Figure images sit on a white card in the dark theme (efni C140 ㊶).
 *
 * Every composed vector figure from efni is line art on a transparent background, so on
 * the dark page its black lines would be drawn straight onto near-black. Raster figures
 * are opaque white already. The light theme leaves images as they are.
 */

import { test, expect, type Page } from '@playwright/test';
import { sectionsContaining } from './helpers/content-fixtures';

type Theme = 'light' | 'dark';

/** Reader URL of a section with figures, picked from the synced content. */
const SECTION = sectionsContaining('<figure', 1)[0];

/** Store the theme the way the Settings dialog does, before the page's scripts run. */
async function seedTheme(page: Page, theme: Theme): Promise<void> {
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
 * Open the section in a stored theme, and wait until hydration has applied it.
 *
 * Hydration runs after the load event that `goto` waits for, and two things there set the
 * `dark` class from the stored theme: the settings store when it loads (`settings.ts`), then
 * the root layout's theme `$effect` (`+layout.svelte`). A class the test added by hand before
 * them was removed again, and on a slow runner the image was measured without its card
 * (2 of 5 CI runs on 2026-11-01). With the theme stored, both agree with it, so the class
 * appearing is the wait, and nothing removes it afterwards. The light theme cannot race this
 * way (it is the default, and nothing adds the class), but opens the same way.
 */
async function openInTheme(page: Page, theme: Theme): Promise<void> {
	await seedTheme(page, theme);
	await page.goto(SECTION);
	const html = page.locator('html');
	const dark = /(^|\s)dark(\s|$)/;
	if (theme === 'dark') await expect(html).toHaveClass(dark, { timeout: 15000 });
	else await expect(html).not.toHaveClass(dark);
}

/** Background and left padding of the first figure image in the reading column. */
async function figureImage(page: Page) {
	const img = page.locator('.reading-content figure img').first();
	await expect(img).toBeAttached({ timeout: 15000 });
	return img.evaluate((el) => {
		const s = getComputedStyle(el);
		return { background: s.backgroundColor, padding: s.paddingLeft };
	});
}

/** An SVG image of `w` × `h` CSS px, line art like efni's composed figures. */
function svgImage(w: number, h: number): string {
	const svg =
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
		`<rect width="${w}" height="${h}" fill="none" stroke="black"/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** An address the test holds open, so the image never loads. */
const PENDING_IMAGE = '/dark-figure-card-pending.svg';

/**
 * Put a figure at the top of the reading column whose image carries the `width` and
 * `height` attributes efni's H1 adds (register §C201: the CSS px the image displays at),
 * and measure it: the image's content box (the picture), its outer box (with the card's
 * padding) and the column. `load: false` measures it before its image arrives.
 */
async function sizedFigure(page: Page, w: number, h: number, { load = true } = {}) {
	await expect(page.locator('.reading-content').first()).toBeAttached({ timeout: 15000 });
	return page.evaluate(
		async ({ w, h, src }) => {
			const figure = document.createElement('figure');
			const img = document.createElement('img');
			img.setAttribute('width', String(w));
			img.setAttribute('height', String(h));
			img.setAttribute('alt', '');
			img.src = src;
			figure.append(img);
			document.querySelector('.reading-content')!.prepend(figure);
			if (src.startsWith('data:')) await img.decode();
			const s = getComputedStyle(img);
			const box = img.getBoundingClientRect();
			const px = (v: string) => parseFloat(v);
			return {
				content: {
					width: Math.round(box.width - px(s.paddingLeft) - px(s.paddingRight)),
					height: Math.round(box.height - px(s.paddingTop) - px(s.paddingBottom))
				},
				outer: Math.round(box.width),
				column: Math.round(figure.getBoundingClientRect().width)
			};
		},
		{ w, h, src: load ? svgImage(w, h) : PENDING_IMAGE }
	);
}

test.describe('Figure images in the dark theme', () => {
	test.skip(!SECTION, 'No synced section with a figure');

	test('sit on a white card', async ({ page }) => {
		await openInTheme(page, 'dark');
		expect(await figureImage(page)).toEqual({ background: 'rgb(255, 255, 255)', padding: '8px' });
	});

	test('the light theme leaves them as they are', async ({ page }) => {
		await openInTheme(page, 'light');
		expect(await figureImage(page)).toEqual({ background: 'rgba(0, 0, 0, 0)', padding: '0px' });
	});

	// The card's padding must sit outside the size the attributes give. Tailwind's preflight
	// makes every element border-box, so without `box-sizing: content-box` the 8 px padding
	// went inside the width attribute: a 156 px figure drew at 140 × 108 (measured
	// 2026-11-07), while without the attributes it draws at 156 × 120.
	test('keep the size their width and height attributes give them, the card outside it', async ({
		page
	}) => {
		await openInTheme(page, 'dark');
		const figure = await sizedFigure(page, 156, 120);
		expect(figure.content).toEqual({ width: 156, height: 120 });
		expect(figure.outer).toBe(156 + 16);
	});

	test('a figure wider than the column stays inside it, card included', async ({ page }) => {
		await openInTheme(page, 'dark');
		const figure = await sizedFigure(page, 4000, 2000);
		expect(figure.outer).toBe(figure.column);
		expect(figure.content.width).toBe(figure.column - 16);
	});

	// H1's point: the attributes reserve the image's box before it loads, so nothing moves
	// when it arrives. `width: auto` would undo the shrink above but lose this.
	test('reserve the same box before the image arrives', async ({ page }) => {
		await page.route(`**${PENDING_IMAGE}`, () => {});
		await openInTheme(page, 'dark');
		const figure = await sizedFigure(page, 156, 120, { load: false });
		expect(figure.content).toEqual({ width: 156, height: 120 });
	});
});
