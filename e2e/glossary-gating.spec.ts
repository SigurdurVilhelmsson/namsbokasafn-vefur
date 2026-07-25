/**
 * Orðasafn (glossary) gating — R6-6
 *
 * The book glossary only exists for books that ship a glossary.json (→ toc.glossary).
 * Books without one (orverufraedi, lifraen-efnafraedi — 0 <glossary> in source until
 * efni's D5 lands) must NOT show a dead sidebar link, and the route must degrade to a
 * friendly "not available yet" state instead of a red error block.
 *
 * Fixtures are chosen from the synced content at run time, not hardcoded: which books
 * ship a glossary changes as efni's content advances. The sibling index-gating spec
 * pinned a slug this way and went red when that book gained an index, while the app
 * was correct — the comment above even anticipates orverufraedi gaining one.
 */

import { test, expect } from '@playwright/test';
import { bookWith, bookWithout } from './helpers/content-fixtures';

const WITH_GLOSSARY = bookWith('glossary');
const WITHOUT_GLOSSARY = bookWithout('glossary');

test.describe('Orðasafn gating (R6-6)', () => {
	test('sidebar shows the Orðasafn link for a book that has a glossary', async ({ page }) => {
		test.skip(!WITH_GLOSSARY, 'no synced book ships a glossary — nothing to assert the positive case on');
		await page.goto(`/${WITH_GLOSSARY}`);
		await page.waitForLoadState('networkidle');
		// Minniskort is unconditional — its presence proves the sidebar toc loaded.
		await expect(page.locator(`aside.sidebar a[href$="/${WITH_GLOSSARY}/minniskort"]`)).toHaveCount(
			1
		);
		await expect(page.locator(`aside.sidebar a[href$="/${WITH_GLOSSARY}/ordabok"]`)).toHaveCount(1);
	});

	test('sidebar hides the Orðasafn link for a book with no glossary', async ({ page }) => {
		test.skip(!WITHOUT_GLOSSARY, 'every synced book now ships a glossary — no fixture for the negative case');
		await page.goto(`/${WITHOUT_GLOSSARY}`);
		await page.waitForLoadState('networkidle');
		await expect(
			page.locator(`aside.sidebar a[href$="/${WITHOUT_GLOSSARY}/minniskort"]`)
		).toHaveCount(1);
		await expect(
			page.locator(`aside.sidebar a[href$="/${WITHOUT_GLOSSARY}/ordabok"]`)
		).toHaveCount(0);
	});

	test('Orðasafn route degrades gracefully (not a red error) when the book has no glossary', async ({
		page
	}) => {
		test.skip(!WITHOUT_GLOSSARY, 'every synced book now ships a glossary — no fixture for the negative case');
		await page.goto(`/${WITHOUT_GLOSSARY}/ordabok`);
		await page.waitForLoadState('networkidle');
		const main = page.locator('main');
		await expect(main).toContainText(/ekki tiltæk/i);
		await expect(main).not.toContainText(/Gat ekki hlaðið/i);
	});
});
