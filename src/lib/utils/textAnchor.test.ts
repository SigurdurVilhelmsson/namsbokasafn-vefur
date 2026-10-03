/**
 * Tests for text-based anchoring utilities
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { serializeRange, deserializeRange, upgradeToV2 } from './textAnchor';
import type { TextRange } from '$lib/types/annotation';

describe('textAnchor utilities', () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	describe('serializeRange', () => {
		it('should capture exact text from range', () => {
			container.innerHTML = '<p>Hello world, this is a test.</p>';
			const textNode = container.querySelector('p')!.firstChild as Text;

			const range = document.createRange();
			range.setStart(textNode, 6);
			range.setEnd(textNode, 11);

			const result = serializeRange(range, container);

			expect(result.version).toBe(2);
			expect(result.exact).toBe('world');
		});

		it('should capture prefix context', () => {
			container.innerHTML = '<p>Hello world, this is a test.</p>';
			const textNode = container.querySelector('p')!.firstChild as Text;

			const range = document.createRange();
			range.setStart(textNode, 6);
			range.setEnd(textNode, 11);

			const result = serializeRange(range, container);

			expect(result.prefix).toBe('Hello ');
		});

		it('should capture suffix context', () => {
			container.innerHTML = '<p>Hello world, this is a test.</p>';
			const textNode = container.querySelector('p')!.firstChild as Text;

			const range = document.createRange();
			range.setStart(textNode, 6);
			range.setEnd(textNode, 11);

			const result = serializeRange(range, container);

			expect(result.suffix).toContain(', this is a test');
		});

		it('should find nearest heading ID', () => {
			container.innerHTML = `
				<h2 id="my-heading">My Heading</h2>
				<p>Some text to highlight here.</p>
			`;
			const textNode = container.querySelector('p')!.firstChild as Text;

			const range = document.createRange();
			range.setStart(textNode, 5);
			range.setEnd(textNode, 9);

			const result = serializeRange(range, container);

			expect(result.anchorId).toBe('my-heading');
		});

		it('should handle no heading anchor', () => {
			container.innerHTML = '<p>Just some text without headings.</p>';
			const textNode = container.querySelector('p')!.firstChild as Text;

			const range = document.createRange();
			range.setStart(textNode, 0);
			range.setEnd(textNode, 4);

			const result = serializeRange(range, container);

			expect(result.anchorId).toBe(null);
		});
	});

	describe('deserializeRange', () => {
		it('should find exact text match', () => {
			container.innerHTML = '<p>Hello world, this is a test.</p>';

			const textRange: TextRange = {
				version: 2,
				exact: 'world',
				prefix: 'Hello ',
				suffix: ', this is',
				anchorId: null,
				offsetFromAnchor: 0
			};

			const range = deserializeRange(textRange, container);

			expect(range).not.toBeNull();
			expect(range!.toString()).toBe('world');
		});

		it('should use context to disambiguate duplicate text', () => {
			container.innerHTML = '<p>test one, test two, test three</p>';

			const textRange: TextRange = {
				version: 2,
				exact: 'test',
				prefix: 'one, ',
				suffix: ' two',
				anchorId: null,
				offsetFromAnchor: 0
			};

			const range = deserializeRange(textRange, container);

			expect(range).not.toBeNull();
			expect(range!.toString()).toBe('test');

			// The match should be at position 10 (after "test one, ")
			const fullText = container.textContent || '';
			const preText = fullText.slice(0, fullText.indexOf(range!.toString(), 5));
			expect(preText).toContain('one,');
		});

		it('should return null for missing text', () => {
			container.innerHTML = '<p>Hello world.</p>';

			const textRange: TextRange = {
				version: 2,
				exact: 'nonexistent',
				prefix: '',
				suffix: '',
				anchorId: null,
				offsetFromAnchor: 0
			};

			const range = deserializeRange(textRange, container);

			expect(range).toBeNull();
		});

		it('should search from anchor element when provided', () => {
			container.innerHTML = `
				<h2 id="section-1">Section 1</h2>
				<p>First unique text here.</p>
				<h2 id="section-2">Section 2</h2>
				<p>Second unique text here.</p>
			`;

			const textRange: TextRange = {
				version: 2,
				exact: 'Second unique',
				prefix: '',
				suffix: ' text here',
				anchorId: 'section-2',
				offsetFromAnchor: 0
			};

			const range = deserializeRange(textRange, container);

			expect(range).not.toBeNull();
			expect(range!.toString()).toBe('Second unique');
		});
	});

	describe('upgradeToV2', () => {
		it('should create v2 range from legacy data and DOM range', () => {
			container.innerHTML = `
				<h2 id="my-heading">My Heading</h2>
				<p>Some highlighted text here.</p>
			`;
			const textNode = container.querySelector('p')!.firstChild as Text;

			const domRange = document.createRange();
			domRange.setStart(textNode, 5);
			domRange.setEnd(textNode, 16);

			const legacyData = {
				selectedText: 'highlighted',
				range: { startOffset: 5, endOffset: 16 }
			};

			const result = upgradeToV2(legacyData, domRange, container);

			expect(result.version).toBe(2);
			expect(result.exact).toBe('highlighted');
			expect(result.anchorId).toBe('my-heading');
			expect(result.prefix).toContain('Some ');
			expect(result.suffix).toContain(' text here');
			// Legacy fields preserved for debugging
			expect(result.startOffset).toBe(5);
			expect(result.endOffset).toBe(16);
		});
	});

	// 🔴 Highlights are anchored by text offset, and the glossaryTerms action
	// injects <span class="term-en"> under a setting the reader can toggle.
	// Anchoring must therefore read the PUBLISHED text only — otherwise the same
	// highlight anchors differently with the gloss on and off, and one saved
	// before a chapter gained data-en can silently restore over the wrong
	// occurrence.
	describe('injected .term-en spans are invisible to anchoring', () => {
		const GLOSSED =
			'<p>Fyrst <dfn class="term">efni<span class="term-en"> (e. matter)</span></dfn> og svo meira efni her.</p>';
		const PLAIN = '<p>Fyrst <dfn class="term">efni</dfn> og svo meira efni her.</p>';

		// Discriminating: fails before the fix — range.toString() yields
		// "efni (e. matter)".
		it('excludes the gloss from the serialized exact text', () => {
			container.innerHTML = GLOSSED;
			const range = document.createRange();
			range.selectNodeContents(container.querySelector('dfn')!);

			expect(serializeRange(range, container).exact).toBe('efni');
		});

		// Discriminating: fails before the fix — the prefix would carry
		// "(e. matter)" and so would not match the same highlight saved against
		// content that had no gloss yet.
		it('excludes the gloss from the surrounding context', () => {
			container.innerHTML = GLOSSED;
			const tail = container.querySelector('p')!.lastChild as Text;
			const at = tail.data.indexOf('meira');

			const range = document.createRange();
			range.setStart(tail, at);
			range.setEnd(tail, at + 'meira efni'.length);

			const { prefix, exact } = serializeRange(range, container);
			expect(exact).toBe('meira efni');
			expect(prefix).not.toContain('(e.');
			expect(prefix).toBe('Fyrst efni og svo ');
		});

		// Not discriminating today — both sides are consistent before the fix and
		// after it. This pins the INVARIANT that they stay consistent: contentText
		// produces the offsets and createRangeAtPosition consumes them, so
		// filtering one without the other silently desyncs every restore.
		it('maps offsets back through the same filter it measured with', () => {
			container.innerHTML = GLOSSED;
			const stored = {
				version: 2 as const,
				exact: 'meira efni',
				prefix: 'Fyrst efni og svo ',
				suffix: ' her.',
				anchorId: null,
				offsetFromAnchor: 0
			};

			expect(deserializeRange(stored, container)?.toString()).toBe('meira efni');
		});

		// Control: ordinary inline markup must still be walked. A filter that
		// rejected too much would break this.
		it('still reads text inside other inline elements', () => {
			container.innerHTML = '<p>Hello <em>brave</em> world.</p>';
			const stored = {
				version: 2 as const,
				exact: 'brave world',
				prefix: 'Hello ',
				suffix: '.',
				anchorId: null,
				offsetFromAnchor: 0
			};

			expect(deserializeRange(stored, container)?.toString()).toBe('brave world');
		});

		// Control on the round trip: a highlight saved against plain content still
		// restores once the gloss appears.
		it('restores a highlight saved before the gloss existed', () => {
			container.innerHTML = PLAIN;
			const saveRange = document.createRange();
			saveRange.selectNodeContents(container.querySelector('dfn')!);
			const stored = serializeRange(saveRange, container);

			container.innerHTML = GLOSSED;
			expect(deserializeRange(stored, container)?.toString()).toBe('efni');
		});
	});
});
