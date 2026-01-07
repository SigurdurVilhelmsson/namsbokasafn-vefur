import type { PageLoad } from './$types';
import { loadSectionContent } from '$lib/utils/contentLoader';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
	const { bookSlug, chapterSlug, sectionSlug } = params;

	try {
		const section = await loadSectionContent(bookSlug, chapterSlug, `${sectionSlug}.md`);
		return {
			section,
			bookSlug,
			chapterSlug,
			sectionSlug
		};
	} catch (e) {
		console.error('Failed to load section:', e);
		throw error(404, {
			message: 'Kafli fannst ekki'
		});
	}
};
