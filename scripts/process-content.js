#!/usr/bin/env node
/**
 * Process content at build time
 *
 * Enriches each book's toc.json with per-section metadata read from the
 * pre-rendered HTML: title, section and chapter numbers and learning
 * objectives (from the page-data block), and an estimated reading time.
 * Front matter (chapters/00) is included.
 *
 * Done at build time so the reader gets this from toc.json without fetching
 * or parsing every page. (It no longer parses Markdown or builds a
 * cross-reference index: both went with the Markdown pipeline.)
 *
 * Usage: node scripts/process-content.js
 * Run after sync-content.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { buildOfflineManifest } from './lib/offline-manifest.js';

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
export function parseHtmlPageData(content) {
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

	// Process front matter (chapters/00/ — preface etc.) so it gets metadata too.
	for (const section of toc.frontMatter || []) {
		const sectionFilePath = join(bookDir, 'chapters', '00', section.file);
		if (!existsSync(sectionFilePath)) {
			console.warn(`    Warning: Front-matter file not found: ${section.file}`);
			sectionsSkipped++;
			continue;
		}
		try {
			const fileContent = readFileSync(sectionFilePath, 'utf-8');
			const pageData = parseHtmlPageData(fileContent);
			const readingTime = calculateReadingTimeHtml(fileContent);
			section.metadata = {
				title: pageData?.title || section.title,
				section: String(pageData?.section || section.number),
				chapter: pageData?.chapter || 0,
				readingTime,
				difficulty: undefined,
				objectives: pageData?.objectives || []
			};
			sectionsProcessed++;
		} catch (error) {
			console.warn(`    Warning: Failed to process ${section.file}: ${error.message}`);
			sectionsSkipped++;
		}
	}

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
					objectives: pageData?.objectives || []
				};

				sectionsProcessed++;
			} catch (error) {
				console.warn(`    Warning: Failed to process ${section.file}: ${error.message}`);
				sectionsSkipped++;
			}
		}
	}

	// Offline manifest: what "download for offline" fetches, and its real size.
	const manifest = buildOfflineManifest(join(projectRoot, 'static'), bookSlug);
	if (manifest.missing.length > 0) {
		console.warn(`    Warning: ${manifest.missing.length} <img> target(s) missing on disk`);
	}
	for (const tag of manifest.unparsed) {
		console.warn(`    Warning: <img> with no readable src, not in the offline download: ${tag}`);
	}
	writeFileSync(
		join(bookDir, 'offline-manifest.json'),
		JSON.stringify({ version: manifest.version, bytes: manifest.bytes, files: manifest.files }) + '\n',
		'utf-8'
	);
	// Disk bytes: what the device stores (nginx gzips HTML/SVG on the wire).
	toc.offline = { version: manifest.version, files: manifest.files.length, bytes: manifest.bytes };

	// Write enriched toc.json
	writeFileSync(tocPath, JSON.stringify(toc, null, 2) + '\n', 'utf-8');

	console.log(`    Processed: ${sectionsProcessed} sections, Skipped: ${sectionsSkipped}`);
	console.log(
		`    Offline: ${manifest.files.length} files, ${(manifest.bytes / 1e6).toFixed(1)} MB (version ${manifest.version})`
	);
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main();
}
