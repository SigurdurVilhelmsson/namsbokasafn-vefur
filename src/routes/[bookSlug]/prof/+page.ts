import type { PageLoad } from './$types';
import { loadTableOfContents } from '$lib/utils/contentLoader';

export const prerender = false;

/**
 * AdaptiveQuiz snapshots its practice problems when it mounts. Loading the
 * table of contents here runs the section-rename migration first: on a hard
 * load it otherwise landed later (from the header), and answers recorded
 * against the old ids were silently dropped. Not prerendered, so this runs in
 * the browser only and inlines nothing.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	try {
		await loadTableOfContents(params.bookSlug, fetch);
	} catch {
		// The quiz works without it; the header retries the table of contents
	}
	return {};
};
