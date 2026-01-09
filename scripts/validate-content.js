/**
 * Content validation script
 *
 * Validates book content for common issues:
 * - Broken internal references
 * - Missing image alt text
 * - Duplicate IDs
 * - Missing referenced images
 * - Invalid frontmatter
 *
 * Usage: node scripts/validate-content.js [--fix]
 * Exit code: 0 if valid, 1 if errors found
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// Track all issues found
const issues = {
	errors: [],
	warnings: []
};

// Track all valid section slugs for cross-reference validation
const validSections = new Map(); // Map<bookSlug, Set<sectionPath>>
const validChapters = new Map(); // Map<bookSlug, Set<chapterSlug>>

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
		console.error('Run "npm run copy-content" first');
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
 * Build index of valid sections from TOC
 */
function indexSections(bookSlug, toc) {
	const sections = new Set();
	const chapters = new Set();

	for (const chapter of toc.chapters || []) {
		chapters.add(chapter.slug);

		for (const section of chapter.sections || []) {
			// Store as "chapterSlug/sectionSlug"
			sections.add(`${chapter.slug}/${section.slug}`);
		}
	}

	validSections.set(bookSlug, sections);
	validChapters.set(bookSlug, chapters);
}

/**
 * Validate markdown content
 */
function validateMarkdown(filePath, bookSlug, chapterSlug) {
	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');
	const fileName = basename(filePath);

	// Track IDs found in this file
	const ids = new Map(); // id -> line number

	lines.forEach((line, index) => {
		const lineNum = index + 1;

		// Check for images without alt text
		// Pattern: ![](path) or ![ ](path)
		const emptyAltMatches = line.matchAll(/!\[\s*\]\([^)]+\)/g);
		for (const match of emptyAltMatches) {
			warning(filePath, lineNum, `Image missing alt text: ${match[0]}`);
		}

		// Check for referenced images that don't exist
		const imageMatches = line.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
		for (const match of imageMatches) {
			const imagePath = match[2];

			// Skip external URLs
			if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
				continue;
			}

			// Resolve image path
			let fullImagePath;
			if (imagePath.startsWith('/')) {
				fullImagePath = join(contentDir, '..', imagePath);
			} else {
				fullImagePath = join(dirname(filePath), imagePath);
			}

			if (!existsSync(fullImagePath)) {
				error(filePath, lineNum, `Missing image: ${imagePath}`);
			}
		}

		// Check for duplicate heading IDs
		// Pattern: {#id} at end of heading
		const headingIdMatch = line.match(/^#+\s+.*\{#([^}]+)\}\s*$/);
		if (headingIdMatch) {
			const id = headingIdMatch[1];
			if (ids.has(id)) {
				error(filePath, lineNum, `Duplicate ID "${id}" (first at line ${ids.get(id)})`);
			} else {
				ids.set(id, lineNum);
			}
		}

		// Check for HTML id attributes
		const htmlIdMatches = line.matchAll(/id=["']([^"']+)["']/g);
		for (const match of htmlIdMatches) {
			const id = match[1];
			if (ids.has(id)) {
				error(filePath, lineNum, `Duplicate ID "${id}" (first at line ${ids.get(id)})`);
			} else {
				ids.set(id, lineNum);
			}
		}

		// Check for broken internal links
		// Pattern: [text](/bookSlug/kafli/chapterSlug/sectionSlug)
		const linkMatches = line.matchAll(/\[([^\]]*)\]\(\/([^/]+)\/kafli\/([^/]+)\/([^/)]+)/g);
		for (const match of linkMatches) {
			const linkedBook = match[2];
			const linkedChapter = match[3];
			const linkedSection = match[4];
			const sectionPath = `${linkedChapter}/${linkedSection}`;

			// Check if referenced book exists
			if (!validSections.has(linkedBook)) {
				error(filePath, lineNum, `Link to unknown book: ${linkedBook}`);
			} else if (!validSections.get(linkedBook).has(sectionPath)) {
				error(filePath, lineNum, `Broken link: /${linkedBook}/kafli/${linkedChapter}/${linkedSection}`);
			}
		}

		// Check for cross-references to figures/tables/equations
		// Pattern: {ref:figure-1-2} or similar
		const refMatches = line.matchAll(/\{ref:([^}]+)\}/g);
		for (const match of refMatches) {
			const refId = match[1];
			// Note: We could validate these against actual IDs in the content
			// For now, just ensure they have a valid format
			if (!/^(figure|table|equation|example)-\d+-\d+/.test(refId)) {
				warning(filePath, lineNum, `Unusual reference format: {ref:${refId}}`);
			}
		}
	});

	// Check frontmatter
	validateFrontmatter(filePath, content);
}

/**
 * Validate frontmatter
 */
function validateFrontmatter(filePath, content) {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) {
		warning(filePath, 1, 'No frontmatter found');
		return;
	}

	const frontmatter = frontmatterMatch[1];

	// Check for required fields
	const requiredFields = ['title'];
	for (const field of requiredFields) {
		if (!frontmatter.includes(`${field}:`)) {
			warning(filePath, 1, `Missing frontmatter field: ${field}`);
		}
	}
}

/**
 * Validate glossary
 */
function validateGlossary(bookSlug) {
	const glossaryPath = join(contentDir, bookSlug, 'glossary.json');
	if (!existsSync(glossaryPath)) {
		warning(glossaryPath, 0, 'Glossary file not found');
		return;
	}

	try {
		const content = readFileSync(glossaryPath, 'utf-8');
		const glossaryData = JSON.parse(content);

		// Handle both array and {terms: [...]} formats
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

	indexSections(bookSlug, toc);

	// Validate each chapter and section
	for (const chapter of toc.chapters || []) {
		const chapterDir = join(contentDir, bookSlug, 'chapters', chapter.slug);

		if (!existsSync(chapterDir)) {
			error(chapterDir, 0, `Chapter directory not found: ${chapter.slug}`);
			continue;
		}

		for (const section of chapter.sections || []) {
			const sectionPath = join(chapterDir, section.file);

			if (!existsSync(sectionPath)) {
				error(sectionPath, 0, `Section file not found: ${section.file}`);
				continue;
			}

			validateMarkdown(sectionPath, bookSlug, chapter.slug);
		}
	}

	// Validate glossary
	validateGlossary(bookSlug);
}

/**
 * Print results
 */
function printResults() {
	console.log('\n' + '='.repeat(60));
	console.log('VALIDATION RESULTS');
	console.log('='.repeat(60));

	if (issues.errors.length === 0 && issues.warnings.length === 0) {
		console.log('\n✓ No issues found!');
		return true;
	}

	if (issues.errors.length > 0) {
		console.log(`\n✗ ${issues.errors.length} error(s):\n`);
		for (const issue of issues.errors) {
			const location = issue.line > 0 ? `:${issue.line}` : '';
			const relativePath = issue.file.replace(contentDir, '');
			console.log(`  ERROR ${relativePath}${location}`);
			console.log(`        ${issue.message}\n`);
		}
	}

	if (issues.warnings.length > 0) {
		console.log(`\n⚠ ${issues.warnings.length} warning(s):\n`);
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
	console.log('Content Validation');
	console.log('==================');
	console.log(`Content directory: ${contentDir}`);

	const books = getBooks();
	console.log(`Found ${books.length} book(s): ${books.join(', ')}`);

	// First pass: index all sections
	for (const bookSlug of books) {
		const toc = loadToc(bookSlug);
		if (toc) {
			indexSections(bookSlug, toc);
		}
	}

	// Second pass: validate content
	for (const bookSlug of books) {
		validateBook(bookSlug);
	}

	const success = printResults();
	process.exit(success ? 0 : 1);
}

main();
