/**
 * Decision D04 on /minniskort (plan step S4.4; register PED-08, PED-11, PED-20): the ratings
 * by correctness, 'Æfa' takes the due cards and 'Aukaæfing' every card without growing an
 * interval that is not due yet, and a message after 'Man það' and a miss.
 */
import { test, expect, type Page } from '@playwright/test';
import { STORAGE_KEY, openFlashcards } from './helpers/flashcards';

const question = (page: Page) => page.getByRole('region', { name: 'Spurning', exact: true });
const answer = (page: Page) => page.getByRole('region', { name: 'Svar', exact: true });
const predict = (page: Page) => page.getByRole('button', { name: 'Man það', exact: true });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

interface Stored {
	studyRecords: Record<string, { interval: number }>;
	reviewHistory: { rating: string; predictedKnown?: boolean; extra?: boolean }[];
}
const stored = (page: Page) =>
	page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as Stored, STORAGE_KEY);
const intervals = async (page: Page) => Object.values((await stored(page)).studyRecords ?? {}).map((r) => r.interval);

/** Predict 'Man það' and rate 'Rétt' on every card of the running session */
async function rememberAll(page: Page, cards: number) {
	for (let i = 0; i < cards; i++) {
		await predict(page).click();
		await page.getByRole('button', { name: /^Rétt/ }).click();
	}
}

test.describe("D04's rulings on /minniskort", () => {
	test('the hint asks for correctness and the ratings answer it', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await button(page, 'Æfa').click();
		await predict(page).click();
		await expect(page.getByText('Berðu saman við svarið: hafðirðu rétt fyrir þér?')).toBeVisible();
		for (const label of ['Rangt', 'Að hluta', 'Rétt', 'Auðvelt']) {
			await expect(page.getByRole('button', { name: new RegExp(`^${label}`) })).toBeVisible();
		}
	});

	test("'Æfa' again finds nothing due, and 'Aukaæfing' leaves the intervals alone", async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await button(page, 'Æfa').click();
		await rememberAll(page, 2);
		await expect(page.getByRole('heading', { name: 'Vel gert!' })).toBeFocused();
		await expect(page.getByText('Þú hefur lokið öllum kortum fyrir í dag.')).toBeVisible();
		expect(await intervals(page)).toEqual([1, 1]);

		await button(page, 'Til baka').click();
		await button(page, 'Æfa').click();
		await expect(page.getByRole('heading', { name: 'Ekkert kort á dagskrá' })).toBeFocused();

		await button(page, 'Aukaæfing').click();
		await expect(question(page)).toBeFocused();
		await rememberAll(page, 2);
		await expect(page.getByText('Aukaæfingu lokið.')).toBeVisible();
		expect(await intervals(page)).toEqual([1, 1]);
		expect((await stored(page)).reviewHistory.map((r) => r.extra ?? false)).toEqual([false, false, true, true]);
	});

	test("after 'Man það' and 'Rangt', a message with the answer, then 'Áfram' records it", async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await button(page, 'Æfa').click();
		await predict(page).click();
		await page.getByRole('button', { name: /^Rangt/ }).click();

		const message = 'Þú hélst að þú myndir þetta — skoðaðu svarið vel.';
		await expect(page.getByText(message, { exact: true })).toBeVisible();
		await expect(answer(page)).toBeFocused();
		await expect(page.locator('[role="status"][aria-live="polite"]', { hasText: message })).toHaveCount(1);
		expect((await stored(page)).reviewHistory ?? []).toHaveLength(0);

		await button(page, 'Áfram').click();
		await expect(question(page)).toBeVisible();
		expect((await stored(page)).reviewHistory).toMatchObject([{ rating: 'again', predictedKnown: true }]);
	});
});
