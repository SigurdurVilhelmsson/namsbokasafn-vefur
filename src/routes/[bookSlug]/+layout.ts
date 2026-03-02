import type { LayoutLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTableOfContents } from '$lib/utils/contentLoader';
import { getBook } from '$lib/types/book';

export const load: LayoutLoad = async ({ params, fetch }) => {
	const book = getBook(params.bookSlug);

	if (!book) {
		error(404, { message: 'Bók fannst ekki' });
	}

	// Load TOC to get precomputed references
	let references = null;
	try {
		const toc = await loadTableOfContents(params.bookSlug, fetch);
		references = toc.references || null;
	} catch {
		// TOC not available - references will be computed at runtime
	}

	return {
		book,
		bookSlug: params.bookSlug,
		references
	};
};
