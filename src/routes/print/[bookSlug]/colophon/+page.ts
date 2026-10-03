import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
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

/**
 * Standalone colophon page for a chapter PDF. generate-pdfs.js renders this once
 * per book and appends it (via pdf-lib) only to each standalone chapter PDF, so a
 * chapter distributed alone still carries full CC-BY attribution — while the full
 * book keeps its single front-matter colophon instead of one per chapter.
 */
export const load: PageLoad = async ({ params }) => {
	const { bookSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });
	try {
		return { book };
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print colophon load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
