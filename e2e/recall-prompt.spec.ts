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
 *
 * Plan step S5.4 (PED-17, KEEP-01): the prompt's shown, saved, skipped and abandoned counts
 * are kept on the device, nothing is sent, and /greining shows a one-line summary.
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

		test("opening at the section's end does not take focus from the next-section link", async ({ page }) => {
			await open(page, SECTION!);
			await nextLink(page).focus();
			await atEnd(page, () => expect(recall(page)).toBeVisible({ timeout: 2500 }));
			await expect(nextLink(page)).toBeFocused();
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

test.describe('Local counters (S5.4, PED-17, KEEP-01)', () => {
	test.skip(!SECTION, 'No synced numbered section');

	/** This book's counts, as the browser stores them */
	const storedCounts = (page: Page) =>
		page.evaluate(
			(book) => JSON.parse(localStorage.getItem('namsbokasafn:analytics') ?? '{}').counters?.[book] ?? {},
			BOOK
		);

	test("records a shown prompt and a 'Sleppa'", async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
		await expect.poll(() => storedCounts(page)).toEqual({ recallShown: 1 });
		await page.getByRole('button', { name: 'Sleppa' }).click();
		await expect.poll(() => storedCounts(page)).toEqual({ recallShown: 1, recallSkipped: 1 });
	});

	test('records an abandon when the reader goes on with the prompt open', async ({ page }) => {
		await open(page, SECTION!);
		await reachEnd(page);
		await expect(recall(page)).toBeVisible();
		await nextLink(page).click();
		await expect(recall(page)).toHaveCount(0);
		await expect.poll(() => storedCounts(page)).toEqual({ recallShown: 1, recallAbandoned: 1 });
	});

	test('sends nothing: every request while it counts is a GET to this site', async ({ page }) => {
		await open(page, SECTION!);
		await page.waitForLoadState('networkidle');
		const origin = new URL(page.url()).origin;
		const offending: string[] = [];
		page.on('request', (req) => {
			if (req.method() !== 'GET' || new URL(req.url()).origin !== origin) offending.push(`${req.method()} ${req.url()}`);
		});
		await reachEnd(page);
		await box(page).fill(RECALL_TEXT);
		await recall(page).getByRole('button', { name: 'Vista' }).click();
		await expect.poll(() => storedCounts(page)).toEqual({ recallShown: 1, recallSaved: 1 });
		expect(offending).toEqual([]);
	});
});

test.describe('The recall summary on /greining (S5.4)', () => {
	test.skip(!BOOK, 'No published book is synced');

	const summary = (page: Page) => page.getByText(/^Þú hefur vistað/);

	test('says how many the reader saved and skipped', async ({ page }) => {
		await page.addInitScript((book) => {
			const counters = { [book!]: { recallShown: 4, recallSaved: 2, recallSkipped: 1, recallAbandoned: 1 } };
			localStorage.setItem('namsbokasafn:analytics', JSON.stringify({ counters }));
		}, BOOK);
		await page.goto(`/${BOOK}/greining/`);
		await expect(summary(page)).toHaveText('Þú hefur vistað 2 upprifjanir og sleppt 1.');
	});

	test('says nothing before any prompt was shown', async ({ page }) => {
		await page.goto(`/${BOOK}/greining/`);
		// Control: the overview has rendered, so an absent line is not a page still loading.
		await expect(page.getByText('Heildartími')).toBeVisible({ timeout: 15000 });
		await expect(summary(page)).toHaveCount(0);
	});
});

test.describe('Where the counts and the routines are described (S5.4)', () => {
	test('the privacy page lists the recall counts among what the browser keeps', async ({ page }) => {
		await page.goto('/personuvernd/');
		const stored = page.locator('section[aria-labelledby="stored"] li', { hasText: 'Námsgreining' });
		await expect(stored).toContainText('upprifjun');
	});

	test('/for-teachers has a teaching section with three routines and the privacy link', async ({ page }) => {
		await page.goto('/for-teachers/');
		const teaching = page.locator('section#teaching');
		await expect(teaching.getByRole('heading', { level: 2 })).toHaveText('Kennsla með Námsbókasafni');
		await expect(teaching.locator('ol > li')).toHaveCount(3);
		await expect(teaching.getByRole('link', { name: /persónuvernd/i })).toHaveAttribute('href', '/personuvernd/');
		await expect(page.locator('nav.toc a[href="#teaching"]')).toHaveCount(1);
	});
});

test.describe("S5.4's new text under axe", () => {
	test.skip(!BOOK, 'No published book is synced');

	/** Store the theme, open the page, and wait until hydration has applied it */
	async function openInTheme(page: Page, url: string, theme: 'light' | 'dark') {
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
		await page.goto(url);
		const dark = /(^|\s)dark(\s|$)/;
		if (theme === 'dark') await expect(page.locator('html')).toHaveClass(dark, { timeout: 15000 });
		else await expect(page.locator('html')).not.toHaveClass(dark);
	}

	async function axe(page: Page, selector: string) {
		const results = await new AxeBuilder({ page })
			.include(selector)
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();
		return {
			violations: results.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')}`)),
			measured: results.passes.find((p) => p.id === 'color-contrast')?.nodes.length ?? 0
		};
	}

	for (const theme of ['light', 'dark'] as const) {
		test(`${theme}: the /greining summary line`, async ({ page }) => {
			await page.addInitScript((book) => {
				const counters = { [book!]: { recallShown: 3, recallSaved: 2, recallSkipped: 1 } };
				localStorage.setItem('namsbokasafn:analytics', JSON.stringify({ counters }));
			}, BOOK);
			await openInTheme(page, `/${BOOK}/greining/`, theme);
			await expect(page.getByText(/^Þú hefur vistað/)).toBeVisible({ timeout: 15000 });
			const { violations, measured } = await axe(page, '[data-recall-summary]');
			expect(violations).toEqual([]);
			expect(measured, 'axe measured the line').toBe(1);
		});

		test(`${theme}: the teaching section on /for-teachers`, async ({ page }) => {
			await openInTheme(page, '/for-teachers/', theme);
			const { violations, measured } = await axe(page, 'section#teaching');
			expect(violations).toEqual([]);
			// The control: the heading, the paragraphs, the list items and the link
			expect(measured, 'axe measured the section').toBeGreaterThanOrEqual(6);
		});
	}
});
