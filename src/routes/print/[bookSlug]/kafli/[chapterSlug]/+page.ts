import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug, getChapterPath } from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';
import {
	sortGlossaryTerms,
	buildTermIndex,
	linkGlossaryTerms,
	type TermIndex
} from '$lib/utils/printGlossary';
import { extractArticle, markMachineTranslated } from '$lib/utils/printContent';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const list: Array<{ bookSlug: string; chapterSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		for (const ch of toc.chapters ?? []) {
			list.push({
				bookSlug: book.slug,
				chapterSlug: String(ch.number).padStart(2, '0')
			});
		}
	}
	return list;
}

interface PrintBlock {
	title: string;
	type: string;
	content: string;
	/** Human-reviewed (faithful)? false = machine-translated → gets an MT watermark. */
	reviewed: boolean;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, chapterSlug } = params;
	const book = getBook(bookSlug);
	if (!book) error(404, { message: 'Bók fannst ekki' });

	try {
		const toc = await loadTableOfContents(bookSlug, fetch);
		const chapter = findChapterBySlug(toc, chapterSlug);
		if (!chapter) error(404, { message: 'Kafli fannst ekki' });

		const folder = getChapterPath(chapter);

		// Glossary term-index for linking `<dfn class="term">` → back-of-book entry
		// (`#gloss-N`), matching the /ordabok route's sort. Tolerate absence.
		let termIndex: TermIndex = { byTerm: new Map(), byEnglish: new Map() };
		try {
			const gRes = await fetch(`/content/${bookSlug}/glossary.json`);
			if (gRes.ok) termIndex = buildTermIndex(sortGlossaryTerms((await gRes.json()).terms ?? []));
		} catch {
			// no glossary — leave dfns unlinked
		}

		const blocks: PrintBlock[] = [];
		for (const section of chapter.sections) {
			const url = `/content/${bookSlug}/chapters/${folder}/${section.file}`;
			const res = await fetch(url);
			if (!res.ok) continue; // tolerate missing files (e.g., partial books) — don't break the build
			const html = await res.text();
			const article = linkGlossaryTerms(extractArticle(html), termIndex);
			blocks.push({
				title: section.title,
				type: section.type ?? 'section',
				content: markMachineTranslated(article, section.reviewed ?? false),
				reviewed: section.reviewed ?? false
			});
		}

		// Append the chapter answer key (lives outside chapter.sections in toc.json)
		const answerKeyEntry = toc.answerKey?.find((a) => a.chapter === chapter.number);
		if (answerKeyEntry) {
			const url = `/content/${bookSlug}/chapters/${answerKeyEntry.file}`;
			const res = await fetch(url);
			if (res.ok) {
				const html = await res.text();
				blocks.push({
					title: 'Svarlykill',
					type: 'answer-key',
					// Conservative: mark aggregation pages MT unless proven reviewed.
					content: markMachineTranslated(extractArticle(html), false),
					reviewed: false
				});
			}
		}

		return {
			bookTitle: book.title,
			bookSubtitle: book.subtitle,
			attribution: book.attribution,
			chapter,
			chapterFolder: folder,
			blocks
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print chapter load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
