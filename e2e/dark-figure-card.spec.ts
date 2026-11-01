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
});
