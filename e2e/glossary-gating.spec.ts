/**
 * Orðasafn (glossary) gating — R6-6
 *
 * The book glossary only exists for books that ship a glossary.json (→ toc.glossary).
 * Books without one (orverufraedi, lifraen-efnafraedi — 0 <glossary> in source until
 * efni's D5 lands) must NOT show a dead sidebar link, and the route must degrade to a
 * friendly "not available yet" state instead of a red error block.
 *
 * Fixtures: efnafraedi-2e HAS a glossary; orverufraedi does NOT.
 */

import { test, expect } from '@playwright/test';

const WITH_GLOSSARY = 'efnafraedi-2e';
const WITHOUT_GLOSSARY = 'orverufraedi';

test.describe('Orðasafn gating (R6-6)', () => {
	test('sidebar shows the Orðasafn link for a book that has a glossary', async ({ page }) => {
		await page.goto(`/${WITH_GLOSSARY}`);
		await page.waitForLoadState('networkidle');
		// Minniskort is unconditional — its presence proves the sidebar toc loaded.
		await expect(page.locator(`aside.sidebar a[href$="/${WITH_GLOSSARY}/minniskort"]`)).toHaveCount(
			1
		);
		await expect(page.locator(`aside.sidebar a[href$="/${WITH_GLOSSARY}/ordabok"]`)).toHaveCount(1);
	});

	test('sidebar hides the Orðasafn link for a book with no glossary', async ({ page }) => {
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
		await page.goto(`/${WITHOUT_GLOSSARY}/ordabok`);
		await page.waitForLoadState('networkidle');
		const main = page.locator('main');
		await expect(main).toContainText(/ekki tiltæk/i);
		await expect(main).not.toContainText(/Gat ekki hlaðið/i);
	});
});
