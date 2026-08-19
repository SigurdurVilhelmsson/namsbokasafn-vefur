/**
 * Redirects for section slugs that changed when a Pass-1 review corrected a
 * section title (namsbokasafn-efni §C9). The title drives the rendered
 * filename, which drives the URL, so a title correction renames the page and
 * orphans its old URL.
 *
 * Why a checked-in constant rather than reading efni's
 * `static/content/<book>/slug-map.<track>.json`: that directory is gitignored
 * and only appears after a sync, so anything derived from it is absent in a
 * clean checkout and in CI. This list is present everywhere.
 *
 * Keep in step with the commented 301 block in `nginx-config-example.conf`.
 */

import type { TableOfContents } from '$lib/types/content';

export interface SectionRedirect {
	bookSlug: string;
	/** Zero-padded chapter directory, e.g. "10", or the literal "appendices". */
	fromChapter: string;
	/** Old file basename, without ".html". */
	fromSlug: string;
	toChapter: string;
	toSlug: string;
	/** efni module id owning BOTH pages — a rename is always within one module. */
	moduleId: string;
}

export const SECTION_REDIRECTS: SectionRedirect[] = [
	// efni slug-map.mt-preview.json, recorded 2026-08-18. A re-render corrected
	// the title ("fast ástand efnis" -> "fastur efnishamur").
	{
		bookSlug: 'efnafraedi-2e',
		fromChapter: '10',
		fromSlug: '10-5-fast-astand-efnis',
		toChapter: '10',
		toSlug: '10-5-fastur-efnishamur',
		moduleId: 'm68770'
	},
	// NOT from a slug map. efni's C56 re-extract + re-MT of ch20 (efni c17bb7cf,
	// 2026-08-12) predates §C9 prune-on-rename, so the rename was never recorded
	// and `renamesFromMap` cannot see it — validate-content's detector stayed
	// silent while the old URL was live in the deployed sitemap. Found instead by
	// diffing the DEPLOYED toc.json against a freshly built one; that diff, not
	// the slug map, is the backstop that catches pre-§C9 renames.
	// Title corrected "Aldehýð, ketónar, ..." -> "Aldehýð, ketón, ...".
	{
		bookSlug: 'efnafraedi-2e',
		fromChapter: '20',
		fromSlug: '20-3-aldehyd-ketonar-karboxylsyrur-og-estrar',
		toChapter: '20',
		toSlug: '20-3-aldehyd-keton-karboxylsyrur-og-estrar',
		moduleId: 'm68848'
	}
];

/**
 * Look up a redirect for a section URL. Returns null when the slug is current,
 * unknown, or belongs to another book/chapter.
 */
export function findSectionRedirect(
	bookSlug: string,
	chapterSlug: string,
	sectionSlug: string
): SectionRedirect | null {
	return (
		SECTION_REDIRECTS.find(
			(r) =>
				r.bookSlug === bookSlug && r.fromChapter === chapterSlug && r.fromSlug === sectionSlug
		) ?? null
	);
}

/**
 * Exact-match test for "is this section actually published right now?".
 *
 * Deliberately NOT `findSectionBySlug`: that has `slug`-field, "1-1" -> "1.1"
 * and `\d+-exercises` fallbacks which would report a DIFFERENT section as live
 * and send the reader somewhere wrong. A redirect must only fire when its exact
 * target exists, because our own overlay (`scripts/lib/overlay.js`) can delete
 * a page that efni named as the target.
 */
export function exactSectionExists(
	toc: TableOfContents,
	chapterSlug: string,
	sectionSlug: string
): boolean {
	const matches = (sections: { file?: string }[]) =>
		sections.some((s) => s.file?.replace(/\.html$/, '') === sectionSlug);

	// Front matter (formáli etc.) lives in chapter dir "00", outside toc.chapters.
	if (parseInt(chapterSlug, 10) === 0) {
		return matches(toc.frontMatter ?? []);
	}

	const chapter = toc.chapters.find((c) => String(c.number).padStart(2, '0') === chapterSlug);
	if (!chapter) return false;

	return matches(chapter.sections);
}
