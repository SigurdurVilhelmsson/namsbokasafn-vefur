/**
 * Detect section renames that efni has recorded but vefur does not yet redirect.
 *
 * efni (§C9) prunes a superseded page when a Pass-1 title correction renames it,
 * and records old->new in `static/content/<book>/slug-map.<track>.json`. Vefur
 * serves the old URL from a hand-maintained constant
 * (`src/lib/data/sectionRedirects.ts`). Nothing keeps the two in step, and the
 * failure is SILENT: after a clean prune there is no duplicate, so the sync
 * reports no conflict and the old URL simply starts 404ing.
 *
 * This module is the tripwire. It is warn-only by design — see the call site in
 * `validate-content.js`.
 *
 * Contract notes, confirmed with the efni session:
 * - Key on `renames` only. The map's `contract` string is prose for humans and
 *   is rewritten on the next prune; never parse it.
 * - An absent map means "no redirects", not an error. The file only exists once
 *   a prune has happened, and efni's reconcile is best-effort (its call site
 *   catches and the render still exits 0).
 * - Values are CURRENT: chains collapse on write, so one lookup suffices.
 */

/** Track-relative chapter page, e.g. "chapters/10/10-5-foo.html". */
const CHAPTER_PAGE = /^chapters\/(\d{2})\/([^/]+)\.html$/;

/**
 * Extract usable rename pairs from a parsed slug map.
 *
 * @param {unknown} map Parsed slug-map JSON, or null/garbage.
 * @returns {Array<{from: string, to: string, moduleId: string|undefined}>}
 */
export function renamesFromMap(map) {
	const renames = map && typeof map === 'object' ? map.renames : null;
	if (!renames || typeof renames !== 'object' || Array.isArray(renames)) return [];

	const out = [];
	for (const [from, entry] of Object.entries(renames)) {
		const to = entry && typeof entry === 'object' ? entry.to : null;
		if (typeof to !== 'string' || to.length === 0) continue;
		// A self-map is a redirect loop. efni's chain-collapse should never emit
		// one, but a hand-edited or corrupted map could.
		if (to === from) continue;
		out.push({ from, to, moduleId: entry.moduleId });
	}
	return out;
}

/**
 * Derive the reader-facing URL parts from a track-relative page path.
 *
 * Returns null when the path is not a chapter page whose URL is filename-derived.
 * Appendices are excluded on purpose: `/vidauki/<letter>` is ORDINAL-derived
 * (see generate-toc.js), so renaming an appendix file changes no URL.
 *
 * @param {string} path
 * @returns {{chapterDir: string, slug: string}|null}
 */
export function renameToUrlParts(path) {
	const m = typeof path === 'string' ? path.match(CHAPTER_PAGE) : null;
	if (!m) return null;
	return { chapterDir: m[1], slug: m[2] };
}

/**
 * Renames for `bookSlug` that `sectionRedirects` does not already cover.
 *
 * @param {string} bookSlug
 * @param {ReturnType<typeof renamesFromMap>} renames
 * @param {Array<{bookSlug: string, fromChapter: string, fromSlug: string}>} sectionRedirects
 * @returns {Array<{bookSlug: string, fromChapter: string, fromSlug: string, toChapter: string, toSlug: string, moduleId: string|undefined}>}
 */
export function missingRedirects(bookSlug, renames, sectionRedirects) {
	const missing = [];

	for (const r of renames) {
		const fromParts = renameToUrlParts(r.from);
		const toParts = renameToUrlParts(r.to);
		if (!fromParts || !toParts) continue;

		const covered = sectionRedirects.some(
			(s) =>
				s.bookSlug === bookSlug &&
				s.fromChapter === fromParts.chapterDir &&
				s.fromSlug === fromParts.slug
		);
		if (covered) continue;

		missing.push({
			bookSlug,
			fromChapter: fromParts.chapterDir,
			fromSlug: fromParts.slug,
			toChapter: toParts.chapterDir,
			toSlug: toParts.slug,
			moduleId: r.moduleId
		});
	}

	return missing;
}

/**
 * A paste-ready `SECTION_REDIRECTS` entry, so acting on the warning is copy,
 * paste, done rather than a research task.
 *
 * @param {ReturnType<typeof missingRedirects>[number]} entry
 * @returns {string}
 */
export function suggestionLine(entry) {
	const moduleId = entry.moduleId ? `, moduleId: '${entry.moduleId}'` : '';
	return (
		`{ bookSlug: '${entry.bookSlug}', ` +
		`fromChapter: '${entry.fromChapter}', fromSlug: '${entry.fromSlug}', ` +
		`toChapter: '${entry.toChapter}', toSlug: '${entry.toSlug}'${moduleId} }`
	);
}
