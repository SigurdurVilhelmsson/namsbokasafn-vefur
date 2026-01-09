/**
 * Content validation and linting script
 *
 * Validates book content for common issues:
 * - Broken internal references
 * - Missing image alt text
 * - Duplicate IDs
 * - Missing referenced images
 * - Invalid/incomplete frontmatter
 * - Unclosed or malformed directives
 * - Cross-reference format validation
 * - TOC-frontmatter consistency
 *
 * Usage: node scripts/validate-content.js [--book <bookSlug>]
 * Exit code: 0 if valid, 1 if errors found
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// =============================================================================
// CONFIGURATION
// =============================================================================

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_SECTION_TYPES = ['glossary', 'exercises', 'summary', 'equations', 'answer-key', 'content'];

const DIRECTIVE_NAMES = [
	'practice-problem',
	'answer',
	'explanation',
	'hint',
	'note',
	'warning',
	'example',
	'definition',
	'key-concept',
	'checkpoint',
	'common-misconception'
];

const CROSS_REF_TYPES = ['sec', 'eq', 'fig', 'tbl', 'def'];

// Track all issues found
const issues = {
	errors: [],
	warnings: []
};

// Track all valid section slugs for cross-reference validation
const validSections = new Map(); // Map<bookSlug, Set<sectionPath>>
const validChapters = new Map(); // Map<bookSlug, Set<chapterSlug>>
const tocData = new Map(); // Map<bookSlug, toc>

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
function validateMarkdown(filePath, bookSlug, chapterSlug, tocSection = null, tocChapter = null) {
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

	// Check frontmatter with TOC consistency
	validateFrontmatter(filePath, content, tocSection, tocChapter);

	// Check directive usage
	validateDirectives(filePath, content);

	// Check cross-reference format
	validateCrossReferences(filePath, content);
}

/**
 * Parse frontmatter into object
 */
function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) {
		return { metadata: null, content, hasFrontmatter: false };
	}

	const [, frontmatterStr, body] = match;
	const metadata = {};
	const lines = frontmatterStr.split('\n');
	let currentKey = '';
	let isArray = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (trimmed.startsWith('- ')) {
			if (isArray && currentKey && Array.isArray(metadata[currentKey])) {
				metadata[currentKey].push(trimmed.substring(2).trim());
			}
			continue;
		}

		const colonIndex = trimmed.indexOf(':');
		if (colonIndex > -1) {
			const key = trimmed.substring(0, colonIndex).trim();
			let value = trimmed.substring(colonIndex + 1).trim();

			currentKey = key;

			if (!value) {
				metadata[key] = [];
				isArray = true;
			} else {
				isArray = false;
				// Strip surrounding quotes if present
				if ((value.startsWith('"') && value.endsWith('"')) ||
				    (value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}
				// Keep section as string (to preserve "1.0" vs "1")
				// Only convert to number for chapter and other numeric fields
				if (key === 'section') {
					metadata[key] = value;
				} else {
					const num = Number(value);
					metadata[key] = isNaN(num) ? value : num;
				}
			}
		}
	}

	return { metadata, content: body, hasFrontmatter: true };
}

/**
 * Validate frontmatter
 */
function validateFrontmatter(filePath, content, tocSection = null, tocChapter = null) {
	const { metadata, hasFrontmatter } = parseFrontmatter(content);

	if (!hasFrontmatter) {
		warning(filePath, 1, 'No frontmatter found');
		return;
	}

	// Required fields
	if (!metadata.title || typeof metadata.title !== 'string') {
		error(filePath, 1, 'Missing or invalid "title" field in frontmatter');
	}

	if (metadata.section === undefined) {
		warning(filePath, 1, 'Missing "section" field in frontmatter');
	}

	if (metadata.chapter === undefined) {
		warning(filePath, 1, 'Missing "chapter" field in frontmatter');
	}

	// Optional fields validation
	if (metadata.difficulty !== undefined && !VALID_DIFFICULTIES.includes(metadata.difficulty)) {
		warning(filePath, 1, `Invalid difficulty "${metadata.difficulty}". Must be: ${VALID_DIFFICULTIES.join(', ')}`);
	}

	if (metadata.objectives !== undefined && !Array.isArray(metadata.objectives)) {
		warning(filePath, 1, '"objectives" should be an array');
	}

	if (metadata.keywords !== undefined && !Array.isArray(metadata.keywords)) {
		warning(filePath, 1, '"keywords" should be an array');
	}

	// TOC consistency checks
	if (tocSection && tocChapter) {
		const tocSectionNum = String(tocSection.number);
		const fmSectionNum = String(metadata.section);
		if (metadata.section !== undefined && tocSectionNum !== fmSectionNum) {
			warning(filePath, 1, `Section number mismatch: TOC="${tocSectionNum}", frontmatter="${fmSectionNum}"`);
		}

		if (metadata.chapter !== undefined && metadata.chapter !== tocChapter.number) {
			warning(filePath, 1, `Chapter number mismatch: TOC="${tocChapter.number}", frontmatter="${metadata.chapter}"`);
		}
	}
}

/**
 * Validate directive usage
 */
function validateDirectives(filePath, content) {
	const lines = content.split('\n');
	const openDirectives = [];

	lines.forEach((line, index) => {
		const lineNum = index + 1;

		// Check for directive opening
		const openMatch = line.match(/^:::(\w+[-\w]*)(\{.*\})?/);
		if (openMatch) {
			const [, directiveName, attrs] = openMatch;

			// Check if known directive
			if (!DIRECTIVE_NAMES.includes(directiveName)) {
				warning(filePath, lineNum, `Unknown directive ":::${directiveName}"`);
			}

			// Check required attributes
			if (directiveName === 'practice-problem' && (!attrs || !attrs.includes('id='))) {
				warning(filePath, lineNum, ':::practice-problem should have an id attribute');
			}

			if (directiveName === 'definition' && (!attrs || !attrs.includes('term='))) {
				warning(filePath, lineNum, ':::definition should have a term attribute');
			}

			openDirectives.push({ name: directiveName, line: lineNum });
		}

		// Check for directive closing
		if (line.trim() === ':::') {
			if (openDirectives.length === 0) {
				error(filePath, lineNum, 'Closing ":::" without matching opening directive');
			} else {
				openDirectives.pop();
			}
		}
	});

	// Check for unclosed directives
	for (const dir of openDirectives) {
		error(filePath, dir.line, `Unclosed directive ":::${dir.name}"`);
	}
}

/**
 * Validate cross-reference format
 */
function validateCrossReferences(filePath, content) {
	const lines = content.split('\n');
	const refPattern = /\[ref:(\w+):([^\]]*)\]/g;

	lines.forEach((line, index) => {
		const lineNum = index + 1;
		let match;

		while ((match = refPattern.exec(line)) !== null) {
			const [, refType, refId] = match;

			if (!CROSS_REF_TYPES.includes(refType)) {
				warning(filePath, lineNum, `Invalid cross-reference type "${refType}". Valid: ${CROSS_REF_TYPES.join(', ')}`);
			}

			if (!refId || refId.trim() === '') {
				error(filePath, lineNum, 'Cross-reference has empty id');
			}
		}
	});
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
	tocData.set(bookSlug, toc);

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

			validateMarkdown(sectionPath, bookSlug, chapter.slug, section, chapter);
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
	// Parse arguments
	const args = process.argv.slice(2);
	let targetBook = null;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--book' && args[i + 1]) {
			targetBook = args[i + 1];
			i++;
		}
	}

	console.log('Content Validation & Linting');
	console.log('============================');
	console.log(`Content directory: ${contentDir}`);

	const allBooks = getBooks();

	// Filter to target book if specified
	const books = targetBook ? allBooks.filter((b) => b === targetBook) : allBooks;

	if (targetBook && books.length === 0) {
		console.error(`Error: Book "${targetBook}" not found. Available: ${allBooks.join(', ')}`);
		process.exit(1);
	}

	console.log(`Validating ${books.length} book(s): ${books.join(', ')}`);

	// First pass: index all sections (need all books for cross-book links)
	for (const bookSlug of allBooks) {
		const toc = loadToc(bookSlug);
		if (toc) {
			indexSections(bookSlug, toc);
		}
	}

	// Second pass: validate content (only target books)
	for (const bookSlug of books) {
		validateBook(bookSlug);
	}

	const success = printResults();
	process.exit(success ? 0 : 1);
}

main();
