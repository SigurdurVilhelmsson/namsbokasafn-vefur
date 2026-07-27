/**
 * Shared helpers for the mt-preview → faithful content overlay.
 *
 * The overlay replaces machine-translated modules with human-reviewed
 * (`faithful`) ones as they are completed. Most files switch over per module
 * (the numbered reading sections). But the end-of-chapter pages — summary,
 * key-terms, key-equations, exercises and the answer key — are CHAPTER-LEVEL
 * AGGREGATIONS: a single file that rolls up content from every module in the
 * chapter. A `faithful` build's rollup only contains the modules reviewed so
 * far, so overlaying a partial faithful rollup over the complete mt-preview one
 * loses the machine-translated modules' content (and their section headers).
 *
 * Therefore rollup files only "win" from faithful when the WHOLE chapter is
 * faithful; until then the complete mt-preview rollup is kept (and shows the
 * machine-translation banner). Reading modules always switch per-file.
 *
 * Both sync-content.js (what to overlay) and generate-toc.js (what to mark
 * `reviewed`) import these so the two can never disagree.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Chapter-level aggregation files (roll up content from across the chapter's
// modules). Mirrors the classification in generate-toc.js getSectionType.
const EXERCISE_TYPE_SLUGS = [
	'multiple-choice',
	'fill-in-the-blank',
	'short-answer',
	'critical-thinking',
	'true-false',
	'matching',
	'visual-exercise',
	'conceptual-questions',
	'problems-exercises',
	'ap-test-prep',
	'additional-problems'
];

/**
 * Is this filename a chapter-level aggregation page (vs. a reading module)?
 * Reading modules (e.g. `1-0-introduction.html`, `1-2-name.html`,
 * `3-chemistry-matters.html`) return false.
 */
export function isAggregationFile(filename) {
	const name = filename
		.toLowerCase()
		.replace(/\.html$/, '');

	if (/key-terms|lykilhugtok/.test(name)) return true; // glossary / Lykilhugtök
	if (/key-equations|lykiljofu|lykiljofnu/.test(name)) return true; // Lykilformúlur
	if (/summary|samantekt/.test(name)) return true; // Samantekt
	if (/answer-key|svarlykill/.test(name)) return true; // Svarlykill
	if (/exercises|aefingar/.test(name) || name.endsWith('-exercises')) return true; // Æfingar
	if (EXERCISE_TYPE_SLUGS.some((slug) => name.endsWith('-' + slug))) return true; // per-type exercises

	return false;
}

// Reading-module HTML files in a chapter directory (excludes aggregation pages).
function readingModuleFiles(chapterDir) {
	if (!existsSync(chapterDir)) return [];
	return readdirSync(chapterDir).filter(
		(f) => f.endsWith('.html') && !isAggregationFile(f)
	);
}

/**
 * Is the chapter fully covered by faithful — i.e. does `faithful` contain a
 * version of every reading module that `mt-preview` has for this chapter?
 * Matched by module identity, so a reviewed title correction (which renames the
 * file) still counts as coverage.
 * Only then are faithful's chapter rollups complete enough to use.
 *
 * @param faithfulChaptersDir  …/faithful/chapters
 * @param mtChaptersDir        …/mt-preview/chapters
 * @param chapterDir           zero-padded chapter name, e.g. "01"
 */
export function chapterFullyFaithful(faithfulChaptersDir, mtChaptersDir, chapterDir) {
	const mtDir = resolve(mtChaptersDir, chapterDir);
	// Chapter exists only in faithful (no mt baseline to be incomplete against).
	if (!existsSync(mtDir)) return true;

	// Compare by module IDENTITY, not filename: a reviewed title correction
	// renames the file, and a filename comparison would read a fully reviewed
	// chapter as incomplete — freezing its rollups on mt-preview and leaving the
	// machine-translation banner up forever.
	const faithfulIdentities = new Set(
		chapterIdentityIndex(resolve(faithfulChaptersDir, chapterDir)).values()
	);
	const mtIdentities = chapterIdentityIndex(mtDir);

	return readingModuleFiles(mtDir).every((f) => faithfulIdentities.has(mtIdentities.get(f)));
}

/**
 * Should this faithful file replace the mt-preview baseline?
 * Reading modules: always. Aggregation pages: only when allowed (the chapter is
 * fully faithful, or efni has signalled its rollups are built complete — see
 * faithfulRollupsComplete).
 */
export function faithfulFileWins(filename, aggregationAllowed) {
	return isAggregationFile(filename) ? aggregationAllowed : true;
}

// Marker file efni writes into a book's faithful publication dir
// (05-publication/faithful/) to signal that its faithful aggregation pages —
// chapter rollups (summary/key-terms/exercises/answer-key) and the book
// glossary/index — are built COMPLETE: faithful content for reviewed modules,
// machine-translated fallback for the rest. When present, the overlay serves
// those faithful rollups even before a chapter is fully reviewed, so reviewed
// modules' content flows into the compilations. Absent (today's state), the
// overlay keeps the complete mt-preview rollups (gated by chapter completeness)
// so a partial faithful rollup can never garble a mixed chapter.
//
// Note: this only governs which file is *served*. The machine-translation
// banner is driven separately (a rollup stays "unreviewed" until every module
// in its chapter is faithful), so a mixed rollup still shows the banner.
export const ROLLUPS_COMPLETE_MARKER = 'rollups-complete';

export function faithfulRollupsComplete(faithfulPublicationDir) {
	return existsSync(resolve(faithfulPublicationDir, ROLLUPS_COMPLETE_MARKER));
}

/**
 * The CNXML module id of a rendered page, or null when it carries none.
 *
 * The pipeline emits at most one `<article class="cnx-module" data-module-id>`
 * per file. Chapter rollups (summary/exercises/answer-key) carry none.
 */
export function moduleIdOf(filePath) {
	if (!existsSync(filePath)) return null;
	const match = readFileSync(filePath, 'utf-8').match(/data-module-id="([^"]+)"/);
	return match ? match[1] : null;
}

/**
 * Stable identity of a page within its directory — what "the same section"
 * means when the filename is not stable.
 *
 * A section's filename is derived from its title, so correcting a title in
 * review RENAMES the file. Identity must therefore key on the module id, which
 * survives the rename. Aggregation rollups key on filename instead: they carry
 * no module id (key-terms carries a SYNTHETIC chapter-scoped one, which must
 * never be treated as a module), and their filenames are chapter-derived, so
 * they never rename.
 *
 * The three prefixes keep the namespaces from ever colliding.
 *
 * The `file:` fallback is a SILENT degradation to the pre-fix, filename-keyed
 * behaviour this design replaces: `moduleIdOf` matches only a double-quoted
 * `data-module-id` attribute, so if the efni pipeline ever changed its
 * attribute quoting (or stopped emitting the attribute), every reading module
 * would key on `file:` again and a renamed module would once more publish
 * twice. Nothing here warns when that happens — filename-keyed identities are
 * unique within a directory by construction, so they never form a duplicate
 * group to flag. The failure direction is safe (a missed detection, never a
 * wrong deletion), which is why this is a comment and not a runtime check —
 * but do not read the absence of a warning as proof the pipeline's attribute
 * format is guaranteed.
 */
export function fileIdentity(dir, filename) {
	if (isAggregationFile(filename)) return `agg:${filename}`;
	const moduleId = moduleIdOf(resolve(dir, filename));
	return moduleId ? `module:${moduleId}` : `file:${filename}`;
}

// Memoized filename -> identity, keyed on resolved directory path.
// isReviewedModule runs once per file and calls chapterFullyFaithful, which
// reads two directories; unmemoized that is O(n^2) file reads on a 252-file
// book. Only sync's own prune sweep mutates a directory in-process, and it
// calls resetIdentityCache() afterwards.
const identityCache = new Map();

/** Map of filename -> identity for every .html page in a directory. */
export function chapterIdentityIndex(dir) {
	const key = resolve(dir);
	const cached = identityCache.get(key);
	if (cached) return cached;

	const index = new Map();
	if (existsSync(key)) {
		for (const filename of readdirSync(key)) {
			if (filename.endsWith('.html')) {
				index.set(filename, fileIdentity(key, filename));
			}
		}
	}

	identityCache.set(key, index);
	return index;
}

/** Drop the memo — for tests, and after a directory is mutated in-process. */
export function resetIdentityCache() {
	identityCache.clear();
}

/**
 * Group a synced destination directory's pages by module identity and decide
 * which duplicates the faithful overlay authorises us to drop.
 *
 * `superseded` — baseline pages that the overlay republished under a new
 * filename. Safe to remove: faithful carries the same module under the
 * winning name, so nothing is lost.
 *
 * `conflicts` — a module identity whose duplicate filenames don't resolve to
 * exactly one reviewed candidate: either none of them came from faithful (e.g.
 * a stale render left behind in mt-preview after a title correction), or two
 * or more of them did (faithful itself carries the module under two names).
 * Either way vefur has NO content-derived basis to pick a winner — the
 * competing files are different human-visible translations, and even the
 * chapter's own nav can point at the stale slug. The caller warns and keeps
 * every file; the repair belongs at the source, in namsbokasafn-efni.
 *
 * A file is judged "reviewed" by checking whether faithfulDir has an entry
 * under that exact filename — valid only because `dir` is the POST-SYNC
 * destination (faithful already copied on top without deleting mt-preview),
 * so a filename present in faithfulDir is, by construction, the same file
 * that landed in `dir` under that name. Do not call this with `dir` pointing
 * at an unsynced efni source track — the proxy only holds for the merged
 * destination.
 *
 * @param dir          a synced chapter / front-matter / appendix directory
 * @param faithfulDir  the matching faithful source directory, or null when the
 *                     book has no overlay (a nonexistent path means the same)
 */
export function resolveChapterDuplicates(dir, faithfulDir) {
	const superseded = [];
	const conflicts = [];

	if (!existsSync(dir)) return { superseded, conflicts };

	const groups = new Map();
	for (const [filename, identity] of chapterIdentityIndex(dir)) {
		if (!groups.has(identity)) groups.set(identity, []);
		groups.get(identity).push(filename);
	}

	const hasFaithful = Boolean(faithfulDir) && existsSync(faithfulDir);

	for (const [identity, files] of groups) {
		if (files.length < 2) continue;

		const sorted = [...files].sort();
		const reviewed = hasFaithful
			? sorted.filter((f) => existsSync(resolve(faithfulDir, f)))
			: [];

		if (reviewed.length === 1) {
			superseded.push(...sorted.filter((f) => f !== reviewed[0]));
		} else {
			conflicts.push({ identity, files: sorted });
		}
	}

	superseded.sort();
	conflicts.sort((a, b) => a.identity.localeCompare(b.identity));

	return { superseded, conflicts };
}
