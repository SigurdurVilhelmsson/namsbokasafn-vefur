import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents } from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';
import { extractArticle, markMachineTranslated } from '$lib/utils/printContent';
import { scopeFootnoteBackLinks } from '$lib/utils/printFootnotes';
import { readerAnchor, resolveReaderLinks } from '$lib/utils/printLinks';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const list: Array<{ bookSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		if ((toc.appendices ?? []).length > 0) list.push({ bookSlug: book.slug });
	}
	return list;
}

interface PrintBlock {
	letter: string;
	title: string;
	content: string;
	/** The id the page puts on the appendix's wrapper, which starts its page. */
	anchor: string | null;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });

	try {
		const toc = await loadTableOfContents(bookSlug, fetch);
		const appendices = toc.appendices ?? [];
		if (appendices.length === 0) error(404, { message: 'Engir viðaukar' });

		const blocks: PrintBlock[] = [];
		for (const appendix of appendices) {
			const url = `/content/${bookSlug}/chapters/${appendix.file}`;
			const res = await fetch(url);
			if (!res.ok) continue; // tolerate missing files — don't break the build
			const html = await res.text();
			blocks.push({
				letter: appendix.letter,
				title: appendix.title,
				// Appendices carry no per-item review flag and are MT like the rest,
				// so always mark them (reviewed=false) → "Vélþýtt efni" watermark.
				content: markMachineTranslated(extractArticle(html), false),
				anchor: readerAnchor(`/${bookSlug}/vidauki/${appendix.letter}`, bookSlug)
			});
		}

		const anchors = blocks.flatMap((b) => (b.anchor ? [b.anchor] : []));
		return {
			bookTitle: book.title,
			bookSubtitle: book.subtitle,
			attribution: book.attribution,
			// Every appendix is one document here, and each numbers its footnote references
			// from fnref-1, so they get names unique in the render (PDF plan, Task 3.1's note).
			// Links into the reader then jump to an appendix, or open the live site
			// (src/lib/utils/printLinks.ts).
			blocks: resolveReaderLinks(scopeFootnoteBackLinks(blocks, 'vidauki'), bookSlug, anchors),
			// Linked from a hidden block on the page, so each gets a PDF destination and the
			// book PDF's merge can point the chapters' appendix links at it.
			anchors
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print appendix load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
