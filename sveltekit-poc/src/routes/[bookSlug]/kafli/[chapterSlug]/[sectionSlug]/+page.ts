import type { PageLoad } from './$types';
import {
	loadSectionContent,
	loadTableOfContents,
	findSectionBySlug
} from '$lib/utils/contentLoader';
import { error } from '@sveltejs/kit';
import type { NavigationContext } from '$lib/types/content';

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, chapterSlug, sectionSlug } = params;

	try {
		// Load section content
		const section = await loadSectionContent(bookSlug, chapterSlug, `${sectionSlug}.md`, fetch);

		// Load TOC for navigation context
		const toc = await loadTableOfContents(bookSlug, fetch);
		const result = findSectionBySlug(toc, chapterSlug, sectionSlug);

		if (!result) {
			throw error(404, { message: 'Kafli fannst ekki' });
		}

		const { chapter, section: currentSection } = result;

		// Find chapter and section indices
		const chapterIndex = toc.chapters.findIndex((c) => c.slug === chapterSlug);
		const sectionIndex = chapter.sections.findIndex((s) => s.slug === sectionSlug);

		// Build navigation context
		let previous: NavigationContext['previous'];
		let next: NavigationContext['next'];

		if (sectionIndex > 0) {
			// Previous section in same chapter
			previous = {
				chapter,
				section: chapter.sections[sectionIndex - 1]
			};
		} else if (chapterIndex > 0) {
			// Last section of previous chapter
			const prevChapter = toc.chapters[chapterIndex - 1];
			previous = {
				chapter: prevChapter,
				section: prevChapter.sections[prevChapter.sections.length - 1]
			};
		}

		if (sectionIndex < chapter.sections.length - 1) {
			// Next section in same chapter
			next = {
				chapter,
				section: chapter.sections[sectionIndex + 1]
			};
		} else if (chapterIndex < toc.chapters.length - 1) {
			// First section of next chapter
			const nextChapter = toc.chapters[chapterIndex + 1];
			next = {
				chapter: nextChapter,
				section: nextChapter.sections[0]
			};
		}

		const navigation: NavigationContext = {
			current: { chapter, section: currentSection },
			previous,
			next
		};

		return {
			section,
			navigation,
			bookSlug,
			chapterSlug,
			sectionSlug
		};
	} catch (e) {
		console.error('Failed to load section:', e);

		// Provide more specific error message
		const errorMessage =
			e instanceof Error && e.message.includes('Failed to fetch')
				? 'Gat ekki hlaðið kafla. Athugaðu nettengingu.'
				: 'Kafli fannst ekki eða gat ekki hlaðið efni.';

		throw error(404, {
			message: errorMessage
		});
	}
};
