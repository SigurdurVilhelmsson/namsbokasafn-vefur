/**
 * Which books `scripts/generate-pdfs.js` prints, and the check that it never
 * prints an error page. Kept apart from that script because it starts a dev
 * server and a browser on import.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { RETIREMENT_REFERENCE, isRetired } from './published-books.js';

/**
 * Books to print: every directory in `contentDir` with a toc.json, minus the
 * retired books (a dev machine's static/content keeps one after retirement, but
 * the reader no longer builds its /print routes). Sorted. `requested` narrows
 * to one book; naming a retired book throws rather than printing nothing.
 *
 * @param {string} contentDir the synced content directory (static/content)
 * @param {string | null} [requested] a single book slug, from --book
 * @returns {string[]}
 */
export function pdfBooks(contentDir, requested = null) {
	if (requested && isRetired(requested)) {
		throw new Error(`${requested} is retired, so it has no /print routes (${RETIREMENT_REFERENCE})`);
	}
	if (!existsSync(contentDir)) return [];
	const books = readdirSync(contentDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !isRetired(d.name))
		.map((d) => d.name)
		.filter((slug) => existsSync(join(contentDir, slug, 'toc.json')))
		.sort();
	return requested ? books.filter((slug) => slug === requested) : books;
}

/**
 * Throw unless a page.goto() response is a success. page.pdf() prints whatever
 * loaded, a 404 page included, and the run still exits 0.
 *
 * @param {{ ok(): boolean, status(): number } | null} response
 * @param {string} url
 */
export function assertPrintable(response, url) {
	if (!response) throw new Error(`No response for ${url}`);
	if (!response.ok()) {
		throw new Error(`${url} answered HTTP ${response.status()}: refusing to print an error page`);
	}
}
