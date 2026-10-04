/**
 * Saved reader state follows a renamed section (src/lib/utils/sectionRenames.ts).
 *
 * A reader's read marks and highlights are keyed by the section URL. When a
 * redirect row is ACTIVE (its target is published), opening the book must move
 * them to the new slug. When a row is INERT (target not published), its old page
 * is still the live one, and nothing may move.
 *
 * Fixtures come from SECTION_REDIRECTS and the synced content. In CI, which
 * syncs efni main, the chemistry rows' targets have since been renamed again,
 * so the active case can skip there, like section-redirects.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { SECTION_REDIRECTS } from '../src/lib/data/sectionRedirects';

function isPublished(book: string, chapter: string, slug: string): boolean {
	const path = `static/content/${book}/toc.json`;
	if (!existsSync(path)) return false;
	const toc = JSON.parse(readFileSync(path, 'utf-8'));
	const sections: { file?: string }[] =
		parseInt(chapter, 10) === 0
			? (toc.frontMatter ?? [])
			: (toc.chapters.find((c: { number: number }) => String(c.number).padStart(2, '0') === chapter)
					?.sections ?? []);
	return sections.some((s) => s.file?.replace(/\.html$/, '') === slug);
}

const active = SECTION_REDIRECTS.find((r) => isPublished(r.bookSlug, r.toChapter, r.toSlug));
// Inert: target not published, old page still live (today the physics ch04 rows)
const inert = SECTION_REDIRECTS.find(
	(r) => !isPublished(r.bookSlug, r.toChapter, r.toSlug) && isPublished(r.bookSlug, r.fromChapter, r.fromSlug)
);

test('opening the book moves an active rename’s read mark and highlight to the new slug', async ({
	page
}) => {
	test.skip(!active, 'no redirect row has a published target in this content sync');
	const r = active!;
	const oldKey = `${r.bookSlug}/${r.fromChapter}/${r.fromSlug}`;
	const newKey = `${r.bookSlug}/${r.toChapter}/${r.toSlug}`;
	await page.addInitScript(
		({ oldKey, r }) => {
			if (sessionStorage.getItem('seeded')) return; // seed once, not on reload
			sessionStorage.setItem('seeded', '1');
			const at = '2026-08-01T00:00:00.000Z';
			const progress = { [oldKey]: { read: true, lastVisited: at } };
			localStorage.setItem(
				'namsbokasafn:reader',
				JSON.stringify({ progress, currentChapter: null, currentSection: null, bookmarks: [oldKey], scrollProgress: 0, scrollPositions: {} })
			);
			localStorage.setItem(
				'namsbokasafn:annotations',
				JSON.stringify({
					annotations: [
						{
							id: 'e2e-1',
							bookSlug: r.bookSlug,
							chapterSlug: r.fromChapter,
							sectionSlug: r.fromSlug,
							selectedText: 'x',
							range: { startOffset: 0, endOffset: 1, startContainerPath: '', endContainerPath: '' },
							color: 'yellow',
							createdAt: at,
							updatedAt: at
						}
					]
				})
			);
		},
		{ oldKey, r }
	);

	await page.goto(`/${r.bookSlug}/kafli/${r.toChapter}/${r.toSlug}/`);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });

	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('namsbokasafn:reader')))
		.not.toContain(`"${oldKey}"`);
	const saved = await page.evaluate(() => ({
		reader: JSON.parse(localStorage.getItem('namsbokasafn:reader')!),
		annotations: JSON.parse(localStorage.getItem('namsbokasafn:annotations')!).annotations
	}));

	expect(saved.reader.progress[newKey]?.read).toBe(true);
	expect(saved.reader.bookmarks).toEqual([newKey]);
	expect(saved.annotations[0]).toMatchObject({ chapterSlug: r.toChapter, sectionSlug: r.toSlug });
});

test('an inert rename moves nothing: its old page is still the live one', async ({ page }) => {
	test.skip(!inert, 'no redirect row is inert with its old page published in this content sync');
	const r = inert!;
	const oldKey = `${r.bookSlug}/${r.fromChapter}/${r.fromSlug}`;

	await page.addInitScript((oldKey) => {
		localStorage.setItem(
			'namsbokasafn:reader',
			JSON.stringify({
				progress: { [oldKey]: { read: true, lastVisited: '2026-08-01T00:00:00.000Z' } },
				currentChapter: null,
				currentSection: null,
				bookmarks: [oldKey],
				scrollProgress: 0,
				scrollPositions: {}
			})
		);
	}, oldKey);

	// The old page loads this book's table of contents, which runs the migration
	await page.goto(`/${r.bookSlug}/kafli/${r.fromChapter}/${r.fromSlug}/`);
	await expect(page.locator('.reading-content').first()).toBeVisible({ timeout: 15000 });
	await page.waitForTimeout(1500);
	const reader = await page.evaluate(() => JSON.parse(localStorage.getItem('namsbokasafn:reader')!));
	expect(reader.progress[oldKey]?.read).toBe(true);
	expect(reader.bookmarks).toContain(oldKey);
});
