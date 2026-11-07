/**
 * Tests for the print renders' links into the reader (PDF plan, the 'Open (2026-11-04)'
 * note; [USER]'s rulings of 2026-11-07).
 *
 * efni writes these links root-relative (`/efnafraedi-2e/kafli/01/1-1-…`). Chromium
 * resolved them against the print page's address, so every one was a dead link to the
 * generator's dev server. Each output is parsed as one document, because that is what
 * Chromium resolves `#id` against when it prints a chapter.
 */

import { describe, it, expect } from 'vitest';
import { readerAnchor, siteUrl, anchorArticle, resolveReaderLinks } from './printLinks';
import { markMachineTranslated } from './printContent';
import table from './printLinks.cases.json';

const BOOK = 'efnafraedi-2e';

/** A rendered page: its article carries the anchor when one is given. */
function page(body: string, anchor?: string): { content: string } {
	const id = anchor ? ` id="${anchor}"` : '';
	return { content: `<article class="cnx-module"${id}><main>${body}</main></article>` };
}

/** The render as Chromium sees it: every block in one document. */
function render(blocks: Array<{ content: string }>): Document {
	const html = blocks.map((b) => b.content).join('\n');
	return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

const hrefs = (doc: Document) => [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'));

describe('readerAnchor and siteUrl (the case table the PDF merge shares)', () => {
	it.each(table.cases)('$href → anchor $anchor', ({ href, anchor }) => {
		expect(readerAnchor(href, table.book)).toBe(anchor);
	});

	it.each(table.cases)('$href → $site', ({ href, site }) => {
		expect(siteUrl(href)).toBe(site);
	});
});

describe('anchorArticle', () => {
	it('puts the id on the article, where the section starts its page', () => {
		const out = anchorArticle('<article class="cnx-module"><p>x</p></article>', 'sec-1-1-a');
		const doc = render([{ content: out! }]);
		expect(doc.getElementById('sec-1-1-a')?.tagName).toBe('ARTICLE');
	});

	it('keeps the class where markMachineTranslated looks for it', () => {
		const out = anchorArticle('<article class="cnx-module" data-module-id="m1"></article>', 'sec-x');
		const doc = render([{ content: markMachineTranslated(out!, false) }]);
		expect(doc.getElementById('sec-x')?.className).toBe('mt-content cnx-module');
	});

	it('gives up on an article that already has an id', () => {
		expect(anchorArticle('<article id="m1" class="cnx-module"></article>', 'sec-x')).toBeNull();
	});

	it('gives up when there is no article', () => {
		expect(anchorArticle('<div class="cnx-module"></div>', 'sec-x')).toBeNull();
	});

	it('does not take data-article-id for an id', () => {
		const out = anchorArticle('<article data-article-id="m1" class="cnx-module"></article>', 'sec-x');
		expect(render([{ content: out! }]).getElementById('sec-x')?.tagName).toBe('ARTICLE');
	});
});

describe('resolveReaderLinks', () => {
	it('points an outline link at the section it names, when the render holds it', () => {
		const blocks = [
			page(`<a href="/${BOOK}/kafli/01/1-2-efnishamir">1.2</a>`, 'sec-1-0-introduction'),
			page('<h1>1.2</h1>', 'sec-1-2-efnishamir')
		];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual(['#sec-1-2-efnishamir']);
	});

	it('points a link with a fragment at that element, held by another section', () => {
		const blocks = [
			page(`<a href="/${BOOK}/kafli/01/1-4-maelingar#fs-idm45639696">mynd</a>`, 'sec-1-1-a'),
			page('<figure id="fs-idm45639696"></figure>', 'sec-1-4-maelingar')
		];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual(['#fs-idm45639696']);
	});

	it('falls back to the section when the render lacks the fragment', () => {
		const blocks = [
			page(`<a href="/${BOOK}/kafli/01/1-4-maelingar#fs-gone">mynd</a>`, 'sec-1-1-a'),
			page('<p></p>', 'sec-1-4-maelingar')
		];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual(['#sec-1-4-maelingar']);
	});

	it('sends a link to a page outside the render to the live site', () => {
		const blocks = [page(`<a href="/${BOOK}/vidauki/B">viðauka B</a>`, 'sec-1-1-a')];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual([`https://namsbokasafn.is/${BOOK}/vidauki/B/`]);
	});

	it('keeps the fragment of a link that goes to the live site', () => {
		const blocks = [page(`<a href="/${BOOK}/vidauki/A#fs-idm379479808">A</a>`, 'sec-2-1-a')];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual([`https://namsbokasafn.is/${BOOK}/vidauki/A/#fs-idm379479808`]);
	});

	it('does not take a fragment the render holds as the page being there', () => {
		const blocks = [
			page(`<a href="/${BOOK}/vidauki/A#fs-shared">A</a>`, 'sec-2-1-a'),
			page('<p id="fs-shared"></p>', 'sec-2-2-b')
		];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual([`https://namsbokasafn.is/${BOOK}/vidauki/A/#fs-shared`]);
	});

	it('sends a link to a reader page with no anchor (the periodic table) to the live site', () => {
		const blocks = [page(`<a href="/${BOOK}/lotukerfi">lotukerfið</a>`)];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual([`https://namsbokasafn.is/${BOOK}/lotukerfi/`]);
	});

	it('finds an appendix by the id its page template gives the wrapper', () => {
		const blocks = [page(`<a href="/${BOOK}/vidauki/B">B</a>`), page('<p>B</p>')];
		const doc = render(resolveReaderLinks(blocks, BOOK, ['vidauki-A', 'vidauki-B']));
		expect(hrefs(doc)).toEqual(['#vidauki-B']);
	});

	it('leaves links that are not root-relative alone', () => {
		const body =
			'<a href="#fs-1">a</a><a href="https://openstax.org/details/books/chemistry-2e">b</a>' +
			'<a href="//example.com/x">c</a><a href="mailto:x@example.com">d</a>';
		const doc = render(resolveReaderLinks([page(body, 'sec-1-1-a')], BOOK));
		expect(hrefs(doc)).toEqual([
			'#fs-1',
			'https://openstax.org/details/books/chemistry-2e',
			'//example.com/x',
			'mailto:x@example.com'
		]);
	});

	it('reads a single-quoted href', () => {
		const blocks = [page(`<a class='x' href='/${BOOK}/vidauki/B'>B</a>`, 'sec-1-1-a')];
		const doc = render(resolveReaderLinks(blocks, BOOK));
		expect(hrefs(doc)).toEqual([`https://namsbokasafn.is/${BOOK}/vidauki/B/`]);
	});

	it('rewrites only links, not other elements with an href', () => {
		const svg = `<svg><image href="/${BOOK}/mynd.png"></image></svg>`;
		const [out] = resolveReaderLinks([page(svg, 'sec-1-1-a')], BOOK);
		expect(out.content).toContain(`<image href="/${BOOK}/mynd.png">`);
	});

	it('returns a block with no link into the reader as the same object', () => {
		const plain = page('<p>Texti</p><a href="#fs-1">a</a>', 'sec-1-1-a');
		const linked = page(`<a href="/${BOOK}/vidauki/B">B</a>`, 'sec-1-2-b');
		const out = resolveReaderLinks([plain, linked], BOOK);
		expect(out[0]).toBe(plain);
		expect(out[1]).not.toBe(linked);
	});
});
