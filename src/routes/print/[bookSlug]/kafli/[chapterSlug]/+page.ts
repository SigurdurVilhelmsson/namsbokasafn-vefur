import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import {
	loadTableOfContents,
	findChapterBySlug,
	getChapterPath,
	getSectionPath
} from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';
import {
	sortGlossaryTerms,
	buildTermIndex,
	linkGlossaryTerms,
	type TermIndex
} from '$lib/utils/printGlossary';
import { extractArticle, markMachineTranslated } from '$lib/utils/printContent';
import { linkExercisesToAnswers } from '$lib/utils/printAnswers';
import { scopeFootnoteBackLinks } from '$lib/utils/printFootnotes';
import { readerAnchor, anchorArticle, resolveReaderLinks } from '$lib/utils/printLinks';

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
		// Each section's anchor, named from its reader address, so a link into the reader
		// that names a section of this chapter can jump to it (src/lib/utils/printLinks.ts).
		const anchors: string[] = [];
		for (const section of chapter.sections) {
			const url = `/content/${bookSlug}/chapters/${folder}/${section.file}`;
			const res = await fetch(url);
			if (!res.ok) continue; // tolerate missing files (e.g., partial books) — don't break the build
			const html = await res.text();
			let article = linkGlossaryTerms(extractArticle(html), termIndex);
			const anchor = readerAnchor(
				`/${bookSlug}/kafli/${folder}/${getSectionPath(section)}`,
				bookSlug
			);
			const anchored = anchor ? anchorArticle(article, anchor) : null;
			if (anchor && anchored) {
				article = anchored;
				anchors.push(anchor);
			}
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

		const scope = String(chapter.number).padStart(2, '0');
		return {
			bookTitle: book.title,
			bookSubtitle: book.subtitle,
			attribution: book.attribution,
			chapter,
			chapterFolder: folder,
			// The sections and the answer key are one document here. Each section numbers
			// its footnote references from fnref-1, so they get names unique in the chapter
			// (PDF plan, Task 3.1's note), and each answered exercise links to its answer and
			// back (Task 3.3). Both sets of anchors are scoped by chapter number, to stay
			// unique in the merged book. Links into the reader then jump to a section of
			// this chapter, or open the live site.
			blocks: resolveReaderLinks(
				linkExercisesToAnswers(scopeFootnoteBackLinks(blocks, scope), scope),
				bookSlug
			),
			// The page links to each anchor from a hidden block, because Chromium makes a
			// PDF destination only for an element an in-document link targets. The book
			// PDF's merge needs them to turn a site link from another part into a jump.
			anchors
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Print chapter load error:', e);
		error(500, { message: 'Gat ekki hlaðið prentskjali' });
	}
};
