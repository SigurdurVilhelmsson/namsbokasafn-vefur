/**
 * Paged reading mode (reader plan P0.4)
 *
 * Paged is the default reading mode: a section renders as viewport-fitting
 * pages with Fyrri/Næsta navigation instead of one long scroll.
 */

import { test, expect, type Page } from '@playwright/test';

/** Click through landing → book → first section. Returns false when the
 *  synced content needed for the journey isn't present. */
async function openFirstSection(page: Page): Promise<boolean> {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	if (!(await bookLink.isVisible({ timeout: 10000 }).catch(() => false))) return false;
	await bookLink.click();
	await page.waitForLoadState('networkidle');

	const sectionLink = page.locator('a[href*="/kafli/"]').first();
	if (!(await sectionLink.isVisible({ timeout: 10000 }).catch(() => false))) return false;
	await sectionLink.click();
	await expect(page).toHaveURL(/\/kafli\/.+\/.+/);
	await page.waitForLoadState('networkidle');
	return true;
}

test.describe('Paged reading mode', () => {
	test('shows pagination controls on a section page', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });
		await expect(nav.getByText(/Hluti \d+ af \d+/)).toBeVisible();
	});

	test('Næsta advances and updates the position label and hash', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		const label = nav.locator('.paged-nav-label');
		const before = await label.textContent();

		const nextButton = nav.getByRole('button', { name: 'Næsta síða' });
		test.skip(await nextButton.isDisabled(), 'Section fits a single page');
		await nextButton.click();

		await expect(label).not.toHaveText(before ?? '', { timeout: 5000 });
		await expect(page).toHaveURL(/#sub-\d+(-p-\d+)?$/);

		// Fyrri returns to the start
		await nav.getByRole('button', { name: 'Fyrri síða' }).click();
		await expect(label).toHaveText(before ?? '', { timeout: 5000 });
	});

	test('continuous-scroll setting restores the scrolled experience', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible({ timeout: 15000 });

		// Switch to "Samfellt skrun" via localStorage (the settings store
		// persists there) and reload — the controls must disappear and no
		// content block may remain hidden
		await page.evaluate(() => {
			const raw = localStorage.getItem('namsbokasafn:settings');
			const state = raw ? JSON.parse(raw) : {};
			state.readingMode = 'scrolled';
			localStorage.setItem('namsbokasafn:settings', JSON.stringify(state));
		});
		await page.reload();
		await page.waitForLoadState('networkidle');

		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
		await expect(page.locator('.reading-content [hidden]')).toHaveCount(0);
	});
});
