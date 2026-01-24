#!/usr/bin/env node
/**
 * Process content at build time
 *
 * This script enriches toc.json with:
 * 1. Parsed frontmatter from markdown files (using gray-matter)
 * 2. Cross-reference index with precomputed deterministic numbering
 *
 * Benefits:
 * - Proper YAML parsing (handles quoted strings, nested objects, etc.)
 * - Build-time processing (no runtime parsing overhead)
 * - Metadata available immediately from toc.json
 * - Deterministic cross-reference numbering (equations, figures, tables)
 *
 * Usage: node scripts/process-content.js
 * Run after sync-content.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// =============================================================================
// V2 PATH HELPERS (same logic as contentLoader.ts)
// =============================================================================

// Get URL path for chapter (zero-padded number)
function getChapterPath(chapter) {
	return String(chapter.number).padStart(2, '0');
}

// Get URL path for section (number with dots replaced by dashes)
function getSectionPath(section) {
	return section.number.replace('.', '-');
}

// Get folder name for chapter (slug if present, else padded number)
function getChapterFolder(chapter) {
	return chapter.slug || getChapterPath(chapter);
}

// Reading time calculation (same as in contentLoader.ts)
const WORDS_PER_MINUTE = 180;

// =============================================================================
// CROSS-REFERENCE PROCESSING
// =============================================================================

// Reference type labels (Icelandic)
const LABELS = {
	sec: 'Kafli',
	eq: 'Jafna',
	fig: 'Mynd',
	tbl: 'Tafla',
	def: 'Skilgreining'
};

// Regex patterns for labeled references (same as in reference.ts)
const REFERENCE_PATTERNS = {
	// Equations: $$...$$\s*{#eq:id}
	eq: /\$\$[\s\S]*?\$\$\s*\{#eq:([^}]+)\}/g,
	// Figures: ![alt](url)\s*{#fig:id}
	fig: /!\[([^\]]*)\]\([^)]+\)\s*\{#fig:([^}]+)\}/g,
	// Tables: |...|...\s*{#tbl:id}
	tbl: /\|[\s\S]*?\|\n\s*\{#tbl:([^}]+)\}/g,
	// Definitions: :::definition{#def:id}
	def: /:::definition[^\n]*\{#def:([^}]+)\}/g
};

/**
 * Generate a label for a reference
 */
function generateLabel(type, number) {
	return `${LABELS[type]} ${number}`;
}

/**
 * Extract references from markdown content
 */
function extractReferences(content, chapterSlug, sectionSlug, chapterNumber, counters) {
	const refs = [];

	// Extract equations
	let match;
	const eqPattern = new RegExp(REFERENCE_PATTERNS.eq.source, 'g');
	while ((match = eqPattern.exec(content)) !== null) {
		const id = match[1];
		const eqMatch = match[0].match(/\$\$([\s\S]*?)\$\$/);
		const preview = eqMatch ? eqMatch[1].slice(0, 50).trim() + '...' : undefined;

		counters.eq = (counters.eq || 0) + 1;
		const number = `${chapterNumber}.${counters.eq}`;

		refs.push({
			key: `eq:${id}`,
			type: 'eq',
			id,
			number,
			label: generateLabel('eq', number),
			preview,
			chapterSlug,
			sectionSlug,
			anchor: `eq-${id}`
		});
	}

	// Extract figures
	const figPattern = new RegExp(REFERENCE_PATTERNS.fig.source, 'g');
	while ((match = figPattern.exec(content)) !== null) {
		const alt = match[1];
		const id = match[2];

		counters.fig = (counters.fig || 0) + 1;
		const number = `${chapterNumber}.${counters.fig}`;

		refs.push({
			key: `fig:${id}`,
			type: 'fig',
			id,
			number,
			label: generateLabel('fig', number),
			title: alt,
			preview: alt,
			chapterSlug,
			sectionSlug,
			anchor: `fig-${id}`
		});
	}

	// Extract tables
	const tblPattern = new RegExp(REFERENCE_PATTERNS.tbl.source, 'g');
	while ((match = tblPattern.exec(content)) !== null) {
		const id = match[1];

		counters.tbl = (counters.tbl || 0) + 1;
		const number = `${chapterNumber}.${counters.tbl}`;

		refs.push({
			key: `tbl:${id}`,
			type: 'tbl',
			id,
			number,
			label: generateLabel('tbl', number),
			chapterSlug,
			sectionSlug,
			anchor: `tbl-${id}`
		});
	}

	// Extract definitions
	const defPattern = new RegExp(REFERENCE_PATTERNS.def.source, 'g');
	while ((match = defPattern.exec(content)) !== null) {
		const id = match[1];

		counters.def = (counters.def || 0) + 1;
		const number = `${chapterNumber}.${counters.def}`;

		refs.push({
			key: `def:${id}`,
			type: 'def',
			id,
			number,
			label: generateLabel('def', number),
			chapterSlug,
			sectionSlug,
			anchor: `def-${id}`
		});
	}

	return refs;
}

function calculateReadingTime(content) {
	const cleanText = content
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`[^`]+`/g, '')
		.replace(/!\[.*?\]\(.*?\)/g, '')
		.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
		.replace(/#{1,6}\s*/g, '')
		.replace(/[*_~`]/g, '')
		.replace(/\$\$[\s\S]*?\$\$/g, '')
		.replace(/\$[^$]+\$/g, '')
		.replace(/:::[\s\S]*?:::/g, '')
		.trim();

	const wordCount = cleanText.split(/\s+/).filter((word) => word.length > 0).length;
	const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

	return Math.max(1, Math.min(minutes, 60));
}

function parseDifficulty(value) {
	if (typeof value !== 'string') return undefined;
	const normalized = value.toLowerCase().trim();
	if (['beginner', 'intermediate', 'advanced'].includes(normalized)) {
		return normalized;
	}
	return undefined;
}

function getBooks() {
	if (!existsSync(contentDir)) {
		console.error(`Content directory not found: ${contentDir}`);
		console.error('Run "npm run sync-content" first');
		process.exit(1);
	}

	return readdirSync(contentDir).filter((name) => {
		const path = join(contentDir, name);
		return statSync(path).isDirectory() && existsSync(join(path, 'toc.json'));
	});
}

function processBook(bookSlug) {
	const bookDir = join(contentDir, bookSlug);
	const tocPath = join(bookDir, 'toc.json');

	console.log(`  Processing ${bookSlug}...`);

	// Read original toc.json
	const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));

	let sectionsProcessed = 0;
	let sectionsSkipped = 0;
	let referencesFound = 0;

	// Reference index for the entire book
	const referenceIndex = {};

	// Process each chapter and section
	for (const chapter of toc.chapters || []) {
		const chapterFolder = getChapterFolder(chapter);
		const chapterDir = join(bookDir, 'chapters', chapterFolder);
		const chapterNumber = chapter.number;
		const chapterPath = getChapterPath(chapter);

		// Reset counters for each chapter (deterministic numbering per chapter)
		const counters = { eq: 0, fig: 0, tbl: 0, def: 0 };

		if (!existsSync(chapterDir)) {
			console.warn(`    Warning: Chapter directory not found: ${chapterFolder}`);
			continue;
		}

		for (const section of chapter.sections || []) {
			const sectionFilePath = join(chapterDir, section.file);
			const sectionPath = getSectionPath(section);

			if (!existsSync(sectionFilePath)) {
				console.warn(`    Warning: Section file not found: ${section.file}`);
				sectionsSkipped++;
				continue;
			}

			try {
				const fileContent = readFileSync(sectionFilePath, 'utf-8');
				const { data: frontmatter, content } = matter(fileContent);

				// Calculate reading time from content
				const readingTime = calculateReadingTime(content);

				// Enrich section with parsed metadata
				section.metadata = {
					title: frontmatter.title || section.title,
					section: String(frontmatter.section || section.number),
					chapter: frontmatter.chapter || chapter.number,
					readingTime,
					difficulty: parseDifficulty(frontmatter.difficulty),
					objectives: Array.isArray(frontmatter.objectives) ? frontmatter.objectives : [],
					keywords: Array.isArray(frontmatter.keywords) ? frontmatter.keywords : undefined,
					prerequisites: Array.isArray(frontmatter.prerequisites)
						? frontmatter.prerequisites
						: undefined
				};

				// Include source attribution if present
				if (frontmatter.source) {
					section.metadata.source = frontmatter.source;
				}

				// Extract cross-references from content
				const refs = extractReferences(content, chapterPath, sectionPath, chapterNumber, counters);
				for (const ref of refs) {
					const { key, ...refData } = ref;
					referenceIndex[key] = refData;
					referencesFound++;
				}

				sectionsProcessed++;
			} catch (error) {
				console.warn(`    Warning: Failed to process ${section.file}: ${error.message}`);
				sectionsSkipped++;
			}
		}
	}

	// Add reference index to toc.json
	toc.references = referenceIndex;

	// Write enriched toc.json
	writeFileSync(tocPath, JSON.stringify(toc, null, 2) + '\n', 'utf-8');

	console.log(`    Processed: ${sectionsProcessed} sections, Skipped: ${sectionsSkipped}, References: ${referencesFound}`);
}

function main() {
	console.log('Processing content with gray-matter...');
	console.log(`Content directory: ${contentDir}\n`);

	const books = getBooks();

	if (books.length === 0) {
		console.log('No books found.');
		return;
	}

	console.log(`Found ${books.length} book(s): ${books.join(', ')}\n`);

	for (const bookSlug of books) {
		processBook(bookSlug);
	}

	console.log('\nContent processing complete!');
}

main();
