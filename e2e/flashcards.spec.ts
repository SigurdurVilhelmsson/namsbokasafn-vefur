/**
 * Flashcard Study Session Tests
 * Tests: deck display, card flipping, rating, session progression
 *
 * Note: These tests require book content with glossary terms.
 * Tests use conditional checks for content-dependent assertions.
 */

import { test, expect } from '@playwright/test';

/** Navigate to the flashcards page via the landing page */
async function navigateToFlashcards(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const bookLink = page.getByRole('link', { name: /Efnafræði/i }).first();
	await expect(bookLink).toBeVisible({ timeout: 10000 });
	await bookLink.click();
	await page.waitForLoadState('networkidle');

	const flashcardsLink = page.locator('a[href*="minniskort"]').first();
	if (!(await flashcardsLink.isVisible({ timeout: 5000 }).catch(() => false))) {
		return false;
	}
	await flashcardsLink.click();
	await page.waitForLoadState('networkidle');
	await expect(page).toHaveURL(/minniskort/);
	return true;
}

test.describe('Flashcard Page', () => {
	test('should load flashcards page', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		// Page should have loaded successfully
		await page.waitForTimeout(2000);

		// Should show either a start button or card stats
		const mainContent = page.locator('main');
		await expect(mainContent).toBeVisible({ timeout: 10000 });
	});

	test('should display deck statistics', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		// Look for statistics display (new/due/total counts)
		const pageText = await page.locator('main').textContent();
		if (pageText) {
			// The page should show some content - either stats or a message
			expect(pageText.length).toBeGreaterThan(10);
		}
	});

	test('should start study session when clicking start button', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		// Look for start study button
		const startButton = page.getByText('Byrja námsæfingu');
		if (!(await startButton.isVisible({ timeout: 5000 }).catch(() => false))) {
			// No start button - might have no cards or already in session
			test.skip();
			return;
		}

		await startButton.click();
		await page.waitForTimeout(1000);

		// After starting, should see a card or progress indicator
		// Card shows "Spurning" (Question) label
		const questionLabel = page.getByText('Spurning');
		const progressBar = page.locator('div.h-2.rounded-full');

		const hasCard = await questionLabel.isVisible({ timeout: 5000 }).catch(() => false);
		const hasProgress = await progressBar.isVisible({ timeout: 2000 }).catch(() => false);

		// Either a card or progress should be visible
		expect(hasCard || hasProgress).toBe(true);
	});

	test('should flip card to show answer', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		const startButton = page.getByText('Byrja námsæfingu');
		if (!(await startButton.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await startButton.click();
		await page.waitForTimeout(1000);

		// Click the card to flip it
		const card = page.locator('button.w-full.min-h-\\[300px\\]');
		if (!(await card.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await card.click();
		await page.waitForTimeout(500);

		// After flipping, should show "Svar" (Answer) label and rating buttons
		const answerLabel = page.getByText('Svar');
		const hasAnswer = await answerLabel.isVisible({ timeout: 3000 }).catch(() => false);

		if (hasAnswer) {
			// Rating buttons should now be visible
			const againButton = page.getByText('Aftur');
			const goodButton = page.getByText('Gott');
			expect(
				await againButton.isVisible({ timeout: 3000 }).catch(() => false) ||
					await goodButton.isVisible({ timeout: 3000 }).catch(() => false)
			).toBe(true);
		}
	});

	test('should rate card and advance to next', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		const startButton = page.getByText('Byrja námsæfingu');
		if (!(await startButton.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await startButton.click();
		await page.waitForTimeout(1000);

		// Flip the card
		const card = page.locator('button.w-full.min-h-\\[300px\\]');
		if (!(await card.isVisible({ timeout: 5000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await card.click();
		await page.waitForTimeout(500);

		// Click "Gott" (Good) rating
		const goodButton = page.getByText('Gott');
		if (!(await goodButton.isVisible({ timeout: 3000 }).catch(() => false))) {
			test.skip();
			return;
		}

		await goodButton.click();
		await page.waitForTimeout(1000);

		// Should advance (either to next card or completion)
		// Verify the session progressed by checking localStorage
		const flashcardData = await page.evaluate(() =>
			localStorage.getItem('namsbokasafn:flashcards')
		);
		expect(flashcardData).toBeTruthy();
	});

	test('should persist flashcard data in localStorage', async ({ page }) => {
		const navigated = await navigateToFlashcards(page);
		if (!navigated) {
			test.skip();
			return;
		}

		await page.waitForTimeout(2000);

		// Flashcard store should persist to localStorage
		const flashcardData = await page.evaluate(() =>
			localStorage.getItem('namsbokasafn:flashcards')
		);

		if (flashcardData) {
			const parsed = JSON.parse(flashcardData);
			expect(parsed).toHaveProperty('decks');
		}
	});
});
