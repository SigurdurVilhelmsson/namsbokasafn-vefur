/**
 * The catalogue (/) hydrates cleanly (worklist bl-catalogue-hydration).
 *
 * Each book card was one link wrapping the licence badge, itself a link. Links cannot nest,
 * so the HTML parser closed the card link before the badge and reopened it after; the DOM no
 * longer matched what Svelte expected, it logged hydration_mismatch on every hard load and
 * rendered the catalogue again on the client, nested links included. The badge now sits
 * beside the card link, still linking its licence (attribution is unchanged).
 */
import { expect, test } from '@playwright/test';

test('the catalogue hydrates without a mismatch, and each book card links its licence outside the card link', async ({
	page
}) => {
	const warnings: string[] = [];
	page.on('console', (message) => {
		if (/hydration_mismatch/.test(message.text())) warnings.push(message.text());
	});
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const cards = page.locator('.book-grid .book-card');
	await expect(cards.first()).toBeVisible();
	expect(warnings).toEqual([]);
	expect(await page.locator('a a').count(), 'a link inside a link').toBe(0);

	const count = await cards.count();
	for (let i = 0; i < count; i++) {
		await expect(cards.nth(i).locator('a[rel~="license"]'), `card ${i + 1}'s licence link`).toHaveCount(1);
	}
});
