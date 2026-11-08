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
	unitHeading,
	itemIndexForTarget,
	classifyBlock,
	MODULE_BODY_SELECTOR,
	exampleCut,
	splitPieces,
	shownParts,
	pieceOf,
	type PaginateItem,
	type PageRange,
	type Piece
} from './paginate';

function block(height: number, opts: Partial<PaginateItem> = {}): PaginateItem {
	return { height, keepWithNext: false, ...opts };
}
const heading = (height: number) => block(height, { keepWithNext: true });

describe('paginate', () => {
	// S9.4 (UI-09): the section's first page also holds the machine-translation notice, so it
	// can be given less room than the rest
	it('fills the first page to its own height, and the rest to the page height', () => {
		expect(paginate([block(200), block(300), block(300)], 650, 400)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 3 }
		]);
	});

	it('gives the first page the page height when no first height is given', () => {
		expect(paginate([block(200), block(300), block(300)], 650)).toEqual([
			{ start: 0, end: 2 },
			{ start: 2, end: 3 }
		]);
	});

	it('still puts the first block on a first page smaller than it', () => {
		expect(paginate([block(300), block(100)], 650, 200)).toEqual([
			{ start: 0, end: 1 },
			{ start: 1, end: 2 }
		]);
	});

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
			['p', 'p', 'figure'],
			['h2', 'p'],
			['h2', 'p']
		]);
	});

	// D12 (2026-11-08): the section title stays on every page, so the article's own
	// <header> is no block of any page and the pager never hides it (UI-19, UI-05)
	it('keeps the module header out of every unit, so its h1 is never paged', () => {
		const root = article('<header><h1>T</h1></header><main><p>a</p><section><h2>S</h2><p>b</p></section></main>');
		const header = root.querySelector('header')!;
		const units = buildUnits(root);
		expect(units.flatMap((u) => u.children).filter((el) => el === header || el.contains(header))).toEqual([]);
	});

	// 14.3, 14.4 and 16.3 on efni's ② preview open their body with a sub-section, so the
	// intro held the header alone: a page with nothing but the title (UI-19)
	it('starts with the first sub-section when the body opens with one', () => {
		const units = buildUnits(article('<header><h1>T</h1></header><main><section><h2>S</h2><p>a</p></section></main>'));
		expect(units.map((u) => [u.wrapper?.tagName.toLowerCase() ?? null, tags(u.children)])).toEqual([
			['section', ['h2', 'p']]
		]);
	});

	// Only the article's own <header> is the running title; one inside the body is content
	it('pages a <header> inside the body as a block', () => {
		const units = buildUnits(article('<header><h1>T</h1></header><main><header><p>h</p></header><p>a</p></main>'));
		expect(units.map((u) => tags(u.children))).toEqual([['header', 'p']]);
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
		expect(units.map((u) => tags(u.children))).toEqual([['h2', 'p', 'h3', 'p', 'p', 'h3', 'p']]);
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

	// efni plans a non-landmark wrapper for the module body instead of a second <main>
	// (register UI-30, efni handoff H5; efni names it, `cnx-body` is the proposal). Both
	// forms page alike (H7). The fixture has every shape buildUnits handles: intro blocks,
	// a nested sub-section, a block between sub-sections, and efni's footnotes after the body.
	describe('with either module-body wrapper (S8.3)', () => {
		const body =
			'<p>a</p><figure>f</figure>' +
			'<section><h2>S1</h2><p>b</p><section><h3>S1.1</h3><p>c</p></section></section>' +
			'<p>d</p><section><h2>S2</h2><p>e</p></section>';
		const footnotes = '<section class="footnotes"><h2>N</h2><ol><li>n</li></ol></section>';
		const module = (open: string, close: string) =>
			article(`<header><h1>T</h1></header>${open}${body}${close}${footnotes}`);
		const shape = (root: HTMLElement) =>
			buildUnits(root).map((u) => ({
				wrapper: u.wrapper?.tagName.toLowerCase() ?? null,
				blocks: u.children.map((el) => `${tags([el])[0]}:${el.textContent}`)
			}));
		const withMain = shape(module('<main>', '</main>'));

		it('pages a <main> body block by block (the control)', () => {
			expect(withMain).toEqual([
				{ wrapper: null, blocks: ['p:a', 'figure:f'] },
				{ wrapper: 'section', blocks: ['h2:S1', 'p:b', 'h3:S1.1', 'p:c'] },
				{ wrapper: null, blocks: ['p:d'] },
				{ wrapper: 'section', blocks: ['h2:S2', 'p:e'] },
				{ wrapper: 'section', blocks: ['h2:N', 'ol:n'] }
			]);
		});

		it('gives a div.cnx-body body the same units as a <main> body', () => {
			expect(shape(module('<div class="cnx-body">', '</div>'))).toEqual(withMain);
		});

		// The selector names a class, not an element, so efni may pick the element
		it('looks through the wrapper whatever its element', () => {
			expect(shape(module('<section class="cnx-body">', '</section>'))).toEqual(withMain);
		});

		it('never takes the wrapper itself for a block or a unit', () => {
			for (const root of [module('<main>', '</main>'), module('<div class="cnx-body">', '</div>')]) {
				const wrapper = root.children[1];
				for (const unit of buildUnits(root)) {
					expect(unit.wrapper).not.toBe(wrapper);
					expect(unit.children).not.toContain(wrapper);
				}
			}
		});

		// Only the wrapper: any other top-level <div> stays one block, as the June
		// markup's learning-objectives <div> did
		it('keeps any other top-level <div> as one block', () => {
			expect(shape(article('<div class="learning-objectives"><p>x</p></div><p>a</p>'))).toEqual([
				{ wrapper: null, blocks: ['div:x', 'p:a'] }
			]);
		});

		it('names both forms in one exported selector', () => {
			const first = (html: string) => article(html).firstElementChild!;
			expect(first('<main></main>').matches(MODULE_BODY_SELECTOR)).toBe(true);
			expect(first('<div class="cnx-body"></div>').matches(MODULE_BODY_SELECTOR)).toBe(true);
			for (const other of ['<div></div>', '<section></section>', '<header></header>'])
				expect(first(other).matches(MODULE_BODY_SELECTOR)).toBe(false);
		});
	});

	// A guardrail (register KEEP-08): a worked example pages as one block, so no page
	// break falls between its problem and its 'Lausn', and a display equation is never
	// split. The fixture is chemistry 1.4's Dæmi 1.1 as published (text shortened),
	// once in the body and once inside a sub-section.
	it('keeps a worked example and a display equation each one block', () => {
		const example =
			'<aside id="Example_01_04_01" class="example" data-example-number="1.1">' +
			'<p class="example-label">Dæmi 1.1</p><h4>Útreikningur eðlismassa</h4><p>Gefið…</p>' +
			'<p class="para-title"><strong>Lausn</strong></p><p>Rúmmálið…</p>' +
			'<div class="equation unnumbered"><span class="mathjax-display">…</span></div></aside>';
		const equation = '<div class="equation unnumbered"><span class="mathjax-display">…</span></div>';
		const units = buildUnits(
			article(
				`<header><h1>T</h1></header><main><p>a</p>${example}` +
					`<section><h2>S</h2>${example}${equation}<p>b</p></section></main>`
			)
		);
		expect(units.map((u) => tags(u.children))).toEqual([
			['p', 'aside'],
			['h2', 'aside', 'div', 'p']
		]);
		const solution = units[0].children[1].querySelector('.para-title');
		expect(units.flatMap((u) => u.children)).not.toContain(solution);
	});
});

// What the spoken position names (S9.2, UI-05): the sub-section's own heading
describe('unitHeading', () => {
	const section = (html: string) => {
		const el = document.createElement('section');
		el.innerHTML = html;
		return el;
	};

	it("gives the sub-section's heading, its spaces collapsed", () => {
		expect(unitHeading(section('<h2>  Flokkun\n   efnis </h2><p>a</p>'))).toBe('Flokkun efnis');
	});

	it('takes the first heading among its children, not a nested sub-section\'s', () => {
		expect(unitHeading(section('<p>a</p><h3>Eigin</h3><section><h4>Undir</h4></section>'))).toBe('Eigin');
		expect(unitHeading(section('<p>a</p><section><h3>Undir</h3></section>'))).toBeNull();
	});

	it('gives null for an intro (no wrapper) and an empty heading', () => {
		expect(unitHeading(null)).toBeNull();
		expect(unitHeading(section('<h2> </h2>'))).toBeNull();
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

// D11's trial (2026-11-08): a worked example taller than a page breaks once, before its
// check-your-learning part. The cut is structural: that part's heading has eight wordings.
describe('exampleCut', () => {
	function example(inner: string, cls = 'example'): HTMLElement {
		const el = document.createElement('aside');
		el.className = cls;
		el.innerHTML = inner;
		return el;
	}
	const answer = '<aside class="note check-knowledge-answer"><h4>Svar:</h4><p>1</p></aside>';

	it("is the check-your-learning part's heading, the last one before the answer box", () => {
		const el = example(
			`<p class="example-label">Dæmi</p><h4>T</h4><p>Q</p><p class="para-title">Lausn</p><p>S</p><p class="para-title" id="cut">Kannaðu þekkingu þína</p><p>Q2</p>${answer}`
		);
		expect(exampleCut(el)?.id).toBe('cut');
	});

	it('skips a second solution heading (Dæmi 5.15)', () => {
		const el = example(
			`<p class="para-title">Lausn: A</p><p>S</p><p class="para-title">Lausn: B</p><p>S2</p><p class="para-title" id="cut">Q</p><p>Q2</p>${answer}`
		);
		expect(exampleCut(el)?.id).toBe('cut');
	});

	it('breaks before the first of two check-your-learning parts (Dæmi 5.3)', () => {
		const el = example(
			`<p class="para-title">Lausn</p><p>S</p><p class="para-title" id="cut">Q</p><p>Q2</p>${answer}<p class="para-title">Q</p><p>Q3</p>${answer}`
		);
		expect(exampleCut(el)?.id).toBe('cut');
	});

	it('is null for an example with no answer box', () => {
		expect(exampleCut(example('<p class="para-title">Lausn</p><p>S</p><p class="para-title">Q</p><p>Q2</p>'))).toBeNull();
	});

	it('is null when no solution heading comes before the check-your-learning heading', () => {
		expect(exampleCut(example(`<p>Q</p><p class="para-title">Q</p><p>Q2</p>${answer}`))).toBeNull();
	});

	it('is null for a box that is not an example', () => {
		const note = example(`<p class="para-title">Lausn</p><p class="para-title">Q</p>${answer}`, 'note');
		expect(exampleCut(note)).toBeNull();
	});
});

describe('splitPieces', () => {
	it('keeps a block that cannot break whole', () => {
		expect(splitPieces([block(900)], 500)).toEqual([{ block: 0, part: 'whole', height: 900, keepWithNext: false }]);
	});

	it('keeps a breakable block that fits the page whole', () => {
		expect(splitPieces([{ ...block(400), firstPart: 250 }], 500)).toEqual([
			{ block: 0, part: 'whole', height: 400, keepWithNext: false }
		]);
	});

	it('splits a breakable block taller than the page at its first part', () => {
		expect(splitPieces([{ ...block(900), firstPart: 600 }], 500)).toEqual([
			{ block: 0, part: 'first', height: 600, keepWithNext: false },
			{ block: 0, part: 'second', height: 300, keepWithNext: false }
		]);
	});

	it('numbers the pieces by the block they come from', () => {
		const pieces = splitPieces([heading(30), { ...block(900), firstPart: 600 }, block(100)], 500);
		expect(pieces.map((p) => [p.block, p.part])).toEqual([
			[0, 'whole'],
			[1, 'first'],
			[1, 'second'],
			[2, 'whole']
		]);
	});

	it('keeps a block whole when its first part is not inside it', () => {
		expect(splitPieces([{ ...block(900), firstPart: 0 }], 500)[0].part).toBe('whole');
		expect(splitPieces([{ ...block(900), firstPart: 900 }], 500)[0].part).toBe('whole');
	});
});

describe('shownParts', () => {
	const pieces: Piece[] = [
		{ block: 0, part: 'whole', height: 100, keepWithNext: false },
		{ block: 1, part: 'first', height: 600, keepWithNext: false },
		{ block: 1, part: 'second', height: 300, keepWithNext: false },
		{ block: 2, part: 'whole', height: 100, keepWithNext: false }
	];

	it("names each block on the page with the part that shows", () => {
		expect(shownParts(pieces, { start: 0, end: 2 })).toEqual(
			new Map([
				[0, 'whole'],
				[1, 'first']
			])
		);
		expect(shownParts(pieces, { start: 2, end: 4 })).toEqual(
			new Map([
				[1, 'second'],
				[2, 'whole']
			])
		);
	});

	it('shows a block whole when both its parts are on the page', () => {
		expect(shownParts(pieces, { start: 1, end: 3 }).get(1)).toBe('whole');
	});
});

describe('pieceOf', () => {
	const split: Piece[] = [
		{ block: 0, part: 'whole', height: 100, keepWithNext: false },
		{ block: 1, part: 'first', height: 600, keepWithNext: false },
		{ block: 1, part: 'second', height: 300, keepWithNext: false }
	];
	const whole: Piece[] = [
		{ block: 0, part: 'whole', height: 100, keepWithNext: false },
		{ block: 1, part: 'whole', height: 900, keepWithNext: false }
	];

	it("finds a split block's part", () => {
		expect(pieceOf(split, 1, 'second')).toBe(2);
		expect(pieceOf(split, 1, 'first')).toBe(1);
	});

	it("gives a split block's first part for the whole block", () => {
		expect(pieceOf(split, 1, 'whole')).toBe(1);
	});

	it('gives a whole block for either of its parts', () => {
		expect(pieceOf(whole, 1, 'second')).toBe(1);
	});

	it('is -1 for a block that is not there', () => {
		expect(pieceOf(whole, 5, 'whole')).toBe(-1);
		expect(pieceOf(whole, -1, 'whole')).toBe(-1);
	});
});
