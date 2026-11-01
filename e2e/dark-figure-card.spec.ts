/**
 * Figure images sit on a white card in the dark theme (efni C140 ㊶).
 *
 * Every composed vector figure from efni is line art on a transparent background, so on
 * the dark page its black lines would be drawn straight onto near-black. Raster figures
 * are opaque white already. The light theme leaves images as they are.
 */

import { test, expect, type Page } from '@playwright/test';
import { sectionsContaining } from './helpers/content-fixtures';

/** Reader URL of a section with figures, picked from the synced content. */
const SECTION = sectionsContaining('<figure', 1)[0];

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
		await page.goto(SECTION);
		await page.evaluate(() => document.documentElement.classList.add('dark'));
		expect(await figureImage(page)).toEqual({ background: 'rgb(255, 255, 255)', padding: '8px' });
	});

	test('the light theme leaves them as they are', async ({ page }) => {
		await page.goto(SECTION);
		await page.evaluate(() => document.documentElement.classList.remove('dark'));
		expect(await figureImage(page)).toEqual({ background: 'rgba(0, 0, 0, 0)', padding: '0px' });
	});
});
