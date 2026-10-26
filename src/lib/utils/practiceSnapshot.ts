/**
 * Practice-review snapshots (plan step S3.1, register PED-12 and PED-13).
 *
 * When a reader reveals a Check-your-learning answer, practiceReveal stores the problem so
 * /prof and /nam can show it again. Text alone loses the maths: the textContent of
 * `10<sup>22</sup>` is '1022', and a fraction collapses. So the store also keeps a trimmed
 * copy of the HTML, limited to the elements and attributes below:
 *   - kept: paragraphs, emphasis, underline (§4.2 asks about the underlined element), sup/sub,
 *     tables, lists, images with a same-site address, and
 *     MathML. The page's MathJax SVG is dropped, and the hidden assistive `<math>` beside it is
 *     shown instead (it was hidden only by its inline style, which is not kept). Browsers
 *     render MathML natively, so the snapshot needs no MathJax and works offline;
 *   - dropped with their content: the page's own controls and reading aids (buttons,
 *     equation actions, the English gloss), SVG, scripts and styles;
 *   - unwrapped (content kept): every other element, e.g. links, spans and bionic bold.
 *
 * The same filter runs again when a snapshot is shown (`snapshotFragment`), because
 * localStorage can be edited, and it returns DOM nodes rather than a string, so nothing is
 * serialised and parsed again on the way into the page.
 */

const HTML_TAGS = new Set([
	'p', 'br', 'sup', 'sub', 'em', 'strong', 'i', 'u',
	'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
	'ul', 'ol', 'li', 'div', 'img'
]);

const MATHML_TAGS = new Set([
	'math', 'mrow', 'mi', 'mn', 'mo', 'ms', 'mtext', 'mspace',
	'msub', 'msup', 'msubsup', 'mfrac', 'msqrt', 'mroot',
	'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd',
	'mstyle', 'mpadded', 'mphantom', 'menclose'
]);

/** Attributes kept, per tag ('*' applies to every MathML tag). */
const ATTRIBUTES: Record<string, string[]> = {
	img: ['src', 'alt'],
	th: ['colspan', 'rowspan'],
	td: ['colspan', 'rowspan'],
	math: ['display'],
	mtd: ['columnspan', 'rowspan', 'columnalign'],
	mtable: ['columnalign', 'rowalign'],
	mfrac: ['linethickness'],
	menclose: ['notation'],
	'*': ['mathvariant', 'stretchy', 'width', 'accent', 'accentunder', 'fence', 'separator', 'lspace', 'rspace', 'displaystyle', 'scriptlevel']
};

/** Removed with everything inside them. */
const DROP_SELECTOR = [
	'button', 'script', 'style', 'svg', 'mjx-container', 'iframe', 'object', 'embed', 'noscript', 'template',
	'form', 'input', 'select', 'textarea', 'link', 'meta', 'annotation', 'annotation-xml',
	'.equation-actions', '.term-en', '.practice-answer-toggle', '.practice-self-assess'
].join(',');

const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

/** A same-site path such as `/content/...`: never another host, a protocol or `data:`. */
function isSameSitePath(src: string): boolean {
	return /^\/(?!\/)[^\s\\]*$/.test(src);
}

function cleanAttributes(el: Element, tag: string, isMath: boolean): void {
	const allowed = new Set([...(ATTRIBUTES[tag] ?? []), ...(isMath ? ATTRIBUTES['*'] : [])]);
	for (const attr of [...el.attributes]) {
		if (!allowed.has(attr.name)) el.removeAttribute(attr.name);
	}
	if (tag === 'img') {
		const src = el.getAttribute('src') ?? '';
		if (!isSameSitePath(src)) el.removeAttribute('src');
	}
}

/** Filter `root`'s descendants in place (see the module comment). */
function cleanTree(root: ParentNode): void {
	root.querySelectorAll(DROP_SELECTOR).forEach((el) => el.remove());
	// Deepest first, so unwrapping an element never skips its children.
	const elements = [...root.querySelectorAll('*')].reverse();
	for (const el of elements) {
		const tag = el.localName;
		const isMath = el.namespaceURI === MATHML_NS && MATHML_TAGS.has(tag);
		const isHtml = el.namespaceURI !== MATHML_NS && HTML_TAGS.has(tag);
		if (isMath || isHtml) {
			cleanAttributes(el, tag, isMath);
		} else {
			el.replaceWith(...el.childNodes);
		}
	}
	// Comments and processing instructions carry nothing a reader needs.
	const walker = document.createTreeWalker(root as Node, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_PROCESSING_INSTRUCTION);
	const junk: Node[] = [];
	while (walker.nextNode()) junk.push(walker.currentNode);
	junk.forEach((n) => n.parentNode?.removeChild(n));
}

/** Collapse runs of whitespace, as a reader sees them. */
function normaliseText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

export interface PracticeSnapshot {
	/** Plain text: labels, search, and the fallback for a record stored before S3.1. */
	text: string;
	/** The trimmed HTML (see the module comment). */
	html: string;
}

/**
 * Snapshot of live page nodes. The nodes are cloned, never changed. Pass the answer's body,
 * not its `<h4>Svar:</h4>`: the review views print their own 'Svar' heading.
 */
export function snapshotOf(nodes: Node[]): PracticeSnapshot {
	const box = document.createElement('div');
	for (const node of nodes) {
		// Sibling blocks taken without the whitespace between them (the question's elements)
		// would run together in the text: '…0,31 ml.(b) Dragðu…'.
		if (node.nodeType === Node.ELEMENT_NODE && box.lastChild?.nodeType === Node.ELEMENT_NODE) {
			box.appendChild(document.createTextNode(' '));
		}
		box.appendChild(node.cloneNode(true));
	}
	cleanTree(box);
	return { text: normaliseText(box.textContent ?? ''), html: box.innerHTML.trim() };
}

/**
 * Parse a stored snapshot and filter it again, for display. Returns nodes to append, so the
 * result never passes through innerHTML a second time.
 */
export function snapshotFragment(html: string): DocumentFragment {
	const template = document.createElement('template');
	template.innerHTML = html;
	cleanTree(template.content);
	return template.content;
}

/**
 * A stored answer's text for display. Before S3.1 the answer was stored with its 'Svar:'
 * heading, which the review views print themselves, so a record not yet refreshed read
 * 'Svar' twice.
 */
export function storedAnswerText(answer: string | undefined): string {
	return (answer ?? '').replace(/^\s*Svar:\s*/, '');
}

/** The filtered HTML of a stored snapshot, as a string (tests and size checks). */
export function sanitiseSnapshotHtml(html: string): string {
	const box = document.createElement('div');
	box.appendChild(snapshotFragment(html));
	return box.innerHTML;
}
