import type { PageLoad } from './$types';
import {
	loadTableOfContents,
	loadSectionContent,
	ContentLoadError
} from '$lib/utils/contentLoader';
import { error, isHttpError } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, chapter } = params;

	try {
		// Load TOC to find the answer key entry
		const toc = await loadTableOfContents(bookSlug, fetch);

		// Parse chapter number
		const chapterNum = parseInt(chapter, 10);
		if (isNaN(chapterNum)) {
			throw error(404, { message: 'Ógildur kaflnúmer' });
		}

		// Find the answer key entry for this chapter
		const answerKeyEntry = toc.answerKey?.find(
			(entry) => entry.chapter === chapterNum
		);

		if (!answerKeyEntry) {
			throw error(404, { message: 'Svarlykill fannst ekki fyrir þennan kafla' });
		}

		// Find the chapter info for the title
		const chapterInfo = toc.chapters.find((c) => c.number === chapterNum);

		// Determine the file path - could be in answer-key/ or in chapter folder
		let filePath: string;
		let chapterFolder: string;

		if (answerKeyEntry.file.startsWith('answer-key/')) {
			// Answers are in a separate answer-key directory
			chapterFolder = 'answer-key';
			filePath = answerKeyEntry.file.replace('answer-key/', '');
		} else if (answerKeyEntry.file.includes('/')) {
			// Answers are in chapter folders (e.g., "01/1-answer-key.md")
			const parts = answerKeyEntry.file.split('/');
			chapterFolder = parts[0];
			filePath = parts.slice(1).join('/');
		} else {
			// Fallback: look in chapter folder based on chapter number
			chapterFolder = chapterNum.toString().padStart(2, '0');
			filePath = answerKeyEntry.file;
		}

		// Load the answer key content
		const section = await loadSectionContent(
			bookSlug,
			chapterFolder,
			filePath,
			fetch
		);

		// Build navigation for answer key pages
		const currentIndex = toc.answerKey?.findIndex(
			(entry) => entry.chapter === chapterNum
		) ?? -1;

		let previous: { chapter: number; title: string } | undefined;
		let next: { chapter: number; title: string } | undefined;

		if (toc.answerKey && currentIndex > 0) {
			previous = {
				chapter: toc.answerKey[currentIndex - 1].chapter,
				title: toc.answerKey[currentIndex - 1].title
			};
		}

		if (toc.answerKey && currentIndex < toc.answerKey.length - 1) {
			next = {
				chapter: toc.answerKey[currentIndex + 1].chapter,
				title: toc.answerKey[currentIndex + 1].title
			};
		}

		return {
			section,
			chapterNumber: chapterNum,
			chapterTitle: chapterInfo?.title || `Kafli ${chapterNum}`,
			answerKeyTitle: answerKeyEntry.title,
			bookSlug,
			navigation: { previous, next }
		};
	} catch (e) {
		if (isHttpError(e)) throw e;
		console.error('Failed to load answer key:', e);

		if (e instanceof ContentLoadError && e.isOffline) {
			throw error(503, { message: e.message });
		}

		const errorMessage =
			e instanceof Error && e.message.includes('Failed to fetch')
				? 'Gat ekki hlaðið svarlykli. Athugaðu nettengingu.'
				: 'Svarlykill fannst ekki.';

		throw error(404, { message: errorMessage });
	}
};
