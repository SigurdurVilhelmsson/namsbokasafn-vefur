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

// Determine section type from filename
function getSectionType(filename) {
	const name = basename(filename, '.md').toLowerCase();

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

	// Try parsing from filename (e.g., "1-2-name.md" -> "1.2")
	const name = basename(filename, '.md');
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

		// Regular sections sorted by number
		if (a.number && b.number) {
			const [aMajor, aMinor] = a.number.split('.').map(Number);
			const [bMajor, bMinor] = b.number.split('.').map(Number);
			if (aMajor !== bMajor) return aMajor - bMajor;
			return (aMinor || 0) - (bMinor || 0);
		}

		// Special sections at the end, in standard OpenStax order
		const typeOrder = ['glossary', 'equations', 'summary', 'exercises'];
		const aOrder = a.type ? typeOrder.indexOf(a.type) : -1;
		const bOrder = b.type ? typeOrder.indexOf(b.type) : -1;

		if (aOrder !== -1 && bOrder !== -1) return aOrder - bOrder;
		if (aOrder !== -1) return 1;
		if (bOrder !== -1) return -1;

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
	const chapterDirs = readdirSync(chaptersDir)
		.filter((name) => {
			const fullPath = resolve(chaptersDir, name);
			return statSync(fullPath).isDirectory() && /^\d{2}$/.test(name);
		})
		.sort();

	console.log(`  Found ${chapterDirs.length} chapter(s)`);

	for (const chapterDir of chapterDirs) {
		const chapterNum = parseInt(chapterDir, 10);
		const chapterPath = resolve(chaptersDir, chapterDir);

		// Load chapter metadata from efni repo
		const chapterMeta = loadChapterMetadata(options.efniPath, bookSlug, chapterNum);

		// Find all markdown files in chapter
		const mdFiles = readdirSync(chapterPath).filter((f) => f.endsWith('.md'));

		const sections = [];

		for (const mdFile of mdFiles) {
			const filePath = resolve(chapterPath, mdFile);
			const content = readFileSync(filePath, 'utf-8');
			const frontmatter = parseFrontmatter(content);

			const sectionType = getSectionType(mdFile);
			const sectionNum = getSectionNumber(frontmatter, mdFile, chapterNum);

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
				title = basename(mdFile, '.md')
					.replace(/^\d+-\d+-/, '')
					.replace(/^\d+-/, '')
					.replace(/-/g, ' ');
				title = title.charAt(0).toUpperCase() + title.slice(1);
			}

			const section = {
				number: sectionNum, // May be null, will be assigned after sorting
				title,
				file: mdFile,
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
			const entry = {
				number: s.number || `${chapterNum}.${nextNum++}`,
				title: s.title,
				file: s.file
			};
			if (s.type && s.type !== 'introduction') {
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
