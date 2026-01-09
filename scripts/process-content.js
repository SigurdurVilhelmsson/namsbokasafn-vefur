#!/usr/bin/env node
/**
 * Process content at build time
 *
 * This script enriches toc.json with parsed frontmatter from markdown files.
 * Using gray-matter for proper YAML parsing instead of runtime custom parser.
 *
 * Benefits:
 * - Proper YAML parsing (handles quoted strings, nested objects, etc.)
 * - Build-time processing (no runtime parsing overhead)
 * - Metadata available immediately from toc.json
 *
 * Usage: node scripts/process-content.js
 * Run after copy-content.js
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const contentDir = resolve(projectRoot, 'static', 'content');

// Reading time calculation (same as in contentLoader.ts)
const WORDS_PER_MINUTE = 180;

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
		console.error('Run "npm run copy-content" first');
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
		const chapterDir = join(bookDir, 'chapters', chapter.slug);

		if (!existsSync(chapterDir)) {
			console.warn(`    Warning: Chapter directory not found: ${chapter.slug}`);
			continue;
		}

		for (const section of chapter.sections || []) {
			const sectionPath = join(chapterDir, section.file);

			if (!existsSync(sectionPath)) {
				console.warn(`    Warning: Section file not found: ${section.file}`);
				sectionsSkipped++;
				continue;
			}

			try {
				const fileContent = readFileSync(sectionPath, 'utf-8');
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
