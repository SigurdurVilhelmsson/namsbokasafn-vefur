/**
 * ← / → move to the previous / next section, as the shortcuts dialog says.
 *
 * Until 2026-10-04 they did nothing: the handler looked for links labelled
 * "Næsti kafli", which the February 2026 navigation redesign no longer
 * rendered, yet still swallowed the key everywhere.
 */

import { test, expect, type Page } from '@playwright/test';
import { sectionsContaining } from './helpers/content-fixtures';

/** Keep reader v1.1's paged mode, which claims the arrows for page turns, out of it. */
async function scrolledMode(page: Page): Promise<void> {
	await page.addInitScript(() => {
		try {
			const key = 'namsbokasafn:settings';
			const stored = JSON.parse(localStorage.getItem(key) || '{}');
			localStorage.setItem(key, JSON.stringify({ ...stored, readingMode: 'scrolled' }));
		} catch {
			// Storage blocked: nothing to set.
		}
	});
}

/** Record whether the app prevented the default of the next key press. */
async function watchDefaultPrevented(page: Page): Promise<void> {
	await page.evaluate(() => {
		const w = window as unknown as { __prevented?: boolean };
		delete w.__prevented;
		// Registered after the app's listener, so it sees the app's verdict.
		window.addEventListener('keydown', (e) => (w.__prevented = e.defaultPrevented), {
			once: true
		});
	});
}

test.describe('Section shortcuts', () => {
	test('→ opens the next section and ← returns', async ({ page }) => {
		const urls = sectionsContaining('<p', 50).filter((u) => !/\/\d+-0-[^/]*\/$/.test(u));
		test.skip(urls.length === 0, 'No synced section');

		await scrolledMode(page);
		await page.goto(urls[0]);
		const next = page.locator('a.nav-btn-next');
		const prev = page.locator('a.nav-btn-prev');
		await expect(next).toBeAttached({ timeout: 15000 });
		await expect(prev).toBeAttached();
		const nextHref = (await next.getAttribute('href'))!;
		const startPath = new URL(page.url()).pathname;

		await page.locator('body').click({ position: { x: 5, y: 5 } });
		await page.keyboard.press('ArrowRight');
		await expect(page).toHaveURL((u) => u.pathname.replace(/\/$/, '') === nextHref.replace(/\/$/, ''));

		await expect(page.locator('a.nav-btn-prev')).toBeAttached({ timeout: 15000 });
		await page.keyboard.press('ArrowLeft');
		await expect(page).toHaveURL((u) => u.pathname === startPath);
	});

	test('→ keeps its default where there is no section to move to', async ({ page }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No synced section');
		const book = urls[0].split('/')[1];

		await page.goto(`/${book}/`);
		await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
		await watchDefaultPrevented(page);
		await page.keyboard.press('ArrowRight');
		const prevented = await page.evaluate(
			() => (window as unknown as { __prevented?: boolean }).__prevented
		);
		expect(prevented).toBe(false);
	});

	// Each of these changed section once the shortcut came alive (QA re-check
	// 2026-10-04): the key belonged to something else on the page.
	async function openSection(page: Page): Promise<string> {
		const urls = sectionsContaining('<p', 50).filter((u) => !/\/\d+-0-[^/]*\/$/.test(u));
		test.skip(urls.length === 0, 'No synced section');
		await scrolledMode(page);
		await page.goto(urls[0]);
		await expect(page.locator('a.nav-btn-next')).toBeAttached({ timeout: 15000 });
		await page.locator('body').click({ position: { x: 5, y: 5 } });
		return new URL(page.url()).pathname;
	}

	test('Shift+→ extends a selection instead of changing section', async ({ page }) => {
		const path = await openSection(page);
		await page.keyboard.press('Shift+ArrowRight');
		await page.waitForTimeout(800);
		expect(new URL(page.url()).pathname).toBe(path);
	});

	test('→ stays with an open dialog', async ({ page }) => {
		const path = await openSection(page);
		await page.getByRole('button', { name: 'Stillingar' }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(800);
		expect(new URL(page.url()).pathname).toBe(path);
	});

	test('→ scrolls a focused wide box instead of changing section', async ({ page }) => {
		const path = await openSection(page);
		await page.evaluate(() => {
			const box = document.createElement('div');
			box.id = 'wide-box';
			box.tabIndex = 0;
			box.style.cssText = 'overflow-x:auto;width:200px';
			box.innerHTML = '<div style="width:2000px;height:20px"></div>';
			document.querySelector('.reading-content')!.prepend(box);
			box.focus();
		});
		await page.keyboard.press('ArrowRight');
		await page.waitForTimeout(800);
		expect(new URL(page.url()).pathname).toBe(path);
	});
});

