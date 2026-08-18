/**
 * Renamed section slugs (§C9) must redirect, not 404.
 *
 * A Pass-1 review that corrects a section title renames the rendered file, so
 * the old URL stops resolving once efni prunes the superseded page. The app
 * prerenders a meta-refresh stub for each old slug, listed in
 * `src/lib/data/sectionRedirects.ts`.
 *
 * WHY THIS SPEC EXISTS RATHER THAN A UNIT TEST: the mechanism depends on
 * build-and-serve details a unit test cannot see —
 *   - `trailingSlash: 'always'` (src/routes/+layout.ts) is what makes the
 *     prerenderer emit `<slug>/index.html`. nginx has no `try_files $uri.html`,
 *     so a flat `<slug>.html` would be unreachable and the redirect would
 *     silently never fire, with the build still green.
 *   - the redirect only survives if the route's catch re-throws `isRedirect`.
 * Both failures are invisible to `npm run build`. This spec is what turns them
 * red.
 *
 * Fixtures derive from the synced content at run time: a redirect can only fire
 * when its TARGET is actually published, and which sections exist is a fact
 * about efni's content that changes. Skipping beats a false red.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SECTION_REDIRECTS } from '../src/lib/data/sectionRedirects';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(HERE, '..', 'static', 'content');

interface TocSection {
	file?: string;
}
interface TocChapter {
	number: number;
	sections: TocSection[];
}

/** Is `slug` published in `book`'s chapter `chapterDir` right now? */
function sectionIsPublished(book: string, chapterDir: string, slug: string): boolean {
	const file = join(CONTENT_DIR, book, 'toc.json');
	if (!existsSync(file)) return false;
	try {
		const toc = JSON.parse(readFileSync(file, 'utf-8')) as {
			chapters?: TocChapter[];
			frontMatter?: TocSection[];
		};
		const sections =
			parseInt(chapterDir, 10) === 0
				? (toc.frontMatter ?? [])
				: (toc.chapters ?? []).find((c) => String(c.number).padStart(2, '0') === chapterDir)
						?.sections;
		return (sections ?? []).some((s) => s.file?.replace(/\.html$/, '') === slug);
	} catch {
		return false;
	}
}

for (const r of SECTION_REDIRECTS) {
	const targetLive = sectionIsPublished(r.bookSlug, r.toChapter, r.toSlug);
	const oldUrl = `/${r.bookSlug}/kafli/${r.fromChapter}/${r.fromSlug}/`;
	const newUrl = `/${r.bookSlug}/kafli/${r.toChapter}/${r.toSlug}/`;

	test.describe(`${r.bookSlug} ${r.fromSlug} -> ${r.toSlug}`, () => {
		test.skip(
			!targetLive,
			`redirect target ${r.toSlug} is not published in this content sync — nothing to redirect to`
		);

		test('the old URL lands the reader on the corrected section', async ({ page }) => {
			await page.goto(oldUrl);
			await page.waitForURL(`**${newUrl}`);
			expect(new URL(page.url()).pathname).toBe(newUrl);
		});

		test('the old URL is not an error page', async ({ page }) => {
			await page.goto(oldUrl);
			await page.waitForURL(`**${newUrl}`);
			// The 404 route renders "Kafli fannst ekki"; real content never does.
			await expect(page.locator('body')).not.toContainText('fannst ekki');
		});

		// CONTROL: the current URL must serve content directly, with no bounce.
		// If this ever redirects, from/to have been swapped into a self-loop.
		test('the corrected URL does not itself redirect', async ({ page }) => {
			await page.goto(newUrl);
			expect(new URL(page.url()).pathname).toBe(newUrl);
		});

		// CONTROL: a nonsense sibling must NOT reach the target. Without this, a
		// blanket redirect would look identical to a correct one.
		test('a nonsense slug in the same chapter does not reach the target', async ({ page }) => {
			await page.goto(`/${r.bookSlug}/kafli/${r.fromChapter}/zzz-nonsense-slug/`);
			expect(new URL(page.url()).pathname).not.toBe(newUrl);
		});
	});
}
