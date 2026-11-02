/**
 * The selection popup on touch and keyboard, kept on screen (reader plan S7.1; register UI-13,
 * UI-28, PED-31).
 *
 * Before S7.1 the popup opened only from a mouseup on the article, so a touch selection (no mouse
 * event) or a keyboard selection never reached it. Its focus never moved in, Escape left focus on
 * <body>, and it clamped only its right side, so a selection near the left edge pushed it off the
 * screen (x = -108 measured on a phone).
 *
 * The popup is found by one of its buttons, so these tests ran unchanged against the old dialog:
 * the touch, keyboard and left-edge tests failed there, and the mouse test passed (the control
 * that the harness can see the popup at all).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

const popup = (page: Page) =>
	page
		.locator('[role="toolbar"], [role="dialog"]')
		.filter({ has: page.getByRole('button', { name: 'Búa til minnisspjald' }) });
const article = (page: Page) => page.locator('.text-highlighter');

interface Box {
	x1: number;
	x2: number;
	y: number;
}

/**
 * Find a run of plain paragraph text in the article (a text node that is a direct child of a
 * visible paragraph, so not a glossary term or a link), scroll it to the middle of the screen
 * (so the popup has room on both sides, and the side it picks is its own choice),
 * and return the box of `length` characters on one line. With `select`, also select them
 * programmatically, which fires selectionchange and no pointer event.
 */
async function textBox(page: Page, where: 'start' | 'middle', length: number, select = false): Promise<Box> {
	const box = await page.evaluate(
		({ where, length, select }) => {
			const paras = [...document.querySelectorAll<HTMLElement>('.text-highlighter .reading-content p')].filter(
				(p) => p.getClientRects().length > 0
			);
			for (const p of paras) {
				const first = p.firstChild;
				const nodes = where === 'start' ? (first ? [first] : []) : [...p.childNodes];
				for (const node of nodes) {
					const text = node.textContent ?? '';
					if (node.nodeType !== Node.TEXT_NODE || text.trim().length < 40) continue;
					const start = where === 'start' ? text.length - text.trimStart().length : Math.floor(text.length / 2);
					const range = document.createRange();
					range.setStart(node, start);
					range.setEnd(node, start + length);
					if (range.getClientRects().length !== 1 || /\s/.test(text.slice(start, start + length))) continue;
					// The text itself to the middle of the screen (a tall paragraph's middle is not)
					window.scrollBy({ top: range.getBoundingClientRect().top - window.innerHeight / 2, behavior: 'instant' });
					const rects = range.getClientRects();
					if (select) {
						getSelection()!.removeAllRanges();
						getSelection()!.addRange(range);
					}
					const r = rects[0];
					return { x1: r.left, x2: r.right, y: r.top + r.height / 2 };
				}
			}
			return null;
		},
		{ where, length, select }
	);
	expect(box, 'a plain run of paragraph text to select').not.toBeNull();
	return box!;
}

async function openSection(page: Page) {
	await page.goto(SECTION!);
	await page.locator('.text-highlighter .reading-content p').first().waitFor({ state: 'attached' });
}

/** Select the box by dragging the mouse across it */
async function mouseSelect(page: Page, box: Box) {
	await page.mouse.move(box.x1 + 1, box.y);
	await page.mouse.down();
	await page.mouse.move(box.x2 - 1, box.y, { steps: 5 });
	await page.mouse.up();
}

test.describe('The selection popup (S7.1)', () => {
	test.skip(!SECTION, 'no published book is synced');
	test.beforeEach(async ({ page }) => openSection(page));

	test.describe('on a phone', () => {
		test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

		test('a touch selection, with no mouse event, opens it within 500 ms and leaves focus alone (UI-13)', async ({
			page
		}) => {
			const box = await textBox(page, 'middle', 8);
			// A tap makes this a touch session; then the selection arrives with no pointer event at all
			await page.touchscreen.tap(box.x1 + 2, box.y);
			await page.evaluate(() => getSelection()!.removeAllRanges());
			await textBox(page, 'middle', 8, true);
			await expect(popup(page)).toBeVisible({ timeout: 500 });
			await expect(popup(page).locator(':focus')).toHaveCount(0);
			// Below the selection, clear of the phone's own selection menu above it
			expect((await popup(page).boundingBox())!.y).toBeGreaterThan(box.y);
		});

		test('a tap on a colour highlights the selected text', async ({ page }) => {
			const box = await textBox(page, 'middle', 8);
			await page.touchscreen.tap(box.x1 + 2, box.y);
			const text = await page.evaluate(() => getSelection()!.toString());
			expect(text).toBe('');
			await textBox(page, 'middle', 8, true);
			const selected = await page.evaluate(() => getSelection()!.toString());
			await expect(popup(page)).toBeVisible();
			const colour = (await popup(page).getByRole('button').first().boundingBox())!;
			await page.touchscreen.tap(colour.x + colour.width / 2, colour.y + colour.height / 2);
			await expect(popup(page)).toBeHidden();
			await expect(article(page).locator('mark.highlight-yellow')).toHaveText(selected);
		});
	});

	test.describe('at the left edge of a phone screen', () => {
		test.use({ viewport: { width: 390, height: 844 } });

		test('it stays on the screen (UI-28)', async ({ page }) => {
			const box = await textBox(page, 'start', 4);
			await mouseSelect(page, box);
			await expect(popup(page)).toBeVisible();
			const rect = (await popup(page).boundingBox())!;
			expect(rect.x, 'left edge').toBeGreaterThanOrEqual(0);
			expect(rect.x + rect.width, 'right edge').toBeLessThanOrEqual(390);
		});
	});

	test.describe('on a desktop', () => {
		test.use({ viewport: { width: 1280, height: 900 } });

		test('a mouse selection opens it without moving focus, and a colour highlights the text', async ({ page }) => {
			const box = await textBox(page, 'middle', 8);
			await mouseSelect(page, box);
			await expect(popup(page)).toBeVisible();
			await expect(popup(page).locator(':focus')).toHaveCount(0);
			await popup(page).getByRole('button').first().click();
			await expect(popup(page)).toBeHidden();
			await expect(article(page).locator('mark.highlight-yellow')).toHaveCount(1);
		});

		test('a keyboard selection opens it with focus on its first button (UI-13)', async ({ page }) => {
			await textBox(page, 'middle', 4, true);
			for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
			await expect(popup(page)).toBeVisible();
			await expect(popup(page).getByRole('button').first()).toBeFocused();
		});

		test('the arrow keys, Home and End move along it, and only one of its buttons is a Tab stop', async ({
			page
		}) => {
			await textBox(page, 'middle', 4, true);
			await page.keyboard.press('Shift+ArrowRight');
			const buttons = popup(page).getByRole('button');
			await expect(buttons.first()).toBeFocused();
			await page.keyboard.press('ArrowRight');
			await expect(buttons.nth(1)).toBeFocused();
			await page.keyboard.press('ArrowLeft');
			await expect(buttons.first()).toBeFocused();
			await page.keyboard.press('End');
			await expect(buttons.last()).toBeFocused();
			await page.keyboard.press('ArrowRight');
			await expect(buttons.first()).toBeFocused();
			await page.keyboard.press('Home');
			await expect(buttons.first()).toBeFocused();
			await expect(popup(page).locator('button[tabindex="0"]')).toHaveCount(1);
		});

		test('with focus in it, Shift+arrow goes on extending the selection, and focus stays', async ({ page }) => {
			await textBox(page, 'middle', 4, true);
			await page.keyboard.press('Shift+ArrowRight');
			await expect(popup(page).getByRole('button').first()).toBeFocused();
			const before = await page.evaluate(() => getSelection()!.toString());
			await page.keyboard.press('Shift+ArrowRight');
			await page.keyboard.press('Shift+ArrowRight');
			await expect.poll(() => page.evaluate(() => getSelection()!.toString().length)).toBe(before.length + 2);
			await expect(popup(page)).toBeVisible();
			await expect(popup(page).getByRole('button').first()).toBeFocused();
			// The page did not turn: this is still the section the test opened
			expect(new URL(page.url()).pathname).toBe(SECTION);
			// A colour now highlights the extended text, not the selection the popup opened with,
			// even when pressed at once
			await page.keyboard.press('Shift+ArrowRight');
			const extended = await page.evaluate(() => getSelection()!.toString());
			await page.keyboard.press('Enter');
			await expect(article(page).locator('mark.highlight-yellow')).toHaveText(extended);
		});

		test('a mouse user who pauses mid-drag sees it only when the button comes up', async ({ page }) => {
			const box = await textBox(page, 'middle', 8);
			await page.mouse.move(box.x1 + 1, box.y);
			await page.mouse.down();
			await page.mouse.move((box.x1 + box.x2) / 2, box.y, { steps: 3 });
			await page.waitForTimeout(600);
			await expect(popup(page)).toBeHidden();
			await page.mouse.move(box.x2 - 1, box.y, { steps: 3 });
			await page.mouse.up();
			await expect(popup(page)).toBeVisible();
		});

		test('Escape closes it and returns focus to the article, with the selection collapsed in place', async ({
			page
		}) => {
			await textBox(page, 'middle', 4, true);
			await page.keyboard.press('Shift+ArrowRight');
			await expect(popup(page).getByRole('button').first()).toBeFocused();
			await page.keyboard.press('Escape');
			await expect(popup(page)).toBeHidden();
			await expect(article(page)).toBeFocused();
			expect(await page.evaluate(() => ({ ranges: getSelection()!.rangeCount, collapsed: getSelection()!.isCollapsed }))).toEqual({
				ranges: 1,
				collapsed: true
			});
			// The collapse is not read as a new selection: the popup stays closed
			await page.waitForTimeout(600);
			await expect(popup(page)).toBeHidden();
		});

		test('a colour chosen from the keyboard highlights the text and returns focus to the article', async ({
			page
		}) => {
			await textBox(page, 'middle', 4, true);
			await page.keyboard.press('Shift+ArrowRight');
			await expect(popup(page).getByRole('button').first()).toBeFocused();
			await page.keyboard.press('Enter');
			await expect(popup(page)).toBeHidden();
			await expect(article(page).locator('mark.highlight-yellow')).toHaveCount(1);
			await expect(article(page)).toBeFocused();
		});

		test('it is a toolbar with the corrected name, and axe finds nothing on it (PED-31, UI-28)', async ({ page }) => {
			const box = await textBox(page, 'middle', 8);
			await mouseSelect(page, box);
			await expect(page.getByRole('toolbar', { name: 'Valmöguleikar yfirstrikunar', exact: true })).toBeVisible();
			const results = await new AxeBuilder({ page })
				.include('[role="toolbar"]')
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
				.analyze();
			expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
		});
	});
});
