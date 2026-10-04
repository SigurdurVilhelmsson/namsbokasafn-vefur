import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug } from '$lib/utils/contentLoader';
import { books } from '$lib/types/book';
import { redirectToBookHome } from '$lib/utils/bookHomeRedirect';

/** Front matter lives in chapters/00 but is not a chapter: it has no overview page */
const FRONT_MATTER = '00';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const entries: Array<{ bookSlug: string; chapterSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		// kafli/00/ is the folder of the front-matter pages; without a stub at it
		// the live site answered 403 there
		if (toc.frontMatter?.length) {
			entries.push({ bookSlug: book.slug, chapterSlug: FRONT_MATTER });
		}
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
	if (chapterSlug === FRONT_MATTER) redirectToBookHome(bookSlug);

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
