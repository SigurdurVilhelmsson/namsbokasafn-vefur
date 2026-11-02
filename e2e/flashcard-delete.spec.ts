/**
 * Deleting a card on /:book/minniskort (reader plan S7.2, register UI-14). Before this, a card
 * once made could be removed only by clearing the site's data: no page called the store's
 * remove methods.
 *
 * A file of its own, not flashcards.spec.ts, because feature/reader-m4 rewrites that file.
 * The seed holds a study record for each card, so the test can show the deleted card's record
 * goes with it and the other card's stays.
 */

import { test, expect, type Page } from '@playwright/test';
import { syncedBooks } from './helpers/content-fixtures';
import AxeBuilder from '@axe-core/playwright';
import { WCAG_TAGS } from './helpers/axe';

const STORAGE_KEY = 'namsbokasafn:flashcards';
const CARDS = [
	{ id: 'del-1', front: 'Hvað er mól?', back: 'Magn efnis' },
	{ id: 'del-2', front: 'Hvað er atóm?', back: 'Minnsta eining frumefnis' }
];

async function openSeeded(page: Page) {
	await page.addInitScript(
		({ key, cards }) => {
			// Only on the first load: a reload must see what the app saved
			if (localStorage.getItem(key)) return;
			const created = '2026-11-01T12:00:00.000Z';
			const record = (cardId: string) => ({
				cardId,
				lastReviewed: created,
				nextReview: '2026-11-03T12:00:00.000Z',
				ease: 2.5,
				interval: 1,
				reviewCount: 1,
				consecutiveCorrect: 1
			});
			localStorage.setItem(
				key,
				JSON.stringify({
					decks: [
						{
							id: 'del-deck',
							name: 'Prófunarstokkur',
							created,
							cards: cards.map((c) => ({ ...c, created }))
						}
					],
					studyRecords: Object.fromEntries(cards.map((c) => [c.id, record(c.id)]))
				})
			);
		},
		{ key: STORAGE_KEY, cards: CARDS }
	);
	await page.goto(`/${syncedBooks()[0]}/minniskort/`);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
		timeout: 15000
	});
}

const stored = (page: Page) =>
	page.evaluate((key) => {
		const state = JSON.parse(localStorage.getItem(key) ?? '{}');
		return {
			cards: (state.decks?.[0]?.cards ?? []).map((c: { id: string }) => c.id),
			records: Object.keys(state.studyRecords ?? {})
		};
	}, STORAGE_KEY);

/** The deck row's card count, by its number: the word after it is UI text that may change */
const deckTotal = (page: Page) => page.locator('.deck-card-stats span').first();

const deleteButton = (page: Page, front: string) =>
	page.getByRole('button', { name: `Eyða spjaldi: ${front}` });

test.describe('Deleting a flashcard', () => {
	test('a confirmed delete removes the card and its record, across a reload', async ({ page }) => {
		await openSeeded(page);
		await page.getByText('Spjöldin í stokknum').click();
		page.once('dialog', (dialog) => {
			expect(dialog.type()).toBe('confirm');
			expect(dialog.message()).toBe('Eyða þessu spjaldi? Þetta er ekki hægt að afturkalla.');
			void dialog.accept();
		});
		await deleteButton(page, CARDS[0].front).click();

		await expect(deleteButton(page, CARDS[0].front)).toHaveCount(0);
		await expect(deleteButton(page, CARDS[1].front)).toBeFocused();
		await expect(deckTotal(page)).toHaveText(/^1 /);

		await page.reload();
		await expect(deckTotal(page)).toHaveText(/^1 /, { timeout: 15000 });
		expect(await stored(page)).toEqual({ cards: ['del-2'], records: ['del-2'] });
	});

	test('a cancelled delete keeps the card and its record', async ({ page }) => {
		await openSeeded(page);
		await page.getByText('Spjöldin í stokknum').click();
		page.once('dialog', (dialog) => void dialog.dismiss());
		await deleteButton(page, CARDS[0].front).click();

		await expect(deleteButton(page, CARDS[0].front)).toBeVisible();
		await expect(deckTotal(page)).toHaveText(new RegExp(`^${CARDS.length} `));
		expect(await stored(page)).toEqual({ cards: ['del-1', 'del-2'], records: ['del-1', 'del-2'] });
	});

	test('the card list is collapsed until opened, and passes axe', async ({ page }) => {
		await openSeeded(page);
		await expect(deleteButton(page, CARDS[0].front)).toBeHidden();
		await page.getByText('Spjöldin í stokknum').click();
		await expect(deleteButton(page, CARDS[0].front)).toBeVisible();
		const results = await new AxeBuilder({ page }).include('.deck-cards').withTags(WCAG_TAGS).analyze();
		expect(
			results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
		).toEqual([]);
	});
});
