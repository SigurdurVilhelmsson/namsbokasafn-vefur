import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { books, getBook } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	const { existsSync } = await import('node:fs');
	const list: Array<{ bookSlug: string }> = [];
	for (const book of books) {
		if (existsSync(`static/content/${book.slug}/glossary.json`)) list.push({ bookSlug: book.slug });
	}
	return list;
}

interface GlossaryTerm {
	term: string;
	definition: string;
	english?: string;
	chapter?: number;
}

/**
 * Back-of-book glossary page for the full-book PDF. generate-pdfs.js renders
 * this once and merges it after the appendices. Terms are collated in Icelandic
 * order and given stable `gloss-N` ids so content `<dfn>` terms can later link
 * to their definition (Task 3.4 term-linking).
 */
export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });
	try {
		const res = await fetch(`/content/${bookSlug}/glossary.json`);
		const glossary = res.ok ? await res.json() : { terms: [] };
		const terms: GlossaryTerm[] = [...(glossary.terms ?? [])].sort((a, b) =>
			a.term.localeCompare(b.term, 'is')
		);
		return { bookTitle: book.title, bookSubtitle: book.subtitle, terms };
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print glossary load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
