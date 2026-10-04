/**
 * Search-engine head tags, one sample of each page type.
 *
 * Found 2026-10-04 on namsbokasafn.is: 339 of 360 pages carried two
 * <meta name="description"> (a site-wide default plus the page's own), the
 * colophon had no Open Graph tags, and canonical / og:url pointed at the URL
 * without its trailing slash, which answers 301 (trailingSlash is 'always').
 */

import { test, expect, type Page } from '@playwright/test';
import { sectionsContaining, syncedBooks } from './helpers/content-fixtures';

async function head(page: Page, path: string) {
	await page.goto(path);
	// Wait for the page itself (the landing page has no <main>)
	await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
	return page.evaluate(() => ({
		descriptions: [...document.querySelectorAll('meta[name="description"]')].map(
			(m) => m.getAttribute('content') ?? ''
		),
		canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
		ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
		ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null
	}));
}

const book = syncedBooks()[0];
const section = sectionsContaining('<p', 1)[0];
const PAGES = [
	'/',
	`/${book}/`,
	`/${book}/leyfi/`,
	`/${book}/minniskort/`,
	...(section ? [section] : [])
];

for (const path of PAGES) {
	test(`${path} has one description and slash-terminated canonical URLs`, async ({ page }) => {
		const h = await head(page, path);
		expect(h.descriptions).toHaveLength(1);
		expect(h.descriptions[0].length).toBeGreaterThan(20);
		expect(h.canonical).toBe(`https://namsbokasafn.is${path}`);
		expect(h.ogUrl).toBe(`https://namsbokasafn.is${path}`);
		expect(h.ogTitle).toBeTruthy();
	});
}
