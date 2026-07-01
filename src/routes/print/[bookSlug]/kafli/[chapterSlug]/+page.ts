import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadTableOfContents, findChapterBySlug, getChapterPath } from '$lib/utils/contentLoader';
import { books, getBook } from '$lib/types/book';

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

function extractArticle(html: string): string {
	const article = html.match(/<article[^>]*>[\s\S]*?<\/article>/);
	if (article) return article[0];
	const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
	return body ? body[1] : html;
}

/**
 * Tag machine-translated (unreviewed) content so print.css can render a
 * "Vélþýtt efni" watermark behind it. Adds the `mt-content` class to the first
 * <article> (keeping it the direct child, so the section page-break rule still
 * applies — a wrapper div would defeat `article.cnx-module:first-of-type`).
 */
function markMachineTranslated(articleHtml: string, reviewed: boolean): string {
	if (reviewed) return articleHtml;
	return articleHtml.replace(/(<article\b[^>]*\bclass=")/i, '$1mt-content ');
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

		const blocks: PrintBlock[] = [];
		for (const section of chapter.sections) {
			const url = `/content/${bookSlug}/chapters/${folder}/${section.file}`;
			const res = await fetch(url);
			if (!res.ok) continue; // tolerate missing files (e.g., partial books) — don't break the build
			const html = await res.text();
			blocks.push({
				title: section.title,
				type: section.type ?? 'section',
				content: markMachineTranslated(extractArticle(html), section.reviewed ?? false),
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
