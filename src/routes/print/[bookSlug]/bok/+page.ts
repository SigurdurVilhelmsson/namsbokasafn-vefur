import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents } from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	const { existsSync } = await import('node:fs');
	const list: Array<{ bookSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (existsSync(tocPath)) list.push({ bookSlug: book.slug });
	}
	return list;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });

	try {
		const toc = await loadTableOfContents(bookSlug, fetch);

		// Chapter start pages, written by scripts/generate-pdfs.js after it has
		// measured the chapter PDFs (two-pass TOC). Missing on the first pass
		// and during plain builds — the TOC then renders without page numbers.
		let tocPages: {
			chapters: Array<{ number: number; page: number }>;
			appendicesPage: number | null;
		} | null = null;
		try {
			const res = await fetch(`/downloads/${bookSlug}/toc-pages.json`);
			if (res.ok) tocPages = await res.json();
		} catch {
			// tolerate — page numbers are optional
		}

		return {
			book,
			chapters: toc.chapters ?? [],
			appendices: toc.appendices ?? [],
			tocPages
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print book load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
