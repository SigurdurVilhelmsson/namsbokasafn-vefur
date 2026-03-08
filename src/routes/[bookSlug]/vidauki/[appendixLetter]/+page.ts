import type { PageLoad } from './$types';
import {
	loadTableOfContents,
	loadAppendixContent,
	findAppendixByLetter,
	ContentLoadError
} from '$lib/utils/contentLoader';
import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { books } from '$lib/types/book';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const entries: Array<{ bookSlug: string; appendixLetter: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		for (const a of (toc.appendices || []).filter((a: { isInteractive?: boolean }) => !a.isInteractive)) {
			entries.push({
				bookSlug: book.slug,
				appendixLetter: a.letter
			});
		}
	}
	return entries;
}

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
