/**
 * Tests for the page-break algorithm (reader plan P0.4 test plan; plan step S8.1
 * added the survivor tests, the 0 px rule and the property tests, register
 * CODE-20, KEEP-04, KEEP-06)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	paginate,
	pageIndexForItem,
	buildUnits,
	itemIndexForTarget,
	classifyBlock,
	type PaginateItem,
	type PageRange
} from './paginate';

function block(height: number, opts: Partial<PaginateItem> = {}): PaginateItem {
	return { height, keepWithNext: false, ...opts };
}
const heading = (height: number) => block(height, { keepWithNext: true });

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

	it('moves a block that would overflow onto the next page whole', () => {
		// Two paragraphs fill most of the page; the third must not share
		// the overflow — it starts the next page intact
		const pages = paginate([block(300), block(300), block(300)], 768);
		expect(pages).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('gives a block taller than the page a page of its own', () => {
		const pages = paginate([block(200), block(900), block(200)], 768);
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

	it('keeps a heading with an oversized block after other content', () => {
		const pages = paginate([block(200), heading(60), block(900), block(200)], 768);
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

	it('handles an empty item list', () => {
		expect(paginate([], 768)).toEqual([]);
	});

	// The budget is inclusive: a page may fill it exactly (health mutant [4], <= to <)
	it('puts blocks that sum exactly to the budget on one page', () => {
		expect(paginate([block(300), block(300), block(168)], 768)).toEqual([{ start: 0, end: 3 }]);
		expect(paginate([block(300), block(300), block(169)], 768)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	// The first-item rule (health mutant [17]): a heading taller than the page
	// opens it and keeps the block after it, instead of a page of its own
	it('keeps a heading taller than the page with the block after it', () => {
		expect(paginate([heading(900), block(100), block(100)], 768)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	// Headings that ended the previous page (a heading-only overrun) stay there:
	// the run carried to a new page starts no earlier than that page
	it('never carries headings back past the top of the page', () => {
		expect(paginate([heading(500), heading(500), heading(100), block(700)], 768)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 4 }
		]);
	});

	// A block of 0 px never makes a page that shows nothing. v1.1's atomic flag
	// gave the empty block before an oversized figure a page of its own.
	it('keeps a 0 px block with the oversized block after it', () => {
		expect(paginate([block(0), block(900), block(100)], 768)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('carries a 0 px block that opens a page along with the headings after it', () => {
		// Without the rule: [0 px] alone, then [h2 p]
		expect(paginate([block(0), heading(200), block(200)], 300)).toEqual([{ start: 0, end: 3 }]);
	});

	it('joins 0 px blocks left at the end to the last page', () => {
		// The heading-only overrun ends a page after 'p100'; the 0 px block joins it
		expect(paginate([heading(400), block(100), block(0)], 300)).toEqual([{ start: 0, end: 3 }]);
	});

	it('gives a list of 0 px blocks one page', () => {
		expect(paginate([block(0), block(0)], 300)).toEqual([{ start: 0, end: 2 }]);
	});

	// A 0 px block shares the page of the next sized block, so a break before
	// that block takes it along (v1.1 left it on the page before)
	it('moves a 0 px block to the page of the block after it', () => {
		expect(paginate([block(300), block(0), block(500)], 768)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 }
		]);
		expect(paginate([block(500), block(0), heading(100), block(300)], 768)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 4 }
		]);
	});

	// Negative margins can make a measured height negative: it counts as 0 px.
	// Without that, [p300 -10 h900 p100] parted the heading from p100.
	it('counts a negative height as 0 px', () => {
		expect(paginate([block(300), block(-10), heading(900), block(100)], 768)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 4 }
		]);
		expect(paginate([block(100), block(-100), block(900)], 768)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 }
		]);
	});

	// KEEP-03: the break logic stays pure, so it never reaches for the DOM or a store
	it('imports nothing', () => {
		const IMPORT = /^\s*import\b|\brequire\(|\bimport\(/m;
		// Control: the pattern finds an import when there is one
		expect(IMPORT.test("import { x } from './y';")).toBe(true);
		// A string, not new URL(): jsdom's URL is not the one node:url accepts
		const here = dirname(fileURLToPath(import.meta.url));
		const source = readFileSync(join(here, 'paginate.ts'), 'utf8');
		expect(source.match(IMPORT)).toBeNull();
	});
});

describe('classifyBlock', () => {
	const el = (html: string) => {
		const host = document.createElement('div');
		host.innerHTML = html;
		return host.firstElementChild as Element;
	};

	it('keeps h2, h3 and h4 with the block after them', () => {
		for (const tag of ['h2', 'h3', 'h4']) {
			expect(classifyBlock(el(`<${tag}>T</${tag}>`)), tag).toEqual({ keepWithNext: true });
		}
	});

	it('treats every other block as a plain block', () => {
		const others = [
			'<h1>T</h1>',
			'<h5>T</h5>',
			'<p>a</p>',
			'<figure></figure>',
			'<table></table>',
			'<div class="example"></div>',
			'<div class="note"></div>',
			'<section><h2>T</h2></section>',
			'<ul><li>a</li></ul>'
		];
		for (const html of others) {
			expect(classifyBlock(el(html)), html).toEqual({ keepWithNext: false });
		}
	});
});

/** Small seeded PRNG (mulberry32), so a failing case can be replayed */
function prng(seed: number) {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * The rules paginate() promises, as one check: null when they hold, else what
 * broke. Sized blocks are those taller than 0 px; a negative height counts as
 * 0 px, as the docstring says.
 */
function brokenRule(input: PaginateItem[], budget: number, pages: PageRange[]): string | null {
	const items = input.map((it) => ({ ...it, height: Math.max(0, it.height) }));
	// The pages partition [0, n) in order, none empty
	let next = 0;
	for (const page of pages) {
		if (page.start !== next || page.end <= page.start) return `not a partition at ${JSON.stringify(page)}`;
		next = page.end;
	}
	if (next !== items.length) return `covers ${next} of ${items.length} items`;

	// A 0 px block shares the page of the next sized block; after the last
	// sized block, it is on the last page
	const pageOf = (i: number) => pages.findIndex((page) => i >= page.start && i < page.end);
	for (let i = 0; i < items.length; i++) {
		if (items[i].height > 0) continue;
		let k = i + 1;
		while (k < items.length && items[k].height === 0) k++;
		const expected = k < items.length ? pageOf(k) : pages.length - 1;
		if (pageOf(i) !== expected) return `the 0 px block ${i} is on page ${pageOf(i)}, not ${expected}`;
	}

	const sum = (from: number, to: number) => items.slice(from, to).reduce((s, it) => s + it.height, 0);
	for (let p = 0; p < pages.length; p++) {
		const { start, end } = pages[p];
		const sized = items.slice(start, end).filter((it) => it.height > 0);
		const last = p === pages.length - 1;

		// No page shows nothing, unless it is the only one
		if (sized.length === 0 && pages.length > 1) return `page ${p} holds only 0 px blocks`;

		// Over budget only when every sized block but the last is a heading
		if (sum(start, end) > budget && !sized.slice(0, -1).every((it) => it.keepWithNext)) {
			return `page ${p} overruns with a block before its last that is not a heading`;
		}

		// A page's last sized block is a heading only on the last page, or when
		// two or more headings overran the page together: a heading is never
		// left alone at the end of a page
		if (
			!last &&
			sized.at(-1)?.keepWithNext &&
			(sized.length < 2 || !sized.every((it) => it.keepWithNext) || sum(start, end) <= budget)
		) {
			return `page ${p} ends with a heading`;
		}

		// Maximal: the page ends only where its next sized non-heading block,
		// with the headings carried before it, would not have fitted
		if (!last) {
			let k = end;
			while (k < items.length - 1 && (items[k].keepWithNext || items[k].height <= 0)) k++;
			if (sum(start, k + 1) <= budget) return `page ${p} could have held up to item ${k}`;
		}
	}
	return null;
}

describe('paginate properties (seeded, 10,000 lists each)', () => {
	// Heights from 1 to 2,000 px; half the lists use 50 px steps, so blocks
	// often fill a page exactly and the budget boundary is exercised. Of the
	// `zeroShare` blocks, half are 0 px and half negative (-1 to -200 px).
	function randomList(rand: () => number, zeroShare: number) {
		const coarse = rand() < 0.5;
		const length = Math.floor(rand() * 30);
		const budget = coarse ? 50 * (5 + Math.floor(rand() * 26)) : 240 + Math.floor(rand() * 1300);
		const items = Array.from({ length }, () =>
			block(
				rand() < zeroShare
					? rand() < 0.5
						? 0
						: -1 - Math.floor(rand() * 200)
					: coarse
						? 50 * (1 + Math.floor(rand() * 40))
						: 1 + Math.floor(rand() * 2000),
				{ keepWithNext: rand() < 0.25 }
			)
		);
		return { items, budget };
	}

	function check(seed: number, zeroShare: number) {
		const rand = prng(seed);
		for (let n = 0; n < 10_000; n++) {
			const { items, budget } = randomList(rand, zeroShare);
			const broken = brokenRule(items, budget, paginate(items, budget));
			if (broken) {
				const heights = items.map((it) => (it.keepWithNext ? `h${it.height}` : it.height));
				expect.fail(`list ${n} (seed ${seed}), budget ${budget}, [${heights.join(', ')}]: ${broken}`);
			}
		}
	}

	it('keeps every rule for blocks of 1 to 2,000 px', () => {
		check(20261103, 0);
	});

	it('keeps every rule when a fifth of the blocks are 0 px or negative', () => {
		check(31102026, 0.2);
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

	// Blocks between or after sub-sections are units of their own, like the intro
	it('makes blocks between and after sub-sections units of their own', () => {
		const units = buildUnits(
			article(
				'<header></header><main><section><p>a</p></section><p>b</p>' +
					'<section><p>c</p></section><p>d</p><p>e</p></main>'
			)
		);
		expect(units.map((u) => [u.wrapper?.tagName.toLowerCase() ?? null, tags(u.children)])).toEqual([
			[null, ['header']],
			['section', ['p']],
			[null, ['p']],
			['section', ['p']],
			[null, ['p', 'p']]
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
