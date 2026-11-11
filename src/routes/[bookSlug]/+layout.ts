import type { LayoutLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getBook } from '$lib/types/book';
import type { PdfManifest } from '$lib/types/pdf';

/**
 * The book's PDF list, or null when there is none: no PDFs generated (local dev), or the
 * live server's answer for a missing file, its 200 SPA shell, which is not JSON.
 */
async function loadPdfManifest(fetchFn: typeof fetch, bookSlug: string): Promise<PdfManifest | null> {
	try {
		const res = await fetchFn(`/downloads/${bookSlug}/manifest.json`);
		return res.ok ? ((await res.json()) as PdfManifest) : null;
	} catch {
		return null;
	}
}

export const load: LayoutLoad = async ({ params, fetch }) => {
	const book = getBook(params.bookSlug);

	if (!book) {
		error(404, { message: 'Bók fannst ekki' });
	}

	return {
		book,
		bookSlug: params.bookSlug,
		// Not awaited: a hard load of any book page waited for this list before showing
		// anything (one round trip, for the SPA shell while no PDFs are published).
		// PdfDownloadButton shows itself when it arrives (e2e/pdf-manifest.spec.ts).
		pdfManifest: loadPdfManifest(fetch, params.bookSlug)
	};
};
