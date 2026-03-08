import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug } from '$lib/utils/contentLoader';
import { books } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const entries: Array<{ bookSlug: string; chapterSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		for (const ch of toc.chapters) {
			entries.push({
				bookSlug: book.slug,
				chapterSlug: String(ch.number).padStart(2, '0')
			});
		}
	}
	return entries;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, chapterSlug } = params;

	try {
		const toc = await loadTableOfContents(bookSlug, fetch);
		const chapter = findChapterBySlug(toc, chapterSlug);

		if (!chapter) {
			error(404, {
				message: 'Kafli fannst ekki'
			});
		}

		return {
			bookSlug,
			chapter
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Villa við að hlaða kafla:', e);
		error(500, {
			message: 'Gat ekki hlaðið kafla'
		});
	}
};
