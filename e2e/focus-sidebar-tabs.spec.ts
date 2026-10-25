/**
 * Focus, the phone sidebar and the /greining tabs (reader-review plan step S1.2).
 *
 * - UI-11: closing Settings or search returned focus to its header button with a plain
 *   focus(), and html's scroll-padding-top made that scroll the page by about 420 px.
 * - UI-06: the closed phone sidebar kept its off-screen links in the Tab order, and the
 *   visible desktop sidebar was aria-hidden while its links stayed focusable.
 * - UI-15: below 640 px the /greining tabs had no accessible name and no arrow keys.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

test.use({ serviceWorkers: 'block' });

/** Click where the element is: a Playwright element click scrolls it into view first. */
async function clickInPlace(page: Page, target: Locator): Promise<void> {
	const box = await target.boundingBox();
	if (!box) throw new Error('The element has no box: is it visible?');
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function openSection(page: Page): Promise<void> {
	await page.goto(SECTION!);
	await page.waitForLoadState('networkidle');
}

test.describe('Closing a dialog keeps the page where it was (UI-11)', () => {
	const cases = [
		{ dialog: 'Settings', opener: 'Stillingar', close: 'Loka' },
		{ dialog: 'Settings', opener: 'Stillingar', close: 'Escape' },
		{ dialog: 'Search', opener: 'Leita, Ctrl+K', close: 'Loka' },
		{ dialog: 'Search', opener: 'Leita, Ctrl+K', close: 'Escape' }
	];
	for (const viewport of [PHONE, DESKTOP]) {
		test.describe(`at ${viewport.width} px`, () => {
			test.use({ viewport });
			for (const c of cases) {
				test(`${c.dialog}, closed with ${c.close}: scroll position kept, focus back on '${c.opener}'`, async ({
					page
				}) => {
					test.skip(!SECTION, 'no published book is synced');
					await openSection(page);
					await page.evaluate(() => window.scrollTo(0, 1200));
					const before = await page.evaluate(() => window.scrollY);
					expect(before, 'the section is long enough to scroll').toBeGreaterThan(500);

					const opener = page.getByRole('button', { name: c.opener, exact: true }).filter({ visible: true }).first();
					await clickInPlace(page, opener);
					const dialog = page.getByRole('dialog');
					await expect(dialog).toBeVisible();
					if (c.close === 'Escape') await page.keyboard.press('Escape');
					else await clickInPlace(page, dialog.getByRole('button', { name: c.close, exact: true }));
					await expect(dialog).toBeHidden();

					const after = await page.evaluate(() => window.scrollY);
					expect(Math.abs(after - before), `scrollY ${before} -> ${after}`).toBeLessThanOrEqual(2);
					await expect(opener).toBeFocused();
				});
			}
		});
	}
});

test.describe('The closed phone sidebar is out of the Tab order (UI-06)', () => {
	test.use({ viewport: PHONE });

	test('Tab from the top never focuses anything in the closed sidebar or off screen', async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		await openSection(page);
		await expect(page.locator('aside.sidebar')).toHaveCSS('visibility', 'hidden');
		const stops: { inSidebar: boolean; onScreen: boolean; name: string }[] = [];
		for (let i = 0; i < 40; i++) {
			await page.keyboard.press('Tab');
			const stop = await page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				if (!el || el === document.body) return null;
				const r = el.getBoundingClientRect();
				return {
					inSidebar: !!el.closest('aside.sidebar'),
					onScreen: r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight,
					name: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)
				};
			});
			if (stop) stops.push(stop);
		}
		expect(stops.length, 'Tab reached focusable elements').toBeGreaterThan(5);
		expect(stops.filter((s) => s.inSidebar).map((s) => s.name)).toEqual([]);
		expect(stops.filter((s) => !s.onScreen).map((s) => s.name)).toEqual([]);
	});

	test('opening the sidebar moves focus to its close button, and closing it returns focus to the menu button', async ({
		page
	}) => {
		test.skip(!SECTION, 'no published book is synced');
		await openSection(page);
		const toggle = page.getByRole('button', { name: 'Opna/loka valmynd', exact: true });
		await clickInPlace(page, toggle);
		const close = page.getByRole('button', { name: 'Loka valmynd', exact: true });
		await expect(page.locator('aside.sidebar')).toHaveCSS('visibility', 'visible');
		await expect(close).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(toggle).toBeFocused();
		await expect(page.locator('aside.sidebar')).toHaveCSS('visibility', 'hidden');
	});
});

test.describe('The desktop sidebar is in the accessibility tree (UI-06)', () => {
	test.use({ viewport: DESKTOP });

	test('it is not aria-hidden, and its navigation is exposed', async ({ page }) => {
		test.skip(!SECTION, 'no published book is synced');
		await openSection(page);
		await expect(page.locator('aside.sidebar')).not.toHaveAttribute('aria-hidden', /.*/);
		await expect(page.getByRole('navigation', { name: 'Efnisyfirlit' })).toBeVisible();
	});
});

test.describe('The /greining tabs on a phone (UI-15)', () => {
	test.use({ viewport: PHONE });
	const LABELS = ['Yfirlit', 'Lestur', 'Minniskort', 'Markmið'];

	test('each tab is named by its label, and only the selected one is in the Tab order', async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		for (const label of LABELS) {
			await expect(page.getByRole('tab', { name: label, exact: true })).toBeVisible();
		}
		// The browser's own tabIndex, not the attribute: a tab with no tabindex attribute is
		// still in the Tab order.
		const inTabOrder = await page
			.locator('[role="tab"]')
			.evaluateAll((tabs) => tabs.filter((t) => (t as HTMLElement).tabIndex >= 0).map((t) => t.getAttribute('aria-selected')));
		expect(inTabOrder, 'only the selected tab is in the Tab order').toEqual(['true']);
	});

	test('Tab from the selected tab goes to its panel', async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		await page.getByRole('tab', { name: 'Yfirlit', exact: true }).focus();
		await page.keyboard.press('Tab');
		await expect(page.locator('#tabpanel-yfirlit')).toBeFocused();
	});

	test('Alt and an arrow key leave the selection to the browser', async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		const first = page.getByRole('tab', { name: 'Yfirlit', exact: true });
		await first.focus();
		const prevented = await first.evaluate((el) => {
			const event = new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true });
			el.dispatchEvent(event);
			return event.defaultPrevented;
		});
		expect(prevented, 'Alt+→ is not cancelled').toBe(false);
		await expect(first).toHaveAttribute('aria-selected', 'true');
	});

	test('the arrow keys, Home and End move the selection, wrapping at the ends', async ({ page }) => {
		test.skip(!BOOK, 'no published book is synced');
		await page.goto(`/${BOOK}/greining/`);
		await page.waitForLoadState('networkidle');
		const tab = (label: string) => page.getByRole('tab', { name: label, exact: true });
		await tab('Yfirlit').focus();
		const steps: [string, string][] = [
			['ArrowRight', 'Lestur'],
			['End', 'Markmið'],
			['ArrowRight', 'Yfirlit'],
			['ArrowLeft', 'Markmið'],
			['Home', 'Yfirlit']
		];
		for (const [key, label] of steps) {
			await page.keyboard.press(key);
			await expect(tab(label), `${key} selects '${label}'`).toHaveAttribute('aria-selected', 'true');
			await expect(tab(label)).toBeFocused();
		}
	});
});
