#!/usr/bin/env node

/**
 * Generate downloadable PDFs for each book in static/content/.
 *
 * For every book + chapter found, prints the dedicated /print/<slug>/kafli/<NN>
 * route to a PDF using Playwright Chromium, then merges the per-chapter PDFs
 * with the front-matter (/print/<slug>/bok) into a single full-book PDF using
 * pdf-lib. Writes a manifest.json describing all generated files.
 *
 * Output: static/downloads/<slug>/
 *   - <slug>-kafli-NN.pdf       (one per chapter)
 *   - <slug>-bok.pdf            (full book)
 *   - manifest.json
 *
 * The script uses `vite dev` rather than `vite preview`. The reason:
 * SvelteKit's preview middleware uses a static asset allowlist generated at
 * build time, so files copied into build/ post-build get 404'd. With vite dev
 * we don't need a prior build at all — the print routes compile on demand,
 * and the static adapter on the *next* `vite build` will copy our generated
 * static/downloads/ into build/downloads/ for deploy.
 *
 * Recommended invocation order:
 *   sync-content → generate-pdfs → vite build
 *
 * Prerequisites:
 *   - Playwright browsers installed (`npx playwright install chromium`).
 *
 * Usage:
 *   node scripts/generate-pdfs.js                # all books with content
 *   node scripts/generate-pdfs.js --book <slug>  # single book
 *   node scripts/generate-pdfs.js --port 5180    # custom dev port
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'static', 'content');
const OUTPUT_DIR = join(ROOT, 'static', 'downloads');
const TMP_DIR = join(ROOT, '.svelte-kit', 'pdf-tmp');

function parseArgs(argv) {
	const args = { book: null, port: 5180 };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--book' && argv[i + 1]) args.book = argv[++i];
		else if (a === '--port' && argv[i + 1]) args.port = parseInt(argv[++i], 10);
	}
	return args;
}

function listBooksWithContent() {
	if (!existsSync(CONTENT_DIR)) return [];
	return readdirSync(CONTENT_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.filter((slug) => existsSync(join(CONTENT_DIR, slug, 'toc.json')));
}

function loadToc(bookSlug) {
	return JSON.parse(readFileSync(join(CONTENT_DIR, bookSlug, 'toc.json'), 'utf-8'));
}

function pad2(n) {
	return String(n).padStart(2, '0');
}

async function startDevServer(port) {
	const server = await createServer({
		server: { port, strictPort: true, host: '127.0.0.1' },
		logLevel: 'warn'
	});
	await server.listen();
	const url = `http://127.0.0.1:${port}`;
	return { server, url };
}

async function printToPdf(page, url, outFile) {
	await page.goto(url, { waitUntil: 'load', timeout: 60000 });
	// Give layout/fonts a beat to settle. Pre-rendered MathJax SVG doesn't need
	// time, but custom fonts swap async on first request.
	await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
	await page.evaluate(() => document.fonts?.ready);

	await page.pdf({
		path: outFile,
		format: 'A4',
		printBackground: true,
		preferCSSPageSize: true, // honor @page rules in print.css
		displayHeaderFooter: true,
		headerTemplate: '<div></div>',
		footerTemplate: `
			<div style="width: 100%; font-size: 9pt; color: #6b7280; padding: 0 18mm; display: flex; justify-content: space-between;">
				<span>namsbokasafn.is</span>
				<span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
			</div>
		`,
		margin: { top: '22mm', bottom: '22mm', left: '18mm', right: '18mm' }
	});
}

async function getPdfPageCount(file) {
	const bytes = readFileSync(file);
	const doc = await PDFDocument.load(bytes);
	return doc.getPageCount();
}

async function mergePdfs(files, outFile) {
	const merged = await PDFDocument.create();
	for (const file of files) {
		const bytes = readFileSync(file);
		const src = await PDFDocument.load(bytes);
		const pages = await merged.copyPages(src, src.getPageIndices());
		for (const p of pages) merged.addPage(p);
	}
	const out = await merged.save();
	writeFileSync(outFile, out);
}

async function generateForBook(page, baseUrl, bookSlug) {
	const toc = loadToc(bookSlug);
	const bookOutDir = join(OUTPUT_DIR, bookSlug);
	const bookTmpDir = join(TMP_DIR, bookSlug);
	mkdirSync(bookOutDir, { recursive: true });
	mkdirSync(bookTmpDir, { recursive: true });

	const chapters = toc.chapters ?? [];
	if (chapters.length === 0) {
		console.warn(`  ${bookSlug}: no chapters in toc.json — skipping`);
		return null;
	}

	const chapterEntries = [];
	for (const chapter of chapters) {
		const chSlug = pad2(chapter.number);
		const url = `${baseUrl}/print/${bookSlug}/kafli/${chSlug}`;
		const outFile = join(bookOutDir, `${bookSlug}-kafli-${chSlug}.pdf`);
		console.log(`  ${bookSlug} kafli ${chSlug}: ${chapter.title}`);
		await printToPdf(page, url, outFile);
		const pageCount = await getPdfPageCount(outFile);
		const sizeBytes = statSync(outFile).size;
		chapterEntries.push({
			chapterNum: chapter.number,
			title: chapter.title,
			file: `${bookSlug}-kafli-${chSlug}.pdf`,
			sizeBytes,
			pageCount
		});
	}

	// Front-matter for full-book PDF
	const frontMatterFile = join(bookTmpDir, `${bookSlug}-front.pdf`);
	console.log(`  ${bookSlug}: front matter (title + TOC)`);
	await printToPdf(page, `${baseUrl}/print/${bookSlug}/bok`, frontMatterFile);

	// Merge: front-matter + chapter PDFs
	const fullBookFile = join(bookOutDir, `${bookSlug}-bok.pdf`);
	console.log(`  ${bookSlug}: merging ${chapterEntries.length} chapters into bok.pdf`);
	const filesToMerge = [
		frontMatterFile,
		...chapterEntries.map((c) => join(bookOutDir, c.file))
	];
	await mergePdfs(filesToMerge, fullBookFile);
	const fullSize = statSync(fullBookFile).size;
	const fullPages = await getPdfPageCount(fullBookFile);

	const manifest = {
		generatedAt: new Date().toISOString(),
		bookSlug,
		full: {
			file: `${bookSlug}-bok.pdf`,
			sizeBytes: fullSize,
			pageCount: fullPages
		},
		chapters: chapterEntries
	};
	writeFileSync(join(bookOutDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

	return manifest;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const allBooks = listBooksWithContent();
	const targetBooks = args.book ? allBooks.filter((b) => b === args.book) : allBooks;

	if (targetBooks.length === 0) {
		console.error('No books with content found in static/content/.');
		process.exit(1);
	}

	console.log(`Generating PDFs for ${targetBooks.length} book(s): ${targetBooks.join(', ')}`);

	mkdirSync(OUTPUT_DIR, { recursive: true });
	mkdirSync(TMP_DIR, { recursive: true });

	console.log(`Starting dev server on port ${args.port}...`);
	const { server, url } = await startDevServer(args.port);
	console.log(`  Dev server at ${url}`);

	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 794, height: 1123 }, // A4 at 96 DPI
		deviceScaleFactor: 1
	});
	const page = await context.newPage();

	let exitCode = 0;
	try {
		for (const slug of targetBooks) {
			console.log(`\n=== ${slug} ===`);
			try {
				await generateForBook(page, url, slug);
			} catch (e) {
				console.error(`  Failed for ${slug}:`, e.message);
				exitCode = 1;
			}
		}
		console.log('\nDone.');
	} finally {
		await context.close();
		await browser.close();
		await server.close();
		rmSync(TMP_DIR, { recursive: true, force: true });
	}

	process.exit(exitCode);
}

main().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});
