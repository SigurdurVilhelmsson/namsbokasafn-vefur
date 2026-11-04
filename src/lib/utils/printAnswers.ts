/**
 * Exercise ↔ answer links for the PRINT chapter (PDF plan Task 3.3).
 *
 * The print chapter loader renders every section of a chapter and then appends the
 * chapter's answer key, so an exercise and its answer sit in the same document. This
 * turns an answered exercise's number into a link to its answer, and the answer's
 * number into a link back, the way the reader's `answerLinks.ts` does across two pages.
 * Chromium emits each in-document `<a href="#id">` as a named-destination Link
 * annotation, and generate-pdfs.js harvests and rebases the chapter's `/Dests`, so the
 * links resolve in the standalone chapter PDF and in the merged book alike.
 *
 * Four rules, each pinned in printAnswers.test.ts:
 *
 * - **Anchors of their own, scoped by chapter.** efni gives an `.eoc-exercise` the same
 *   `id` as its `.answer-entry` (both are the exercise's `fs-…` id), so `#<that id>`
 *   would name two elements, and Chromium resolves it to the first: the exercise. The
 *   links target `ex-<scope>-<id>` and `ans-<scope>-<id>` instead, ids no content
 *   carries. The scope (the loader passes the zero-padded chapter number) keeps a name
 *   unique across chapters: generate-pdfs.js namespaces a destination name that two
 *   chapters share, but not the annotations that point at it, so in the merged book a
 *   shared name would leave its links pointing at nothing.
 * - **Only pairs the render holds.** An exercise gets a link only when its answer entry
 *   is in this render's answer key, and an answer entry only when its exercise is in
 *   this render's sections, so no link points at a missing target either way.
 * - **Keyed on `data-has-answer`.** 'false' never links; 'true' links when the answer
 *   entry is there. Where efni wrote no attribute (pages rendered before it, e.g. the
 *   paused books), the answer entry's presence decides. The reader falls back to odd
 *   numbers because its exercise page cannot see the answer key; this render can, and
 *   the answer key holds an entry exactly for the exercises that have a solution (the
 *   predicate `data-has-answer` encodes). Parity is wrong wherever efni numbers
 *   exercises across subsections (efnafraedi-2e ch12–17: 104 answered exercises on even
 *   numbers), and with the presence rule in place it could only drop correct links.
 * - **A repeated exercise has one target.** When the same exercise appears twice (in
 *   efnafraedi-2e ch11, section 11.1 repeats eight of the chapter's exercises), every
 *   copy links to the answer, and the answer links back to the copy on the chapter's
 *   exercises page (block type 'exercises'), as the reader's does, else to the first.
 *
 * An exercise or answer entry with no `data-exercise-number` stays unlinked: the link
 * text is the number, and the reader's fallback for a numberless answer is a button,
 * which print.css hides. None of efnafraedi-2e's 1,744 exercises and 873 answers lacks
 * one (2026-11-04).
 *
 * String-based, like the other print transforms, because the loader also runs in Node
 * at prerender, where there is no DOMParser.
 */

/** A rendered block of the print chapter (the loader's PrintBlock satisfies this). */
export interface PrintAnswerBlock {
	type: string;
	content: string;
}

/** Destination name of an exercise's link target. */
export function exerciseAnchorId(scope: string, key: string): string {
	return `ex-${scope}-${key}`;
}

/** Destination name of an answer entry's link target. */
export function answerAnchorId(scope: string, key: string): string {
	return `ans-${scope}-${key}`;
}

// The reader's aria-labels for the same two links (answerLinks.ts, createNumberLink).
// D20: proposed (reused from answerLinks.ts)
const answerLinkLabel = (n: string) => `Fara í svar við æfingu ${n}`;
// D20: proposed (reused from answerLinks.ts)
const exerciseLinkLabel = (n: string) => `Fara í æfingu ${n}`;

/** Added to a linked exercise or answer entry, so print.css hides its ::before number. */
const LINKED_CLASS = 'print-linked';

const OPEN_DIV = /<div\b([^>]*)>/gi;

const attrPatterns = new Map<string, RegExp>();

/**
 * An attribute's value from a start tag's attribute string, as written in the markup
 * (entities not decoded). Anchored on whitespace, so `id` never matches inside
 * `data-exercise-id`.
 */
function readAttr(attrs: string, name: string): string | undefined {
	let re = attrPatterns.get(name);
	if (!re) {
		re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
		attrPatterns.set(name, re);
	}
	const m = re.exec(attrs);
	return m ? (m[1] ?? m[2]) : undefined;
}

function hasClass(attrs: string, cls: string): boolean {
	return (readAttr(attrs, 'class') ?? '').split(/\s+/).includes(cls);
}

function addClass(attrs: string, cls: string): string {
	return attrs.replace(
		/(^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)')/i,
		(_m, lead: string, dq?: string, sq?: string) =>
			`${lead}class="${(dq ?? sq ?? '').trim()} ${cls}"`
	);
}

// Values read from the markup are still escaped (`&amp;` stays `&amp;`), so they go back in
// as they are: re-escaping `&` would make an href no longer match its id. Only a double
// quote (legal in a single-quoted value) needs escaping in a double-quoted attribute, and
// a `<` in text.
const inAttr = (s: string) => s.replace(/"/g, '&quot;');
const inText = (s: string) => s.replace(/</g, '&lt;');

/** The key an exercise and its answer entry share: `data-exercise-id`, else `id`. */
function entryKey(attrs: string): string | undefined {
	return readAttr(attrs, 'data-exercise-id') || readAttr(attrs, 'id') || undefined;
}

function numberLink(cls: string, href: string, id: string | null, label: string, n: string) {
	const idAttr = id ? ` id="${inAttr(id)}"` : '';
	return (
		`<a class="${cls}" href="#${inAttr(href)}"${idAttr} aria-label="${inAttr(label)}">` +
		`${inText(n)}.</a>`
	);
}

interface ExerciseCopy {
	key: string;
	number: string;
	inExercisesPage: boolean;
}

/**
 * Link each answered exercise in `blocks` to its answer entry and each answer entry back
 * to its exercise (see the module comment for the rules). Exercises are read from every
 * block except the answer key; answer entries only from blocks of type 'answer-key'.
 * `scope` namespaces the anchor ids; the print chapter loader passes the zero-padded
 * chapter number. Returns new blocks; a block with nothing to link is returned as is.
 */
export function linkExercisesToAnswers<T extends PrintAnswerBlock>(
	blocks: T[],
	scope: string
): T[] {
	const isAnswerKey = (b: PrintAnswerBlock) => b.type === 'answer-key';

	// Pass 1: the answers the render holds (first entry per key, with a number) …
	const answers = new Set<string>();
	for (const block of blocks.filter(isAnswerKey)) {
		for (const [, attrs] of block.content.matchAll(OPEN_DIV)) {
			if (!hasClass(attrs, 'answer-entry')) continue;
			const key = entryKey(attrs);
			if (key && readAttr(attrs, 'data-exercise-number')) answers.add(key);
		}
	}

	// … and every copy of an exercise that may link, in document order.
	const copies: ExerciseCopy[] = [];
	for (const block of blocks) {
		if (isAnswerKey(block)) continue;
		for (const [, attrs] of block.content.matchAll(OPEN_DIV)) {
			if (!hasClass(attrs, 'eoc-exercise')) continue;
			const key = entryKey(attrs);
			const number = readAttr(attrs, 'data-exercise-number');
			if (!key || !number || readAttr(attrs, 'data-has-answer') === 'false') continue;
			copies.push({ key, number, inExercisesPage: block.type === 'exercises' });
		}
	}

	// The copy each answer links back to: the exercises page's, else the first.
	const target = new Map<string, number>();
	copies.forEach((c, i) => {
		if (!answers.has(c.key)) return;
		const prev = target.get(c.key);
		if (prev === undefined || (c.inExercisesPage && !copies[prev].inExercisesPage)) {
			target.set(c.key, i);
		}
	});
	if (target.size === 0) return blocks;

	// Pass 2: rewrite, walking the exercises in the same order as pass 1.
	let copyIndex = 0;
	const answerIdGiven = new Set<string>();
	return blocks.map((block) => {
		const answerKey = isAnswerKey(block);
		const content = block.content.replace(OPEN_DIV, (tag, attrs: string) => {
			if (answerKey) {
				if (!hasClass(attrs, 'answer-entry')) return tag;
				const key = entryKey(attrs);
				const number = readAttr(attrs, 'data-exercise-number');
				if (!key || !number || !target.has(key)) return tag;
				const id = answerIdGiven.has(key) ? null : answerAnchorId(scope, key);
				answerIdGiven.add(key);
				const link = numberLink(
					'print-exercise-link',
					exerciseAnchorId(scope, key),
					id,
					exerciseLinkLabel(number),
					number
				);
				return `<div${addClass(attrs, LINKED_CLASS)}>${link}`;
			}

			if (!hasClass(attrs, 'eoc-exercise')) return tag;
			const key = entryKey(attrs);
			const number = readAttr(attrs, 'data-exercise-number');
			if (!key || !number || readAttr(attrs, 'data-has-answer') === 'false') return tag;
			const index = copyIndex++;
			if (!target.has(key)) return tag;
			const id = target.get(key) === index ? exerciseAnchorId(scope, key) : null;
			const link = numberLink(
				'print-answer-link',
				answerAnchorId(scope, key),
				id,
				answerLinkLabel(number),
				number
			);
			return `<div${addClass(attrs, LINKED_CLASS)}>${link}`;
		});
		return content === block.content ? block : { ...block, content };
	});
}
