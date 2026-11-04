/**
 * Print one /print route to a PDF file, for scripts/generate-pdfs.js. Kept apart
 * from that script, which starts a dev server and a browser on import, so a test
 * can drive this function in a browser of its own (e2e/pdf-print.spec.ts).
 *
 * Why it waits for every image (docs/plans/2026-07-01-pdf-redesign-plan.md,
 * Task 4.3's note and the follow-up under it): every `<img>` efni renders carries
 * `loading="lazy"`, so a figure below the first screen is not even requested by
 * the time the page's `load` and `networkidle` fire. page.pdf() then starts the
 * lazy loads itself and prints without waiting for them all, so a figure that
 * has not arrived prints as nothing and the pages after it move up. Chapter 10
 * (82 figures, 268 MB on efni main, SVGs up to 56 MB) printed 112, 108 and 105
 * pages on three runs of the same commit; with the network held to 20 MB/s it
 * printed 78 pages, with 38 figures still loading after page.pdf() returned.
 */

import { assertPrintable } from './pdf-books.js';

/**
 * How long one print waits for its images, in milliseconds. A chapter's figures
 * load from the local dev server, so this bounds a stuck request rather than a
 * slow one: chapter 10 settles in about 30 s unthrottled.
 */
export const IMAGE_SETTLE_TIMEOUT_MS = 180_000;

/**
 * Runs in the page (page.evaluate): turn every lazy `<img>` eager, then wait until
 * each has loaded and decoded or has definitively failed, for at most `timeoutMs`.
 * Never rejects. Returns the outcome of every image.
 *
 * Self-contained, because Playwright sends it to the page as source text.
 *
 * @param {number} timeoutMs
 * @returns {Promise<{ total: number, loaded: number, failed: string[], unfinished: string[] }>}
 */
export function settlePageImages(timeoutMs) {
	const images = [...document.images];
	/** @type {Map<HTMLImageElement, 'loaded' | 'failed'>} */
	const outcome = new Map();
	const settled = images.map(
		(img) =>
			new Promise((resolve) => {
				const done = (state) => {
					if (!outcome.has(img)) outcome.set(img, state);
					resolve(undefined);
				};
				// decode() resolves once the image is loaded and decoded, and rejects
				// for one that failed to load or cannot be decoded, so it decides
				// both cases, including an SVG with no intrinsic size (naturalWidth 0
				// although it loaded).
				const decide = () => img.decode().then(() => done('loaded'), () => done('failed'));
				if (img.complete) {
					decide();
				} else {
					img.addEventListener('load', decide, { once: true });
					img.addEventListener('error', () => done('failed'), { once: true });
				}
			})
	);
	// After the listeners, so an image that finishes at once is still seen.
	for (const img of images) if (img.loading === 'lazy') img.loading = 'eager';

	let timer;
	const deadline = new Promise((resolve) => {
		timer = setTimeout(resolve, timeoutMs);
	});
	return Promise.race([Promise.all(settled), deadline]).then(() => {
		clearTimeout(timer);
		// currentSrc is empty until an image loads; src is the resolved address.
		const src = (img) => img.currentSrc || img.src || '(no src)';
		return {
			total: images.length,
			loaded: images.filter((img) => outcome.get(img) === 'loaded').length,
			failed: images.filter((img) => outcome.get(img) === 'failed').map(src),
			unfinished: images.filter((img) => !outcome.has(img)).map(src)
		};
	});
}

/** How many image addresses an error message lists before it summarises the rest. */
const LISTED_IMAGES = 20;

/**
 * Throw unless every image of a print loaded. A figure that failed or was still
 * loading would be missing from the PDF without a trace, and every page number
 * after it, the book's table of contents included, would depend on how fast it
 * loaded, so the print stops rather than writing that PDF.
 *
 * @param {{ total: number, loaded: number, failed: string[], unfinished: string[] }} report
 * @param {string} url the printed route
 * @param {number} timeoutMs the wait the report came from
 */
export function assertImagesLoaded(report, url, timeoutMs) {
	const missing = report.failed.length + report.unfinished.length;
	if (missing === 0) return;
	const lines = [
		...report.failed.map((src) => `    failed to load: ${src}`),
		...report.unfinished.map((src) => `    still loading after ${timeoutMs / 1000} s: ${src}`)
	];
	const listed = lines.slice(0, LISTED_IMAGES);
	if (lines.length > listed.length) listed.push(`    … and ${lines.length - listed.length} more`);
	throw new Error(
		`${url}: ${missing} of ${report.total} images did not load (${report.failed.length} failed, ${report.unfinished.length} still loading), so the PDF would miss figures and shift its page numbers: refusing to print it\n${listed.join('\n')}`
	);
}

/**
 * Print `url` to `outFile` as A4, after its fonts and every image have loaded.
 * Throws for an error page (assertPrintable) and for a missing image
 * (assertImagesLoaded). Returns the image report.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {string} outFile
 * @param {{ imageTimeoutMs?: number }} [options]
 */
export async function printToPdf(page, url, outFile, { imageTimeoutMs = IMAGE_SETTLE_TIMEOUT_MS } = {}) {
	assertPrintable(await page.goto(url, { waitUntil: 'load', timeout: 60000 }), url);
	// Give layout/fonts a beat to settle. Pre-rendered MathJax SVG doesn't need
	// time, but custom fonts swap async on first request.
	await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
	await page.evaluate(() => document.fonts?.ready);

	const images = await page.evaluate(settlePageImages, imageTimeoutMs);
	assertImagesLoaded(images, url, imageTimeoutMs);

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
	return images;
}
