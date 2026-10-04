/**
 * Tests for the page-break algorithm (reader plan P0.4 test plan)
 */

import { describe, it, expect } from 'vitest';
import { paginate, pageIndexForItem, buildUnits, itemIndexForTarget, type PaginateItem } from './paginate';

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

	it('keeps a heading with a block that fits alone but not with it', () => {
		// 7.2 at 1280x720 (QA E4): h2 63 + p 455 overran a 460 budget, and the
		// heading was left alone on a page. It now overruns by its own height.
		const pages = paginate([block(63, { keepWithNext: true }), block(455), block(100)], 460);
		expect(pages).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('keeps a heading with an oversized paragraph', () => {
		const pages = paginate([block(60, { keepWithNext: true }), block(900)], 768);
		expect(pages).toEqual([{ start: 0, end: 2 }]);
	});

	it('keeps a heading with an oversized atomic block', () => {
		const pages = paginate(
			[block(200), block(60, { keepWithNext: true }), block(900, { atomic: true }), block(200)],
			768
		);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 },
			{ start: 3, end: 4 }
		]);
	});

	it('counts headings carried to a new page against its budget', () => {
		// p300 | h60 p200: the next p190 would make 450 on a 400 page
		const pages = paginate(
			[block(300), block(60, { keepWithNext: true }), block(200), block(190)],
			400
		);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 },
			{ start: 3, end: 4 }
		]);
	});

	it('gives the first page its own, smaller budget', () => {
		// Chrome above the content on arrival (learning objectives) leaves less room
		const pages = paginate([block(100), block(100), block(100)], 768, 150);
		expect(pages).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 }
		]);
	});

	it('still puts one block on a first page too small for it', () => {
		const pages = paginate([block(200), block(100)], 768, 50);
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

describe('buildUnits', () => {
	function article(html: string): HTMLElement {
		const el = document.createElement('article');
		el.className = 'cnx-module';
		el.innerHTML = html;
		return el;
	}
	const tags = (els: HTMLElement[]) => els.map((e) => e.tagName.toLowerCase());

	// efni's current markup: the module body sits in <main>, after a <header>
	// holding the title. Treating <main> as one block made page 2 the whole
	// section, taller than the screen (measured on 1.1 Efnafræði í samhengi).
	it('splits the blocks inside <main>, not <main> as one block', () => {
		const units = buildUnits(
			article(
				'<header><h1>T</h1></header><main><p>a</p><p>b</p><figure></figure>' +
					'<section><h2>S1</h2><p>c</p></section><section><h2>S2</h2><p>d</p></section></main>'
			)
		);
		expect(units.map((u) => tags(u.children))).toEqual([
			['header', 'p', 'p', 'figure'],
			['h2', 'p'],
			['h2', 'p']
		]);
	});

	it('makes each sub-section its own unit, with the <section> as wrapper', () => {
		const units = buildUnits(article('<header></header><main><p>a</p><section><p>b</p></section></main>'));
		expect(units.map((u) => u.wrapper?.tagName.toLowerCase() ?? null)).toEqual([null, 'section']);
	});

	// 23 of 251 chemistry pages nest sub-sections (1.4, 3.1, 7.2, the preface…).
	// A nested <section> taken as one block overflowed the page: 783px in a
	// 720px window on the preface's "Breytingar í annarri útgáfu".
	it('pages the blocks of a nested sub-section, not the nested <section> as one block', () => {
		const units = buildUnits(
			article(
				'<header></header><main><section><h2>A</h2><p>a</p>' +
					'<section><h3>A.1</h3><p>b</p><p>c</p></section>' +
					'<section><h3>A.2</h3><p>d</p></section></section></main>'
			)
		);
		expect(units.map((u) => tags(u.children))).toEqual([
			['header'],
			['h2', 'p', 'h3', 'p', 'p', 'h3', 'p']
		]);
	});

	// The June markup had no <main>; the branch was written against it.
	it('still handles a module whose blocks are direct children', () => {
		const units = buildUnits(article('<h1>T</h1><p>a</p><section><p>b</p></section>'));
		expect(units.map((u) => tags(u.children))).toEqual([['h1', 'p'], ['p']]);
	});
});

describe('itemIndexForTarget', () => {
	const root = document.createElement('section');
	root.innerHTML =
		'<h2>A</h2><p id="para">a <span id="inner">x</span></p>' +
		'<section id="nested"><h3>A.1</h3><p>b</p></section>';
	const items = buildUnits(
		Object.assign(document.createElement('article'), { innerHTML: root.outerHTML })
	)[0].children;
	const article = items[0].closest('article') as HTMLElement;
	const byId = (id: string) => article.querySelector<HTMLElement>('#' + id)!;

	it('finds a block that is the target', () => {
		expect(itemIndexForTarget(items, byId('para'))).toBe(1);
	});

	it('finds the block that contains the target', () => {
		expect(itemIndexForTarget(items, byId('inner'))).toBe(1);
	});

	// A link to a nested sub-section's own id: since nested sections are paged
	// block by block, the target CONTAINS the blocks; land on its first one.
	it('finds the first block inside a target that contains blocks', () => {
		expect(itemIndexForTarget(items, byId('nested'))).toBe(2);
	});

	it('returns -1 for a target outside the unit', () => {
		expect(itemIndexForTarget(items, document.createElement('div'))).toBe(-1);
	});
});
