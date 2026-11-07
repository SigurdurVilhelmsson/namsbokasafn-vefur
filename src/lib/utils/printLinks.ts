/**
 * Links into the reader in the PRINT renders (PDF plan, the 'Open (2026-11-04)' note).
 *
 * efni writes links from the text into the reader root-relative: a chapter
 * introduction's outline (`/efnafraedi-2e/kafli/01/1-1-…`), a link to an element on
 * another page of the chapter (`…/1-4-maelingar#fs-…`), the appendices
 * (`/efnafraedi-2e/vidauki/B`) and the periodic table (`/efnafraedi-2e/lotukerfi`).
 * Chromium resolves them against the print page's address, so in the PDFs each was a
 * link to the dev server generate-pdfs.js runs: 283 dead links in the book PDF.
 *
 * [USER]'s rulings (2026-11-07): a link whose target is in the same PDF jumps there, and
 * every other link opens the page on namsbokasafn.is, with no address printed after it
 * (print.css's `::after` rule stands down for the site).
 *
 * - A render gives each reader page it holds an anchor: `sec-<file basename>` on a
 *   section's `<article>` (the element that starts its page), `vidauki-<letter>` on an
 *   appendix's wrapper. `readerAnchor` derives the name from the page's reader path,
 *   and the PDF merge derives the same name from a site link
 *   (`scripts/lib/pdf-links.js`), so both read one case table
 *   (`printLinks.cases.json`).
 * - `resolveReaderLinks` points a link at `#<id>` when the render holds the page it
 *   names: at the fragment's element when the render holds that too, else at the page's
 *   anchor. Every other root-relative link goes to the live site. The fragment alone
 *   never decides: an id can repeat across pages.
 * - A link from a chapter to an appendix stays a site link in the chapter's own PDF; the
 *   book PDF's merge turns it into a jump to the appendix.
 *
 * String-based, like the other print transforms, because the loaders also run in Node at
 * prerender, where there is no DOMParser.
 */

import { readAttr } from './printContent';

/** The live site, where a link to a page outside the render goes. */
export const SITE_ORIGIN = 'https://namsbokasafn.is';

/** A rendered block of a print route (the loaders' PrintBlock types satisfy this). */
export interface PrintLinkBlock {
	content: string;
}

/**
 * The anchor a print render gives the reader page at `href` (root-relative; any query
 * or fragment is ignored): `sec-<basename>` for a section of `bookSlug`,
 * `vidauki-<letter>` for an appendix, null for any other page. A section's basename
 * starts with its chapter number, so the name is unique in the whole book.
 */
export function readerAnchor(href: string, bookSlug: string): string | null {
	const path = href.split(/[?#]/, 1)[0];
	const parts = path.split('/').filter(Boolean);
	if (parts[0] !== bookSlug) return null;
	if (parts.length === 4 && parts[1] === 'kafli') return `sec-${parts[3]}`;
	if (parts.length === 3 && parts[1] === 'vidauki') return `vidauki-${parts[2]}`;
	return null;
}

/**
 * The live site's address for a root-relative `href`. Pages take a trailing slash
 * (`trailingSlash = 'always'`), before any query or fragment; a file (a dot in the last
 * segment) does not.
 */
export function siteUrl(href: string): string {
	const cut = href.search(/[?#]/);
	const path = cut < 0 ? href : href.slice(0, cut);
	const rest = cut < 0 ? '' : href.slice(cut);
	const last = path.slice(path.lastIndexOf('/') + 1);
	const slash = path.endsWith('/') || last.includes('.') ? '' : '/';
	return `${SITE_ORIGIN}${path}${slash}${rest}`;
}

/** The first `<article>` start tag; a quoted attribute value may hold a `>`. */
const ARTICLE_TAG = /<article\b(?:[^>"']|"[^"]*"|'[^']*')*>/i;

/**
 * Give the block's first `<article>` the id `id`. Returns null, and the page then has
 * no anchor, when there is no article or it already has an id.
 */
export function anchorArticle(html: string, id: string): string | null {
	const match = ARTICLE_TAG.exec(html);
	if (!match || readAttr(match[0], 'id') !== undefined) return null;
	const tag = `<article id="${id}"${match[0].slice('<article'.length)}`;
	return html.slice(0, match.index) + tag + html.slice(match.index + match[0].length);
}

/** A start tag; a quoted attribute value may hold a `>`. */
const START_TAG = /<[a-zA-Z](?:[^>"']|"[^"]*"|'[^']*')*>/g;

/** An `<a>` start tag. */
const A_TAG = /<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

/** The `href` attribute of a start tag, with what precedes the value kept. */
const HREF = /(\shref\s*=\s*)(?:"([^"]*)"|'([^']*)')/i;

// Values read from the markup are still escaped, so they go back in as they are; only a
// double quote (legal in a single-quoted value) needs escaping in a double-quoted one.
const inAttr = (s: string) => s.replace(/"/g, '&quot;');

/**
 * Point every root-relative link in the render at its target in the render, or at the
 * live site (see the module comment for the rules). `outsideIds` are ids the print page
 * renders around the blocks (the appendix wrappers). Returns new blocks; a block with no
 * link into the reader is returned as is.
 */
export function resolveReaderLinks<T extends PrintLinkBlock>(
	blocks: T[],
	bookSlug: string,
	outsideIds: Iterable<string> = []
): T[] {
	const ids = new Set(outsideIds);
	for (const block of blocks) {
		for (const [tag] of block.content.matchAll(START_TAG)) {
			const id = readAttr(tag, 'id');
			if (id) ids.add(id);
		}
	}

	const target = (href: string) => {
		const anchor = readerAnchor(href, bookSlug);
		if (!anchor || !ids.has(anchor)) return siteUrl(href);
		const hash = href.indexOf('#');
		const fragment = hash < 0 ? '' : href.slice(hash + 1);
		return `#${fragment && ids.has(fragment) ? fragment : anchor}`;
	};

	return blocks.map((block) => {
		const content = block.content.replace(A_TAG, (tag) =>
			tag.replace(HREF, (attr, lead: string, dq?: string, sq?: string) => {
				const href = dq ?? sq ?? '';
				if (!href.startsWith('/') || href.startsWith('//')) return attr;
				return `${lead}"${inAttr(target(href))}"`;
			})
		);
		return content === block.content ? block : { ...block, content };
	});
}
