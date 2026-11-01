/**
 * Flashcard page (/:book/minniskort): deck list, study session, rating.
 *
 * A fresh profile has no cards (a reader makes them by selecting text in a
 * section), so the tests seed one small deck through the store's localStorage
 * key. Until 2026-10-04 every test here skipped: they reached the page by
 * clicking through the landing page, lost a client-side navigation race, and
 * called a bare test.skip(). Past that, they looked for a "Byrja námsæfingu"
 * button the page no longer has, and would have skipped on it.
 *
 * Predict-first (plan step S4.1, KEEP-02): the card is not a button. The answer
 * and the ratings appear only after 'Man það' or 'Man það ekki'. Never bring
 * tap-to-flip back: it would remove the intervention.
 */

import { test, expect, type Page } from '@playwright/test';
import { CARDS, STORAGE_KEY, openFlashcards } from './helpers/flashcards';

const RATINGS = ['Rangt', 'Að hluta', 'Rétt', 'Auðvelt'];

/** The question card of the running session, and which seeded card it shows */
async function currentCard(page: Page) {
	const question = page.getByRole('region', { name: 'Spurning', exact: true });
	await expect(question).toBeVisible();
	const text = (await question.textContent()) ?? '';
	const card = CARDS.find((c) => text.includes(c.front));
	expect(card, `question "${text}" is one of the seeded cards`).toBeTruthy();
	return { question, card: card! };
}

test.describe('Flashcard Page', () => {
	test('says there are no cards yet in a fresh profile', async ({ page }) => {
		await openFlashcards(page, { seed: false });
		await expect(page.getByText('Engin minniskort enn')).toBeVisible();
	});

	test('lists a deck with its card count', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await expect(page.getByText('Prófunarstokkur')).toBeVisible();
		await expect(page.getByText(`${CARDS.length} kort`)).toBeVisible();
	});

	test('Æfa starts a session on a card of the deck', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await page.getByRole('button', { name: 'Æfa' }).click();
		await currentCard(page);
	});

	test('the answer stays hidden until a prediction is made', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await page.getByRole('button', { name: 'Æfa' }).click();
		const { card } = await currentCard(page);

		// Before a prediction: no answer, no ratings, and no card to tap
		await expect(page.getByRole('main').getByText(card.back)).toHaveCount(0);
		for (const rating of RATINGS) {
			await expect(page.getByRole('button', { name: new RegExp(`^${rating}`) })).toHaveCount(0);
		}
		await expect(page.getByRole('button', { name: /^Spurning/ })).toHaveCount(0);

		// Exact: 'Man það' is also the start of 'Man það ekki'
		await page.getByRole('button', { name: 'Man það', exact: true }).click();
		await expect(page.getByRole('region', { name: 'Svar', exact: true })).toContainText(card.back);
		for (const rating of RATINGS) {
			await expect(page.getByRole('button', { name: new RegExp(`^${rating}`) })).toBeVisible();
		}
	});

	test("'Man það ekki' then 'Rétt' moves on, saves both, and survives a reload", async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await page.getByRole('button', { name: 'Æfa' }).click();
		const { card } = await currentCard(page);
		await page.getByRole('button', { name: 'Man það ekki', exact: true }).click();
		await expect(page.getByRole('region', { name: 'Svar', exact: true })).toContainText(card.back);
		await page.getByRole('button', { name: /^Rétt/ }).click();

		// The other card comes up next
		const next = page.getByRole('region', { name: 'Spurning', exact: true });
		await expect(next).not.toContainText(card.front);

		const saved = await page.evaluate((key) => {
			const state = JSON.parse(localStorage.getItem(key) ?? '{}');
			return Object.keys(state.studyRecords ?? {});
		}, STORAGE_KEY);
		expect(saved).toContain(card.id);

		// The review records the doubt beside the outcome: predicted unknown, rated correct
		const review = await page.evaluate((key) => {
			const state = JSON.parse(localStorage.getItem(key) ?? '{}');
			return (state.reviewHistory ?? []).at(-1);
		}, STORAGE_KEY);
		expect(review).toMatchObject({ cardId: card.id, rating: 'good', predictedKnown: false, wasCorrect: true });

		// A reload resumes the session on the next card
		await page.reload();
		await expect(page.getByText(`Kort 2 af ${CARDS.length}`)).toBeVisible({ timeout: 15000 });
		const afterReload = await page.evaluate((key) => {
			const state = JSON.parse(localStorage.getItem(key) ?? '{}');
			return Object.keys(state.studyRecords ?? {});
		}, STORAGE_KEY);
		expect(afterReload).toContain(card.id);
	});
});
