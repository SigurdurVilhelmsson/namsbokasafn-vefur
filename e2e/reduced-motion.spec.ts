/**
 * Reduced motion (plan step SF.3, register UI-25). Svelte's transitions run on the Web
 * Animations API, which no CSS can stop, so under prefers-reduced-motion they must not start
 * at all; CSS animations and transitions are cut to 0.01 ms by app.css's reset.
 *
 * Every animation the page creates is recorded (element.animate() is wrapped before any page
 * script runs, and document.getAnimations() is read too), while a reader opens Settings, the
 * selection popup and the recall prompt. Under 'reduce' none may last longer than 1 ms, and a
 * toolbar button's own transition is 0.01 ms or less. Control: the same steps under
 * 'no-preference' create at least one longer animation, or the recorder saw nothing.
 */
import { test, expect, type Page } from '@playwright/test';
import { firstModuleSection, publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();
const SECTION = BOOK ? firstModuleSection(BOOK) : null;

async function recordAnimations(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const seen: number[] = ((window as unknown as { __durations: number[] }).__durations = []);
		const animate = Element.prototype.animate;
		Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
			const animation = animate.apply(this, args);
			seen.push(Number(animation.effect?.getTiming().duration) || 0);
			return animation;
		};
	});
}

/** The longest animation recorded so far, or running now, in ms */
const longest = (page: Page) =>
	page.evaluate(() =>
		Math.max(
			0,
			...(window as unknown as { __durations: number[] }).__durations,
			...document.getAnimations().map((a) => Number(a.effect?.getTiming().duration) || 0)
		)
	);

/** Select a run of plain paragraph text with the mouse, as a reader would */
async function selectText(page: Page): Promise<void> {
	const box = await page.evaluate(() => {
		for (const p of document.querySelectorAll<HTMLElement>('.text-highlighter .reading-content p')) {
			for (const node of p.childNodes) {
				const text = node.textContent ?? '';
				if (node.nodeType !== Node.TEXT_NODE || text.trim().length < 40) continue;
				const range = document.createRange();
				const start = Math.floor(text.length / 2);
				range.setStart(node, start);
				range.setEnd(node, start + 8);
				if (range.getClientRects().length !== 1 || /\s/.test(text.slice(start, start + 8))) continue;
				window.scrollBy({ top: range.getBoundingClientRect().top - window.innerHeight / 2, behavior: 'instant' });
				const r = range.getBoundingClientRect();
				return { x1: r.left, x2: r.right, y: r.top + r.height / 2 };
			}
		}
		return null;
	});
	expect(box, 'a plain run of paragraph text to select').not.toBeNull();
	await page.mouse.move(box!.x1 + 1, box!.y);
	await page.mouse.down();
	await page.mouse.move(box!.x2 - 1, box!.y, { steps: 5 });
	await page.mouse.up();
}

/** Open Settings, the selection popup and the recall prompt, each with its transition */
async function openTheAnimatedParts(page: Page): Promise<void> {
	await page.goto(SECTION!);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15_000 });

	const dialog = page.getByRole('dialog');
	const opener = page.getByRole('button', { name: 'Stillingar' }).first();
	await expect(async () => {
		if (!(await dialog.isVisible())) await opener.click();
		await expect(dialog).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 20_000 });
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);

	await selectText(page);
	await expect(page.getByRole('toolbar').first()).toBeVisible();

	// The recall prompt comes once read detection (1.5 s) has seen the section's end
	await expect(async () => {
		await page.locator('[data-section-end]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
		await expect(page.getByRole('region', { name: 'Upprifjun', exact: true })).toBeVisible({ timeout: 2_500 });
	}).toPass({ timeout: 25_000 });
}

test.describe('Reduced motion', () => {
	test.skip(!SECTION, 'no published book is synced');

	test("under 'reduce' nothing animates for longer than 1 ms", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await recordAnimations(page);
		await openTheAnimatedParts(page);
		expect(await longest(page)).toBeLessThanOrEqual(1);
		const transition = await page
			.getByRole('button', { name: 'Prenta kafla' })
			.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
		// 0.01 ms, compared in seconds: 1e-5 * 1000 is 0.010000000000000002
		expect(transition, "a toolbar button's colour transition, in seconds").toBeLessThanOrEqual(1e-5);
	});

	test("control: under 'no-preference' the same steps animate for longer", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await recordAnimations(page);
		await openTheAnimatedParts(page);
		expect(await longest(page)).toBeGreaterThan(1);
	});
});
