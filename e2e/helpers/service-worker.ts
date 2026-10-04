import type { Page } from '@playwright/test';

/** Open `url` and wait until the service worker controls the page. */
export async function openControlled(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.evaluate(() => navigator.serviceWorker.ready);
	if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
		await page.reload();
		await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
			timeout: 30_000
		});
	}
}
