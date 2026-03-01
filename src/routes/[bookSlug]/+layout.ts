import type { LayoutLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTableOfContents } from '$lib/utils/contentLoader';

// Book configurations - would be loaded from a config file in production
const BOOKS: Record<
	string,
	{
		title: string;
		slug: string;
		color: string;
		features?: {
			periodicTable?: boolean;
		};
	}
> = {
	efnafraedi: {
		title: 'Efnafræði',
		slug: 'efnafraedi',
		color: 'blue',
		features: {
			periodicTable: true
		}
	},
	liffraedi: {
		title: 'Líffræði',
		slug: 'liffraedi',
		color: 'green'
	}
};

export const load: LayoutLoad = async ({ params, fetch }) => {
	const book = BOOKS[params.bookSlug];

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
