/**
 * Tests for the page-break algorithm (reader plan P0.4 test plan)
 */

import { describe, it, expect } from 'vitest';
import { paginate, pageIndexForItem, type PaginateItem } from './paginate';

function block(height: number, opts: Partial<PaginateItem> = {}): PaginateItem {
	return { height, atomic: false, keepWithNext: false, ...opts };
}

describe('paginate', () => {
	it('puts a short sub-section on a single page', () => {
		const pages = paginate([block(100), block(120), block(80)], 768);
		expect(pages).toEqual([{ start: 0, end: 3 }]);
	});

	it('splits equal-height paragraphs when the viewport fits two', () => {
		// 5 paragraphs of 300px, viewport fits 2 (768px) → 3 pages
		const pages = paginate(Array.from({ length: 5 }, () => block(300)), 768);
		expect(pages).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 4 },
			{ start: 4, end: 5 }
		]);
	});

	it('moves an atomic block that would overflow onto the next page', () => {
		// Two paragraphs fill most of the page; the figure must not share
		// the overflow — it starts the next page intact
		const pages = paginate([block(300), block(300), block(300, { atomic: true })], 768);
		expect(pages).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('gives an atomic block taller than the viewport its own page', () => {
		const pages = paginate([block(200), block(900, { atomic: true }), block(200)], 768);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('promotes a heading at a page end to the next page (keep-with-next)', () => {
		// p(400), h3(60), p(400): heading fits on page 1 but its paragraph
		// does not — the heading moves to page 2 with its content
		const pages = paginate([block(400), block(60, { keepWithNext: true }), block(400)], 768);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 }
		]);
	});

	it('accepts a stranded heading rather than emit an empty page', () => {
		// A lone heading followed by an oversized paragraph: heading cannot
		// be pulled forward without emptying its page
		const pages = paginate([block(60, { keepWithNext: true }), block(900)], 768);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 2 }
		]);
	});

	it('handles an empty item list', () => {
		expect(paginate([], 768)).toEqual([]);
	});
});

describe('pageIndexForItem', () => {
	it('locates the page containing an item index', () => {
		const pages = [
			{ start: 0, end: 2 },
			{ start: 2, end: 4 },
			{ start: 4, end: 5 }
		];
		expect(pageIndexForItem(pages, 0)).toBe(0);
		expect(pageIndexForItem(pages, 3)).toBe(1);
		expect(pageIndexForItem(pages, 4)).toBe(2);
		// Out of range clamps to the last page
		expect(pageIndexForItem(pages, 99)).toBe(2);
	});
});
