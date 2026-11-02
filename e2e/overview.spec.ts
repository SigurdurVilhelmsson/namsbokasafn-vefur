/**
 * The overview (/yfirlit) shows the chapter whose chip is selected (code review M17).
 *
 * Each chip starts a long run of fetches and nothing cancelled the one before, so a slow
 * load ('Allir kaflar') that finished after a quick one ('Kafli 1') replaced its results:
 * the page showed every chapter under the 'Kafli 1' chip.
 */
import { expect, test } from '@playwright/test';
import { publishedBook } from './helpers/content-fixtures';

const BOOK = publishedBook();

test('a slower earlier choice never replaces the selected chapter', async ({ page }) => {
	test.skip(!BOOK, 'no published book is synced');
	// A little network latency per section file, as on a real connection: locally the files
	// arrive so fast that 'Allir kaflar' can finish before the second click lands
	await page.route('**/content/**/chapters/**', (route) => setTimeout(() => route.continue(), 30));
	let pending = 0;
	let lastActivity = Date.now();
	const isSectionFile = (url: string) => url.includes('/chapters/');
	page.on('request', (r) => {
		if (!isSectionFile(r.url())) return;
		pending++;
		lastActivity = Date.now();
	});
	for (const event of ['requestfinished', 'requestfailed'] as const) {
		page.on(event, (r) => {
			if (!isSectionFile(r.url())) return;
			pending--;
			lastActivity = Date.now();
		});
	}
	await page.goto(`/${BOOK}/yfirlit/`);
	await page.waitForLoadState('networkidle');

	const tabs = page.getByRole('tablist', { name: 'Veldu kafla' });
	await tabs.getByRole('tab', { name: 'Allir kaflar' }).click();
	await tabs.getByRole('tab', { name: 'Kafli 1', exact: true }).click();
	await expect(tabs.getByRole('tab', { name: 'Kafli 1', exact: true })).toHaveAttribute('aria-selected', 'true');

	// Let every fetch finish, including the abandoned 'Allir kaflar' run: wait until no section
	// file has been in flight for a second (waitForLoadState('networkidle') returns at once,
	// since the page reached that state before the clicks)
	await expect.poll(() => (pending === 0 && Date.now() - lastActivity > 1000 ? 'quiet' : 'busy'), {
		timeout: 60000,
		intervals: [250]
	}).toBe('quiet');

	const breadcrumbs = await page.locator('a', { hasText: /^\s*Kafli \d+ >/ }).allTextContents();
	expect(breadcrumbs.length, 'chapter 1 has review blocks').toBeGreaterThan(0);
	expect(breadcrumbs.filter((t) => !/^\s*Kafli 1 >/.test(t))).toEqual([]);
});
