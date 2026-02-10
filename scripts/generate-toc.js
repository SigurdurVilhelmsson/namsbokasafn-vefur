#!/usr/bin/env node
/**
 * Generate toc.json by scanning chapter directories
 *
 * This script auto-generates toc.json based on what chapters and sections
 * actually exist in static/content/{bookSlug}/chapters/.
 *
 * It reads:
 * - Markdown frontmatter for section titles and numbers
 * - status.json from namsbokasafn-efni for chapter titles (optional)
 * - Existing toc.json for book metadata (title, attribution)
 *
 * Usage:
 *   node scripts/generate-toc.js                    # Generate for all books
 *   node scripts/generate-toc.js efnafraedi         # Generate for specific book
 *   node scripts/generate-toc.js --efni-path ../x   # Custom efni repo path
 *   node scripts/generate-toc.js --dry-run          # Preview without writing
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');
const DEFAULT_EFNI_PATH = resolve(projectRoot, '..', 'namsbokasafn-efni');

// Parse command line arguments
function parseArgs(args) {
	const options = {
		dryRun: false,
		efniPath: DEFAULT_EFNI_PATH,
		books: [],
		help: false
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--help' || arg === '-h') {
			options.help = true;
		} else if (arg === '--dry-run' || arg === '-n') {
			options.dryRun = true;
		} else if (arg === '--efni-path') {
			options.efniPath = resolve(args[++i] || DEFAULT_EFNI_PATH);
		} else if (!arg.startsWith('-')) {
			options.books.push(arg);
		}
	}

	return options;
}

function showHelp() {
	console.log(`
Generate toc.json by scanning chapter directories

Usage:
  node scripts/generate-toc.js [options] [book...]

Examples:
  node scripts/generate-toc.js                    Generate for all books
  node scripts/generate-toc.js efnafraedi         Generate for specific book
  node scripts/generate-toc.js -n                 Preview without writing
  node scripts/generate-toc.js --efni-path ../x   Custom efni repo path

Options:
  --dry-run, -n     Preview changes without writing
  --efni-path       Path to namsbokasafn-efni repo (for chapter titles)
  --help, -h        Show this help message
`);
}

// Parse YAML-like frontmatter from markdown file
function parseFrontmatter(content) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};

	const frontmatter = {};
	const lines = match[1].split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) continue;

		const key = line.slice(0, colonIndex).trim();
		let value = line.slice(colonIndex + 1).trim();

		// Remove surrounding quotes
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}

		frontmatter[key] = value;
	}

	return frontmatter;
}

// Parse metadata from HTML file (from embedded page-data JSON or HTML elements)
function parseHtmlMetadata(content) {
	const metadata = {};

	// Try to extract from embedded page-data JSON
	const pageDataMatch = content.match(/<script[^>]*id="page-data"[^>]*>([\s\S]*?)<\/script>/);
	if (pageDataMatch) {
		try {
			const pageData = JSON.parse(pageDataMatch[1]);
			if (pageData.title) metadata.title = pageData.title;
			if (pageData.section) metadata.section = pageData.section;
			if (pageData.chapter) metadata.chapter = pageData.chapter;
			return metadata;
		} catch {
			// Fall through to HTML parsing
		}
	}

	// Fallback: extract from HTML elements
	const titleMatch = content.match(/<h1[^>]*id="title"[^>]*>([^<]+)<\/h1>/);
	if (titleMatch) {
		metadata.title = titleMatch[1].trim();
	} else {
		// Try any h1
		const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
		if (h1Match) metadata.title = h1Match[1].trim();
	}

	// Try title tag
	if (!metadata.title) {
		const tagMatch = content.match(/<title>([^<]+)<\/title>/);
		if (tagMatch) metadata.title = tagMatch[1].trim();
	}

	return metadata;
}

// Get file extension (.md or .html)
function getFileExtension(filename) {
	return extname(filename).toLowerCase();
}

// Get basename without extension (.md or .html)
function getBasenameWithoutExt(filename) {
	const ext = getFileExtension(filename);
	if (ext === '.md' || ext === '.html') {
		return basename(filename, ext);
	}
	return basename(filename);
}

// Determine section type from filename
function getSectionType(filename) {
	const name = getBasenameWithoutExt(filename).toLowerCase();

	if (name.includes('key-terms') || name.includes('lykilhugtok')) {
		return 'glossary';
	}
	if (name.includes('key-equations') || name.includes('lykiljofu') || name.includes('lykiljofnu')) {
		return 'equations';
	}
	if (name.includes('summary') || name.includes('samantekt')) {
		return 'summary';
	}
	if (name.includes('exercises') || name.includes('aefingar') || name.endsWith('-exercises')) {
		return 'exercises';
	}
	if (name.includes('answer-key') || name.includes('svarlykill')) {
		return 'answer-key';
	}
	if (name.includes('introduction') || name.match(/-0-/)) {
		return 'introduction';
	}

	return null; // Regular section
}

// Parse section number from frontmatter or filename
function getSectionNumber(frontmatter, filename, chapterNum) {
	// Try frontmatter first
	if (frontmatter.section && frontmatter.section !== 'intro') {
		return frontmatter.section;
	}

	// Try parsing from filename (e.g., "1-2-name.md" or "1-2-name.html" -> "1.2")
	const name = getBasenameWithoutExt(filename);
	const match = name.match(/^(\d+)-(\d+)/);
	if (match) {
		return `${match[1]}.${match[2]}`;
	}

	// For special sections, generate a number based on order
	return null;
}

// Sort sections by section number
function sortSections(sections) {
	return sections.sort((a, b) => {
		// Introduction comes first
		if (a.type === 'introduction') return -1;
		if (b.type === 'introduction') return 1;

		// Special sections (summary, exercises, etc.) always come last, regardless of number
		const specialTypes = ['glossary', 'equations', 'summary', 'exercises', 'answer-key'];
		const aIsSpecial = a.type && specialTypes.includes(a.type);
		const bIsSpecial = b.type && specialTypes.includes(b.type);

		// If both are special, sort by type order
		if (aIsSpecial && bIsSpecial) {
			return specialTypes.indexOf(a.type) - specialTypes.indexOf(b.type);
		}

		// If only one is special, regular sections come first
		if (aIsSpecial) return 1;
		if (bIsSpecial) return -1;

		// Regular sections sorted by number
		if (a.number && b.number) {
			const [aMajor, aMinor] = a.number.split('.').map(Number);
			const [bMajor, bMinor] = b.number.split('.').map(Number);
			if (aMajor !== bMajor) return aMajor - bMajor;
			return (aMinor || 0) - (bMinor || 0);
		}

		// If one has a number and the other doesn't, numbered comes first
		if (a.number) return -1;
		if (b.number) return 1;

		// Fallback: alphabetical by filename
		return a.file.localeCompare(b.file);
	});
}

// Load chapter metadata from efni repo status.json
function loadChapterMetadata(efniPath, bookSlug, chapterNum) {
	const paddedNum = String(chapterNum).padStart(2, '0');
	const statusPath = resolve(efniPath, 'books', bookSlug, 'chapters', `ch${paddedNum}`, 'status.json');

	if (!existsSync(statusPath)) {
		return null;
	}

	try {
		return JSON.parse(readFileSync(statusPath, 'utf-8'));
	} catch {
		return null;
	}
}

// Load existing toc.json for book metadata
function loadExistingToc(bookPath) {
	const tocPath = resolve(bookPath, 'toc.json');

	if (!existsSync(tocPath)) {
		return null;
	}

	try {
		return JSON.parse(readFileSync(tocPath, 'utf-8'));
	} catch {
		return null;
	}
}

// Scan appendix directory and generate appendix entries
function scanAppendices(bookPath) {
	// Check for appendices in multiple possible locations
	const possibleDirs = [
		resolve(bookPath, 'chapters', 'appendix'),
		resolve(bookPath, 'chapters', 'appendices'),
		resolve(bookPath, 'chapters', '99')
	];

	let appendixDir = null;
	for (const dir of possibleDirs) {
		if (existsSync(dir)) {
			appendixDir = dir;
			break;
		}
	}

	if (!appendixDir) {
		return [];
	}

	// Find all appendix files and prefer HTML when both exist for same basename
	const allAppendixFiles = readdirSync(appendixDir)
		.filter((f) => f.endsWith('.md') || f.endsWith('.html'))
		.sort();

	const appendixByBasename = new Map();
	for (const file of allAppendixFiles) {
		const base = getBasenameWithoutExt(file);
		const existing = appendixByBasename.get(base);
		if (!existing) {
			appendixByBasename.set(base, file);
		} else if (file.endsWith('.html') && existing.endsWith('.md')) {
			appendixByBasename.set(base, file);
		}
	}

	const appendixFiles = Array.from(appendixByBasename.values()).sort();

	const appendices = [];

	for (const file of appendixFiles) {
		const filePath = resolve(appendixDir, file);
		const content = readFileSync(filePath, 'utf-8');
		const isHtml = file.endsWith('.html');
		const frontmatter = isHtml ? parseHtmlMetadata(content) : parseFrontmatter(content);

		let letter = null;

		// Try to extract letter from filename (e.g., "A-periodic-table.md" -> "A")
		const letterMatch = getBasenameWithoutExt(file).match(/^([A-M])-/i);
		if (letterMatch) {
			letter = letterMatch[1].toUpperCase();
		} else {
			// Try to extract from "99-N-" format (e.g., "99-1-" -> "A", "99-2-" -> "B")
			const numberMatch = getBasenameWithoutExt(file).match(/^99-(\d+)-/);
			if (numberMatch) {
				const num = parseInt(numberMatch[1], 10);
				// Convert 1→A, 2→B, ..., 13→M
				if (num >= 1 && num <= 13) {
					letter = String.fromCharCode(64 + num); // 65 is 'A'
				}
			} else {
				// Try to extract from "appendices-N-" format (e.g., "appendices-1-" -> "A")
				const appendixMatch = getBasenameWithoutExt(file).match(/^appendices-(\d+)-/);
				if (appendixMatch) {
					const num = parseInt(appendixMatch[1], 10);
					// Convert 1→A, 2→B, ..., 13→M
					if (num >= 1 && num <= 13) {
						letter = String.fromCharCode(64 + num); // 65 is 'A'
					}
				}
			}
		}

		if (!letter) {
			console.warn(`    Warning: Could not extract appendix letter from: ${file}`);
			continue;
		}

		// Determine the directory name for the file path
		const dirName = basename(appendixDir);

		const appendix = {
			letter,
			title: frontmatter.title || `Viðauki ${letter}`,
			file: `${dirName}/${file}`
		};

		// Check if this appendix should link to an interactive component
		if (frontmatter.isInteractive === 'true' || frontmatter.componentPath) {
			appendix.isInteractive = true;
			appendix.componentPath = frontmatter.componentPath || null;
		}

		appendices.push(appendix);
	}

	// Sort by letter
	return appendices.sort((a, b) => a.letter.localeCompare(b.letter));
}

// Load book metadata from efni repo toc.json
function loadEfniBookMetadata(efniPath, bookSlug) {
	// Try faithful first, then mt-preview
	for (const variant of ['faithful', 'mt-preview']) {
		const tocPath = resolve(efniPath, 'books', bookSlug, '05-publication', variant, 'toc.json');
		if (existsSync(tocPath)) {
			try {
				const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
				return { title: toc.title, attribution: toc.attribution };
			} catch {
				// Continue to next variant
			}
		}
	}
	return null;
}

// Generate toc.json for a single book
function generateToc(bookSlug, options) {
	const bookPath = resolve(contentDir, bookSlug);
	const chaptersDir = resolve(bookPath, 'chapters');

	if (!existsSync(chaptersDir)) {
		console.error(`  Error: chapters directory not found: ${chaptersDir}`);
		return null;
	}

	// Get existing toc for metadata preservation
	const existingToc = loadExistingToc(bookPath);

	// Try to get book metadata from efni repo
	const efniMetadata = loadEfniBookMetadata(options.efniPath, bookSlug);

	// Start building the toc
	const toc = {
		title: existingToc?.title || efniMetadata?.title || bookSlug,
		attribution: existingToc?.attribution || efniMetadata?.attribution || null,
		chapters: []
	};

	// Remove null attribution
	if (!toc.attribution) {
		delete toc.attribution;
	}

	// Find chapter directories (01, 02, etc.)
	// Exclude 99 as it's used for appendices
	const chapterDirs = readdirSync(chaptersDir)
		.filter((name) => {
			const fullPath = resolve(chaptersDir, name);
			return statSync(fullPath).isDirectory() && /^\d{2}$/.test(name) && name !== '99';
		})
		.sort();

	console.log(`  Found ${chapterDirs.length} chapter(s)`);

	for (const chapterDir of chapterDirs) {
		const chapterNum = parseInt(chapterDir, 10);
		const chapterPath = resolve(chaptersDir, chapterDir);

		// Load chapter metadata from efni repo
		const chapterMeta = loadChapterMetadata(options.efniPath, bookSlug, chapterNum);

		// Find all content files in chapter (both .md and .html)
		// When both .md and .html exist for same basename, prefer .html (pre-rendered from CNXML pipeline)
		const allFiles = readdirSync(chapterPath).filter((f) => f.endsWith('.md') || f.endsWith('.html'));

		// Group files by basename and prefer HTML when both exist
		const filesByBasename = new Map();
		for (const file of allFiles) {
			const base = getBasenameWithoutExt(file);
			const existing = filesByBasename.get(base);
			if (!existing) {
				filesByBasename.set(base, file);
			} else {
				// Prefer .html over .md when both exist
				if (file.endsWith('.html') && existing.endsWith('.md')) {
					filesByBasename.set(base, file);
				}
			}
		}

		const contentFiles = Array.from(filesByBasename.values());

		const sections = [];

		for (const contentFile of contentFiles) {
			const filePath = resolve(chapterPath, contentFile);
			const content = readFileSync(filePath, 'utf-8');
			const isHtml = contentFile.endsWith('.html');
			const frontmatter = isHtml ? parseHtmlMetadata(content) : parseFrontmatter(content);

			const sectionType = getSectionType(contentFile);
			const sectionNum = getSectionNumber(frontmatter, contentFile, chapterNum);

			// Get title from frontmatter or chapter metadata
			let title = frontmatter.title;
			if (!title && chapterMeta?.sections) {
				const sectionMeta = chapterMeta.sections.find((s) => s.id === sectionNum);
				if (sectionMeta) {
					title = sectionMeta.titleIs || sectionMeta.titleEn;
				}
			}
			if (!title) {
				// Fallback: derive from filename
				title = getBasenameWithoutExt(contentFile)
					.replace(/^\d+-\d+-/, '')
					.replace(/^\d+-/, '')
					.replace(/-/g, ' ');
				title = title.charAt(0).toUpperCase() + title.slice(1);
			}

			const section = {
				number: sectionNum, // May be null, will be assigned after sorting
				title,
				file: contentFile,
				type: sectionType
			};

			sections.push(section);
		}

		// Sort sections
		const sortedSections = sortSections(sections);

		// Build final section entries and assign numbers to those without them
		let nextNum = 1;
		// First, find the highest used section number
		for (const s of sortedSections) {
			if (s.number) {
				const parts = s.number.split('.');
				const minor = parseInt(parts[1], 10);
				if (!isNaN(minor) && minor >= nextNum) {
					nextNum = minor + 1;
				}
			}
		}

		const finalSections = sortedSections.map((s) => {
			// Special sections (intro, glossary, etc.) use empty string for number
			// to match OpenStax structure where these are unnumbered
			const specialTypes = ['introduction', 'glossary', 'equations', 'summary', 'exercises', 'answer-key'];
			const isSpecial = s.type && specialTypes.includes(s.type);

			const entry = {
				number: isSpecial ? '' : (s.number || `${chapterNum}.${nextNum++}`),
				title: s.title,
				file: s.file
			};
			if (s.type) {
				entry.type = s.type;
			}
			return entry;
		});

		// Get chapter title
		let chapterTitle = chapterMeta?.titleIs || chapterMeta?.titleEn;
		if (!chapterTitle && existingToc) {
			const existingChapter = existingToc.chapters?.find((c) => c.number === chapterNum);
			chapterTitle = existingChapter?.title;
		}
		if (!chapterTitle) {
			chapterTitle = `Kafli ${chapterNum}`;
		}

		toc.chapters.push({
			number: chapterNum,
			title: chapterTitle,
			sections: finalSections
		});

		console.log(`    Chapter ${chapterNum}: ${chapterTitle} (${finalSections.length} sections)`);
	}

	// Scan for appendices
	const appendices = scanAppendices(bookPath);
	if (appendices.length > 0) {
		toc.appendices = appendices;
		console.log(`  Found ${appendices.length} appendix/appendices`);
	}

	// Extract answer-key sections from chapters into separate answerKey array
	const answerKey = [];
	for (const chapter of toc.chapters) {
		const answerKeySection = chapter.sections.find(s => s.type === 'answer-key');
		if (answerKeySection) {
			// File path points to actual location in chapter folder
			const chapterPadded = chapter.number.toString().padStart(2, '0');
			answerKey.push({
				chapter: chapter.number,
				title: `Kafli ${chapter.number}`,
				file: `${chapterPadded}/${answerKeySection.file}`
			});
			// Remove answer-key from chapter sections
			chapter.sections = chapter.sections.filter(s => s.type !== 'answer-key');
		}
	}
	if (answerKey.length > 0) {
		toc.answerKey = answerKey;
		console.log(`  Found ${answerKey.length} answer key(s)`);
	}

	// Check if index.json exists and add index entry
	const indexPath = resolve(bookPath, 'index.json');
	if (existsSync(indexPath)) {
		toc.index = {
			title: 'Stafrófsröð',
			file: 'index.json'
		};
		console.log('  Found index');
	}

	return toc;
}

// Get list of books in content directory
function getContentBooks() {
	if (!existsSync(contentDir)) {
		return [];
	}

	return readdirSync(contentDir).filter((name) => {
		const path = resolve(contentDir, name);
		if (!statSync(path).isDirectory()) return false;
		// A valid book has a chapters directory
		return existsSync(resolve(path, 'chapters'));
	});
}

function main() {
	const args = process.argv.slice(2);
	const options = parseArgs(args);

	if (options.help) {
		showHelp();
		process.exit(0);
	}

	console.log('TOC Generator');
	console.log('=============\n');

	// Determine which books to process
	const availableBooks = getContentBooks();

	if (availableBooks.length === 0) {
		console.error('No books found in static/content/');
		process.exit(1);
	}

	let booksToProcess = options.books.length > 0 ? options.books : availableBooks;

	// Validate requested books exist
	const invalidBooks = booksToProcess.filter((b) => !availableBooks.includes(b));
	if (invalidBooks.length > 0) {
		console.error(`Error: Books not found: ${invalidBooks.join(', ')}`);
		console.error(`Available books: ${availableBooks.join(', ')}`);
		process.exit(1);
	}

	if (options.dryRun) {
		console.log('[DRY-RUN MODE - no files will be written]\n');
	}

	let success = 0;
	let failed = 0;

	for (const bookSlug of booksToProcess) {
		console.log(`Processing: ${bookSlug}`);

		const toc = generateToc(bookSlug, options);

		if (!toc) {
			failed++;
			continue;
		}

		const tocPath = resolve(contentDir, bookSlug, 'toc.json');

		if (options.dryRun) {
			console.log(`  [DRY-RUN] Would write: ${tocPath}`);
			console.log(`  Generated TOC with ${toc.chapters.length} chapter(s)\n`);
		} else {
			writeFileSync(tocPath, JSON.stringify(toc, null, 2) + '\n', 'utf-8');
			console.log(`  Wrote: ${tocPath}\n`);
		}

		success++;
	}

	console.log(`\nComplete: ${success} succeeded, ${failed} failed`);
	process.exit(failed > 0 ? 1 : 0);
}

main();
