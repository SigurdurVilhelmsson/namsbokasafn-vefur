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
import rehypeKatex from 'rehype-katex';
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
	| 'link-to-material'
	| 'chemistry-everyday'
	| 'chapter-overview'
	| 'scientist-spotlight'
	| 'how-science-connects';

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
	},
	'learning-objectives': {
		className: 'content-block learning-objectives',
		blockType: 'learning-objectives'
	},
	'link-to-material': {
		className: 'content-block link-to-material',
		blockType: 'link-to-material'
	},
	'chemistry-everyday': {
		className: 'content-block chemistry-everyday',
		blockType: 'chemistry-everyday'
	},
	'chapter-overview': {
		className: 'content-block chapter-overview',
		blockType: 'chapter-overview'
	},
	'scientist-spotlight': {
		className: 'content-block scientist-spotlight',
		blockType: 'scientist-spotlight'
	},
	'how-science-connects': {
		className: 'content-block how-science-connects',
		blockType: 'how-science-connects'
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
	'link-to-material': 'Tengill á námsefni',
	'chemistry-everyday': 'Efnafræði í daglegu lífi',
	'chapter-overview': 'Yfirlit kafla',
	'scientist-spotlight': 'Nærmynd af efnafræðingi',
	'how-science-connects': 'Hvernig vísindin tengjast'
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
	'link-to-material':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>',
	'chemistry-everyday':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
	'chapter-overview':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>',
	'scientist-spotlight':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
	'how-science-connects':
		'<svg class="content-block-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>'
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
 * Rehype plugin to wrap images with their captions into figure elements
 * Detects patterns like:
 *   <p><img ...></p>
 *   <p>Mynd 1.28 Caption text...</p>
 * And converts them to:
 *   <figure>
 *     <img ...>
 *     <figcaption>Mynd 1.28 Caption text...</figcaption>
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

			// Check if next sibling is a paragraph that looks like a caption
			const nextIndex = index + 1;
			if (nextIndex >= parentEl.children.length) return;

			const nextSibling = parentEl.children[nextIndex] as Element;
			if (nextSibling.type !== 'element' || nextSibling.tagName !== 'p') return;

			// Extract text content of the next paragraph to check if it's a caption
			const captionText = extractTextContent(nextSibling);
			if (!CAPTION_PATTERN.test(captionText.trim())) return;

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
						children: nextSibling.children || []
					} as Element
				]
			};

			// Replace the image paragraph with the figure
			parentEl.children[index] = figureElement as ElementContent;

			// Remove the caption paragraph (now incorporated into figcaption)
			parentEl.children.splice(nextIndex, 1);
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
 * Check if a paragraph contains only a single KaTeX equation (treat as block)
 */
function isBlockEquation(parent: Element, katexNode: Element): boolean {
	if (parent.tagName !== 'p') return false;

	// Check if katex span is the only significant child
	const significantChildren = parent.children?.filter((child) => {
		if (child.type === 'text') {
			return (child as { value: string }).value.trim().length > 0;
		}
		return child.type === 'element';
	}) || [];

	return significantChildren.length === 1 && significantChildren[0] === katexNode;
}

/**
 * Extract LaTeX source from KaTeX element
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
function createEquationWrapper(katexNode: Element, latex: string): Element {
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
				children: [katexNode]
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
 * Rehype plugin to wrap KaTeX equations with accessibility and interaction features
 */
function rehypeEquationWrapper() {
	return (tree: Node) => {
		// Process paragraphs that contain only equations - convert to block equations
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!parent || index === undefined) return;

			// Check if this is a paragraph containing only a KaTeX equation
			if (node.tagName === 'p') {
				const children = node.children || [];

				// Find katex spans
				const katexSpans = children.filter((child) => {
					if (child.type !== 'element') return false;
					const el = child as Element;
					const className = Array.isArray(el.properties?.className)
						? el.properties.className.join(' ')
						: (el.properties?.className as string) || '';
					return el.tagName === 'span' && className.includes('katex');
				}) as Element[];

				// Check if paragraph has only whitespace text and one katex span
				const nonWhitespaceText = children.filter((child) => {
					if (child.type === 'text') {
						return (child as { value: string }).value.trim().length > 0;
					}
					return child.type === 'element';
				});

				if (nonWhitespaceText.length === 1 && katexSpans.length === 1) {
					// This is a standalone block equation
					const katexNode = katexSpans[0];
					const latex = extractLatex(katexNode);
					const wrapper = createEquationWrapper(katexNode, latex);

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

			if (node.tagName === 'span' && className.includes('katex')) {
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
// MARKDOWN PROCESSOR
// =============================================================================

/**
 * Process markdown content to HTML
 */
export async function processMarkdown(content: string): Promise<string> {
	const result = await unified()
		.use(remarkParse)
		.use(remarkPandocSubSup) // Must be before remarkGfm!
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
		.use(rehypeFigureCaptions) // Wrap images + captions into figure elements
		.use(rehypeEquationWrapper)
		.use(rehypeContentBlocks)
		.use(rehypeSlug)
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
		.use(remarkPandocSubSup) // Must be before remarkGfm!
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
		.use(rehypeFigureCaptions) // Wrap images + captions into figure elements
		.use(rehypeEquationWrapper)
		.use(rehypeContentBlocks)
		.use(rehypeSlug)
		.use(rehypeShiftHeadings)
		.use(rehypeStringify, { allowDangerousHtml: true })
		.processSync(content);

	return String(result);
}
