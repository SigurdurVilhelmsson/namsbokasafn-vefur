/**
 * Text-based anchoring utilities for stable highlight restoration.
 *
 * This module provides functions to serialize DOM Ranges to text-based anchors
 * and restore them after navigation or page reload.
 *
 * Strategy:
 * 1. Store the exact highlighted text + surrounding context (prefix/suffix)
 * 2. Store the nearest heading ID as a stable anchor point
 * 3. On restoration, search for text starting from the anchor
 * 4. Use context to disambiguate when the same text appears multiple times
 */

import type { TextRange } from '$lib/types/annotation';

const CONTEXT_LENGTH = 30; // Characters of context before/after highlight

/**
 * Decorations vefur INJECTS into the content, which anchoring must not see.
 *
 * 🔴 Highlights are anchored by text offset. `.term-en` is an English gloss the
 * glossaryTerms action appends inside a <dfn>, under a setting the reader can
 * toggle — so without this, the same highlight anchors differently with the
 * setting on and off, and every highlight saved before a chapter gained
 * `data-en` would find its ±30-character context changed underneath it. The
 * context check would then fail and fall through to a bare indexOf, which can
 * silently restore the highlight over the WRONG occurrence.
 *
 * Anchoring therefore reads the PUBLISHED text only. Both the offset source
 * (contentText) and the offset consumer (createRangeAtPosition) must apply the
 * same filter, or their offsets desync.
 */
const INJECTED_SELECTOR = '.term-en';

function contentTextWalker(container: HTMLElement): TreeWalker {
	return document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) =>
			node.parentElement?.closest(INJECTED_SELECTOR)
				? NodeFilter.FILTER_REJECT
				: NodeFilter.FILTER_ACCEPT
	});
}

/** A container's text with injected decorations excluded. */
function contentText(container: HTMLElement): string {
	const walker = contentTextWalker(container);
	let text = '';
	while (walker.nextNode()) text += (walker.currentNode as Text).data;
	return text;
}

/** A range's text with injected decorations excluded. */
function rangeContentText(range: Range): string {
	const fragment = range.cloneContents();
	for (const el of Array.from(fragment.querySelectorAll(INJECTED_SELECTOR))) {
		el.remove();
	}
	return fragment.textContent || '';
}

/**
 * Serialize a DOM Range to a text-based TextRange.
 *
 * @param range - The DOM Range from user selection
 * @param container - The container element to search within
 * @returns TextRange with text-based anchoring
 */
export function serializeRange(range: Range, container: HTMLElement): TextRange {
	const exact = rangeContentText(range);

	// Get surrounding context
	const { prefix, suffix } = getTextContext(range, container);

	// Find nearest heading with ID
	const { anchorId, offsetFromAnchor } = findAnchorInfo(range, container);

	return {
		version: 2,
		exact,
		prefix,
		suffix,
		anchorId,
		offsetFromAnchor
	};
}

/**
 * Deserialize a TextRange back to a DOM Range.
 *
 * @param textRange - The stored TextRange
 * @param container - The container element to search within
 * @returns DOM Range if found, null if text not found
 */
export function deserializeRange(textRange: TextRange, container: HTMLElement): Range | null {
	// If this is a legacy v1 range, try to find text using selectedText from annotation
	// The caller should pass the selectedText as textRange.exact for legacy ranges

	const { exact, prefix, suffix } = textRange;

	if (!exact) {
		console.warn('Cannot deserialize range without exact text');
		return null;
	}

	// Strategy 1: Find exact text with context matching
	const range = findTextWithContext(exact, prefix, suffix, container);

	if (range) {
		return range;
	}

	// Strategy 2: Fall back to exact text search without context
	const fallbackRange = findExactText(exact, container);
	if (fallbackRange) {
		return fallbackRange;
	}

	console.warn('Could not restore highlight - text not found:', exact.substring(0, 50));
	return null;
}

/**
 * Get the text context (prefix and suffix) around a Range.
 */
function getTextContext(
	range: Range,
	container: HTMLElement
): { prefix: string; suffix: string } {
	// Create a range from container start to selection start
	const preRange = document.createRange();
	preRange.setStart(container, 0);
	preRange.setEnd(range.startContainer, range.startOffset);
	const preText = rangeContentText(preRange);

	// Create a range from selection end to container end
	const postRange = document.createRange();
	postRange.setStart(range.endContainer, range.endOffset);
	postRange.setEnd(container, container.childNodes.length);
	const postText = rangeContentText(postRange);

	return {
		prefix: preText.slice(-CONTEXT_LENGTH),
		suffix: postText.slice(0, CONTEXT_LENGTH)
	};
}

/**
 * Find the nearest heading with an ID and calculate offset from it.
 */
function findAnchorInfo(
	range: Range,
	container: HTMLElement
): { anchorId: string | null; offsetFromAnchor: number } {
	// Walk up from selection to find nearest heading with ID
	let node: Node | null = range.startContainer;
	let anchorElement: HTMLElement | null = null;

	// First, check ancestors
	while (node && node !== container) {
		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (/^H[1-6]$/i.test(el.tagName) && el.id) {
				anchorElement = el;
				break;
			}
		}
		node = node.parentNode;
	}

	// If no ancestor heading, look for preceding sibling headings
	if (!anchorElement) {
		const headings = container.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
		const selectionNode = range.startContainer;

		// Find the last heading that comes before our selection
		for (const heading of headings) {
			const position = selectionNode.compareDocumentPosition(heading);
			// DOCUMENT_POSITION_PRECEDING means heading comes before selection
			if (position & Node.DOCUMENT_POSITION_PRECEDING) {
				anchorElement = heading as HTMLElement;
			}
		}
	}

	if (!anchorElement) {
		return { anchorId: null, offsetFromAnchor: 0 };
	}

	// Calculate character offset from anchor to selection start
	const anchorRange = document.createRange();
	anchorRange.setStartAfter(anchorElement);
	anchorRange.setEnd(range.startContainer, range.startOffset);
	const offsetFromAnchor = anchorRange.toString().length;

	return {
		anchorId: anchorElement.id,
		offsetFromAnchor
	};
}

/**
 * Find text in container with context matching for disambiguation.
 */
function findTextWithContext(
	exact: string,
	prefix: string,
	suffix: string,
	container: HTMLElement
): Range | null {
	const fullText = contentText(container);

	// Find all occurrences of the exact text
	const matches: number[] = [];
	let pos = 0;
	while ((pos = fullText.indexOf(exact, pos)) !== -1) {
		matches.push(pos);
		pos += 1;
	}

	if (matches.length === 0) {
		return null;
	}

	// Score each match by how well it matches the context
	let bestMatch = matches[0];
	let bestScore = -1;

	for (const matchPos of matches) {
		const contextStart = Math.max(0, matchPos - prefix.length);
		const contextEnd = Math.min(fullText.length, matchPos + exact.length + suffix.length);
		const matchContext = fullText.slice(contextStart, contextEnd);

		// Calculate similarity score
		const expectedContext = prefix + exact + suffix;
		const score = calculateSimilarity(matchContext, expectedContext);

		if (score > bestScore) {
			bestScore = score;
			bestMatch = matchPos;
		}
	}

	// Create range at best match position
	return createRangeAtPosition(container, bestMatch, exact.length);
}

/**
 * Find exact text without context (fallback).
 */
function findExactText(exact: string, container: HTMLElement): Range | null {
	const fullText = contentText(container);
	const pos = fullText.indexOf(exact);

	if (pos === -1) {
		return null;
	}

	return createRangeAtPosition(container, pos, exact.length);
}

/**
 * Calculate similarity between two strings (0-1 score).
 */
function calculateSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	if (a.length === 0 || b.length === 0) return 0;

	// Simple character matching score
	const maxLen = Math.max(a.length, b.length);
	let matches = 0;

	for (let i = 0; i < Math.min(a.length, b.length); i++) {
		if (a[i] === b[i]) matches++;
	}

	return matches / maxLen;
}

/**
 * Create a DOM Range at a specific text position within a container.
 */
function createRangeAtPosition(
	container: HTMLElement,
	startPos: number,
	length: number
): Range | null {
	const range = document.createRange();
	// Same filter as contentText() — offsets come from there and must agree.
	const walker = contentTextWalker(container);

	let currentPos = 0;
	let startNode: Text | null = null;
	let startOffset = 0;
	let endNode: Text | null = null;
	let endOffset = 0;

	const endPos = startPos + length;

	while (walker.nextNode()) {
		const textNode = walker.currentNode as Text;
		const nodeLength = textNode.length;
		const nodeEnd = currentPos + nodeLength;

		// Check if start position is in this node
		if (!startNode && startPos >= currentPos && startPos < nodeEnd) {
			startNode = textNode;
			startOffset = startPos - currentPos;
		}

		// Check if end position is in this node
		if (startNode && endPos >= currentPos && endPos <= nodeEnd) {
			endNode = textNode;
			endOffset = endPos - currentPos;
			break;
		}

		currentPos = nodeEnd;
	}

	if (!startNode || !endNode) {
		return null;
	}

	try {
		range.setStart(startNode, startOffset);
		range.setEnd(endNode, endOffset);
		return range;
	} catch (e) {
		console.warn('Failed to create range:', e);
		return null;
	}
}

/**
 * Find the nearest heading ID for a given node.
 * Useful for upgrading legacy annotations.
 */
export function findNearestHeadingId(node: Node, container: HTMLElement): string | null {
	const headings = container.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');

	let nearestHeading: Element | null = null;

	for (const heading of headings) {
		const position = node.compareDocumentPosition(heading);
		if (position & Node.DOCUMENT_POSITION_PRECEDING) {
			nearestHeading = heading;
		}
	}

	return nearestHeading?.id || null;
}

/**
 * Upgrade a legacy v1 annotation to v2 format.
 * Call this when restoring a legacy highlight successfully.
 */
export function upgradeToV2(
	legacyRange: { selectedText: string; range: { startOffset?: number; endOffset?: number } },
	domRange: Range,
	container: HTMLElement
): TextRange {
	const { prefix, suffix } = getTextContext(domRange, container);
	const { anchorId, offsetFromAnchor } = findAnchorInfo(domRange, container);

	return {
		version: 2,
		exact: legacyRange.selectedText,
		prefix,
		suffix,
		anchorId,
		offsetFromAnchor,
		// Keep legacy fields for debugging
		startOffset: legacyRange.range.startOffset,
		endOffset: legacyRange.range.endOffset
	};
}
