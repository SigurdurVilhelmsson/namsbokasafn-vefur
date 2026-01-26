/**
 * Svelte action for bionic reading mode
 * Bolds the first portion of each word to aid reading speed
 */

import { get } from 'svelte/store';
import { bionicReading } from '$lib/stores/settings';

// Elements and selectors to skip when processing text
const SKIP_SELECTORS = [
	'code',
	'pre',
	'kbd',
	'.katex',
	'.katex-display',
	'.equation-wrapper',
	'svg',
	'script',
	'style',
	'.bionic-bold',
	'[data-bionic-processed]'
];

// Word regex that handles Icelandic characters (á, ð, é, í, ó, ú, ý, þ, æ, ö)
const WORD_REGEX = /[\p{L}\p{N}'-]+/gu;

// Minimum word length to apply bionic formatting
const MIN_WORD_LENGTH = 3;

// Fraction of word to bold (40%)
const BOLD_FRACTION = 0.4;

interface BionicState {
	originalHTML: string | null;
	unsubscribe: (() => void) | null;
	isProcessed: boolean;
}

/**
 * Calculate how many characters to bold for a given word
 */
function getBoldLength(wordLength: number): number {
	if (wordLength < MIN_WORD_LENGTH) {
		return 0;
	}
	// Bold at least 1 character, at most BOLD_FRACTION of the word
	return Math.max(1, Math.ceil(wordLength * BOLD_FRACTION));
}

/**
 * Process a single text node, wrapping the bold portions in <b> tags
 */
function processTextNode(textNode: Text): DocumentFragment | null {
	const text = textNode.textContent || '';
	if (!text.trim()) {
		return null;
	}

	const fragment = document.createDocumentFragment();
	let lastIndex = 0;
	let hasChanges = false;

	// Find all words in the text
	let match: RegExpExecArray | null;
	WORD_REGEX.lastIndex = 0;

	while ((match = WORD_REGEX.exec(text)) !== null) {
		const word = match[0];
		const wordStart = match.index;

		// Add text before the word
		if (wordStart > lastIndex) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex, wordStart)));
		}

		const boldLength = getBoldLength(word.length);

		if (boldLength > 0) {
			// Create bold portion
			const boldSpan = document.createElement('b');
			boldSpan.className = 'bionic-bold';
			boldSpan.textContent = word.slice(0, boldLength);
			fragment.appendChild(boldSpan);

			// Add rest of the word
			if (boldLength < word.length) {
				fragment.appendChild(document.createTextNode(word.slice(boldLength)));
			}
			hasChanges = true;
		} else {
			// Word too short, add as-is
			fragment.appendChild(document.createTextNode(word));
		}

		lastIndex = wordStart + word.length;
	}

	// Add any remaining text after the last word
	if (lastIndex < text.length) {
		fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
	}

	return hasChanges ? fragment : null;
}

/**
 * Check if an element or its ancestors match skip selectors
 */
function shouldSkipElement(element: Node): boolean {
	let current: Node | null = element;

	while (current && current.nodeType === Node.ELEMENT_NODE) {
		const el = current as Element;
		for (const selector of SKIP_SELECTORS) {
			try {
				if (el.matches(selector)) {
					return true;
				}
			} catch {
				// Invalid selector, skip
			}
		}
		current = current.parentElement;
	}

	return false;
}

/**
 * Apply bionic reading formatting to a container element
 */
function applyBionicReading(container: HTMLElement): void {
	// Mark as processed to avoid double-processing
	container.setAttribute('data-bionic-processed', 'true');

	// Create a TreeWalker to iterate over all text nodes
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
		acceptNode: (node: Text) => {
			// Skip empty or whitespace-only nodes
			if (!node.textContent?.trim()) {
				return NodeFilter.FILTER_REJECT;
			}

			// Skip if parent should be skipped
			if (node.parentElement && shouldSkipElement(node.parentElement)) {
				return NodeFilter.FILTER_REJECT;
			}

			return NodeFilter.FILTER_ACCEPT;
		}
	});

	// Collect text nodes first to avoid issues with DOM modifications during traversal
	const textNodes: Text[] = [];
	let currentNode: Text | null;

	while ((currentNode = walker.nextNode() as Text | null)) {
		textNodes.push(currentNode);
	}

	// Process each text node
	for (const textNode of textNodes) {
		const fragment = processTextNode(textNode);
		if (fragment && textNode.parentNode) {
			textNode.parentNode.replaceChild(fragment, textNode);
		}
	}
}

/**
 * Remove bionic reading formatting by restoring original HTML
 */
function removeBionicReading(container: HTMLElement, originalHTML: string): void {
	container.innerHTML = originalHTML;
	container.removeAttribute('data-bionic-processed');
}

/**
 * Svelte action for bionic reading
 * Attach to a container element (like .reading-content) to enable bionic reading
 */
export function bionicReadingAction(node: HTMLElement) {
	const state: BionicState = {
		originalHTML: null,
		unsubscribe: null,
		isProcessed: false
	};

	function updateBionicReading(enabled: boolean) {
		if (enabled && !state.isProcessed) {
			// Store original HTML before processing
			state.originalHTML = node.innerHTML;
			applyBionicReading(node);
			state.isProcessed = true;
		} else if (!enabled && state.isProcessed && state.originalHTML !== null) {
			// Restore original HTML
			removeBionicReading(node, state.originalHTML);
			state.isProcessed = false;
		}
	}

	// Apply initial state
	const initialEnabled = get(bionicReading);
	updateBionicReading(initialEnabled);

	// Subscribe to store changes
	state.unsubscribe = bionicReading.subscribe((enabled) => {
		updateBionicReading(enabled);
	});

	return {
		// Re-apply when content changes (e.g., navigation)
		update() {
			if (state.isProcessed) {
				// Content changed, need to re-process
				state.originalHTML = null;
				state.isProcessed = false;
				const enabled = get(bionicReading);
				if (enabled) {
					state.originalHTML = node.innerHTML;
					applyBionicReading(node);
					state.isProcessed = true;
				}
			}
		},
		destroy() {
			if (state.unsubscribe) {
				state.unsubscribe();
			}
			// Restore original HTML on destroy if processed
			if (state.isProcessed && state.originalHTML !== null) {
				removeBionicReading(node, state.originalHTML);
			}
		}
	};
}
