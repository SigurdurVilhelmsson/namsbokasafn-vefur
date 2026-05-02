import type { LayoutLoad } from './$types';
import { error } from '@sveltejs/kit';
import { loadTableOfContents } from '$lib/utils/contentLoader';
import { getBook } from '$lib/types/book';
import type { PdfManifest } from '$lib/types/pdf';

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

	// Load PDF manifest if present (gracefully missing during local dev)
	let pdfManifest: PdfManifest | null = null;
	try {
		const res = await fetch(`/downloads/${params.bookSlug}/manifest.json`);
		if (res.ok) pdfManifest = await res.json();
	} catch {
		// PDFs haven't been generated for this build — buttons will hide themselves.
	}

	return {
		book,
		bookSlug: params.bookSlug,
		references,
		pdfManifest
	};
};
