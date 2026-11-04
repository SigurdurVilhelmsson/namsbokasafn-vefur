/**
 * Footnote back links for the PRINT renders (PDF plan, the note under Task 3.1).
 *
 * efni numbers a page's footnote references from 1: the reference in the text is
 * `<sup class="footnote-ref"><a href="#<footnote id>" id="fnref-1">`, and the footnote
 * links back with `<a href="#fnref-1" class="footnote-backref">`. The footnote's own id
 * (`eip-…`, or a module's `foot-NNNNN`) is a content id; `fnref-N` restarts on every
 * section page. The reader shows one section per page, so the name is unique there. The
 * print chapter puts every section of a chapter and its answer key in one document, and
 * the appendix route every appendix, so one render can hold two `id="fnref-1"`. Chromium
 * resolves `#fnref-1` to the first, and the later section's back link lands on the
 * earlier section's reference: 14 of efnafraedi-2e's 36 back links (2026-11-04).
 *
 * This renames each block's back-link targets to `fn-<scope>-<block index>-<old id>`,
 * a name no content carries, and points that block's links at the new name. Three rules,
 * each pinned in printFootnotes.test.ts:
 *
 * - **Keyed on the back link, not the name.** A target is whatever id a
 *   `.footnote-backref`'s href names, so the rule holds if efni renames `fnref-N`.
 * - **Only pairs inside one block.** An id is renamed only when a back link in the same
 *   block names it, and only the hrefs in that block follow it. Another block's links,
 *   and ids no back link names, are left as they are.
 * - **The footnotes are left alone.** The forward links (`#eip-…`) and the footnote ids
 *   they name do not change. (`foot-00001` is chapter 1's and the appendices' footnote
 *   id, once in each render; the two meet only in the merged book, where generate-pdfs.js
 *   namespaces the colliding name and the links to it.)
 *
 * The scope keeps a name unique across the parts of the merged book: the chapter loader
 * passes the zero-padded chapter number, the appendix loader 'vidauki'. So the renamed
 * targets never reach the merge's collision handling.
 *
 * String-based, like the other print transforms, because the loaders also run in Node at
 * prerender, where there is no DOMParser.
 */

import { readAttr, hasClass } from './printContent';

/** A rendered block of a print route (the loaders' PrintBlock types satisfy this). */
export interface PrintFootnoteBlock {
	content: string;
}

/** The name a block's footnote back-link target gets in the render. */
export function footnoteRefAnchorId(scope: string, blockIndex: number, id: string): string {
	return `fn-${scope}-${blockIndex}-${id}`;
}

/** A start tag; a quoted attribute value may hold a `>`. */
const START_TAG = /<[a-zA-Z](?:[^>"']|"[^"]*"|'[^']*')*>/g;

/** An `id` or `href` attribute, with what precedes the value kept for the rewrite. */
const ID_OR_HREF = /(\s(id|href)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;

// Values read from the markup are still escaped, so they go back in as they are; only a
// double quote (legal in a single-quoted value) needs escaping in a double-quoted one.
const inAttr = (s: string) => s.replace(/"/g, '&quot;');

function scopeBlock(html: string, scope: string, blockIndex: number): string {
	if (!html.includes('footnote-backref')) return html;

	// Pass 1: the ids in the block, and the ones its back links name.
	const ids = new Set<string>();
	const named = new Set<string>();
	for (const [tag] of html.matchAll(START_TAG)) {
		const id = readAttr(tag, 'id');
		if (id) ids.add(id);
		if (!hasClass(tag, 'footnote-backref')) continue;
		const href = readAttr(tag, 'href');
		if (href && href.length > 1 && href.startsWith('#')) named.add(href.slice(1));
	}
	const renamed = new Map<string, string>();
	for (const id of named) {
		if (ids.has(id)) renamed.set(id, footnoteRefAnchorId(scope, blockIndex, id));
	}
	if (renamed.size === 0) return html;

	// Pass 2: rename those ids, and every href in the block that points at one.
	return html.replace(START_TAG, (tag) =>
		tag.replace(ID_OR_HREF, (attr, lead: string, name: string, dq?: string, sq?: string) => {
			const value = dq ?? sq ?? '';
			const isId = name.toLowerCase() === 'id';
			const next = isId
				? renamed.get(value)
				: value.startsWith('#')
					? renamed.get(value.slice(1))
					: undefined;
			if (next === undefined) return attr;
			return `${lead}"${isId ? '' : '#'}${inAttr(next)}"`;
		})
	);
}

/**
 * Give every block's footnote back-link targets a name unique in the render, and point
 * the block's back links at it (see the module comment for the rules). `scope` is the
 * render's: the zero-padded chapter number, or 'vidauki'. Returns new blocks; a block
 * with nothing to rename is returned as is.
 */
export function scopeFootnoteBackLinks<T extends PrintFootnoteBlock>(
	blocks: T[],
	scope: string
): T[] {
	return blocks.map((block, i) => {
		const content = scopeBlock(block.content, scope, i);
		return content === block.content ? block : { ...block, content };
	});
}
