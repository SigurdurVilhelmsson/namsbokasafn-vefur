/**
 * Paged reading mode (reader plan P0.4)
 *
 * Paged is the default reading mode: a section renders as viewport-fitting
 * pages with Fyrri/Næsta navigation instead of one long scroll.
 */

import { test, expect, type Page } from '@playwright/test';
import { ATOMIC_SELECTOR } from '../src/lib/utils/paginate';

/** Click through landing → book → first section. Returns false when the
 *  synced content needed for the journey isn't present. */
async function openFirstSection(page: Page): Promise<boolean> {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	if (!(await bookLink.isVisible({ timeout: 10000 }).catch(() => false))) return false;
	await bookLink.click();
	// A client-side navigation keeps the document, so networkidle can resolve
	// before it starts; without this wait the chapter-link lookup below ran on
	// the landing page, found nothing and SKIPPED the test (2 of 3 skipped).
	await expect(page).toHaveURL(/\/efnafraedi-2e\//);
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

	// The point of paged mode: no scrolling within a page. Sums the heights of
	// the content blocks visible on each page (the chrome around the page is
	// not counted, as the paginator's own budget leaves room for it). The one
	// designed exception: a page holding a single block taller than the window.
	// The paginator splits between blocks, never inside one, so a long worked
	// example, a big table or a long flat list (the preface's 60 reviewers)
	// keeps a page of its own and scrolls there. The test splits <main> and
	// nested <section>s itself before counting, so a wrapper the paginator
	// wrongly took as one block shows up as many blocks and still fails.
	test('every page of a section fits the viewport', async ({ page }) => {
		test.skip(!(await openFirstSection(page)), 'No section content available');

		const nav = page.getByRole('navigation', { name: 'Síðuflakk' });
		await expect(nav).toBeVisible();
		const next = nav.getByRole('button', { name: 'Næsta síða' });

		for (let i = 0; i < 40; i++) {
			const { visible, count, atomic, viewport } = await page.evaluate((atomicSelector) => {
				const root = document.querySelector('article.cnx-module') as HTMLElement;
				const main = root.querySelector(':scope > main');
				const flat = (el: Element): Element[] =>
					el.tagName === 'SECTION' ? Array.from(el.children).flatMap(flat) : [el];
				const blocks = [
					...Array.from(root.children).filter((el) => el.tagName !== 'MAIN'),
					...(main ? Array.from(main.children) : [])
				].flatMap(flat);
				const shown = blocks.filter((el) => (el as HTMLElement).offsetParent !== null);
				return {
					visible: shown.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0),
					count: shown.length,
					atomic: shown.length === 1 && shown[0].matches(atomicSelector),
					viewport: window.innerHeight
				};
			}, ATOMIC_SELECTOR);
			const ok = visible <= viewport || count === 1;
			expect(
				ok,
				`page ${i + 1}: ${Math.round(visible)}px of content in ${count} block(s) in a ${viewport}px window${atomic ? ' (unsplittable)' : ''}`
			).toBe(true);
			if (await next.isDisabled()) break;
			await next.click();
			await page.waitForTimeout(300);
		}
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
		// Not networkidle: after a reload the service worker can keep the
		// network busy past 30 s (it timed out once in a full-suite run).
		// Wait for the content, then for what the paginator itself waits for
		// (fonts) plus a margin, so "no controls" cannot pass merely because
		// paged mode had not drawn them yet.
		await expect(page.locator('.reading-content')).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1000);

		await expect(page.getByRole('navigation', { name: 'Síðuflakk' })).toHaveCount(0);
		await expect(page.locator('.reading-content [hidden]')).toHaveCount(0);
	});
});
