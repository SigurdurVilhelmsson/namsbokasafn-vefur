import { describe, it, expect } from 'vitest';
import { books, retiredBooks } from '../../src/lib/types/book.ts';
import { pdfBookInfo } from './pdf-attribution.js';

// What loadBookConfig() returns, from the same module (book-config.test.js
// checks that the esbuild bundle and this import agree).
const config = { books };

describe('pdfBookInfo: the title', () => {
	// The bug: generate-pdfs.js took toc.json's title, and generate-toc.js puts
	// the slug there when efni's toc has none (the live chemistry toc.json says
	// "efnafraedi-2e"), so running headers and the document title read
	// "efnafraedi-2e".
	it("is book.ts's title, not the slug", () => {
		expect(pdfBookInfo(config, 'efnafraedi-2e').title).toBe('Efnafræði');
	});

	it('is every registered book’s own title', () => {
		for (const book of books) expect(pdfBookInfo(config, book.slug).title).toBe(book.title);
	});

	it('throws for a slug book.ts does not know, rather than print the slug', () => {
		expect(() => pdfBookInfo(config, 'stjornufraedi')).toThrow(/no entry in src\/lib\/types\/book\.ts/);
	});

	// A retired book's entry stays in book.ts for efni's licence test, but out
	// of `books`: the reader serves no /print routes for it.
	it('throws for a retired book', () => {
		for (const book of retiredBooks) {
			expect(() => pdfBookInfo(config, book.slug)).toThrow(/no entry/);
		}
	});
});
