/**
 * Content validation and linting script
 *
 * Validates book content for common issues:
 * - TOC structure and section types
 * - Missing section files
 * - Glossary consistency
 *
 * HTML content is validated upstream in the CNXML pipeline.
 *
 * Usage: node scripts/validate-content.js [--book <bookSlug>]
 * Exit code: 0 if valid, 1 if errors found
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { build } from 'esbuild';
import { renamesFromMap, missingRedirects, suggestionLine } from './lib/rename-detector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// =============================================================================
// CONFIGURATION
// =============================================================================

const VALID_SECTION_TYPES = ['introduction', 'glossary', 'exercises', 'summary', 'equations', 'answer-key', 'supplementary'];

// Track all issues found
const issues = {
	errors: [],
	warnings: []
};

/**
 * Log an error
 */
function error(file, line, message) {
	issues.errors.push({ file, line, message });
}

/**
 * Log a warning
 */
function warning(file, line, message) {
	issues.warnings.push({ file, line, message });
}

/**
 * Get all book directories
 */
function getBooks() {
	if (!existsSync(contentDir)) {
		console.error(`Content directory not found: ${contentDir}`);
		console.error('Run "npm run sync-content" first');
		process.exit(1);
	}

	return readdirSync(contentDir).filter((name) => {
		const path = join(contentDir, name);
		return statSync(path).isDirectory();
	});
}

/**
 * Load and parse TOC for a book
 */
function loadToc(bookSlug) {
	const tocPath = join(contentDir, bookSlug, 'toc.json');
	if (!existsSync(tocPath)) {
		error(tocPath, 0, 'TOC file not found');
		return null;
	}

	try {
		const content = readFileSync(tocPath, 'utf-8');
		return JSON.parse(content);
	} catch (e) {
		error(tocPath, 0, `Invalid JSON: ${e.message}`);
		return null;
	}
}

/**
 * Get chapter directory name (supports both v1 and v2 formats)
 */
function getChapterDir(chapter) {
	if (chapter.slug) {
		return chapter.slug;
	}
	return String(chapter.number).padStart(2, '0');
}

/**
 * Validate glossary
 */
function validateGlossary(bookSlug, toc) {
	const glossaryPath = join(contentDir, bookSlug, 'glossary.json');

	const hasGlossarySections = toc?.chapters?.some(ch =>
		ch.sections?.some(s => s.type === 'glossary')
	);
	if (!existsSync(glossaryPath)) {
		if (hasGlossarySections) {
			warning(glossaryPath, 0, 'Glossary file not found but TOC references glossary sections');
		}
		return;
	}

	try {
		const content = readFileSync(glossaryPath, 'utf-8');
		const glossaryData = JSON.parse(content);

		const glossary = Array.isArray(glossaryData) ? glossaryData : glossaryData.terms;

		if (!Array.isArray(glossary)) {
			error(glossaryPath, 0, 'Glossary should be an array or have a "terms" property');
			return;
		}

		const terms = new Set();
		glossary.forEach((entry, index) => {
			if (!entry.term) {
				error(glossaryPath, index + 1, 'Glossary entry missing "term"');
			} else {
				if (terms.has(entry.term.toLowerCase())) {
					warning(glossaryPath, index + 1, `Duplicate glossary term: ${entry.term}`);
				}
				terms.add(entry.term.toLowerCase());
			}

			if (!entry.definition) {
				error(glossaryPath, index + 1, `Glossary entry "${entry.term}" missing "definition"`);
			}
		});

		console.log(`  Glossary: ${glossary.length} terms`);
	} catch (e) {
		error(glossaryPath, 0, `Invalid JSON: ${e.message}`);
	}
}

/**
 * Validate a single book
 */
function validateBook(bookSlug) {
	console.log(`\nValidating book: ${bookSlug}`);

	const toc = loadToc(bookSlug);
	if (!toc) return;

	// Validate TOC section types
	for (const chapter of toc.chapters || []) {
		for (const section of chapter.sections || []) {
			if (section.type && !VALID_SECTION_TYPES.includes(section.type)) {
				warning(
					join(contentDir, bookSlug, 'toc.json'),
					0,
					`Invalid section type "${section.type}" for ${section.file}. Valid: ${VALID_SECTION_TYPES.join(', ')}`
				);
			}
		}
	}

	// Validate each chapter and section exist on disk
	for (const chapter of toc.chapters || []) {
		const chapterDirName = getChapterDir(chapter);
		const chapterDir = join(contentDir, bookSlug, 'chapters', chapterDirName);

		if (!existsSync(chapterDir)) {
			error(chapterDir, 0, `Chapter directory not found: ${chapterDirName}`);
			continue;
		}

		for (const section of chapter.sections || []) {
			const sectionPath = join(chapterDir, section.file);

			if (!existsSync(sectionPath)) {
				error(sectionPath, 0, `Section file not found: ${section.file}`);
			}
		}
	}

	// Validate front-matter files (chapters/00/ — preface etc.) exist on disk
	for (const section of toc.frontMatter || []) {
		const sectionPath = join(contentDir, bookSlug, 'chapters', '00', section.file);
		if (!existsSync(sectionPath)) {
			error(sectionPath, 0, `Front-matter file not found: ${section.file}`);
		}
	}

	// Validate glossary
	validateGlossary(bookSlug, toc);
}

/**
 * Print results
 */
function printResults() {
	console.log('\n' + '='.repeat(60));
	console.log('VALIDATION RESULTS');
	console.log('='.repeat(60));

	if (issues.errors.length === 0 && issues.warnings.length === 0) {
		console.log('\n\u2713 No issues found!');
		return true;
	}

	if (issues.errors.length > 0) {
		console.log(`\n\u2717 ${issues.errors.length} error(s):\n`);
		for (const issue of issues.errors) {
			const location = issue.line > 0 ? `:${issue.line}` : '';
			const relativePath = issue.file.replace(contentDir, '');
			console.log(`  ERROR ${relativePath}${location}`);
			console.log(`        ${issue.message}\n`);
		}
	}

	if (issues.warnings.length > 0) {
		console.log(`\n\u26a0 ${issues.warnings.length} warning(s):\n`);
		for (const issue of issues.warnings) {
			const location = issue.line > 0 ? `:${issue.line}` : '';
			const relativePath = issue.file.replace(contentDir, '');
			console.log(`  WARN  ${relativePath}${location}`);
			console.log(`        ${issue.message}\n`);
		}
	}

	console.log('='.repeat(60));
	console.log(`Total: ${issues.errors.length} errors, ${issues.warnings.length} warnings`);

	return issues.errors.length === 0;
}

/**
 * Build gate for per-book attribution metadata. Loads the TypeScript book config
 * via esbuild (resolving the $lib alias) and runs the same validation the runtime
 * uses, so missing/inconsistent licence data fails the build loudly — including a
 * derivativeLicence that disagrees with the most-restrictive source licence.
 */
async function validateAttributions() {
	const libDir = resolve(projectRoot, 'src', 'lib');
	let mod;
	try {
		const result = await build({
			entryPoints: [resolve(libDir, 'types', 'book.ts')],
			bundle: true,
			format: 'esm',
			platform: 'node',
			write: false,
			logLevel: 'silent',
			alias: { $lib: libDir }
		});
		const code = result.outputFiles[0].text;
		const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
		mod = await import(dataUrl);
	} catch (e) {
		error('src/lib/types/book.ts', 0, `Could not load attribution data: ${e.message}`);
		return;
	}

	const problems = mod.validateAllBookAttributions();
	for (const [slug, errs] of Object.entries(problems)) {
		for (const msg of errs) {
			error(`book.ts (${slug})`, 0, `Attribution — ${msg}`);
		}
	}
}

/**
 * Tripwire for §C9 section renames efni has recorded but we do not redirect.
 *
 * WARN-ONLY, deliberately. `deploy.yml` runs `npm run build`, which runs this
 * validator, so an error here would let a content change in the sister repo
 * block a deploy — inverting the repo's own rule that an efni content defect
 * must never fail vefur's sync. The point is to make a silent 404 loud, not to
 * gate the pipeline.
 *
 * Why it is needed at all: after efni prunes cleanly there is no duplicate, so
 * `resolveChapterDuplicates` reports no conflict and the old URL simply starts
 * 404ing with nothing in the sync output.
 */
async function validateSectionRedirects(books) {
	const libDir = resolve(projectRoot, 'src', 'lib');
	let sectionRedirects;
	try {
		const result = await build({
			entryPoints: [resolve(libDir, 'data', 'sectionRedirects.ts')],
			bundle: true,
			format: 'esm',
			platform: 'node',
			write: false,
			logLevel: 'silent',
			alias: { $lib: libDir }
		});
		const code = result.outputFiles[0].text;
		const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
		sectionRedirects = (await import(dataUrl)).SECTION_REDIRECTS;
	} catch (e) {
		warning('src/lib/data/sectionRedirects.ts', 0, `Could not load section redirects: ${e.message}`);
		return;
	}

	for (const bookSlug of books) {
		const bookDir = join(contentDir, bookSlug);
		if (!existsSync(bookDir)) continue;

		// Track-qualified by design: vefur flattens both tracks into one
		// directory, so a shared slug-map.json would have whichever track synced
		// last overwrite the other's.
		const maps = readdirSync(bookDir).filter(
			(f) => f.startsWith('slug-map.') && f.endsWith('.json')
		);

		for (const mapFile of maps) {
			const mapPath = join(bookDir, mapFile);
			let parsed;
			try {
				parsed = JSON.parse(readFileSync(mapPath, 'utf-8'));
			} catch (e) {
				warning(mapPath, 0, `Could not parse slug map: ${e.message}`);
				continue;
			}

			const missing = missingRedirects(bookSlug, renamesFromMap(parsed), sectionRedirects);
			for (const entry of missing) {
				warning(
					mapPath,
					0,
					`Section renamed but not redirected: /${bookSlug}/kafli/${entry.fromChapter}/${entry.fromSlug} ` +
						`now 404s. Add to src/lib/data/sectionRedirects.ts:\n      ${suggestionLine(entry)},`
				);
			}
		}
	}
}

/**
 * Main function
 */
async function main() {
	const args = process.argv.slice(2);
	let targetBook = null;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--book' && args[i + 1]) {
			targetBook = args[i + 1];
			i++;
		}
	}

	console.log('Content Validation');
	console.log('==================');
	console.log(`Content directory: ${contentDir}`);

	const allBooks = getBooks();

	const books = targetBook ? allBooks.filter((b) => b === targetBook) : allBooks;

	if (targetBook && books.length === 0) {
		console.error(`Error: Book "${targetBook}" not found. Available: ${allBooks.join(', ')}`);
		process.exit(1);
	}

	console.log(`Validating ${books.length} book(s): ${books.join(', ')}`);

	for (const bookSlug of books) {
		validateBook(bookSlug);
	}

	// Attribution/licence metadata gate (book.ts is the source of truth).
	await validateAttributions();

	// §C9 tripwire: renames efni recorded that we do not redirect (warn-only).
	await validateSectionRedirects(books);

	const success = printResults();
	process.exit(success ? 0 : 1);
}

main();
