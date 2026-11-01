/**
 * The section-end recall prompt on main (plan step S5.2; register PED-04, KEEP-05, UI-04;
 * call 2, decision D10). It replaces the 'Vel gert!' celebration, shows once per numbered
 * section, never on a rollup or the Formáli, and never because the section was marked read
 * by hand: under D10 it waits for the end of the section.
 *
 * Plan step S5.3 (UI-01, PED-18, PED-25, UI-02): focus never falls to <body> after a save, a
 * skip or Escape, the save is spoken by the shared announcer, Escape never discards typed
 * text, the phone layout fits, touch screens get no autofocus or keyboard hint, axe passes
 * with text typed, and the 'why' line shows once.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { firstModuleSection, frontMatterSection, publishedBook, sectionOfType } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const recall = (page: Page) => page.getByRole('region', { name: 'Upprifjun' });
/** Shown only while the section is unread, so its absence shows read detection ran */
const bottomMarkRead = (page: Page) => page.getByRole('button', { name: 'Merkja kafla sem lesinn' });

async function open(page: Page, url: string) {
	await page.goto(url);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
}

/**
 * Bring the end-of-section marker into view until `check` passes. Scrolling to the page's
 * bottom once is not enough: lazy images keep loading and push the marker back out of view
 * (measured: the page grew from 4,927 to 5,361 px after the scroll).
 */
async function atEnd(page: Page, check: () => Promise<void>) {
	await expect(async () => {
		await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
		await check();
	}).toPass({ timeout: 20000 });
}

/** Hold the end in view until read detection (1.5 s) has marked the section read */
const reachEnd = (page: Page) => atEnd(page, () => expect(bottomMarkRead(page)).toHaveCount(0, { timeout: 2500 }));

test.describe('The recall prompt', () => {
	test.skip(!SECTION, 'No synced numbered section');

	test('a numbered section ends with it', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
	});

	for (const type of ['glossary', 'summary']) {
		test(`a rollup (${type}) ends without it`, async ({ page }) => {
			const url = sectionOfType(BOOK!, type);
			test.skip(!url, `No ${type} page in this content`);
			await open(page, url!);
			await reachEnd(page);
			await page.waitForTimeout(500);
			await expect(recall(page)).toHaveCount(0);
		});
	}

	test('the Formáli ends without it', async ({ page }) => {
		const url = frontMatterSection(BOOK!);
		test.skip(!url, 'No front matter in this content');
		await open(page, url!);
		await reachEnd(page);
		await page.waitForTimeout(500);
		await expect(recall(page)).toHaveCount(0);
	});

	test('marking read by hand opens nothing; the end of the section still does (D10)', async ({ page }) => {
		await open(page, SECTION!);
		await page.getByRole('button', { name: 'Merkja sem lesið' }).click();
		await expect(bottomMarkRead(page)).toHaveCount(0);
		await page.waitForTimeout(500);
		await expect(recall(page)).toHaveCount(0);

		await atEnd(page, () => expect(recall(page)).toBeVisible({ timeout: 2500 }));
	});

	test("'Sleppa' closes it in one tap, and it does not come back to that section", async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await page.getByRole('button', { name: 'Sleppa' }).click();
		await expect(recall(page)).toHaveCount(0);

		await page.reload();
		await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
		// Held at the end past read detection's 1.5 s, it still does not come back
		for (let i = 0; i < 3; i++) {
			await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
			await page.waitForTimeout(1000);
		}
		await expect(recall(page)).toHaveCount(0);
	});

	test('with it open, the next-section link works and the prompt does not follow', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
		const before = page.url();

		await page.getByRole('link', { name: /Næsti kafli/ }).click();
		await expect(page).not.toHaveURL(before);
		await expect(page.locator('.reading-content').first()).toBeVisible();
		await expect(recall(page)).toHaveCount(0);
	});
});

const announcer = (page: Page, text: RegExp) => page.locator('[role="status"][aria-live="polite"]', { hasText: text });
const nextLink = (page: Page) => page.locator('[data-nav="next"]');
const box = (page: Page) => recall(page).locator('textarea');
const RECALL_TEXT = 'Eðliseiginleikar breyta ekki efninu sjálfu.';

/** Open the section and reach its end, with the prompt's box focused (a desktop autofocuses it) */
async function promptOpen(page: Page) {
	await open(page, SECTION!);
	await reachEnd(page);
	await expect(box(page)).toBeFocused();
}

/** Focus left the vanished form for the next-section link, never <body> */
async function expectFocusOnNext(page: Page) {
	await expect(nextLink(page)).toBeFocused();
	expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
}

for (const viewport of [
	{ width: 1280, height: 800 },
	{ width: 390, height: 844 }
]) {
	test.describe(`The recall prompt, keyboard only at ${viewport.width} px (S5.3)`, () => {
		test.skip(!SECTION, 'No synced numbered section');
		test.use({ viewport });

		test('Ctrl+Enter saves, the announcer speaks within 500 ms, and focus goes to the next section', async ({
			page
		}) => {
			await promptOpen(page);
			await page.keyboard.type(RECALL_TEXT);
			await page.keyboard.press('Control+Enter');
			await expect(announcer(page, /^Vistað/)).toHaveCount(1, { timeout: 500 });
			await expectFocusOnNext(page);
			// The saved message stays until dismissed
			await page.waitForTimeout(1500);
			await expect(recall(page)).toContainText('Vistað');
		});

		test("'Vista' from the keyboard saves and moves focus to the next section", async ({ page }) => {
			await promptOpen(page);
			await page.keyboard.type(RECALL_TEXT);
			await page.keyboard.press('Tab'); // Sleppa
			await page.keyboard.press('Tab'); // Vista
			await expect(page.getByRole('button', { name: 'Vista', exact: true })).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(announcer(page, /^Vistað/)).toHaveCount(1, { timeout: 500 });
			await expectFocusOnNext(page);
		});

		test("'Sleppa' from the keyboard closes it and moves focus to the next section", async ({ page }) => {
			await promptOpen(page);
			await page.keyboard.press('Tab');
			await expect(page.getByRole('button', { name: 'Sleppa' })).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(recall(page)).toHaveCount(0);
			await expectFocusOnNext(page);
		});

		test('Escape on an empty box acts as Sleppa', async ({ page }) => {
			await promptOpen(page);
			await page.keyboard.press('Escape');
			await expect(recall(page)).toHaveCount(0);
			await expectFocusOnNext(page);
		});

		test('Escape on a box holding text keeps the text and the prompt', async ({ page }) => {
			await promptOpen(page);
			await page.keyboard.type(RECALL_TEXT);
			await page.keyboard.press('Escape');
			await expect(recall(page)).toBeVisible();
			await expect(box(page)).toHaveValue(RECALL_TEXT);
		});
	});
}

test.describe('The recall prompt on a phone (S5.3)', () => {
	test.skip(!SECTION, 'No synced numbered section');

	async function touchPage(browser: Browser): Promise<Page> {
		const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
		return context.newPage();
	}

	test("'Vista' is one line, and neither the timer pill nor the tools button covers the buttons", async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await open(page, SECTION!);
		await reachEnd(page);
		await box(page).fill(RECALL_TEXT);
		const save = page.getByRole('button', { name: 'Vista', exact: true });
		await save.evaluate((el) => el.scrollIntoView({ block: 'center' }));
		const saveBox = (await save.boundingBox())!;
		expect(saveBox.height).toBeLessThanOrEqual(44);

		const overlaps = await page.evaluate(() => {
			const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
			const hit = (a: DOMRect, b: DOMRect | null) =>
				!!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
			const buttons = [...document.querySelectorAll('.recall-prompt button')].map((b) => b.getBoundingClientRect());
			const pill = rect('.pill');
			const fab = rect('.fab-button');
			return {
				measured: buttons.length,
				pill: buttons.some((b) => hit(b, pill)),
				fab: buttons.some((b) => hit(b, fab))
			};
		});
		expect(overlaps).toEqual({ measured: 2, pill: false, fab: false });
	});

	test('a touch screen gets no autofocus and no Ctrl+Enter hint', async ({ browser }) => {
		const page = await touchPage(browser);
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
		await expect(box(page)).not.toBeFocused();
		await expect(recall(page)).not.toContainText('Ctrl+Enter');
		await page.context().close();
	});

	test('a desktop shows the Ctrl+Enter hint (the control for the touch test)', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toContainText('Ctrl+Enter');
	});
});

test.describe('The recall prompt with text typed, under axe (S5.3)', () => {
	test.skip(!SECTION, 'No synced numbered section');

	for (const theme of ['light', 'dark'] as const) {
		test(`${theme}: no WCAG A/AA violations`, async ({ page }) => {
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
			await open(page, SECTION!);
			await reachEnd(page);
			await box(page).fill(RECALL_TEXT);
			await page.waitForTimeout(400); // the fly-in transition

			const results = await new AxeBuilder({ page })
				.include('.recall-prompt')
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();
			expect(results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`))).toEqual([]);
			// The control: axe measured the heading, the instruction, the hint and both buttons
			const measured = results.passes.find((p) => p.id === 'color-contrast')?.nodes.length ?? 0;
			expect(measured).toBeGreaterThanOrEqual(5);
		});
	}
});

test.describe("The recall prompt's one-time 'why' line (S5.3, PED-25)", () => {
	test.skip(!SECTION, 'No synced numbered section');

	test('the first prompt shows it and the next one does not', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toContainText('Af hverju?');
		await page.getByRole('button', { name: 'Sleppa' }).click();

		await nextLink(page).click();
		await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
		await atEnd(page, () => expect(recall(page)).toBeVisible({ timeout: 2500 }));
		await expect(recall(page)).not.toContainText('Af hverju?');
	});
});
