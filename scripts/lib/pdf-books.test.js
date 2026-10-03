import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { assertPrintable, pdfBooks } from './pdf-books.js';

describe('pdfBooks', () => {
	let root;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'vefur-pdf-books-'));
		for (const slug of ['lifraen-efnafraedi', 'efnafraedi-2e', 'liffraedi-2e']) {
			mkdirSync(join(root, slug));
			writeFileSync(join(root, slug, 'toc.json'), '{"chapters":[]}');
		}
		mkdirSync(join(root, 'stjornufraedi')); // no toc.json
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	// A dev machine's static/content keeps a retired book, but the reader no
	// longer builds its /print routes, so printing it yields error pages.
	it('leaves out a retired book that is still in the content directory', () => {
		expect(pdfBooks(root)).not.toContain('lifraen-efnafraedi');
	});

	it('lists every other book with a toc.json, sorted', () => {
		expect(pdfBooks(root)).toEqual(['efnafraedi-2e', 'liffraedi-2e']);
	});

	it('narrows to a named book', () => {
		expect(pdfBooks(root, 'liffraedi-2e')).toEqual(['liffraedi-2e']);
	});

	// Naming it is deliberate, so say why nothing happens rather than report
	// "no books with content".
	it('refuses a named retired book', () => {
		expect(() => pdfBooks(root, 'lifraen-efnafraedi')).toThrow(/retired/);
	});

	it('returns nothing when the content directory is missing', () => {
		expect(pdfBooks(join(root, 'nope'))).toEqual([]);
	});
});

describe('assertPrintable', () => {
	const response = (status) => ({ ok: () => status >= 200 && status < 300, status: () => status });
	const url = 'http://127.0.0.1:5180/print/x/kafli/01/';

	// page.pdf() prints whatever loaded, error page included, and exits 0.
	it('throws on an error status, naming it', () => {
		expect(() => assertPrintable(response(404), url)).toThrow(/404/);
	});

	it('throws when there is no response at all', () => {
		expect(() => assertPrintable(null, url)).toThrow(url);
	});

	it('accepts a successful response', () => {
		expect(() => assertPrintable(response(200), url)).not.toThrow();
	});
});
