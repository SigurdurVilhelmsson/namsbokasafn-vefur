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
});
