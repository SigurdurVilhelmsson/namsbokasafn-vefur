/**
 * Tests for the print renders' footnote back links (PDF plan, the note under Task 3.1).
 *
 * The fixtures copy efni's markup: each section page numbers its references from
 * `fnref-1`, the footnote's id is a content id (`eip-…`), and the footnote's back link
 * names the reference. Each output is parsed as one document, because that is what
 * Chromium resolves `#id` against when it prints a chapter.
 */

import { describe, it, expect } from 'vitest';
import {
	scopeFootnoteBackLinks,
	footnoteRefAnchorId,
	type PrintFootnoteBlock
} from './printFootnotes';

/** A section page with one footnote per `[footnote id, reference number]`. */
function section(...notes: Array<[string, number]>): PrintFootnoteBlock {
	const refs = notes
		.map(
			([fid, n]) =>
				`<p>Texti ${n}<sup class="footnote-ref"><a href="#${fid}" id="fnref-${n}">${n}</a></sup></p>`
		)
		.join('\n');
	const items = notes
		.map(
			([fid, n]) =>
				`<li id="${fid}" class="footnote-item"><p>Neðanmálsgrein ${n}. ` +
				`<a href="#fnref-${n}" class="footnote-backref" aria-label="Back to content">↩</a></p></li>`
		)
		.join('\n');
	return {
		content:
			`<article class="cnx-module"><main>${refs}</main>` +
			`<section class="footnotes"><h2>Neðanmálsgreinar</h2><ol class="footnotes-list">${items}</ol></section>` +
			`</article>`
	};
}

/** The render as Chromium sees it: every block in one document. */
function render(blocks: PrintFootnoteBlock[]): Document {
	const html = blocks.map((b, i) => `<div data-block="${i}">${b.content}</div>`).join('\n');
	return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
}

/** Every element that `href="#name"` could resolve to. */
function targetsOf(doc: Document, link: Element): Element[] {
	const name = link.getAttribute('href')!.slice(1);
	return [...doc.querySelectorAll('[id]')].filter((el) => el.id === name);
}

const blockOf = (el: Element) => el.closest('[data-block]')!.getAttribute('data-block');

describe('scopeFootnoteBackLinks', () => {
	it('gives two sections that both say fnref-1 two names, each back link its own', () => {
		const blocks = [section(['eip-a', 1]), section(['eip-b', 1])];
		const doc = render(scopeFootnoteBackLinks(blocks, '05'));

		const backs = [...doc.querySelectorAll('a.footnote-backref')];
		expect(backs).toHaveLength(2);
		const names = backs.map((a) => a.getAttribute('href'));
		expect(names).toEqual([
			`#${footnoteRefAnchorId('05', 0, 'fnref-1')}`,
			`#${footnoteRefAnchorId('05', 1, 'fnref-1')}`
		]);
		for (const back of backs) {
			const targets = targetsOf(doc, back);
			expect(targets).toHaveLength(1);
			// The reference in the same section, the one whose link names this footnote.
			expect(blockOf(targets[0])).toBe(blockOf(back));
			expect(targets[0].parentElement!.matches('sup.footnote-ref')).toBe(true);
			const footnoteId = back.closest('li.footnote-item')!.id;
			expect(targets[0].getAttribute('href')).toBe(`#${footnoteId}`);
		}
		expect(doc.querySelectorAll('[id^="fnref-"]')).toHaveLength(0);
	});

	it('renames every reference of a section and keeps the forward links', () => {
		const blocks = [
			section(['eip-a', 1], ['eip-b', 2]),
			section(['eip-c', 1], ['eip-d', 2], ['eip-e', 3])
		];
		const doc = render(scopeFootnoteBackLinks(blocks, '20'));

		const ids = [...doc.querySelectorAll('[id]')].map((el) => el.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const back of doc.querySelectorAll('a.footnote-backref')) {
			const [target] = targetsOf(doc, back);
			expect(target && blockOf(target)).toBe(blockOf(back));
		}
		// Forward links: unchanged, each resolving to its footnote.
		const forwards = [...doc.querySelectorAll('sup.footnote-ref > a')];
		expect(forwards.map((a) => a.getAttribute('href'))).toEqual([
			'#eip-a',
			'#eip-b',
			'#eip-c',
			'#eip-d',
			'#eip-e'
		]);
		for (const fwd of forwards) {
			const targets = targetsOf(doc, fwd);
			expect(targets).toHaveLength(1);
			expect(targets[0].matches('li.footnote-item')).toBe(true);
		}
	});

	it('leaves ids no back link in the same block names, and links that are not back links', () => {
		const footnoted = section(['eip-a', 1]);
		const blocks: PrintFootnoteBlock[] = [
			{
				content:
					// A reference whose footnote is missing: no back link names it.
					'<p><sup class="footnote-ref"><a href="#eip-x" id="fnref-9">9</a></sup></p>' +
					// An ordinary in-page link and its target.
					'<p id="fs-1">Sjá <a href="#fs-1">hér</a>.</p>' +
					// A back link whose target is in another block.
					'<a href="#fnref-1" class="footnote-backref">↩</a>'
			},
			footnoted
		];
		const out = scopeFootnoteBackLinks(blocks, '01');

		expect(out[0]).toBe(blocks[0]);
		expect(out[1].content).not.toBe(footnoted.content);
		const doc = render(out);
		const second = doc.querySelector('[data-block="1"]')!;
		expect(second.querySelector('sup.footnote-ref > a')!.id).toBe(
			footnoteRefAnchorId('01', 1, 'fnref-1')
		);
		expect(doc.getElementById('fnref-9')).not.toBeNull();
		expect(doc.querySelector('a[href="#fs-1"]')).not.toBeNull();
		expect(doc.querySelector('[data-block="0"] a.footnote-backref')!.getAttribute('href')).toBe(
			'#fnref-1'
		);
	});

	it('returns a block with no footnotes as it is', () => {
		const plain: PrintFootnoteBlock = {
			content: '<article class="cnx-module"><main><p id="fs-2">Texti</p></main></article>'
		};
		const footnoted = section(['eip-a', 1]);
		const out = scopeFootnoteBackLinks([plain, footnoted], '03');

		expect(out[0]).toBe(plain);
		expect(out[1].content).toContain(`id="${footnoteRefAnchorId('03', 1, 'fnref-1')}"`);
		expect(out[1].content).toContain(`href="#${footnoteRefAnchorId('03', 1, 'fnref-1')}"`);
	});

	it('scopes the names by the render, so two chapters never share one', () => {
		const a = render(scopeFootnoteBackLinks([section(['eip-a', 1])], '01'));
		const b = render(scopeFootnoteBackLinks([section(['eip-b', 1])], 'vidauki'));
		const idA = a.querySelector('sup.footnote-ref > a')!.id;
		const idB = b.querySelector('sup.footnote-ref > a')!.id;
		expect(idA).toBe('fn-01-0-fnref-1');
		expect(idB).toBe('fn-vidauki-0-fnref-1');
	});

	it('reads single-quoted attributes and a ">" inside a quoted value', () => {
		const blocks: PrintFootnoteBlock[] = [
			section(['eip-a', 1]),
			{
				content:
					`<p title="a > b"><sup class='footnote-ref'><a href='#eip-b' id='fnref-1'>1</a></sup></p>` +
					`<li id='eip-b' class='footnote-item'><a class='footnote-backref' title="x > y" href='#fnref-1'>↩</a></li>`
			}
		];
		const doc = render(scopeFootnoteBackLinks(blocks, '12'));
		const back = doc.querySelector('[data-block="1"] a.footnote-backref')!;
		expect(back.getAttribute('href')).toBe(`#${footnoteRefAnchorId('12', 1, 'fnref-1')}`);
		const targets = targetsOf(doc, back);
		expect(targets).toHaveLength(1);
		expect(blockOf(targets[0])).toBe('1');
	});
});
