import { describe, it, expect } from 'vitest';
import { books, getAllBooks, getBook, retiredBooks, validateAllBookAttributions } from './book';

describe('book attribution data', () => {
	it('every book has valid, internally-consistent attribution', () => {
		expect(validateAllBookAttributions()).toEqual({});
	});

	// Retired, but its entry stays: efni's licence-contract test reads it.
	it('Organic Chemistry is CC BY-NC-SA 4.0', () => {
		const book = retiredBooks.find((b) => b.slug === 'lifraen-efnafraedi');
		expect(book?.attribution.derivativeLicence).toBe('CC-BY-NC-SA-4.0');
	});

	it('validates a retired book too', () => {
		const book = retiredBooks[0];
		const saved = book.attribution;
		book.attribution = { ...saved, sources: [] };
		try {
			expect(validateAllBookAttributions()).toHaveProperty(book.slug);
		} finally {
			book.attribution = saved;
		}
	});

	it('College Physics is CC BY-NC-SA 4.0', () => {
		const book = books.find((b) => b.slug === 'edlisfraedi-2e');
		expect(book?.attribution.derivativeLicence).toBe('CC-BY-NC-SA-4.0');
	});

	it('Chemistry is CC BY 4.0', () => {
		const book = books.find((b) => b.slug === 'efnafraedi-2e');
		expect(book?.attribution.derivativeLicence).toBe('CC-BY-4.0');
	});

	it('the legacy source.license stays consistent with the derivative licence', () => {
		// Backward-compat field used by BookCover and the print PDF — must not drift.
		for (const book of [...books, ...retiredBooks]) {
			const isNcSa = book.attribution.derivativeLicence === 'CC-BY-NC-SA-4.0';
			expect(book.source.license).toBe(isNcSa ? 'CC BY-NC-SA 4.0' : 'CC BY 4.0');
		}
	});
});

// A retired book is off the site (2026-09-23 ruling). Every route's entries()
// iterates `books`, and every route's layout looks the slug up with getBook(),
// so keeping the entry OUT of `books` is what stops the build prerendering it
// and makes a client-side hit on one of its URLs a 404.
describe('retired books', () => {
	it('keeps organic chemistry out of the served books', () => {
		expect(books.map((b) => b.slug)).not.toContain('lifraen-efnafraedi');
	});

	it('does not resolve organic chemistry by slug', () => {
		expect(getBook('lifraen-efnafraedi')).toBeUndefined();
	});

	it('leaves organic chemistry off every book list the UI shows', () => {
		expect(getAllBooks().map((b) => b.slug)).not.toContain('lifraen-efnafraedi');
	});

	it('still serves the three paused books', () => {
		for (const slug of ['edlisfraedi-2e', 'liffraedi-2e', 'orverufraedi']) {
			expect(getBook(slug)?.slug).toBe(slug);
		}
	});
});
