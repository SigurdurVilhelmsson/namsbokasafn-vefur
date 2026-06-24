import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents } from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const list: Array<{ bookSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		if ((toc.appendices ?? []).length > 0) list.push({ bookSlug: book.slug });
	}
	return list;
}

interface PrintBlock {
	letter: string;
	title: string;
	content: string;
}

function extractArticle(html: string): string {
	const article = html.match(/<article[^>]*>[\s\S]*?<\/article>/);
	if (article) return article[0];
	const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
	return body ? body[1] : html;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });

	try {
		const toc = await loadTableOfContents(bookSlug, fetch);
		const appendices = toc.appendices ?? [];
		if (appendices.length === 0) error(404, { message: 'Engir viðaukar' });

		const blocks: PrintBlock[] = [];
		for (const appendix of appendices) {
			const url = `/content/${bookSlug}/chapters/${appendix.file}`;
			const res = await fetch(url);
			if (!res.ok) continue; // tolerate missing files — don't break the build
			const html = await res.text();
			blocks.push({
				letter: appendix.letter,
				title: appendix.title,
				content: extractArticle(html)
			});
		}

		return {
			bookTitle: book.title,
			bookSubtitle: book.subtitle,
			attribution: book.attribution,
			blocks
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print appendix load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
