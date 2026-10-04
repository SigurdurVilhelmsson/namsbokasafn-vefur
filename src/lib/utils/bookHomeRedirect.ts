/**
 * Redirect stubs for URL levels that have no page of their own.
 *
 * `/<book>/kafli/`, `/<book>/svarlykill/`, `/<book>/vidauki/` and
 * `/<book>/kafli/00/` are folders in the static build: their child pages are
 * prerendered beneath them, but nothing was rendered AT them. nginx's
 * `try_files $uri $uri/ /200.html` then matches the bare folder, finds no
 * index.html and answers 403 Forbidden, which is what a reader who trims a URL
 * got on the live site (measured 2026-10-04). Each now prerenders a small
 * redirect stub to the book home, the same mechanism as the section renames
 * in sectionRedirects.ts.
 */

import { error, redirect } from '@sveltejs/kit';
import { books } from '$lib/types/book';

/** One entry per book with synced content: a stub for a book with no build is noise. */
export async function bookEntries(): Promise<Array<{ bookSlug: string }>> {
	const { existsSync } = await import('node:fs');
	return books
		.filter((book) => existsSync(`static/content/${book.slug}/toc.json`))
		.map((book) => ({ bookSlug: book.slug }));
}

/**
 * Always throws: SvelteKit prerenders the redirect as a meta-refresh stub.
 * Only a registered book is redirected. The slug comes from the URL, so on a
 * client-side navigation a crafted one ("//evil.example") would otherwise make
 * this an open redirect.
 */
export function redirectToBookHome(bookSlug: string): never {
	if (!books.some((book) => book.slug === bookSlug)) {
		error(404, { message: 'Bók fannst ekki' });
	}
	// Trailing slash: trailingSlash is 'always', and the prerenderer copies
	// this Location verbatim into the stub
	redirect(301, `/${bookSlug}/`);
}
