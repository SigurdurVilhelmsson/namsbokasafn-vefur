import { describe, it, expect } from 'vitest';
import { books, validateAllBookAttributions } from './book';

describe('book attribution data', () => {
	it('every book has valid, internally-consistent attribution', () => {
		expect(validateAllBookAttributions()).toEqual({});
	});

	it('Organic Chemistry is CC BY-NC-SA 4.0', () => {
		const book = books.find((b) => b.slug === 'lifraen-efnafraedi');
		expect(book?.attribution.derivativeLicence).toBe('CC-BY-NC-SA-4.0');
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
		for (const book of books) {
			const isNcSa = book.attribution.derivativeLicence === 'CC-BY-NC-SA-4.0';
			expect(book.source.license).toBe(isNcSa ? 'CC BY-NC-SA 4.0' : 'CC BY 4.0');
		}
	});
});
