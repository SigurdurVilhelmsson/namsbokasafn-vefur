/**
 * Phone-width layout of the section reader.
 *
 * Each test here failed on main before its fix (2026-10-04, found by the
 * reader v1.1 QA): the hidden MathML copy widened the page, Settings had no
 * way in below 1024px, and the collapsed tools button's invisible menu
 * swallowed taps while the timer pill sat on top of the button itself.
 */

import { test, expect, type Browser, type Page } from '@playwright/test';
import { sectionsContaining } from './helpers/content-fixtures';

const PHONE = { width: 375, height: 667 };

/** Scrolled mode where the reader has paged mode, so every block is laid out. */
async function phonePage(browser: Browser, opts: { touch: boolean }): Promise<Page> {
	const context = await browser.newContext({
		viewport: PHONE,
		isMobile: opts.touch,
		hasTouch: opts.touch
	});
	await context.addInitScript(() => {
		try {
			const key = 'namsbokasafn:settings';
			const stored = JSON.parse(localStorage.getItem(key) || '{}');
			localStorage.setItem(key, JSON.stringify({ ...stored, readingMode: 'scrolled' }));
		} catch {
			// Storage blocked: the default mode applies, which the tests tolerate.
		}
	});
	return context.newPage();
}

async function openSection(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
}

test.describe('Phone layout', () => {
	// efni's visually-hidden copy is position:absolute with no positioned
	// ancestor, so it escaped overflow containers and set the page's width.
	// isMobile is off on purpose: the overflow reproduced without emulation.
	test('hidden assistive maths does not widen the page', async ({ browser }) => {
		test.setTimeout(180000); // eight full section loads
		const urls = sectionsContaining('class="assistive-mathml"', 8);
		test.skip(urls.length === 0, 'No synced section has assistive MathML');

		const page = await phonePage(browser, { touch: false });
		const widths: string[] = [];
		for (const url of urls) {
			await openSection(page, url);
			const { scrollWidth, innerWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				innerWidth: window.innerWidth
			}));
			widths.push(`${url} ${scrollWidth}/${innerWidth}`);
		}
		expect(widths.filter((w) => !w.endsWith(` ${PHONE.width}/${PHONE.width}`))).toEqual([]);
	});

	test('Settings opens from the header', async ({ browser }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No synced section');

		const page = await phonePage(browser, { touch: true });
		await openSection(page, urls[0]);
		await page.getByRole('button', { name: 'Stillingar' }).tap();
		await expect(page.getByRole('dialog')).toBeVisible();
	});

	test('the collapsed tools menu does not catch taps around its button', async ({ browser }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No synced section');

		const page = await phonePage(browser, { touch: true });
		await openSection(page, urls[0]);
		const fab = page.locator('.fab-button');
		await expect(fab).toBeVisible();

		// A point inside the collapsed container, above the button: the invisible
		// menu items stack there.
		const hit = await page.evaluate(() => {
			const container = document.querySelector('.fab-container')!.getBoundingClientRect();
			const button = document.querySelector('.fab-button')!.getBoundingClientRect();
			const x = button.left + button.width / 2;
			const y = (container.top + button.top) / 2;
			const el = document.elementFromPoint(x, y);
			return { inContainer: !!el?.closest('.fab-container'), gap: button.top - container.top };
		});
		expect(hit.gap).toBeGreaterThan(0);
		expect(hit.inContainer).toBe(false);

		// Opened, the menu stays open and its items take taps. (It used to close
		// itself in the same tick; toBeVisible() alone passes on an opacity-0 link.)
		await fab.tap();
		await expect(fab).toHaveAttribute('aria-expanded', 'true');
		const item = page.getByRole('link', { name: 'Orðasafn' });
		await expect(item).toHaveCSS('opacity', '1');
		const itemHit = await item.evaluate((el) => {
			const r = el.getBoundingClientRect();
			return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
		});
		// No tap-through here: the menu auto-closes after 5s, which a loaded CI
		// runner can reach before a tap lands.
		expect(itemHit).toBe(true);
	});

	// Measured on the live build of 2026-10-25: after 'Fyrri kafli', the next four
	// Tab stops were the collapsed menu's invisible links.
	test('the collapsed tools menu takes no Tab stops, and a scroll hands focus back', async ({ browser }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No synced section');

		const page = await phonePage(browser, { touch: false });
		await openSection(page, urls[0]);
		const fab = page.locator('.fab-button');
		await expect(fab).toBeVisible();
		const focusInMenu = () => page.evaluate(() => !!document.activeElement?.closest('.fab-menu'));

		// Collapsed: the links come just before the button, and Shift+Tab skips them
		await fab.focus();
		await page.keyboard.press('Shift+Tab');
		expect(await focusInMenu()).toBe(false);
		// That focus move can scroll the page, and a late scroll event would close
		// the menu we open next (the menu collapses on scroll by design)
		await page.waitForFunction(
			() => new Promise((done) => {
				const y = window.scrollY;
				setTimeout(() => done(window.scrollY === y), 250);
			})
		);

		// Open, the same key lands on a link: the control that this test can see one
		await fab.focus();
		await page.keyboard.press('Enter');
		await expect(fab).toHaveAttribute('aria-expanded', 'true');
		await page.keyboard.press('Shift+Tab');
		expect(await focusInMenu()).toBe(true);

		// A scroll collapses the menu, which goes inert: focus moves to the button, not <body>
		// (Up if the earlier focus move left the page at its foot, down otherwise)
		await page.evaluate(() => window.scrollTo(0, window.scrollY > 100 ? 0 : 400));
		await expect(fab).toHaveAttribute('aria-expanded', 'false');
		await expect(fab).toBeFocused();
	});

	test('the timer pill does not cover the tools button', async ({ browser }) => {
		const urls = sectionsContaining('<p', 1);
		test.skip(urls.length === 0, 'No synced section');

		const page = await phonePage(browser, { touch: true });
		await openSection(page, urls[0]);
		const pill = page.getByRole('button', { name: 'Opna tímamæli' });
		const fab = page.locator('.fab-button');
		await expect(pill).toBeVisible();
		await expect(fab).toBeVisible();

		const a = (await pill.boundingBox())!;
		const b = (await fab.boundingBox())!;
		const overlap =
			a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
		expect(overlap).toBe(false);
	});
});
