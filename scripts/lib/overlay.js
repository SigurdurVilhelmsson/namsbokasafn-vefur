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

import { existsSync, readdirSync } from 'fs';
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

	const faithfulFiles = new Set(
		existsSync(resolve(faithfulChaptersDir, chapterDir))
			? readdirSync(resolve(faithfulChaptersDir, chapterDir))
			: []
	);
	const mtModules = readingModuleFiles(mtDir);
	return mtModules.every((f) => faithfulFiles.has(f));
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
