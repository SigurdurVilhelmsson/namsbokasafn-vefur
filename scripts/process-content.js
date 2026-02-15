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

// Get folder name for chapter (slug if present, else padded number)
function getChapterFolder(chapter) {
	return chapter.slug || getChapterPath(chapter);
}

// Reading time calculation
const WORDS_PER_MINUTE = 180;

function calculateReadingTimeHtml(content) {
	const cleanText = content
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&\w+;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	const wordCount = cleanText.split(/\s+/).filter((word) => word.length > 0).length;
	const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

	return Math.max(1, Math.min(minutes, 60));
}

/**
 * Parse metadata from HTML page-data JSON
 */
function parseHtmlPageData(content) {
	const match = content.match(/<script[^>]*id="page-data"[^>]*>([\s\S]*?)<\/script>/);
	if (!match) return null;

	try {
		return JSON.parse(match[1]);
	} catch {
		return null;
	}
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

	// Process each chapter and section
	for (const chapter of toc.chapters || []) {
		const chapterFolder = getChapterFolder(chapter);
		const chapterDir = join(bookDir, 'chapters', chapterFolder);

		if (!existsSync(chapterDir)) {
			console.warn(`    Warning: Chapter directory not found: ${chapterFolder}`);
			continue;
		}

		for (const section of chapter.sections || []) {
			const sectionFilePath = join(chapterDir, section.file);

			if (!existsSync(sectionFilePath)) {
				console.warn(`    Warning: Section file not found: ${section.file}`);
				sectionsSkipped++;
				continue;
			}

			try {
				const fileContent = readFileSync(sectionFilePath, 'utf-8');

				// HTML content: extract metadata from page-data JSON
				const pageData = parseHtmlPageData(fileContent);
				const readingTime = calculateReadingTimeHtml(fileContent);

				section.metadata = {
					title: pageData?.title || section.title,
					section: String(pageData?.section || section.number),
					chapter: pageData?.chapter || chapter.number,
					readingTime,
					difficulty: undefined,
					objectives: []
				};

				sectionsProcessed++;
			} catch (error) {
				console.warn(`    Warning: Failed to process ${section.file}: ${error.message}`);
				sectionsSkipped++;
			}
		}
	}

	// Write enriched toc.json
	writeFileSync(tocPath, JSON.stringify(toc, null, 2) + '\n', 'utf-8');

	console.log(`    Processed: ${sectionsProcessed} sections, Skipped: ${sectionsSkipped}`);
}

function main() {
	console.log('Processing content...');
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
