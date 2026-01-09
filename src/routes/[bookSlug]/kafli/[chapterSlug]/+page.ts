import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug } from '$lib/utils/contentLoader';

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
			chapter,
			bookTitle: toc.title
		};
	} catch (e) {
		console.error('Villa við að hlaða kafla:', e);
		error(500, {
			message: 'Gat ekki hlaðið kafla'
		});
	}
};
