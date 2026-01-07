/**
 * Markdown processing utilities using unified/remark/rehype
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Node, Data } from 'unist';

// =============================================================================
// TYPES
// =============================================================================

interface DirectiveNode extends Node {
	name?: string;
	attributes?: Record<string, string | null | undefined> | null;
	data?: Data & { hName?: string; hProperties?: Record<string, unknown> };
	children?: Node[];
}

type ContentBlockType =
	| 'note'
	| 'warning'
	| 'example'
	| 'definition'
	| 'key-concept'
	| 'checkpoint'
	| 'common-misconception';

// =============================================================================
// DIRECTIVE CONFIGURATION
// =============================================================================

/** Configuration for each directive type */
const DIRECTIVE_CONFIG: Record<
	string,
	{
		className: string;
		blockType?: ContentBlockType;
		additionalProps?: (
			attrs: Record<string, string | null | undefined>
		) => Record<string, unknown>;
	}
> = {
	'practice-problem': {
		className: 'practice-problem-container',
		additionalProps: (attrs) => ({ 'data-problem-id': attrs.id || undefined })
	},
	answer: {
		className: 'practice-answer-container'
	},
	explanation: {
		className: 'practice-explanation-container'
	},
	hint: {
		className: 'practice-hint-container'
	},
	note: {
		className: 'content-block note',
		blockType: 'note'
	},
	warning: {
		className: 'content-block warning',
		blockType: 'warning'
	},
	example: {
		className: 'content-block example',
		blockType: 'example'
	},
	definition: {
		className: 'content-block definition',
		blockType: 'definition',
		additionalProps: (attrs) => ({ 'data-term': attrs.term || undefined })
	},
	'key-concept': {
		className: 'content-block key-concept',
		blockType: 'key-concept'
	},
	checkpoint: {
		className: 'content-block checkpoint',
		blockType: 'checkpoint'
	},
	'common-misconception': {
		className: 'content-block common-misconception',
		blockType: 'common-misconception'
	}
};

/** Titles for each block type (Icelandic) */
const BLOCK_TITLES: Record<ContentBlockType, string> = {
	note: 'Athugið',
	warning: 'Viðvörun',
	example: 'Dæmi',
	definition: 'Skilgreining',
	'key-concept': 'Lykilhugtak',
	checkpoint: 'Sjálfsmat',
	'common-misconception': 'Algeng misskilningur'
};

/** SVG icons for each block type */
const BLOCK_ICONS: Record<ContentBlockType, string> = {
	note: '<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
	warning:
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
	example:
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>',
	definition:
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>',
	'key-concept':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>',
	checkpoint:
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
	'common-misconception':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
};

// =============================================================================
// REMARK PLUGINS
// =============================================================================

/**
 * Custom remark plugin to handle markdown directives
 * Transforms :::note, :::warning, etc. into styled HTML
 */
function remarkCustomDirectives() {
	return (tree: Root) => {
		visit(tree, (node: DirectiveNode) => {
			if (node.type !== 'containerDirective' || !node.name) return;

			const config = DIRECTIVE_CONFIG[node.name];
			if (!config) return;

			const data = node.data || (node.data = {});
			data.hName = 'div';

			const attributes = node.attributes || {};
			const additionalProps = config.additionalProps?.(attributes) || {};

			// For content blocks, wrap with icon and title structure
			if (config.blockType) {
				const blockType = config.blockType;
				const title = BLOCK_TITLES[blockType];
				const icon = BLOCK_ICONS[blockType];
				const term = attributes.term;

				// Store original children to wrap them
				data.hProperties = {
					className: config.className,
					'data-block-type': blockType,
					'data-title': title,
					'data-icon': icon,
					'data-term': term || undefined,
					...additionalProps
				};
			} else {
				data.hProperties = {
					className: config.className,
					...additionalProps
				};
			}
		});
	};
}

/**
 * Remark plugin to transform cross-reference syntax into links
 * Transforms: [ref:eq:1.1] into a link with data attributes
 */
function remarkCrossReferences() {
	const REFERENCE_PATTERN = /\[ref:(sec|eq|fig|tbl|def):([^\]]+)\]/g;

	return (tree: Root) => {
		visit(tree, 'text', (node: { type: string; value: string }, index, parent) => {
			if (!parent || index === undefined) return;

			const text = node.value;
			const matches = [...text.matchAll(REFERENCE_PATTERN)];

			if (matches.length === 0) return;

			// Build new nodes from the text with references
			const newNodes: Node[] = [];
			let lastIndex = 0;

			for (const match of matches) {
				const [fullMatch, refType, refId] = match;
				const matchIndex = match.index!;

				// Add text before the reference
				if (matchIndex > lastIndex) {
					newNodes.push({
						type: 'text',
						value: text.slice(lastIndex, matchIndex)
					} as Node);
				}

				// Create a link node for the reference
				newNodes.push({
					type: 'link',
					url: `#ref:${refType}:${refId}`,
					children: [{ type: 'text', value: fullMatch }],
					data: {
						hName: 'a',
						hProperties: {
							className: 'cross-reference',
							'data-ref-type': refType,
							'data-ref-id': refId,
							href: `#ref:${refType}:${refId}`
						}
					}
				} as Node);

				lastIndex = matchIndex + fullMatch.length;
			}

			// Add remaining text after last reference
			if (lastIndex < text.length) {
				newNodes.push({
					type: 'text',
					value: text.slice(lastIndex)
				} as Node);
			}

			// Replace the original text node with new nodes
			(parent as { children: Node[] }).children.splice(index, 1, ...newNodes);
		});
	};
}

// =============================================================================
// REHYPE PLUGINS
// =============================================================================

/**
 * Rehype plugin to wrap content blocks with icon and title HTML
 */
function rehypeContentBlocks() {
	return (tree: Node) => {
		visit(tree, 'element', (node: { tagName: string; properties?: Record<string, unknown>; children?: Node[] }) => {
			const props = node.properties;
			if (!props || typeof props.className !== 'string') return;
			if (!props.className.includes('content-block')) return;

			const blockType = props['dataBlockType'] as ContentBlockType | undefined;
			if (!blockType) return;

			const title = (props['dataTitle'] as string) || BLOCK_TITLES[blockType];
			const icon = (props['dataIcon'] as string) || BLOCK_ICONS[blockType];
			const term = props['dataTerm'] as string | undefined;

			// Clean up data attributes from final HTML
			delete props['dataBlockType'];
			delete props['dataTitle'];
			delete props['dataIcon'];
			delete props['dataTerm'];

			// Build the title text
			let titleHtml = title;
			if (blockType === 'definition' && term) {
				titleHtml = `<span class="content-block-label">${title}:</span> ${term}`;
			}

			// Store current children
			const content = node.children || [];

			// Rebuild children with icon and content structure
			node.children = [
				{
					type: 'raw',
					value: icon
				} as unknown as Node,
				{
					type: 'element',
					tagName: 'div',
					properties: { className: 'content-block-content' },
					children: [
						{
							type: 'element',
							tagName: 'h4',
							properties: { className: 'content-block-title' },
							children: [{ type: 'raw', value: titleHtml }]
						} as unknown as Node,
						{
							type: 'element',
							tagName: 'div',
							properties: {},
							children: content
						} as unknown as Node
					]
				} as unknown as Node
			];
		});
	};
}

/**
 * Rehype plugin to shift heading levels (h1→h2, h2→h3, etc.)
 */
function rehypeShiftHeadings() {
	return (tree: Node) => {
		visit(tree, 'element', (node: { tagName: string }) => {
			const match = node.tagName.match(/^h([1-6])$/);
			if (match) {
				const level = parseInt(match[1], 10);
				const newLevel = Math.min(level + 1, 6);
				node.tagName = `h${newLevel}`;
			}
		});
	};
}

// =============================================================================
// MARKDOWN PROCESSOR
// =============================================================================

/**
 * Process markdown content to HTML
 */
export async function processMarkdown(content: string): Promise<string> {
	const result = await unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkDirective)
		.use(remarkCustomDirectives)
		.use(remarkCrossReferences)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex, {
			strict: false,
			trust: true,
			throwOnError: false
		})
		.use(rehypeContentBlocks)
		.use(rehypeShiftHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(content);

	return String(result);
}

/**
 * Synchronous markdown processing (for simple cases)
 * Note: This blocks the event loop - prefer async version
 */
export function processMarkdownSync(content: string): string {
	const result = unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(remarkMath)
		.use(remarkDirective)
		.use(remarkCustomDirectives)
		.use(remarkCrossReferences)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeKatex, {
			strict: false,
			trust: true,
			throwOnError: false
		})
		.use(rehypeContentBlocks)
		.use(rehypeShiftHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.processSync(content);

	return String(result);
}
