/**
 * Markdown processing utilities using unified/remark/rehype
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeMathjaxSvg from 'rehype-mathjax/svg';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Node, Data } from 'unist';
import type { Element, ElementContent, RootContent } from 'hast';

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
	| 'common-misconception'
	| 'learning-objectives'
	| 'link-to-learning' // OpenStax class name
	| 'everyday-life' // OpenStax class name
	| 'chapter-overview'
	| 'chemist-portrait' // OpenStax class name
	| 'sciences-interconnect'; // OpenStax class name

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
	// Practice problem - interactive problems within content
	'practice-problem': {
		className: 'practice-problem-container',
		additionalProps: (attrs) => ({
			'data-problem-id': attrs.id || undefined
		})
	},
	// End-of-chapter exercise - minimal styling with running numbers (OpenStax style)
	// Note: All <exercise> tags in OpenStax are EOC exercises
	exercise: {
		className: 'eoc-exercise',
		additionalProps: (attrs) => ({
			id: attrs.id || undefined,  // Actual id for anchor navigation
			'data-exercise-id': attrs.id || undefined,
			'data-exercise-number': attrs.number || undefined
		})
	},
	answer: {
		className: 'practice-answer-container'
	},
	svar: {
		className: 'practice-answer-container'
	},
	explanation: {
		className: 'practice-explanation-container'
	},
	hint: {
		className: 'practice-hint-container'
	},
	// Answer key entry - for separate answer key pages
	'answer-entry': {
		className: 'answer-entry',
		additionalProps: (attrs) => ({
			id: attrs.id || undefined,  // Actual id for anchor navigation
			'data-exercise-id': attrs.id || undefined,
			'data-exercise-number': attrs.number || undefined
		})
	},
	// Key term entry - for key terms page
	'glossary-entry': {
		className: 'glossary-entry',
		additionalProps: (attrs) => ({
			'data-term': attrs.term || undefined,
			'data-term-id': attrs.id || undefined
		})
	},
	// Key equation entry - for key equations page
	'key-equation': {
		className: 'key-equation-entry',
		additionalProps: (attrs) => ({
			'data-equation-id': attrs.id || undefined,
			'data-equation-number': attrs.number || undefined
		})
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
	},
	'learning-objectives': {
		className: 'content-block learning-objectives',
		blockType: 'learning-objectives'
	},
	// OpenStax class names
	'link-to-learning': {
		className: 'content-block link-to-learning',
		blockType: 'link-to-learning'
	},
	'everyday-life': {
		className: 'content-block everyday-life',
		blockType: 'everyday-life'
	},
	'chemist-portrait': {
		className: 'content-block chemist-portrait',
		blockType: 'chemist-portrait'
	},
	'sciences-interconnect': {
		className: 'content-block sciences-interconnect',
		blockType: 'sciences-interconnect'
	},
	'chapter-overview': {
		className: 'content-block chapter-overview',
		blockType: 'chapter-overview'
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
	'common-misconception': 'Algeng misskilningur',
	'learning-objectives': 'Námsmarkmið',
	// OpenStax class names
	'link-to-learning': 'Tengill á námsefni',
	'everyday-life': 'Efnafræði í daglegu lífi',
	'chemist-portrait': 'Nærmynd af efnafræðingi',
	'sciences-interconnect': 'Hvernig vísindin tengjast',
	'chapter-overview': 'Yfirlit kafla'
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
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
	'learning-objectives':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>',
	// OpenStax class names
	'link-to-learning':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>',
	'everyday-life':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
	'chemist-portrait':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
	'sciences-interconnect':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
	'chapter-overview':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>'
};

// =============================================================================
// REMARK PLUGINS
// =============================================================================

/**
 * Remark plugin to convert Pandoc-style subscripts and superscripts
 * Converts ~text~ to <sub> and ^text^ to <sup>
 * Must run BEFORE remarkGfm to avoid ~ being treated as strikethrough
 */
function remarkPandocSubSup() {
	return (tree: Root) => {
		visit(tree, 'text', (node: { type: string; value: string }, index, parent) => {
			if (!parent || index === undefined) return;

			const text = node.value;
			// Match ~subscript~ and ^superscript^ patterns
			const pattern = /(~([^~\s]+)~|\^([^\^\s]+)\^)/g;
			const matches = [...text.matchAll(pattern)];

			if (matches.length === 0) return;

			const newNodes: Node[] = [];
			let lastIndex = 0;

			for (const match of matches) {
				const [fullMatch, , subscriptText, superscriptText] = match;
				const matchIndex = match.index!;

				// Add text before the match
				if (matchIndex > lastIndex) {
					newNodes.push({
						type: 'text',
						value: text.slice(lastIndex, matchIndex)
					} as Node);
				}

				// Create sub or sup node
				if (subscriptText) {
					newNodes.push({
						type: 'html',
						value: `<sub>${subscriptText}</sub>`
					} as Node);
				} else if (superscriptText) {
					newNodes.push({
						type: 'html',
						value: `<sup>${superscriptText}</sup>`
					} as Node);
				}

				lastIndex = matchIndex + fullMatch.length;
			}

			// Add remaining text
			if (lastIndex < text.length) {
				newNodes.push({
					type: 'text',
					value: text.slice(lastIndex)
				} as Node);
			}

			// Replace the original text node
			(parent as { children: Node[] }).children.splice(index, 1, ...newNodes);
		});
	};
}

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
					dataBlockType: blockType,
					dataTitle: title,
					dataIcon: icon,
					dataTerm: term || undefined,
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
 * Extract text content from an element node recursively
 */
function extractTextContent(node: Node): string {
	if ('value' in node && typeof node.value === 'string') {
		return node.value;
	}
	if ('children' in node && Array.isArray(node.children)) {
		return (node.children as Node[]).map(extractTextContent).join('');
	}
	return '';
}

/**
 * Rehype plugin to wrap content blocks with icon and title HTML
 */
function rehypeContentBlocks() {
	return (tree: Node) => {
		visit(tree, 'element', (node: { tagName: string; properties?: Record<string, unknown>; children?: Node[] }) => {
			const props = node.properties;
			if (!props) return;

			// Handle className as either string or array
			const className = Array.isArray(props.className)
				? props.className.join(' ')
				: (typeof props.className === 'string' ? props.className : '');

			if (!className.includes('content-block')) return;

			const blockType = props['dataBlockType'] as ContentBlockType | undefined;
			if (!blockType) return;

			let title = (props['dataTitle'] as string) || BLOCK_TITLES[blockType];
			const icon = (props['dataIcon'] as string) || BLOCK_ICONS[blockType];
			const term = props['dataTerm'] as string | undefined;

			// Clean up data attributes from final HTML
			delete props['dataBlockType'];
			delete props['dataTitle'];
			delete props['dataIcon'];
			delete props['dataTerm'];

			// Store current children
			let content = node.children || [];

			// For example blocks, extract first heading as title
			if (blockType === 'example' && content.length > 0) {
				const firstChild = content[0] as Element;
				if (
					firstChild.type === 'element' &&
					(firstChild.tagName === 'h3' || firstChild.tagName === 'h4')
				) {
					const headingText = extractTextContent(firstChild);
					if (headingText.trim()) {
						title = headingText.trim();
						// Remove the heading from content
						content = content.slice(1);
					}
				}
			}

			// Build the title text
			let titleHtml = title;
			if (blockType === 'definition' && term) {
				titleHtml = `<span class="content-block-label">${title}:</span> ${term}`;
			}

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

/**
 * Rehype plugin to process table attributes from marker comments
 * Looks for <!-- TABLE_ATTRS: id="..." summary="..." --> before tables
 */
function rehypeTableAttributes() {
	return (tree: Node) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!parent || index === undefined || node.tagName !== 'table') return;

			const parentEl = parent as Element;

			// Look for preceding comment node with TABLE_ATTRS
			for (let i = index - 1; i >= 0; i--) {
				const sibling = parentEl.children[i];

				// Skip whitespace text nodes
				if (sibling.type === 'text') {
					const textValue = (sibling as { value: string }).value;
					if (textValue.trim().length === 0) continue;
					break;  // Non-whitespace text - stop looking
				}

				// Found a raw/comment node
				if (sibling.type === 'raw' || sibling.type === 'comment') {
					const value = (sibling as { value: string }).value || '';
					const match = value.match(/TABLE_ATTRS:\s*(.*?)\s*-->/);

					if (match) {
						const attrString = match[1];

						// Parse id and summary
						const idMatch = attrString.match(/id="([^"]*)"/);
						const summaryMatch = attrString.match(/summary="([^"]*)"/);

						if (idMatch) {
							node.properties = node.properties || {};
							node.properties.id = idMatch[1];
						}

						if (summaryMatch) {
							node.properties = node.properties || {};
							// Use aria-describedby pattern for accessibility
							node.properties['aria-label'] = summaryMatch[1];
						}

						// Remove the marker comment
						parentEl.children.splice(i, 1);
					}
					break;
				}

				// Any other element type - stop looking
				if (sibling.type === 'element') break;
			}
		});
	};
}

/**
 * Rehype plugin to apply IDs to equations from marker comments
 * Processes <!-- EQ_ID:id --> markers added by preprocessEquationAttributes
 */
function rehypeEquationIds() {
	return (tree: Node) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!parent || index === undefined) return;

			const parentEl = parent as Element;

			// Check if this is a paragraph containing a MathJax equation
			if (node.tagName !== 'p') return;

			// Look for preceding comment node with EQ_ID
			for (let i = index - 1; i >= 0; i--) {
				const sibling = parentEl.children[i];

				// Skip whitespace text nodes
				if (sibling.type === 'text') {
					const textValue = (sibling as { value: string }).value;
					if (textValue.trim().length === 0) continue;
					break;  // Non-whitespace text - stop looking
				}

				// Found a raw/comment node
				if (sibling.type === 'raw' || sibling.type === 'comment') {
					const value = (sibling as { value: string }).value || '';
					const match = value.match(/EQ_ID:(\S+)\s*-->/);

					if (match) {
						const eqId = match[1];

						// Check if this paragraph contains a MathJax equation
						const hasMath = node.children?.some((child) => {
							if (child.type !== 'element') return false;
							const el = child as Element;
							const className = Array.isArray(el.properties?.className)
								? el.properties.className.join(' ')
								: (el.properties?.className as string) || '';
							return className.includes('MathJax') || el.tagName === 'mjx-container';
						});

						if (hasMath) {
							// Apply the ID to the paragraph (which contains the equation)
							node.properties = node.properties || {};
							node.properties.id = eqId;
							node.properties.className = node.properties.className
								? `${node.properties.className} equation-block`
								: 'equation-block';

							// Remove the marker comment
							parentEl.children.splice(i, 1);
						}
					}
					break;
				}

				// Any other element type - stop looking
				if (sibling.type === 'element') break;
			}
		});

		// Also handle inline equation markers
		visit(tree, 'raw', (node: { type: string; value: string }, index, parent) => {
			if (!parent || index === undefined) return;

			const value = node.value || '';
			const match = value.match(/<!--\s*EQ_INLINE_ID:(\S+)\s*-->/);
			if (!match) return;

			const eqId = match[1];
			const parentEl = parent as Element;

			// Find the next sibling that's a MathJax element
			for (let i = index + 1; i < parentEl.children.length; i++) {
				const sibling = parentEl.children[i];

				if (sibling.type === 'text') {
					const textValue = (sibling as { value: string }).value;
					if (textValue.trim().length === 0) continue;
					break;  // Non-whitespace text - stop looking
				}

				if (sibling.type === 'element') {
					const el = sibling as Element;
					const className = Array.isArray(el.properties?.className)
						? el.properties.className.join(' ')
						: (el.properties?.className as string) || '';

					if (className.includes('MathJax') || el.tagName === 'mjx-container') {
						// Apply the ID to the MathJax element
						el.properties = el.properties || {};
						el.properties.id = eqId;

						// Remove the marker comment
						parentEl.children.splice(index, 1);
						return;
					}
					break;
				}
			}
		});
	};
}

/**
 * Rehype plugin to apply Pandoc-style IDs from data attributes to elements
 * Processes data-pandoc-id, data-term-id, data-caption-id
 */
function rehypePandocIds() {
	return (tree: Node) => {
		visit(tree, 'element', (node: Element) => {
			const props = node.properties;
			if (!props) return;

			// Process data-pandoc-id on images
			if (props['dataPandocId']) {
				props.id = props['dataPandocId'];
				delete props['dataPandocId'];
			}

			// Process data-pandoc-class on images
			if (props['dataPandocClass']) {
				const existingClass = Array.isArray(props.className)
					? props.className.join(' ')
					: (typeof props.className === 'string' ? props.className : '');
				const newClasses = (props['dataPandocClass'] as string).split(' ');
				props.className = existingClass ? `${existingClass} ${newClasses.join(' ')}` : newClasses.join(' ');
				delete props['dataPandocClass'];
			}

			// Process data-term-id on strong elements (glossary terms)
			if (node.tagName === 'strong' && props['dataTermId']) {
				props.id = props['dataTermId'];
				props.className = props.className
					? `${props.className} glossary-term`
					: 'glossary-term';
				delete props['dataTermId'];
			}

			// Process data-caption-id on em elements (figure captions)
			if (node.tagName === 'em' && props['dataCaptionId']) {
				props.id = props['dataCaptionId'];
				props.className = props.className
					? `${props.className} figure-caption-id`
					: 'figure-caption-id';
				delete props['dataCaptionId'];
			}
		});
	};
}

/**
 * Process caption children to wrap "Mynd X.Y" label in <strong> tag
 */
function processCaptionLabel(children: ElementContent[]): ElementContent[] {
	const LABEL_PATTERN = /^(Mynd\s+\d+\.\d+)\s*/;

	if (children.length === 0) return children;

	const firstChild = children[0];

	// Only process if first child is a text node
	if (firstChild.type !== 'text') return children;

	const textNode = firstChild as { type: 'text'; value: string };
	const match = textNode.value.match(LABEL_PATTERN);

	if (!match) return children;

	const label = match[1];
	const rest = textNode.value.slice(match[0].length);

	const newChildren: ElementContent[] = [
		{
			type: 'element',
			tagName: 'strong',
			properties: { className: 'figure-label' },
			children: [{ type: 'text', value: label }]
		} as Element
	];

	// Add remaining text if any
	if (rest) {
		newChildren.push({ type: 'text', value: ' ' + rest } as ElementContent);
	}

	// Add remaining original children
	newChildren.push(...children.slice(1));

	return newChildren;
}

/**
 * Rehype plugin to wrap images with their captions into figure elements
 * Detects patterns like:
 *   <p><img ...></p>
 *   <p>Mynd 1.28 Caption text...</p>
 * And converts them to:
 *   <figure>
 *     <img ...>
 *     <figcaption><strong>Mynd 1.28</strong> Caption text...</figcaption>
 *   </figure>
 */
function rehypeFigureCaptions() {
	// Pattern to match Icelandic figure captions: "Mynd X.Y" or "Mynd X.Y."
	const CAPTION_PATTERN = /^Mynd\s+\d+\.\d+/;

	return (tree: Node) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!parent || index === undefined) return;

			const parentEl = parent as Element;
			if (!parentEl.children) return;

			// Check if this is a paragraph containing only an image
			if (node.tagName !== 'p') return;

			const children = node.children || [];

			// Find img elements in this paragraph
			const imgElements = children.filter((child): child is Element =>
				child.type === 'element' && (child as Element).tagName === 'img'
			);

			// Check if paragraph contains only an image (and optional whitespace)
			const nonWhitespaceChildren = children.filter((child) => {
				if (child.type === 'text') {
					return (child as { value: string }).value.trim().length > 0;
				}
				return child.type === 'element';
			});

			if (imgElements.length !== 1 || nonWhitespaceChildren.length !== 1) return;

			const imgNode = imgElements[0];

			// Find the next sibling paragraph, skipping whitespace text nodes
			let captionIndex = -1;
			let captionNode: Element | null = null;

			for (let i = index + 1; i < parentEl.children.length; i++) {
				const sibling = parentEl.children[i];

				// Skip whitespace-only text nodes
				if (sibling.type === 'text') {
					const textValue = (sibling as { value: string }).value;
					if (textValue.trim().length === 0) continue;
					// Non-whitespace text node means no caption follows
					break;
				}

				// Found an element - check if it's a caption paragraph
				if (sibling.type === 'element') {
					const siblingEl = sibling as Element;
					if (siblingEl.tagName === 'p') {
						const captionText = extractTextContent(siblingEl);
						if (CAPTION_PATTERN.test(captionText.trim())) {
							captionIndex = i;
							captionNode = siblingEl;
						}
					}
					// Stop after first element (paragraph or otherwise)
					break;
				}
			}

			// No caption found
			if (captionIndex === -1 || !captionNode) return;

			// Process caption children to wrap "Mynd X.Y" in <strong>
			const processedCaptionChildren = processCaptionLabel(captionNode.children || []);

			// Create the figure element
			const figureElement: Element = {
				type: 'element',
				tagName: 'figure',
				properties: {},
				children: [
					imgNode,
					{
						type: 'element',
						tagName: 'figcaption',
						properties: {},
						children: processedCaptionChildren
					} as Element
				]
			};

			// Replace the image paragraph with the figure
			parentEl.children[index] = figureElement as ElementContent;

			// Remove whitespace nodes between image and caption, then the caption itself
			// Work backwards to avoid index shifting issues
			for (let i = captionIndex; i > index; i--) {
				parentEl.children.splice(i, 1);
			}
		});
	};
}

// =============================================================================
// EQUATION ACCESSIBILITY
// =============================================================================

/**
 * Convert LaTeX to readable Icelandic description for screen readers
 */
function latexToSpeech(latex: string): string {
	if (!latex) return 'Stærðfræðijafna';

	const readable = latex
		// Fractions
		.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) deilt með ($2)')
		// Text commands
		.replace(/\\text\{([^}]+)\}/g, '$1')
		// Subscripts and superscripts
		.replace(/_\{([^}]+)\}/g, ' undirskrift $1')
		.replace(/\^2/g, ' í öðru veldi')
		.replace(/\^3/g, ' í þriðja veldi')
		.replace(/\^\{([^}]+)\}/g, ' í $1 veldi')
		// Common symbols
		.replace(/\\pm/g, ' plús eða mínus ')
		.replace(/\\times/g, ' sinnum ')
		.replace(/\\div/g, ' deilt með ')
		.replace(/\\cdot/g, ' sinnum ')
		.replace(/\\sqrt\{([^}]+)\}/g, 'kvaðratrótin af $1')
		.replace(/\\sum/g, 'summa')
		.replace(/\\int/g, 'heildi')
		.replace(/\\infty/g, 'óendanleiki')
		.replace(/\\pi/g, 'pí')
		.replace(/\\alpha/g, 'alfa')
		.replace(/\\beta/g, 'beta')
		.replace(/\\gamma/g, 'gamma')
		.replace(/\\delta/g, 'delta')
		.replace(/\\theta/g, 'theta')
		.replace(/\\lambda/g, 'lambda')
		.replace(/\\mu/g, 'mý')
		.replace(/\\sigma/g, 'sigma')
		.replace(/\\rho/g, 'ró')
		.replace(/\\left/g, '')
		.replace(/\\right/g, '')
		// Chemical notation
		.replace(/\\ce\{([^}]+)\}/g, 'efnajafna: $1')
		// Clean up remaining LaTeX commands
		.replace(/\\[a-zA-Z]+/g, ' ')
		.replace(/[{}]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	return readable ? `Stærðfræðijafna: ${readable}` : 'Stærðfræðijafna';
}

/**
 * Check if a paragraph contains only a single MathJax equation (treat as block)
 */
function isBlockEquation(parent: Element, mathNode: Element): boolean {
	if (parent.tagName !== 'p') return false;

	// Check if math element is the only significant child
	const significantChildren = parent.children?.filter((child) => {
		if (child.type === 'text') {
			return (child as { value: string }).value.trim().length > 0;
		}
		return child.type === 'element';
	}) || [];

	return significantChildren.length === 1 && significantChildren[0] === mathNode;
}

/**
 * Extract LaTeX source from MathJax element
 */
function extractLatex(node: Element): string {
	let latex = '';
	visit(node, 'element', (child: Element) => {
		if (
			child.tagName === 'annotation' &&
			child.properties?.encoding === 'application/x-tex'
		) {
			const textNode = child.children?.[0];
			if (textNode && 'value' in textNode) {
				latex = textNode.value as string;
			}
		}
	});
	return latex;
}

/**
 * Create equation wrapper element
 */
function createEquationWrapper(mathNode: Element, latex: string): Element {
	const ariaLabel = latexToSpeech(latex);

	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: 'equation-wrapper group',
			role: 'math',
			'aria-label': ariaLabel,
			tabIndex: 0,
			'data-latex': latex
		},
		children: [
			{
				type: 'element',
				tagName: 'div',
				properties: { className: 'equation-content' },
				children: [mathNode]
			},
			{
				type: 'element',
				tagName: 'div',
				properties: { className: 'equation-actions' },
				children: [
					{
						type: 'element',
						tagName: 'button',
						properties: {
							className: 'equation-copy-btn',
							type: 'button',
							title: 'Afrita LaTeX',
							'aria-label': 'Afrita LaTeX jöfnu',
							'data-action': 'copy-latex'
						},
						children: [{ type: 'text', value: 'Afrita' }]
					},
					{
						type: 'element',
						tagName: 'button',
						properties: {
							className: 'equation-citation-btn',
							type: 'button',
							title: 'Afrita tilvísun',
							'aria-label': 'Afrita tilvísun í jöfnu',
							'data-action': 'copy-citation'
						},
						children: [{ type: 'text', value: '📋' }]
					},
					{
						type: 'element',
						tagName: 'button',
						properties: {
							className: 'equation-zoom-btn',
							type: 'button',
							title: 'Stækka',
							'aria-label': 'Stækka jöfnu',
							'data-action': 'zoom-equation'
						},
						children: [{ type: 'text', value: '⊕' }]
					}
				]
			}
		]
	};
}

/**
 * Rehype plugin to wrap MathJax equations with accessibility and interaction features
 */
function rehypeEquationWrapper() {
	return (tree: Node) => {
		// Process paragraphs that contain only equations - convert to block equations
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!parent || index === undefined) return;

			// Check if this is a paragraph containing only a MathJax equation
			if (node.tagName === 'p') {
				const children = node.children || [];

				// Find MathJax elements (mjx-container from rehype-mathjax)
				const mathSpans = children.filter((child) => {
					if (child.type !== 'element') return false;
					const el = child as Element;
					const className = Array.isArray(el.properties?.className)
						? el.properties.className.join(' ')
						: (el.properties?.className as string) || '';
					return (el.tagName === 'mjx-container' || el.tagName === 'span') &&
						(className.includes('MathJax') || className.includes('mathjax'));
				}) as Element[];

				// Check if paragraph has only whitespace text and one math element
				const nonWhitespaceText = children.filter((child) => {
					if (child.type === 'text') {
						return (child as { value: string }).value.trim().length > 0;
					}
					return child.type === 'element';
				});

				if (nonWhitespaceText.length === 1 && mathSpans.length === 1) {
					// This is a standalone block equation
					const mathNode = mathSpans[0];
					const latex = extractLatex(mathNode);
					const wrapper = createEquationWrapper(mathNode, latex);

					// Replace the paragraph with the wrapper
					const parentEl = parent as { children: RootContent[] };
					if (parentEl.children) {
						parentEl.children[index] = wrapper as RootContent;
					}
					return;
				}
			}
		});

		// Second pass: add accessibility to remaining inline equations
		visit(tree, 'element', (node: Element) => {
			const className = Array.isArray(node.properties?.className)
				? node.properties.className.join(' ')
				: (node.properties?.className as string) || '';

			if ((node.tagName === 'mjx-container' || node.tagName === 'span') &&
				(className.includes('MathJax') || className.includes('mathjax'))) {
				// Skip if already wrapped (check if parent is equation-content)
				const latex = extractLatex(node);

				// Add accessibility attributes if not already present
				node.properties = node.properties || {};
				if (!node.properties.role) {
					node.properties.role = 'math';
					node.properties['aria-label'] = latexToSpeech(latex);
				}
			}
		});
	};
}

// =============================================================================
// PREPROCESSING
// =============================================================================

/**
 * Icelandic to English directive name mapping
 * remark-directive only supports ASCII characters in directive names
 */
const ICELANDIC_DIRECTIVE_MAP: Record<string, string> = {
	'æfingadæmi': 'practice-problem',
	'svar': 'answer'
};

// =============================================================================
// PANDOC ATTRIBUTE PROCESSING
// =============================================================================

/**
 * Parse Pandoc-style attribute string like {#id .class key="value"}
 * Returns object with id, classes array, and other key-value pairs
 */
function parsePandocAttributes(attrString: string): {
	id?: string;
	classes: string[];
	attrs: Record<string, string>;
} {
	const result = { id: undefined as string | undefined, classes: [] as string[], attrs: {} as Record<string, string> };

	if (!attrString || !attrString.startsWith('{') || !attrString.endsWith('}')) {
		return result;
	}

	const inner = attrString.slice(1, -1).trim();
	if (!inner) return result;

	// Match patterns: #id, .class, key="value"
	const patterns = [
		/#([\w-]+)/g,           // ID: #foo
		/\.([\w-]+)/g,          // Class: .foo
		/([\w-]+)="([^"]*)"/g   // Key-value: key="value"
	];

	// Extract IDs
	let match;
	const idPattern = /#([\w-]+)/g;
	while ((match = idPattern.exec(inner)) !== null) {
		result.id = match[1];  // Take last ID if multiple
	}

	// Extract classes
	const classPattern = /\.([\w-]+)/g;
	while ((match = classPattern.exec(inner)) !== null) {
		result.classes.push(match[1]);
	}

	// Extract key-value pairs
	const kvPattern = /([\w-]+)="([^"]*)"/g;
	while ((match = kvPattern.exec(inner)) !== null) {
		result.attrs[match[1]] = match[2];
	}

	return result;
}

/**
 * Convert Icelandic directive names to their English equivalents
 * This is needed because remark-directive only supports ASCII in directive names
 */
function normalizeDirectiveNames(content: string): string {
	// Match :::directivename at the start of a line
	return content.replace(/^(:::)(æfingadæmi|svar)/gm, (match, prefix, name) => {
		const englishName = ICELANDIC_DIRECTIVE_MAP[name];
		return englishName ? `${prefix}${englishName}` : match;
	});
}

/**
 * Unescape markdown link brackets that were incorrectly escaped
 * Some content pipelines escape [ and ] as \[ and \] which breaks links
 */
function unescapeBrackets(content: string): string {
	// Only unescape brackets that are part of markdown link syntax
	// Pattern: \[text\](url) -> [text](url)
	return content.replace(/\\(\[|\])/g, '$1');
}

/**
 * Process Pandoc-style attributes on images
 * Converts: ![alt](url){#id .class} → ![alt](url){data-id="id" data-class="class"}
 * This preprocessing makes it easier for the rehype plugin to extract attributes
 */
function preprocessImageAttributes(content: string): string {
	// Pattern: ![alt](url){...attributes...}
	const imgAttrPattern = /!\[([^\]]*)\]\(([^)]+)\)\{([^}]+)\}/g;

	return content.replace(imgAttrPattern, (match, alt, url, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);
		const parts = [`![${alt}](${url})`];

		// Build data attributes string for rehype to process
		const dataAttrs: string[] = [];
		if (parsed.id) dataAttrs.push(`data-pandoc-id="${parsed.id}"`);
		if (parsed.classes.length > 0) dataAttrs.push(`data-pandoc-class="${parsed.classes.join(' ')}"`);
		for (const [key, value] of Object.entries(parsed.attrs)) {
			dataAttrs.push(`data-pandoc-${key}="${value}"`);
		}

		if (dataAttrs.length > 0) {
			// Use HTML img tag to preserve attributes
			return `<img src="${url}" alt="${alt}" ${dataAttrs.join(' ')} />`;
		}

		return match;
	});
}

/**
 * Process Pandoc-style attributes on inline elements (bold, italic)
 * Converts: **term**{#id} → <strong data-term-id="id">term</strong>
 * Converts: **term**{id="id"} → <strong data-term-id="id">term</strong>
 * Converts: *caption*{#id} → <em data-caption-id="id">caption</em>
 */
function preprocessInlineAttributes(content: string): string {
	// Bold with attributes: **text**{...}
	// Use non-greedy matching with 's' flag behavior ([\s\S] for dotall) to handle:
	// - Nested formatting like **term (*x*)**{id="..."}
	// - Multi-line terms like **útvermið\nferli**{#term-00009}
	const boldPattern = /\*\*([\s\S]+?)\*\*\{([^}]+)\}/g;
	content = content.replace(boldPattern, (match, text, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);
		const dataAttrs: string[] = [];
		// Use shorthand id OR long-form id="..." attribute
		const termId = parsed.id || parsed.attrs.id;
		if (termId) dataAttrs.push(`data-term-id="${termId}"`);
		if (parsed.classes.length > 0) dataAttrs.push(`class="${parsed.classes.join(' ')}"`);

		return `<strong ${dataAttrs.join(' ')}>${text}</strong>`;
	});

	// Italic with attributes: *text*{...} (often figure captions)
	// Use [\s\S] for dotall behavior to handle multi-line captions
	// The negative lookbehind prevents matching inside bold (**)
	const italicPattern = /(?<!\*)\*([\s\S]+?)\*\{([^}]+)\}/g;
	content = content.replace(italicPattern, (match, text, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);
		const dataAttrs: string[] = [];
		// Use shorthand id OR long-form id="..." attribute
		const captionId = parsed.id || parsed.attrs.id;
		if (captionId) dataAttrs.push(`data-caption-id="${captionId}"`);
		if (parsed.classes.length > 0) dataAttrs.push(`class="${parsed.classes.join(' ')}"`);

		return `<em ${dataAttrs.join(' ')}>${text}</em>`;
	});

	return content;
}

/**
 * Process Pandoc-style attributes on display equations
 * Uses a marker comment approach: equations stay as markdown so remark-math can process them,
 * then a rehype plugin applies the IDs after rendering.
 *
 * Converts: $$equation$${#id} → <!-- EQ_ID:id -->$$equation$$
 * Also handles: $$equation$${id="..."} long form
 */
function preprocessEquationAttributes(content: string): string {
	// Display equations with attributes: $$...$${ ... }
	// Match $$ equation $$ followed by {#id} or {id="..."}
	const displayEqPattern = /(\$\$[^$]+\$\$)\{([^}]+)\}/g;
	content = content.replace(displayEqPattern, (match, equation, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);
		const eqId = parsed.id || parsed.attrs.id;

		if (eqId) {
			// Add marker comment before the equation - rehype plugin will apply the ID
			return `<!-- EQ_ID:${eqId} -->\n${equation}`;
		}
		return equation; // Strip the attribute if no ID found
	});

	// Inline equations with attributes: $...${ ... }
	// Less common but handle for completeness
	const inlineEqPattern = /(?<!\$)(\$[^$\n]+\$)\{([^}]+)\}/g;
	content = content.replace(inlineEqPattern, (match, equation, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);
		const eqId = parsed.id || parsed.attrs.id;

		if (eqId) {
			// For inline, use a span marker that won't break the math rendering
			return `<!-- EQ_INLINE_ID:${eqId} -->${equation}`;
		}
		return equation; // Strip the attribute if no ID found
	});

	return content;
}

/**
 * Strip standalone Pandoc ID attributes that weren't caught by other preprocessors
 * These appear as orphan {#id} or {id="..."} on their own line or inline
 * Common after figure captions that aren't wrapped in italic
 */
function stripOrphanPandocAttributes(content: string): string {
	// Pattern: standalone {#id} or {id="..."} that appears:
	// 1. At the end of a line (after caption text)
	// 2. On its own line
	// 3. After closing asterisks for multi-line italics (figure captions)
	// We strip these as they've already been processed or aren't needed

	// First, handle {#id} on its own line (common for figure IDs)
	content = content.replace(/^\{#[\w-]+\}\s*$/gm, '');

	// Handle {#id} at end of line after closing paren, asterisk, or other caption terminators
	// Must NOT match directive attributes (:::directive{#id})
	// Key insight: directive attributes come immediately after word characters (directive name)
	// Orphan attributes come after punctuation like ), *, ], etc.
	content = content.replace(/([)\]*"'])\{#[\w-]+\}\s*$/gm, '$1');

	// Handle {id="..."} at end of line after punctuation (not after directive names)
	content = content.replace(/([)\]*"'])\{id="[^"]*"\}\s*$/gm, '$1');

	return content;
}

/**
 * Process Pandoc-style attributes on tables
 * Converts: |table|\n{id="..." summary="..."} → adds data attributes
 */
function preprocessTableAttributes(content: string): string {
	// Pattern: table followed by {id="..." ...} on next line
	// We mark these for the rehype plugin to pick up
	const tableAttrPattern = /(\|[^\n]+\|\n)\s*\{([^}]+)\}/g;

	return content.replace(tableAttrPattern, (match, table, attrs) => {
		const parsed = parsePandocAttributes(`{${attrs}}`);

		// Create a marker comment that rehype can process
		let marker = `<!-- TABLE_ATTRS:`;
		if (parsed.id || parsed.attrs.id) marker += ` id="${parsed.id || parsed.attrs.id}"`;
		if (parsed.attrs.summary) marker += ` summary="${parsed.attrs.summary}"`;
		marker += ` -->`;

		return `${marker}\n${table}`;
	});
}

/**
 * Style unprocessed equation placeholders [[EQ:N]] as warnings
 * These should have been replaced by apply-equations.js but may remain if equations file was missing
 */
function markUnprocessedEquations(content: string): string {
	// Pattern: [[EQ:N]] placeholders that weren't replaced
	const eqPattern = /\[\[EQ:(\d+)\]\]/g;

	return content.replace(eqPattern, (match, num) => {
		// Replace with a warning span that will be visible
		return `<span class="equation-placeholder-warning" title="Jafna ${num} vantar - [[EQ:${num}]]">[Jafna ${num}]</span>`;
	});
}

/**
 * Apply all preprocessing steps to content before markdown parsing
 * Order matters: more specific patterns should be processed before general ones
 */
function preprocessContent(content: string): string {
	let result = content;
	result = normalizeDirectiveNames(result);
	result = unescapeBrackets(result);
	result = preprocessImageAttributes(result);
	result = preprocessInlineAttributes(result);    // **term**{#id} and *caption*{#id}
	result = preprocessEquationAttributes(result);  // $$eq$${#id}
	result = preprocessTableAttributes(result);
	result = markUnprocessedEquations(result);
	result = stripOrphanPandocAttributes(result);   // Clean up any remaining {#id} or {id="..."}
	return result;
}

// =============================================================================
// MARKDOWN PROCESSOR
// =============================================================================

/**
 * Process markdown content to HTML
 */
export async function processMarkdown(content: string): Promise<string> {
	// Preprocess: normalize directives and fix escaped brackets
	const preprocessed = preprocessContent(content);

	const result = await unified()
		.use(remarkParse)
		.use(remarkPandocSubSup) // Must be before remarkGfm!
		.use(remarkGfm, { singleTilde: false })
		.use(remarkMath)
		.use(remarkDirective)
		.use(remarkCustomDirectives)
		.use(remarkCrossReferences)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeMathjaxSvg)
		.use(rehypeEquationIds) // Apply IDs from marker comments to rendered equations
		.use(rehypeFigureCaptions) // Wrap images + captions into figure elements
		.use(rehypeEquationWrapper)
		.use(rehypeContentBlocks)
		.use(rehypePandocIds) // Process Pandoc-style IDs from data attributes
		.use(rehypeTableAttributes) // Process table accessibility attributes
		.use(rehypeSlug)
		.use(rehypeShiftHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(preprocessed);

	return String(result);
}

/**
 * Synchronous markdown processing (for simple cases)
 * Note: This blocks the event loop - prefer async version
 */
export function processMarkdownSync(content: string): string {
	// Preprocess: normalize directives and fix escaped brackets
	const preprocessed = preprocessContent(content);

	const result = unified()
		.use(remarkParse)
		.use(remarkPandocSubSup) // Must be before remarkGfm!
		.use(remarkGfm, { singleTilde: false })
		.use(remarkMath)
		.use(remarkDirective)
		.use(remarkCustomDirectives)
		.use(remarkCrossReferences)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeMathjaxSvg)
		.use(rehypeEquationIds) // Apply IDs from marker comments to rendered equations
		.use(rehypeFigureCaptions) // Wrap images + captions into figure elements
		.use(rehypeEquationWrapper)
		.use(rehypeContentBlocks)
		.use(rehypePandocIds) // Process Pandoc-style IDs from data attributes
		.use(rehypeTableAttributes) // Process table accessibility attributes
		.use(rehypeSlug)
		.use(rehypeShiftHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.processSync(preprocessed);

	return String(result);
}
