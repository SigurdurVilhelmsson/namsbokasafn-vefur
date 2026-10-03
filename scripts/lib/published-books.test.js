import { describe, it, expect } from 'vitest';
import { books, retiredBooks } from '../../src/lib/types/book.ts';
import {
	KNOWN_BOOKS,
	PUBLISHED_BOOKS,
	RETIRED_BOOKS,
	RETIREMENT_REFERENCE,
	RULING_REFERENCE,
	isPublished,
	isRetired,
	publishableBooks,
	withheldBooks
} from './published-books.js';

// The five books that exist in namsbokasafn-efni's publication tree today.
// `stjornufraedi` is deliberately absent: it has no rendered chapters yet, so
// the sync never offers it. Used as the realistic input in the tests below.
const SOURCE_BOOKS = [
	'edlisfraedi-2e',
	'efnafraedi-2e',
	'liffraedi-2e',
	'lifraen-efnafraedi',
	'orverufraedi'
];

describe('PUBLISHED_BOOKS', () => {
	// The 2026-08-22 ruling kept chemistry and organic; the 2026-09-23 ruling
	// withdrew organic.
	it('names chemistry alone', () => {
		expect([...PUBLISHED_BOOKS]).toEqual(['efnafraedi-2e']);
	});

	it('cannot be mutated by a caller', () => {
		expect(() => PUBLISHED_BOOKS.push('liffraedi-2e')).toThrow();
		expect(PUBLISHED_BOOKS).toHaveLength(1);
	});

	it('points at the ruling rather than restating it', () => {
		expect(RULING_REFERENCE).toContain('C109');
		expect(RULING_REFERENCE).toContain('2026-08-22');
	});
});

// The deploy's freeze protects every known book the allowlist holds back, even
// when the efni checkout it reads lacks one (an older pinned commit, a book with
// no rendered chapters). A book the reader registers but this list misses would
// lose that protection and be deleted from the server by the next deploy.
describe('KNOWN_BOOKS', () => {
	it('names every book book.ts registers, served or retired', () => {
		expect([...KNOWN_BOOKS].sort()).toEqual(
			[...books, ...retiredBooks].map((b) => b.slug).sort()
		);
	});
});

// A retired book is taken OFF the site: the deploy deletes its server copy
// rather than freezing it, and the reader stops serving it. The three books
// held back on 2026-08-22 are a pause, and must stay frozen.
describe('RETIRED_BOOKS', () => {
	it('names organic chemistry alone', () => {
		expect([...RETIRED_BOOKS]).toEqual(['lifraen-efnafraedi']);
	});

	it('cannot be mutated by a caller', () => {
		expect(() => RETIRED_BOOKS.push('liffraedi-2e')).toThrow();
	});

	// The reader takes its served list from book.ts, which keeps a retired
	// book's entry out of `books` (efni's licence test still reads it there).
	it('matches the books book.ts keeps out of the reader', () => {
		expect(retiredBooks.map((b) => b.slug)).toEqual([...RETIRED_BOOKS]);
	});

	it('is never published at the same time', () => {
		for (const slug of RETIRED_BOOKS) expect(PUBLISHED_BOOKS).not.toContain(slug);
	});

	it('is a subset of the registered books, so the deploy knows its directories', () => {
		for (const slug of RETIRED_BOOKS) expect(KNOWN_BOOKS).toContain(slug);
	});

	it('points at the ruling rather than restating it', () => {
		expect(RETIREMENT_REFERENCE).toContain('2026-09-23');
	});
});

describe('isRetired', () => {
	it('retires organic chemistry', () => {
		expect(isRetired('lifraen-efnafraedi')).toBe(true);
	});

	// 🔴 Slug-keyed for the same reason as the allowlist: the three books paused
	// on 2026-08-22 share organic's `status: 'preview'`, and the ruling keeps
	// them frozen. A status-keyed rule would delete their live pages.
	it('does not retire the three paused books, which share its preview status', () => {
		expect(isRetired('edlisfraedi-2e')).toBe(false);
		expect(isRetired('liffraedi-2e')).toBe(false);
		expect(isRetired('orverufraedi')).toBe(false);
	});

	it('does not retire chemistry or a book it has never heard of', () => {
		expect(isRetired('efnafraedi-2e')).toBe(false);
		expect(isRetired('stjornufraedi')).toBe(false);
	});
});

describe('isPublished', () => {
	it('admits chemistry', () => {
		expect(isPublished('efnafraedi-2e')).toBe(true);
	});

	it('holds back the retired organic chemistry', () => {
		expect(isPublished('lifraen-efnafraedi')).toBe(false);
	});

	it('holds back all three withdrawn books', () => {
		expect(isPublished('edlisfraedi-2e')).toBe(false);
		expect(isPublished('liffraedi-2e')).toBe(false);
		expect(isPublished('orverufraedi')).toBe(false);
	});

	// The failure this guards is publishing something unreviewed, so an
	// unrecognised slug must fall on the safe side. efni gains books faster than
	// vefur hears about it.
	it('withholds a book it has never heard of', () => {
		expect(isPublished('stjornufraedi')).toBe(false);
		expect(isPublished('')).toBe(false);
	});

});

describe('publishableBooks / withheldBooks', () => {
	it('splits the real source tree into two and loses nothing', () => {
		expect(publishableBooks(SOURCE_BOOKS)).toEqual(['efnafraedi-2e']);
		expect(withheldBooks(SOURCE_BOOKS)).toEqual([
			'edlisfraedi-2e',
			'liffraedi-2e',
			'lifraen-efnafraedi',
			'orverufraedi'
		]);
		expect(publishableBooks(SOURCE_BOOKS).length + withheldBooks(SOURCE_BOOKS).length).toBe(
			SOURCE_BOOKS.length
		);
	});

	it('preserves input order', () => {
		expect(withheldBooks(['orverufraedi', 'efnafraedi-2e', 'liffraedi-2e'])).toEqual([
			'orverufraedi',
			'liffraedi-2e'
		]);
	});

	it('returns empty for an empty source tree', () => {
		expect(publishableBooks([])).toEqual([]);
		expect(withheldBooks([])).toEqual([]);
	});
});
