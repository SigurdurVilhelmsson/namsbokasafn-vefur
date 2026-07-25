/**
 * Atriðisorðaskrá (subject index) gating — R6-4
 *
 * The book-wide index only exists for books that ship an index.json (→ toc.index).
 * Books without one (physics/microbiology/organic, and biology before its index
 * syncs) must NOT show a dead sidebar link, and the route must degrade to a
 * friendly "not available yet" state instead of a red error block.
 *
 * Fixtures are chosen from the synced content at run time, not hardcoded: which
 * books ship an index changes as efni's content advances. This spec previously
 * pinned edlisfraedi-2e as the no-index book and went red when physics gained one,
 * while the app was behaving correctly.
 */

import { test, expect } from '@playwright/test';
import { bookWith, bookWithout } from './helpers/content-fixtures';

const WITH_INDEX = bookWith('index');
const WITHOUT_INDEX = bookWithout('index');

test.describe('Atriðisorðaskrá gating (R6-4)', () => {
	test('sidebar shows the index link for a book that has an index', async ({ page }) => {
		test.skip(!WITH_INDEX, 'no synced book ships an index — nothing to assert the positive case on');
		const slug = WITH_INDEX as string;
		await page.goto(`/${slug}`);
		await page.waitForLoadState('networkidle');
		// Minniskort is unconditional — its presence proves the sidebar toc loaded.
		await expect(page.locator(`aside.sidebar a[href$="/${slug}/minniskort"]`)).toHaveCount(1);
		await expect(page.locator(`aside.sidebar a[href$="/${slug}/atridiordasskra"]`)).toHaveCount(1);
	});

	test('sidebar hides the index link for a book with no index', async ({ page }) => {
		test.skip(!WITHOUT_INDEX, 'every synced book now ships an index — no fixture for the negative case');
		const slug = WITHOUT_INDEX as string;
		await page.goto(`/${slug}`);
		await page.waitForLoadState('networkidle');
		// Wait for the sidebar to render (unconditional link present) before asserting absence.
		await expect(page.locator(`aside.sidebar a[href$="/${slug}/minniskort"]`)).toHaveCount(1);
		await expect(page.locator(`aside.sidebar a[href$="/${slug}/atridiordasskra"]`)).toHaveCount(0);
	});

	test('index route degrades gracefully (not a red error) when the book has no index', async ({
		page
	}) => {
		test.skip(!WITHOUT_INDEX, 'every synced book now ships an index — no fixture for the negative case');
		const slug = WITHOUT_INDEX as string;
		await page.goto(`/${slug}/atridiordasskra`);
		await page.waitForLoadState('networkidle');
		const main = page.locator('main');
		// Friendly "not available yet" wording, not the failure message.
		await expect(main).toContainText(/ekki tiltæk/i);
		await expect(main).not.toContainText(/Gat ekki hlaðið/i);
	});
});
