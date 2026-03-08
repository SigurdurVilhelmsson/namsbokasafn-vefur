import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug } from '$lib/utils/contentLoader';

export const prerender = true;

export async function entries() {
	const { readFileSync } = await import('node:fs');
	const toc = JSON.parse(readFileSync('static/content/efnafraedi-2e/toc.json', 'utf-8'));
	return toc.chapters.map((ch: { number: number }) => ({
		bookSlug: 'efnafraedi-2e',
		chapterSlug: String(ch.number).padStart(2, '0')
	}));
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
