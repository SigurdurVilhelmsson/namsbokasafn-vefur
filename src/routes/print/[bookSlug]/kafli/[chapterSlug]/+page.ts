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
}

function extractArticle(html: string): string {
	const article = html.match(/<article[^>]*>[\s\S]*?<\/article>/);
	if (article) return article[0];
	const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
	return body ? body[1] : html;
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
				content: extractArticle(html)
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
					content: extractArticle(html)
				});
			}
		}

		return {
			bookTitle: book.title,
			bookSubtitle: book.subtitle,
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
