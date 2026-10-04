/**
 * URL levels with no page of their own redirect to the book home.
 *
 * `/<book>/kafli/`, `/<book>/kafli/00/`, `/<book>/svarlykill/` and
 * `/<book>/vidauki/` are folders in the static build. With nothing rendered at
 * them, nginx answered 403 Forbidden on the live site (2026-10-04) to a reader
 * who trimmed a URL. See src/lib/utils/bookHomeRedirect.ts.
 */

import { test, expect } from '@playwright/test';
import { bookWithFrontMatter, syncedBooks } from './helpers/content-fixtures';

const FRONT_MATTER_BOOK = bookWithFrontMatter();

for (const level of ['kafli', 'kafli/00', 'svarlykill', 'vidauki']) {
	test(`/${level}/ leads to the book home`, async ({ page }) => {
		const book = level === 'kafli/00' ? FRONT_MATTER_BOOK : syncedBooks()[0];
		test.skip(!book, 'no synced book has front matter');
		// The raw response must be the prerendered stub. A preview server falls
		// back to the app shell, whose router would also redirect, but nginx
		// answers 403 for a build folder with no index.html: only the file
		// itself proves the fix the live site needs.
		const raw = await page.request.get(`/${book}/${level}/`);
		expect(await raw.text()).toContain(`http-equiv="refresh" content="0;url=/${book}/"`);

		await page.goto(`/${book}/${level}/`);
		await expect(page).toHaveURL((u) => u.pathname === `/${book}/`);
	});
}
