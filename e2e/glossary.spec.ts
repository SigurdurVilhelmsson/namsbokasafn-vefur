/**
 * Glossary page (/:book/ordabok): the term list, search, letter filter.
 *
 * Expectations come from the book's own glossary.json, read at run time.
 * Until 2026-10-04 every test here skipped: they reached the page by clicking
 * through the landing page, lost a client-side navigation race, and called a
 * bare test.skip(). Two of them could not fail even when they ran.
 */

import { test, expect, type Page } from '@playwright/test';
import { bookWith, glossaryTerms } from './helpers/content-fixtures';

const BOOK = bookWith('glossary');
const TERMS = BOOK ? glossaryTerms(BOOK) : [];

async function openGlossary(page: Page) {
	await page.goto(`/${BOOK}/ordabok/`);
	await expect(page.getByPlaceholder('Leita í orðasafni...')).toBeVisible({ timeout: 15000 });
}

test.describe('Glossary Page', () => {
	test.skip(!BOOK || TERMS.length === 0, 'no synced book ships a glossary');

	test('lists every term in the glossary', async ({ page }) => {
		await openGlossary(page);
		await expect(page.locator('.glossary-count')).toHaveText(`${TERMS.length} niðurstöður`);
		await expect(page.locator('.glossary-term-card').first()).toBeVisible();
	});

	test('search narrows the list to the matching term', async ({ page }) => {
		await openGlossary(page);
		const target = TERMS.find((t) => t.term.length > 8) ?? TERMS[0];
		await page.getByPlaceholder('Leita í orðasafni...').fill(target.term);
		await expect(page.locator('.glossary-count')).not.toHaveText(`${TERMS.length} niðurstöður`);
		await expect(
			page.locator('.glossary-term-title').filter({ hasText: new RegExp(`^${target.term}$`) })
		).toBeVisible();
	});

	test('a letter shows only the terms that start with it', async ({ page }) => {
		await openGlossary(page);
		// The most common first letter, so the filter has something to show
		const counts = new Map<string, number>();
		for (const t of TERMS) {
			const l = t.term[0].toUpperCase();
			counts.set(l, (counts.get(l) ?? 0) + 1);
		}
		const [letter, expected] = [...counts].sort((x, y) => y[1] - x[1])[0];

		await page.locator('.glossary-letter-btn', { hasText: new RegExp(`^${letter}$`) }).click();
		await expect(page.locator('.glossary-count')).toHaveText(
			new RegExp(`^${expected} niðurstöð`)
		);
		const titles = await page.locator('.glossary-term-title').allTextContents();
		expect(titles.length).toBeGreaterThan(0);
		expect(titles.filter((t) => !t.trim().toUpperCase().startsWith(letter))).toEqual([]);
	});

	test('a term shows its English and its definition', async ({ page }) => {
		await openGlossary(page);
		const target = TERMS.find((t) => t.english) ?? TERMS[0];
		const card = page
			.locator('.glossary-term-card')
			.filter({ has: page.locator('.glossary-term-title', { hasText: new RegExp(`^${target.term}$`) }) })
			.first();
		await expect(card.locator('.glossary-term-definition')).toHaveText(target.definition);
		if (target.english) await expect(card.locator('.glossary-term-english')).toHaveText(target.english);
	});
});
