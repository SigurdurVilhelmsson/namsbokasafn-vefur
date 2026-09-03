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
	},

	// edlisfraedi-2e ch04 — FOUR renames, landed here BEFORE the sync that
	// activates them. All four old slugs are live on namsbokasafn.is and in the
	// deployed sitemap today; efni's mt-preview already carries the new names,
	// so the next `sync-content.js edlisfraedi-2e` retires all four at once.
	//
	// These entries are deliberately INERT until then: `load` only redirects
	// when `exactSectionExists` finds the target published, and the new slugs
	// are not in vefur's toc.json yet. So this ships safely ahead of the
	// content — which is the only ordering that gives readers no 404 window.
	//
	// When these were found there was NO slug map for edlisfraedi-2e at all, so
	// `renamesFromMap` had nothing to read and the §C9 detector could not warn.
	// Found instead by diffing vefur's published chapters against efni's
	// mt-preview keyed on `data-module-id`; a sweep of all five books found
	// these four and nothing else. Module id is identical across each pair, so
	// each is one module under two names, not a delete-plus-add.
	//
	// efni has since backfilled the map (2026-08-19), so the detector WILL now
	// cover these four once the book is synced — simulated against the real
	// detector: 0 uncovered, with a fabricated rename as control reporting 1.
	// That does not make these entries redundant: the map only reaches
	// `static/content/` on a sync of that book, and the detector is warn-only.
	{
		bookSlug: 'edlisfraedi-2e',
		fromChapter: '04',
		fromSlug: '4-1-throun-krafthugtaksins',
		toChapter: '04',
		toSlug: '4-1-throun-kraftshugtaksins',
		moduleId: 'm42069'
	},
	{
		bookSlug: 'edlisfraedi-2e',
		fromChapter: '04',
		fromSlug: '4-5-thverkraftur-spenna-og-onnur-daemi-um-krafta',
		toChapter: '04',
		toSlug: '4-5-thverkraftur-togkraftur-og-onnur-daemi-um-krafta',
		moduleId: 'm42075'
	},
	{
		bookSlug: 'edlisfraedi-2e',
		fromChapter: '04',
		fromSlug: '4-6-lausn-vandamala',
		toChapter: '04',
		toSlug: '4-6-lausnaradferdir-vid-urlausn-verkefna',
		moduleId: 'm42076'
	},
	{
		bookSlug: 'edlisfraedi-2e',
		fromChapter: '04',
		fromSlug: '4-8-itarefni-inngangur-ad-grunnkroftunum-fjorum',
		toChapter: '04',
		toSlug: '4-8-itarefni-grunnkraftarnir-fjorir-inngangur',
		moduleId: 'm42137'
	},

	// lifraen-efnafraedi ch03 — THREE renames, from efni's
	// `slug-map.mt-preview.json` (recorded 2026-09-02). A fresh paid MT of organic
	// ch03 (efni §C118 ⑯/⑲) retitled three sections, and efni's prune-on-rename
	// deleted the old pages and recorded old -> new.
	//
	// Landed here BEFORE the sync that activates them, for the same reason as the
	// physics block above: `load` only redirects when `exactSectionExists` finds
	// the target published, so these are INERT until then — the only ordering with
	// no 404 window. Verified against efni's tree at the time of writing: all three
	// targets exist under `05-publication/mt-preview/chapters/03/`, and all three
	// sources are pruned.
	//
	// ⚠️ THE 3-6 AND 3-7 PAIRS CROSS OVER — 3-6 goes `stellingar` -> `afbrigdi`
	// while 3-7 goes `afbrigdi` -> `stellingar`. That is what efni recorded and it
	// is not a transcription slip; do not "normalise" them into the same direction.
	//
	// ⚠️ efni's branch `feat/c82-action3-full-corpus-loop` carries these pages and
	// has NOT merged to efni `main`, so a sync from `main` will not publish the
	// targets yet. These entries simply stay inert until it does.
	{
		bookSlug: 'lifraen-efnafraedi',
		fromChapter: '03',
		fromSlug: '3-2-alkanar-og-hverfur-alkana',
		toChapter: '03',
		toSlug: '3-2-alkanar-og-alkanhverfur',
		moduleId: 'm00033'
	},
	{
		bookSlug: 'lifraen-efnafraedi',
		fromChapter: '03',
		fromSlug: '3-6-stellingar-etans',
		toChapter: '03',
		toSlug: '3-6-afbrigdi-etans',
		moduleId: 'm00037'
	},
	{
		bookSlug: 'lifraen-efnafraedi',
		fromChapter: '03',
		fromSlug: '3-7-afbrigdi-annarra-alkana',
		toChapter: '03',
		toSlug: '3-7-stellingar-annarra-alkana',
		moduleId: 'm00038'
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
