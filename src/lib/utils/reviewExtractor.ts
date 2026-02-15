/**
 * Extracts review-worthy content blocks from section HTML.
 * Used by the Quick Review (yfirlit) page.
 */

export type ReviewBlockType = 'key-concept' | 'definition' | 'learning-objectives' | 'checkpoint';

export interface ReviewBlock {
	type: ReviewBlockType;
	html: string;
}

const BLOCK_SELECTORS: { selector: string; type: ReviewBlockType }[] = [
	{ selector: '.learning-objectives', type: 'learning-objectives' },
	{ selector: '.content-block.key-concept', type: 'key-concept' },
	{ selector: '.content-block.definition', type: 'definition' },
	{ selector: '.content-block.checkpoint', type: 'checkpoint' }
];

/**
 * Parses the given HTML string and extracts educational content blocks
 * matching predefined selectors (learning objectives, key concepts,
 * definitions, and checkpoints).
 *
 * @param html - Raw HTML string of a section page
 * @returns Array of ReviewBlock objects in document order per type
 */
export function extractReviewBlocks(html: string): ReviewBlock[] {
	if (!html) return [];

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const blocks: ReviewBlock[] = [];

	for (const { selector, type } of BLOCK_SELECTORS) {
		const elements = doc.querySelectorAll(selector);
		for (const el of elements) {
			blocks.push({ type, html: el.outerHTML });
		}
	}

	return blocks;
}
