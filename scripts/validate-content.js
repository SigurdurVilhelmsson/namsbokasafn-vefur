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

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// =============================================================================
// CONFIGURATION
// =============================================================================

const VALID_SECTION_TYPES = ['introduction', 'glossary', 'exercises', 'summary', 'equations', 'answer-key'];

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
 * Main function
 */
function main() {
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

	const success = printResults();
	process.exit(success ? 0 : 1);
}

main();
