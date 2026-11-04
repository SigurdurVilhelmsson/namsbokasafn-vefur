/**
 * A source-text guard on scripts/generate-pdfs.js, which a test cannot import: it
 * starts a dev server and a browser when loaded. The helpers it calls have tests of
 * their own (lib/pdf-attribution.test.js, lib/pdf-links.test.js,
 * e2e/pdf-print.spec.ts); this one fails when the script stops calling them, which
 * otherwise shows only in a PDF run nobody reads closely. Each check names the bug
 * it would let back in.
 *
 * Read like focusRing.test.ts reads CSS: the script's text, with comments removed so
 * prose about `toc.json`'s title cannot trip a check or satisfy one.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT = join(process.cwd(), 'scripts', 'generate-pdfs.js');

/**
 * Remove `//` and block comments, keeping strings and template literals whole (a
 * URL's `//` inside a template is code). The script has no regex literals, which
 * this does not read.
 */
function stripComments(src) {
	let out = '';
	let i = 0;
	while (i < src.length) {
		const ch = src[i];
		const next = src[i + 1];
		if (ch === '/' && next === '/') {
			while (i < src.length && src[i] !== '\n') i++;
		} else if (ch === '/' && next === '*') {
			const end = src.indexOf('*/', i + 2);
			i = end === -1 ? src.length : end + 2;
		} else if (ch === '"' || ch === "'" || ch === '`') {
			let j = i + 1;
			while (j < src.length && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
			out += src.slice(i, j + 1);
			i = j + 1;
		} else {
			out += ch;
			i++;
		}
	}
	return out;
}

/**
 * The top-level arguments of every call to `name` (not its declaration), each with
 * its whitespace collapsed.
 */
function callArgs(code, name) {
	const calls = [];
	const re = new RegExp(`(?<![\\w.])${name}\\s*\\(`, 'g');
	for (const m of code.matchAll(re)) {
		if (/function\s+$/.test(code.slice(Math.max(0, m.index - 20), m.index))) continue;
		const args = [];
		let depth = 0;
		let start = m.index + m[0].length;
		for (let i = start; i < code.length; i++) {
			const ch = code[i];
			if (ch === '"' || ch === "'" || ch === '`') {
				let j = i + 1;
				while (j < code.length && code[j] !== ch) j += code[j] === '\\' ? 2 : 1;
				i = j;
			} else if ('([{'.includes(ch)) depth++;
			else if (')]}'.includes(ch)) {
				if (depth === 0) {
					args.push(code.slice(start, i));
					break;
				}
				depth--;
			} else if (ch === ',' && depth === 0) {
				args.push(code.slice(start, i));
				start = i + 1;
			}
		}
		calls.push(args.map((a) => a.replace(/\s+/g, ' ').trim()).filter((a) => a !== ''));
	}
	return calls;
}

const code = stripComments(readFileSync(SCRIPT, 'utf8'));

describe('scripts/generate-pdfs.js (source text)', () => {
	it('reads the title from book.ts through pdfBookInfo, never from toc.json', () => {
		// The bug of 59f4528: toc.json's title is the slug when efni's toc has none, so
		// every running header and document title read "efnafraedi-2e".
		expect(code).toMatch(/\bconst\s+bookInfo\s*=\s*pdfBookInfo\s*\(\s*bookConfig\s*,\s*bookSlug\s*\)/);
		expect(code).toMatch(/\bconst\s+bookTitle\s*=\s*bookInfo\.title\s*;/);
		expect(code).not.toMatch(/\btoc\s*(?:\?\.|\.)\s*title\b/);
		expect(code).not.toMatch(/\btoc\s*(?:\?\.)?\[\s*['"`]title['"`]\s*\]/);
		expect(code).not.toMatch(/\{[^{}]*\btitle\b[^{}]*\}\s*=\s*toc\b/);
		expect(code).not.toMatch(/loadToc\s*\([^)]*\)\s*(?:\?\.|\.)\s*title\b/);
	});

	it('writes the document information on the book and on every chapter PDF', () => {
		const calls = callArgs(code, 'applyDocumentInfo');
		expect(calls).toContainEqual(['merged', 'bookInfo']);
		expect(calls.some(([doc, info]) => doc === 'standalone' && /^chapterDocInfo\(bookInfo,/.test(info))).toBe(true);
	});

	it('stamps the footer licence line on the book and on every chapter PDF', () => {
		const calls = callArgs(code, 'stampPages');
		expect(calls.map((args) => args[0]).sort()).toEqual(['merged', 'standalone']);
		for (const args of calls) {
			expect(args).toHaveLength(3);
			expect(args[2]).toBe('bookInfo.licenceLine');
		}
	});

	it("renames each part's links with its namespaced anchors", () => {
		// Without it, the merged book's footnote back links point at names it no
		// longer has (36 of 36 in the 2026-11-04 run).
		expect(callArgs(code, 'mergeChapterDests')).toEqual([
			['registry', 'dests', 'mergedOffset', 'chapterNum', 'collidingNames']
		]);
		expect(callArgs(code, 'namespaceChapterLinks')).toEqual([
			['merged', 'pages', 'dests', 'chapterNum', 'collidingNames']
		]);
	});

	it('prints only through pdf-print.js, which waits for every image', () => {
		// A print that did not wait for the lazy-loaded figures dropped some of them
		// and moved every page number after them (chapter 10: 112, 108, 105 pages).
		expect(code).toMatch(/import\s*\{\s*printToPdf\s*\}\s*from\s*'\.\/lib\/pdf-print\.js'/);
		expect(code).not.toMatch(/function\s+printToPdf\b/);
		// page.pdf({ … }); the log line's "bok.pdf (" is not a call.
		expect(code).not.toMatch(/\.pdf\s*\(\s*\{/);
		expect(callArgs(code, 'printToPdf').length).toBeGreaterThan(0);
	});

	it('prints each route on a fresh page, with no service worker', () => {
		// One page reused for all 25 prints held the earlier chapters' figures: the
		// browser reached 6.2 GB, and two of three whole-book runs stopped with
		// Chromium's "Printing failed".
		expect(code).toMatch(/\bserviceWorkers\s*:\s*'block'/);
		expect(code).toMatch(/withPrintPage\s*\(\s*context\s*,\s*\(page\)\s*=>\s*printToPdf\s*\(/);
		expect(code).toMatch(/await\s+page\.close\s*\(\s*\)/);
	});
});
