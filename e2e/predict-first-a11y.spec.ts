/**
 * Predict-first's accessibility (plan step S4.2; register UI-01, PED-20, UI-16).
 *
 * Before S4.2, the prediction buttons disappeared with focus on them, so focus fell to
 * <body> after a prediction and after a rating; the prediction vanished once the answer
 * showed; and the rating grid's interval previews were faded to 2.07-3.97:1. Kept apart
 * from flashcards.spec.ts, whose 5 tests M4's exit criterion counts.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY, openFlashcards, seedDeck } from './helpers/flashcards';
import { syncedBooks } from './helpers/content-fixtures';

const question = (page: Page) => page.getByRole('region', { name: 'Spurning', exact: true });
const answer = (page: Page) => page.getByRole('region', { name: 'Svar', exact: true });
const echo = (page: Page) => answer(page).locator('p', { hasText: 'Þú sagðir' });
const predict = (page: Page, label: 'Man það' | 'Man það ekki') =>
	page.getByRole('button', { name: label, exact: true });

const reviewCount = (page: Page) =>
	page.evaluate(
		(key) => (JSON.parse(localStorage.getItem(key) ?? '{}').reviewHistory ?? []).length as number,
		STORAGE_KEY
	);

async function startSession(page: Page) {
	await openFlashcards(page, { seed: true });
	await page.getByRole('button', { name: 'Æfa' }).click();
	await expect(question(page)).toBeVisible();
}

test.describe('Predict-first on /minniskort', () => {
	test('after a prediction, focus is on the answer, and a held Enter rates nothing', async ({ page }) => {
		await startSession(page);
		await predict(page, 'Man það').focus();
		await page.keyboard.press('Enter');
		await expect(answer(page)).toBeFocused();

		// A held key repeats. With focus on a rating button, this recorded 'Aftur'.
		for (let i = 0; i < 5; i++) await page.keyboard.press('Enter');
		expect(await reviewCount(page)).toBe(0);
		await expect(answer(page)).toBeVisible();
	});

	test("after 'Gott', focus is on the next question, and the counter is spoken", async ({ page }) => {
		await startSession(page);
		await predict(page, 'Man það').click();
		await page.getByRole('button', { name: /^Gott/ }).focus();
		await page.keyboard.press('Enter');
		await expect(question(page)).toBeFocused();
		await expect(page.locator('[role="status"][aria-live="polite"]', { hasText: 'Kort 2 af 2' })).toHaveCount(1);
	});

	test('after the last card, focus is on the completion heading', async ({ page }) => {
		await startSession(page);
		for (let i = 0; i < 2; i++) {
			await predict(page, 'Man það').click();
			await page.getByRole('button', { name: /^Gott/ }).click();
		}
		await expect(page.getByRole('heading', { name: 'Vel gert!' })).toBeFocused();
	});

	test('the answer side says what was predicted', async ({ page }) => {
		await startSession(page);
		await predict(page, 'Man það ekki').click();
		await expect(echo(page)).toHaveText('Þú sagðir: Man það ekki');
	});

	for (const theme of ['light', 'dark'] as const) {
		test(`the rating grid has no contrast failure (${theme} theme)`, async ({ page }) => {
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
			await startSession(page);
			const html = page.locator('html');
			if (theme === 'dark') await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
			else await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
			await predict(page, 'Man það').click();
			await expect(page.locator('.rating-grid')).toBeVisible();

			const results = await new AxeBuilder({ page }).include('.rating-grid').withRules(['color-contrast']).analyze();
			expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
			// The control: axe measured the four labels and the four intervals
			const measured = results.passes.find((p) => p.id === 'color-contrast')?.nodes.length ?? 0;
			expect(measured).toBeGreaterThanOrEqual(8);
		});
	}
});

test.describe('Predict-first on /nam', () => {
	test('after a prediction, focus is on the answer, which says what was predicted', async ({ page }) => {
		await seedDeck(page);
		await page.goto(`/${syncedBooks()[0]}/nam/`);
		await page.getByRole('button', { name: /Hefja nám/ }).click();
		await expect(question(page)).toBeVisible({ timeout: 15000 });
		await predict(page, 'Man það').click();
		await expect(answer(page)).toBeFocused();
		await expect(echo(page)).toHaveText('Þú sagðir: Man það');
	});
});

test.describe("Predict-first's one-time 'why' line (plan step S4.3, PED-25)", () => {
	test('shows on the first card of a fresh profile, and never again', async ({ page }) => {
		await startSession(page);
		const why = page.getByText(/^Af hverju\?/);
		await expect(why).toBeVisible();

		await predict(page, 'Man það').click();
		await page.getByRole('button', { name: /^Gott/ }).click();
		await expect(question(page)).toBeVisible();
		await expect(why).toHaveCount(0);

		// The next visit resumes the session on the second card, still without it
		await page.reload();
		await expect(question(page)).toBeVisible({ timeout: 15000 });
		await expect(why).toHaveCount(0);
	});
});
