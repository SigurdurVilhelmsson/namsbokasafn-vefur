/**
 * Flashcard page (/:book/minniskort): deck list, study session, rating.
 *
 * A fresh profile has no cards (a reader makes them by selecting text in a
 * section), so the tests seed one small deck through the store's localStorage
 * key. Until 2026-10-04 every test here skipped: they reached the page by
 * clicking through the landing page, lost a client-side navigation race, and
 * called a bare test.skip(). Past that, they looked for a "Byrja námsæfingu"
 * button the page no longer has, and would have skipped on it.
 */

import { test, expect, type Page } from '@playwright/test';
import { syncedBooks } from './helpers/content-fixtures';

const STORAGE_KEY = 'namsbokasafn:flashcards';
const CARDS = [
	{ id: 'e2e-1', front: 'Hvað er mól?', back: 'Magn efnis' },
	{ id: 'e2e-2', front: 'Hvað er atóm?', back: 'Minnsta eining frumefnis' }
];

async function openFlashcards(page: Page, { seed }: { seed: boolean }) {
	if (seed) {
		await page.addInitScript(
			({ key, cards }) => {
				// Only on the first load: a reload must see what the app saved
				if (localStorage.getItem(key)) return;
				const created = new Date().toISOString();
				localStorage.setItem(
					key,
					JSON.stringify({
						decks: [
							{
								id: 'e2e-deck',
								name: 'Prófunarstokkur',
								created,
								cards: cards.map((c) => ({ ...c, created }))
							}
						]
					})
				);
			},
			{ key: STORAGE_KEY, cards: CARDS }
		);
	}
	await page.goto(`/${syncedBooks()[0]}/minniskort/`);
	await expect(page.getByRole('heading', { name: 'Minniskort', level: 1 })).toBeVisible({
		timeout: 15000
	});
}

/** The question card of the running session, and which seeded card it shows */
async function currentCard(page: Page) {
	const question = page.getByRole('button', { name: /^Spurning/ });
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

	test('flipping a card shows its answer and the four ratings', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await page.getByRole('button', { name: 'Æfa' }).click();
		const { question, card } = await currentCard(page);
		await question.click();

		await expect(page.getByRole('button', { name: /^Svar/ })).toContainText(card.back);
		for (const rating of ['Aftur', 'Erfitt', 'Gott', 'Auðvelt']) {
			await expect(page.getByRole('button', { name: new RegExp(`^${rating}`) })).toBeVisible();
		}
	});

	test('rating a card moves on and is saved across a reload', async ({ page }) => {
		await openFlashcards(page, { seed: true });
		await page.getByRole('button', { name: 'Æfa' }).click();
		const { question, card } = await currentCard(page);
		await question.click();
		await page.getByRole('button', { name: /^Gott/ }).click();

		// The other card comes up next
		const next = page.getByRole('button', { name: /^Spurning/ });
		await expect(next).not.toContainText(card.front);

		const saved = await page.evaluate((key) => {
			const state = JSON.parse(localStorage.getItem(key) ?? '{}');
			return Object.keys(state.studyRecords ?? {});
		}, STORAGE_KEY);
		expect(saved).toContain(card.id);

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
