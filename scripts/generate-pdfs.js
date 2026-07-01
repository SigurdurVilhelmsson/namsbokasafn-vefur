#!/usr/bin/env node

/**
 * Generate downloadable PDFs for each book in static/content/.
 *
 * For every book + chapter found, prints the dedicated /print/<slug>/kafli/<NN>
 * route to a PDF using Playwright Chromium, then assembles a full book PDF
 * (front matter + chapters + appendices) with pdf-lib. The assembly pass adds
 * the book-layout features Chromium can't do on its own:
 *
 *   - continuous page numbering across the whole book (folios on the outer
 *     edge: left on verso/even pages, right on recto/odd pages)
 *   - running headers (book title on verso, chapter title on recto)
 *   - a table of contents with real page numbers (two-pass: chapters are
 *     measured first, then the front matter is re-printed with page numbers
 *     fed in via downloads/<slug>/toc-pages.json)
 *   - PDF bookmarks (outline) for the TOC, every chapter and the appendices
 *
 * Standalone chapter PDFs are stamped with the same book-absolute page
 * numbers, so a printed chapter matches the full book and its TOC.
 *
 * Output: static/downloads/<slug>/
 *   - <slug>-kafli-NN.pdf       (one per chapter)
 *   - <slug>-bok.pdf            (full book)
 *   - toc-pages.json            (chapter start pages, read by /print/<slug>/bok)
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
 *   - Playwright browsers installed (`npx playwright install chromium`),
 *     or PDF_CHROMIUM_PATH pointing at a system Chromium binary.
 *
 * Usage:
 *   node scripts/generate-pdfs.js                # all books with content
 *   node scripts/generate-pdfs.js --book <slug>  # single book
 *   node scripts/generate-pdfs.js --port 5180    # custom dev port
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
	rmSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { PDFDocument, PDFName, PDFHexString, StandardFonts, rgb } from 'pdf-lib';
import {
	harvestDests,
	findCollidingNames,
	mergeChapterDests,
	writeMergedDests
} from './lib/pdf-links.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'static', 'content');
const OUTPUT_DIR = join(ROOT, 'static', 'downloads');
const TMP_DIR = join(ROOT, '.svelte-kit', 'pdf-tmp');

// Stamp geometry (PDF points; A4 = 595.28 × 841.89). Folios/headers sit on the
// outer edge, ~18mm in — inside the 22mm side margins (see print.css @page), so
// they never collide with body text or the binding gutter.
const MARGIN_X = 51; // 18mm from the outer paper edge
const FOOTER_BASELINE = 34;
const HEADER_BASELINE = 806;
const STAMP_FONT_SIZE = 9;
const HEADER_COLOR = rgb(0.42, 0.42, 0.42);
const FOLIO_COLOR = rgb(0.2, 0.2, 0.2);

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

	// Headers/footers are stamped afterwards with pdf-lib (continuous book
	// numbering, running headers), so Chromium prints content only.
	await page.pdf({
		path: outFile,
		format: 'A4',
		printBackground: true,
		preferCSSPageSize: true, // honor @page rules in print.css
		displayHeaderFooter: false,
		// preferCSSPageSize honours print.css's @page margins (20/22/22/22mm —
		// symmetric binding-safe sides for double-sided binding); these mirror
		// that for clarity and any non-CSS-page-size fallback.
		margin: { top: '20mm', bottom: '22mm', left: '22mm', right: '22mm' }
	});
}

async function getPdfPageCount(file) {
	const bytes = readFileSync(file);
	const doc = await PDFDocument.load(bytes);
	return doc.getPageCount();
}

/**
 * Drop characters the standard Helvetica font can't encode (WinAnsi covers
 * all Icelandic letters; this guards against stray symbols in titles).
 */
function encodableText(font, text) {
	let out = '';
	for (const ch of text) {
		try {
			font.encodeText(ch);
			out += ch;
		} catch {
			out += '?';
		}
	}
	return out;
}

/**
 * Stamp running headers and folios onto a loaded PDFDocument.
 *
 * pageInfo(i) is called for each page index and returns null (leave the page
 * untouched — e.g. front matter) or:
 *   { pageNumber, headerText | null }
 *
 * Book conventions: odd page numbers are recto (folio + header on the right),
 * even are verso (on the left). Chapter openers pass headerText: null.
 */
async function stampPages(doc, pageInfo) {
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
	const pages = doc.getPages();

	for (let i = 0; i < pages.length; i++) {
		const info = pageInfo(i);
		if (!info) continue;

		const page = pages[i];
		const { width } = page.getSize();
		const isRecto = info.pageNumber % 2 === 1;

		const folio = String(info.pageNumber);
		const folioWidth = font.widthOfTextAtSize(folio, STAMP_FONT_SIZE);
		page.drawText(folio, {
			x: isRecto ? width - MARGIN_X - folioWidth : MARGIN_X,
			y: FOOTER_BASELINE,
			size: STAMP_FONT_SIZE,
			font,
			color: FOLIO_COLOR
		});

		if (info.headerText) {
			const text = encodableText(fontItalic, info.headerText);
			const textWidth = fontItalic.widthOfTextAtSize(text, STAMP_FONT_SIZE);
			page.drawText(text, {
				x: isRecto ? width - MARGIN_X - textWidth : MARGIN_X,
				y: HEADER_BASELINE,
				size: STAMP_FONT_SIZE,
				font: fontItalic,
				color: HEADER_COLOR
			});
		}
	}
}

/**
 * Add a flat PDF outline (bookmarks) to the document.
 * items: [{ title, pageIndex }]
 */
function addOutline(doc, items) {
	if (items.length === 0) return;
	const ctx = doc.context;
	const pageRefs = doc.getPages().map((p) => p.ref);

	const outlineRef = ctx.nextRef();
	const itemRefs = items.map(() => ctx.nextRef());

	items.forEach((item, i) => {
		const dict = ctx.obj({
			Title: PDFHexString.fromText(item.title),
			Parent: outlineRef,
			Dest: [pageRefs[item.pageIndex], PDFName.of('XYZ'), null, null, null]
		});
		if (i > 0) dict.set(PDFName.of('Prev'), itemRefs[i - 1]);
		if (i < items.length - 1) dict.set(PDFName.of('Next'), itemRefs[i + 1]);
		ctx.assign(itemRefs[i], dict);
	});

	ctx.assign(
		outlineRef,
		ctx.obj({
			Type: 'Outlines',
			First: itemRefs[0],
			Last: itemRefs[items.length - 1],
			Count: items.length
		})
	);
	doc.catalog.set(PDFName.of('Outlines'), outlineRef);
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

	// Stale page numbers from a previous run must not leak into pass-1 prints.
	const tocPagesFile = join(bookOutDir, 'toc-pages.json');
	rmSync(tocPagesFile, { force: true });

	// --- Pass 1: print raw chapter/appendix PDFs and measure them ------------

	const chapterParts = [];
	for (const chapter of chapters) {
		const chSlug = pad2(chapter.number);
		const url = `${baseUrl}/print/${bookSlug}/kafli/${chSlug}/`;
		const rawFile = join(bookTmpDir, `${bookSlug}-kafli-${chSlug}-raw.pdf`);
		console.log(`  ${bookSlug} kafli ${chSlug}: ${chapter.title}`);
		await printToPdf(page, url, rawFile);
		chapterParts.push({
			chapterNum: chapter.number,
			title: chapter.title,
			rawFile,
			outFile: `${bookSlug}-kafli-${chSlug}.pdf`,
			pageCount: await getPdfPageCount(rawFile)
		});
	}

	let appendixPart = null;
	if ((toc.appendices ?? []).length > 0) {
		const rawFile = join(bookTmpDir, `${bookSlug}-vidauki-raw.pdf`);
		console.log(`  ${bookSlug}: appendices (${toc.appendices.length})`);
		await printToPdf(page, `${baseUrl}/print/${bookSlug}/vidauki/`, rawFile);
		appendixPart = { rawFile, pageCount: await getPdfPageCount(rawFile) };
	}

	// Back-of-book glossary (rendered from glossary.json), merged after appendices.
	let glossaryPart = null;
	if (existsSync(join(CONTENT_DIR, bookSlug, 'glossary.json'))) {
		const rawFile = join(bookTmpDir, `${bookSlug}-ordabok-raw.pdf`);
		console.log(`  ${bookSlug}: glossary (orðaskrá)`);
		await printToPdf(page, `${baseUrl}/print/${bookSlug}/ordabok/`, rawFile);
		glossaryPart = { rawFile, pageCount: await getPdfPageCount(rawFile) };
	}

	// Body page numbering starts at 1 on the first page of chapter 1; appendices
	// then the glossary continue the count.
	let nextStart = 1;
	for (const part of chapterParts) {
		part.startPage = nextStart;
		nextStart += part.pageCount;
	}
	if (appendixPart) {
		appendixPart.startPage = nextStart;
		nextStart += appendixPart.pageCount;
	}
	// Glossary is the last body part, so its start is the running total (no need
	// to advance nextStart further).
	if (glossaryPart) glossaryPart.startPage = nextStart;

	// --- Pass 2: front matter with TOC page numbers --------------------------

	// The /print/<slug>/bok route reads this file to fill in TOC page numbers.
	writeFileSync(
		tocPagesFile,
		JSON.stringify(
			{
				chapters: chapterParts.map((p) => ({
					number: p.chapterNum,
					page: p.startPage
				})),
				appendicesPage: appendixPart?.startPage ?? null,
				glossaryPage: glossaryPart?.startPage ?? null
			},
			null,
			2
		)
	);

	const frontMatterFile = join(bookTmpDir, `${bookSlug}-front.pdf`);
	console.log(`  ${bookSlug}: front matter (title + TOC)`);
	await printToPdf(page, `${baseUrl}/print/${bookSlug}/bok/`, frontMatterFile);
	const frontPageCount = await getPdfPageCount(frontMatterFile);

	// Colophon page — identical for every chapter, so render once and append it
	// (below) only to the standalone chapter PDFs. The full book is NOT given a
	// per-chapter colophon; it carries the single front-matter colophon instead.
	const colophonFile = join(bookTmpDir, `${bookSlug}-colophon.pdf`);
	console.log(`  ${bookSlug}: colophon (standalone chapters)`);
	await printToPdf(page, `${baseUrl}/print/${bookSlug}/colophon/`, colophonFile);

	// --- Stamp + write standalone chapter PDFs, assemble the full book -------

	const bookTitle = toc.title ?? bookSlug;
	const merged = await PDFDocument.create();
	merged.setTitle(bookTitle, { showInWindowTitleBar: true });
	merged.setLanguage('is');

	const front = await PDFDocument.load(readFileSync(frontMatterFile));
	for (const p of await merged.copyPages(front, front.getPageIndices())) merged.addPage(p);

	const outlineItems = [];
	if (frontPageCount > 1) outlineItems.push({ title: 'Efnisyfirlit', pageIndex: 1 });

	// Collected so we can rebuild internal-link destinations after the merge:
	// copyPages drops the catalog /Dests dict, so every `<a href="#id">` in the
	// content dangles until we harvest each chapter's dests and rewrite them
	// against the merged page tree. Also lets us register chapter start pages as
	// named dests for the clickable table of contents. See scripts/lib/pdf-links.js.
	const destHarvest = []; // { dests, mergedOffset, chapterNum }
	const tocDests = {}; // anchor name → merged page index (chapter/appendix starts)

	const chapterEntries = [];
	for (const part of chapterParts) {
		const headerForPage = (localIndex) => ({
			pageNumber: part.startPage + localIndex,
			// Chapter opener (cover page) carries a folio but no running header.
			headerText:
				localIndex === 0
					? null
					: (part.startPage + localIndex) % 2 === 1
						? `${part.chapterNum}. ${part.title}`
						: bookTitle
		});

		// Standalone chapter file — book-absolute page numbers so a printed
		// chapter matches the full book and its TOC.
		const standalone = await PDFDocument.load(readFileSync(part.rawFile));
		standalone.setTitle(`${bookTitle} — ${part.chapterNum}. ${part.title}`, {
			showInWindowTitleBar: true
		});
		standalone.setLanguage('is');
		await stampPages(standalone, headerForPage);
		// Append the standalone-only colophon as an unstamped addendum page (so a
		// chapter shared on its own still carries full CC-BY attribution). It is
		// deliberately absent from the merged book below.
		const colDoc = await PDFDocument.load(readFileSync(colophonFile));
		for (const p of await standalone.copyPages(colDoc, colDoc.getPageIndices())) {
			standalone.addPage(p);
		}
		const standaloneFile = join(bookOutDir, part.outFile);
		writeFileSync(standaloneFile, await standalone.save());

		// Same pages into the full book.
		const mergedOffset = merged.getPageCount();
		outlineItems.push({ title: `${part.chapterNum}. ${part.title}`, pageIndex: mergedOffset });
		tocDests[`kafli-${part.chapterNum}`] = mergedOffset;
		const src = await PDFDocument.load(readFileSync(part.rawFile));
		destHarvest.push({ dests: harvestDests(src), mergedOffset, chapterNum: part.chapterNum });
		const copied = await merged.copyPages(src, src.getPageIndices());
		for (const p of copied) merged.addPage(p);

		chapterEntries.push({
			chapterNum: part.chapterNum,
			title: part.title,
			file: part.outFile,
			sizeBytes: statSync(standaloneFile).size,
			pageCount: part.pageCount,
			startPage: part.startPage
		});
	}

	if (appendixPart) {
		const mergedOffset = merged.getPageCount();
		outlineItems.push({ title: 'Viðaukar', pageIndex: mergedOffset });
		tocDests['vidaukar'] = mergedOffset;
		const src = await PDFDocument.load(readFileSync(appendixPart.rawFile));
		destHarvest.push({ dests: harvestDests(src), mergedOffset, chapterNum: 90 });
		const copied = await merged.copyPages(src, src.getPageIndices());
		for (const p of copied) merged.addPage(p);
	}

	if (glossaryPart) {
		const mergedOffset = merged.getPageCount();
		outlineItems.push({ title: 'Orðaskrá', pageIndex: mergedOffset });
		tocDests['ordaskra'] = mergedOffset;
		const src = await PDFDocument.load(readFileSync(glossaryPart.rawFile));
		destHarvest.push({ dests: harvestDests(src), mergedOffset, chapterNum: 91 });
		const copied = await merged.copyPages(src, src.getPageIndices());
		for (const p of copied) merged.addPage(p);
	}

	// Rebuild the merged catalog /Dests: harvested content dests (rebased to the
	// merged page tree) so every in-content link resolves again, plus chapter /
	// appendix start pages for the clickable TOC. Colliding auto-ids (footnote
	// anchors) are namespaced per chapter so they don't clobber.
	const collidingNames = findCollidingNames(destHarvest.map((h) => h.dests));
	// `gloss-N` are intentionally shared: many chapters link the same glossary
	// entry, and each chapter carries a hidden placeholder target for it (so
	// Chromium emits the dfn link annotation). They must NOT be namespaced — the
	// glossary part is harvested last, so its real gloss-N entry page wins.
	for (const name of [...collidingNames]) {
		if (name.startsWith('gloss-')) collidingNames.delete(name);
	}
	const registry = new Map();
	for (const { dests, mergedOffset, chapterNum } of destHarvest) {
		mergeChapterDests(registry, dests, mergedOffset, chapterNum, collidingNames);
	}
	for (const [name, mergedPageIndex] of Object.entries(tocDests)) {
		registry.set(name, { mergedPageIndex, params: [PDFName.of('Fit')] });
	}
	writeMergedDests(merged, registry);

	// Continuous folios + running headers across the whole assembled book.
	const partStarts = chapterParts.map((p) => ({
		header: (n) => (n % 2 === 1 ? `${p.chapterNum}. ${p.title}` : bookTitle),
		startPage: p.startPage
	}));
	if (appendixPart) {
		partStarts.push({
			header: (n) => (n % 2 === 1 ? 'Viðaukar' : bookTitle),
			startPage: appendixPart.startPage
		});
	}
	if (glossaryPart) {
		partStarts.push({
			header: (n) => (n % 2 === 1 ? 'Orðaskrá' : bookTitle),
			startPage: glossaryPart.startPage
		});
	}
	await stampPages(merged, (i) => {
		if (i < frontPageCount) return null; // front matter is unnumbered
		const pageNumber = i - frontPageCount + 1;
		const part = [...partStarts].reverse().find((p) => pageNumber >= p.startPage);
		if (!part) return null;
		return {
			pageNumber,
			headerText: pageNumber === part.startPage ? null : part.header(pageNumber)
		};
	});

	addOutline(merged, outlineItems);

	const fullBookFile = join(bookOutDir, `${bookSlug}-bok.pdf`);
	console.log(`  ${bookSlug}: assembling bok.pdf (${merged.getPageCount()} pages)`);
	writeFileSync(fullBookFile, await merged.save());

	const manifest = {
		generatedAt: new Date().toISOString(),
		bookSlug,
		full: {
			file: `${bookSlug}-bok.pdf`,
			sizeBytes: statSync(fullBookFile).size,
			pageCount: merged.getPageCount()
		},
		chapters: chapterEntries
	};
	if (appendixPart) {
		manifest.appendices = {
			pageCount: appendixPart.pageCount,
			startPage: appendixPart.startPage
		};
	}
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

	// PDF_CHROMIUM_PATH lets CI/sandboxes point at a system Chromium instead of
	// the Playwright-managed download.
	const browser = await chromium.launch({
		executablePath: process.env.PDF_CHROMIUM_PATH || undefined
	});
	const context = await browser.newContext({
		viewport: { width: 794, height: 1123 }, // A4 at 96 DPI
		deviceScaleFactor: 1
	});
	const page = await context.newPage();
	// Render PDFs with *screen* styles. The /print routes are styled
	// unconditionally by print.css, while app.css carries a global
	// `@media print` block meant for users printing the reading view — it
	// hides <header>/<aside> (killing section titles and note boxes) and
	// flattens colors. Emulating screen media keeps it out of the PDFs;
	// Chromium still honors break-* and @page rules when printing.
	await page.emulateMedia({ media: 'screen' });

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
