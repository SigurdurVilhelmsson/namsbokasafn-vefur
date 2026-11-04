/**
 * scripts/generate-pdfs.js prints each /print route with printToPdf
 * (scripts/lib/pdf-print.js), which waits for every image before page.pdf(). efni
 * marks every <img> loading="lazy", so a figure below the first screen is not even
 * requested when the page's load and networkidle fire, and page.pdf() did not wait
 * for the loads it starts: chapter 10 printed 112, 108 and 105 pages on three runs
 * of one commit, with figures missing (PDF plan, Task 4.3's note).
 *
 * These print a small page served through page.route(), so they need no dev server
 * and no synced content: a lazy figure far below the first screen whose response
 * is held back, as a large figure's is.
 */

import { existsSync, readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { printToPdf } from '../scripts/lib/pdf-print.js';

const ORIGIN = 'http://pdf-print.test';

// A 2×2 red PNG.
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGM4oaEBRAwQCgAhLgRhHuBtwgAAAABJRU5ErkJggg==',
	'base64'
);

/**
 * Serve a page whose figures sit below 6,000 px of text, each answered after its
 * own delay (null: answer 404).
 */
async function serveFigures(page: Page, figures: Record<string, number | null>) {
	const imgs = Object.keys(figures)
		.map((name) => `<img src="/${name}" alt="" width="400" height="300" loading="lazy">`)
		.join('\n');
	await page.route(`${ORIGIN}/**`, async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path === '/') {
			return route.fulfill({
				contentType: 'text/html',
				body: `<!doctype html><html><body><div style="height: 6000px">Texti</div>${imgs}</body></html>`
			});
		}
		const delay = figures[path.slice(1)];
		if (delay === null || delay === undefined) return route.fulfill({ status: 404, body: '' });
		await new Promise((resolve) => setTimeout(resolve, delay));
		return route.fulfill({ contentType: 'image/png', body: PNG }).catch(() => {});
	});
}

/** How many raster images a PDF's pages draw. */
async function imageCount(file: string): Promise<number> {
	const doc = await PDFDocument.load(readFileSync(file), { updateMetadata: false });
	let count = 0;
	for (const page of doc.getPages()) {
		const resources = page.node.Resources();
		const xobjects = resources && doc.context.lookup(resources.get(PDFName.of('XObject')));
		if (!(xobjects instanceof PDFDict)) continue;
		for (const [, ref] of xobjects.entries()) {
			const xobject = doc.context.lookup(ref);
			if (!(xobject instanceof PDFRawStream)) continue;
			if (xobject.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') count++;
		}
	}
	return count;
}

test.describe('printToPdf waits for every image', () => {
	test('a lazy figure whose response is slow is in the PDF', async ({ page }) => {
		await serveFigures(page, { 'a.png': 1500, 'b.png': 2500 });
		const out = test.info().outputPath('slow.pdf');
		const report = await printToPdf(page, `${ORIGIN}/`, out);
		expect(await imageCount(out)).toBe(2);
		expect(report).toEqual({ total: 2, loaded: 2, failed: [], unfinished: [] });
	});

	test('an image that fails stops the print, naming it', async ({ page }) => {
		await serveFigures(page, { 'a.png': 0, 'missing.png': null });
		const out = test.info().outputPath('failed.pdf');
		await expect(printToPdf(page, `${ORIGIN}/`, out)).rejects.toThrow(
			/1 of 2 images did not load \(1 failed, 0 still loading\)[\s\S]*failed to load: http:\/\/pdf-print\.test\/missing\.png/
		);
		expect(existsSync(out)).toBe(false);
	});

	test('an image still loading at the bound stops the print, naming it', async ({ page }) => {
		await serveFigures(page, { 'a.png': 0, 'stuck.png': 5000 });
		const out = test.info().outputPath('stuck.pdf');
		await expect(printToPdf(page, `${ORIGIN}/`, out, { imageTimeoutMs: 1000 })).rejects.toThrow(
			/1 of 2 images did not load \(0 failed, 1 still loading\)[\s\S]*still loading after 1 s: http:\/\/pdf-print\.test\/stuck\.png/
		);
		expect(existsSync(out)).toBe(false);
	});
});
