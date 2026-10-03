/**
 * The URLs the sitemap lists, derived from the books in the content directory.
 *
 * ⚠️ It reads the CONTENT DIRECTORY, not the book registry, so a book stays
 * listed for as long as `static/content/<slug>/toc.json` exists. A retired book
 * (RETIRED_BOOKS) is the exception: a dev machine's static/content keeps it
 * after retirement, so it is filtered here by slug. The books paused on
 * 2026-08-22 are not filtered: they stay live.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { isRetired } from './published-books.js';

export const BASE_URL = 'https://namsbokasafn.is';

/** Static pages that don't depend on content */
const STATIC_PAGES = ['/', '/feedback', '/for-teachers'];

/** Per-book tool pages (relative to /{bookSlug}) */
const BOOK_PAGES = [
	'', // book home
	'/ordabok',
	'/minniskort',
	'/lotukerfi',
	'/prof',
	'/greining',
	'/markmid',
	'/bokamerki',
	'/atridiordasskra',
	'/nam',
	'/yfirlit'
];

/**
 * Every URL to list, in sitemap order. Throws if `contentDir` cannot be read.
 * @param {string} contentDir the synced content directory (static/content)
 * @returns {string[]}
 */
export function sitemapUrls(contentDir) {
	const urls = STATIC_PAGES.map((page) => `${BASE_URL}${page}`);

	const books = readdirSync(contentDir, { withFileTypes: true })
		.filter((d) => d.isDirectory() && !isRetired(d.name))
		.map((d) => d.name);

	for (const bookSlug of books) {
		let toc;
		try {
			toc = JSON.parse(readFileSync(join(contentDir, bookSlug, 'toc.json'), 'utf-8'));
		} catch {
			console.warn(`Skipping ${bookSlug}: no toc.json found`);
			continue;
		}

		// Add book-level pages
		for (const page of BOOK_PAGES) {
			urls.push(`${BASE_URL}/${bookSlug}${page}`);
		}

		// Add chapter and section pages
		for (const chapter of toc.chapters || []) {
			const chapterSlug = String(chapter.number).padStart(2, '0');
			urls.push(`${BASE_URL}/${bookSlug}/kafli/${chapterSlug}`);

			for (const section of chapter.sections || []) {
				const sectionSlug = section.file.replace('.html', '');
				urls.push(`${BASE_URL}/${bookSlug}/kafli/${chapterSlug}/${sectionSlug}`);
			}

			// Answer key page
			urls.push(`${BASE_URL}/${bookSlug}/svarlykill/${chapter.number}`);
		}
	}

	return urls;
}
