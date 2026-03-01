import type { PageLoad } from './$types';
import {
	loadTableOfContents,
	loadAppendixContent,
	findAppendixByLetter,
	ContentLoadError
} from '$lib/utils/contentLoader';
import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, appendixLetter } = params;

	try {
		// Load TOC to find appendix info
		const toc = await loadTableOfContents(bookSlug, fetch);
		const appendix = findAppendixByLetter(toc, appendixLetter);

		if (!appendix) {
			throw error(404, { message: 'Viðauki fannst ekki' });
		}

		// If appendix is interactive (like periodic table), redirect to component
		if (appendix.isInteractive && appendix.componentPath) {
			throw redirect(307, `/${bookSlug}${appendix.componentPath}`);
		}

		// Load appendix content
		const content = await loadAppendixContent(bookSlug, appendix.file, fetch);

		// Build navigation for previous/next appendices
		const appendices = toc.appendices || [];
		const currentIndex = appendices.findIndex(a => a.letter === appendix.letter);

		const previousAppendix = currentIndex > 0 ? appendices[currentIndex - 1] : undefined;
		const nextAppendix = currentIndex < appendices.length - 1 ? appendices[currentIndex + 1] : undefined;

		return {
			appendix,
			content,
			bookSlug,
			appendixLetter,
			previousAppendix,
			nextAppendix,
			allAppendices: appendices
		};
	} catch (e) {
		if (isHttpError(e) || isRedirect(e)) throw e;
		console.error('Failed to load appendix:', e);

		// Handle offline errors with specific messaging
		if (e instanceof ContentLoadError && e.isOffline) {
			throw error(503, {
				message: e.message
			});
		}

		// Provide more specific error message
		const errorMessage =
			e instanceof Error && e.message.includes('Failed to fetch')
				? 'Gat ekki hlaðið viðauka. Athugaðu nettengingu.'
				: 'Viðauki fannst ekki eða gat ekki hlaðið efni.';

		throw error(404, {
			message: errorMessage
		});
	}
};
