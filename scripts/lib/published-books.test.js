import { describe, it, expect } from 'vitest';
import {
	PUBLISHED_BOOKS,
	RULING_REFERENCE,
	isPublished,
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
	it('names the two books the 2026-08-22 ruling keeps', () => {
		expect([...PUBLISHED_BOOKS].sort()).toEqual(['efnafraedi-2e', 'lifraen-efnafraedi']);
	});

	it('cannot be mutated by a caller', () => {
		expect(() => PUBLISHED_BOOKS.push('liffraedi-2e')).toThrow();
		expect(PUBLISHED_BOOKS).toHaveLength(2);
	});

	it('points at the ruling rather than restating it', () => {
		expect(RULING_REFERENCE).toContain('C109');
		expect(RULING_REFERENCE).toContain('2026-08-22');
	});
});

describe('isPublished', () => {
	it('admits the two permitted books', () => {
		expect(isPublished('efnafraedi-2e')).toBe(true);
		expect(isPublished('lifraen-efnafraedi')).toBe(true);
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

	// 🔴 The exclusion must be slug-keyed. Four of five books are
	// `status: 'preview'` in the registry, INCLUDING the kept organic chemistry —
	// so any rule phrased over status unpublishes a book the ruling keeps.
	it('keeps lifraen-efnafraedi, which is a preview-status book', () => {
		expect(isPublished('lifraen-efnafraedi')).toBe(true);
	});
});

describe('publishableBooks / withheldBooks', () => {
	it('splits the real source tree into two and loses nothing', () => {
		expect(publishableBooks(SOURCE_BOOKS)).toEqual(['efnafraedi-2e', 'lifraen-efnafraedi']);
		expect(withheldBooks(SOURCE_BOOKS)).toEqual([
			'edlisfraedi-2e',
			'liffraedi-2e',
			'orverufraedi'
		]);
		expect(publishableBooks(SOURCE_BOOKS).length + withheldBooks(SOURCE_BOOKS).length).toBe(
			SOURCE_BOOKS.length
		);
	});

	it('preserves input order', () => {
		expect(publishableBooks(['lifraen-efnafraedi', 'efnafraedi-2e'])).toEqual([
			'lifraen-efnafraedi',
			'efnafraedi-2e'
		]);
	});

	it('returns empty for an empty source tree', () => {
		expect(publishableBooks([])).toEqual([]);
		expect(withheldBooks([])).toEqual([]);
	});
});
