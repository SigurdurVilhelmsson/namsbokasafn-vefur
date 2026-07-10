/**
 * Atriðisorðaskrá (subject index) gating — R6-4
 *
 * The book-wide index only exists for books that ship an index.json (→ toc.index).
 * Books without one (physics/microbiology/organic, and biology before its index
 * syncs) must NOT show a dead sidebar link, and the route must degrade to a
 * friendly "not available yet" state instead of a red error block.
 *
 * Fixtures: efnafraedi-2e HAS an index; edlisfraedi-2e (physics) does NOT.
 */

import { test, expect } from '@playwright/test';

const WITH_INDEX = 'efnafraedi-2e';
const WITHOUT_INDEX = 'edlisfraedi-2e';

test.describe('Atriðisorðaskrá gating (R6-4)', () => {
	test('sidebar shows the index link for a book that has an index', async ({ page }) => {
		await page.goto(`/${WITH_INDEX}`);
		await page.waitForLoadState('networkidle');
		// Minniskort is unconditional — its presence proves the sidebar toc loaded.
		await expect(page.locator(`aside.sidebar a[href$="/${WITH_INDEX}/minniskort"]`)).toHaveCount(1);
		await expect(
			page.locator(`aside.sidebar a[href$="/${WITH_INDEX}/atridiordasskra"]`)
		).toHaveCount(1);
	});

	test('sidebar hides the index link for a book with no index', async ({ page }) => {
		await page.goto(`/${WITHOUT_INDEX}`);
		await page.waitForLoadState('networkidle');
		// Wait for the sidebar to render (unconditional link present) before asserting absence.
		await expect(
			page.locator(`aside.sidebar a[href$="/${WITHOUT_INDEX}/minniskort"]`)
		).toHaveCount(1);
		await expect(
			page.locator(`aside.sidebar a[href$="/${WITHOUT_INDEX}/atridiordasskra"]`)
		).toHaveCount(0);
	});

	test('index route degrades gracefully (not a red error) when the book has no index', async ({
		page
	}) => {
		await page.goto(`/${WITHOUT_INDEX}/atridiordasskra`);
		await page.waitForLoadState('networkidle');
		const main = page.locator('main');
		// Friendly "not available yet" wording, not the failure message.
		await expect(main).toContainText(/ekki tiltæk/i);
		await expect(main).not.toContainText(/Gat ekki hlaðið/i);
	});
});
