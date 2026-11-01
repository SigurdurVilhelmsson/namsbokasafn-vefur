/**
 * A seeded flashcard deck for the flashcard specs. A fresh profile has no cards (a reader
 * makes them by selecting text in a section), so the specs seed one small deck through the
 * store's localStorage key.
 */
import { expect, type Page } from '@playwright/test';
import { syncedBooks } from './content-fixtures';

export const STORAGE_KEY = 'namsbokasafn:flashcards';
export const CARDS = [
	{ id: 'e2e-1', front: 'Hvað er mól?', back: 'Magn efnis' },
	{ id: 'e2e-2', front: 'Hvað er atóm?', back: 'Minnsta eining frumefnis' }
];

/** Seed the deck before the first load only: a reload must see what the app saved. */
export async function seedDeck(page: Page): Promise<void> {
	await page.addInitScript(
		({ key, cards }) => {
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

/** Open /minniskort for the first synced book, with or without the seeded deck. */
export async function openFlashcards(page: Page, { seed }: { seed: boolean }): Promise<void> {
	if (seed) await seedDeck(page);
	await page.goto(`/${syncedBooks()[0]}/minniskort/`);
	await expect(page.getByRole('heading', { name: 'Minniskort', level: 1 })).toBeVisible({
		timeout: 15000
	});
}
