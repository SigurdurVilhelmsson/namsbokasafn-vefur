import type { PageLoad } from './$types';
import {
	loadSectionContent,
	loadTableOfContents,
	findSectionBySlug,
	getChapterFolder,
	getSectionPath,
	ContentLoadError
} from '$lib/utils/contentLoader';
import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import type { NavigationContext } from '$lib/types/content';
import { books } from '$lib/types/book';
import {
	SECTION_REDIRECTS,
	findSectionRedirect,
	exactSectionExists
} from '$lib/data/sectionRedirects';

export const prerender = true;

export async function entries() {
	const { readFileSync, existsSync } = await import('node:fs');
	const entries: Array<{ bookSlug: string; chapterSlug: string; sectionSlug: string }> = [];
	for (const book of books) {
		const tocPath = `static/content/${book.slug}/toc.json`;
		if (!existsSync(tocPath)) continue;
		const toc = JSON.parse(readFileSync(tocPath, 'utf-8'));
		// Front matter (preface etc.) lives in chapter dir "00", outside toc.chapters.
		for (const sec of toc.frontMatter ?? []) {
			entries.push({
				bookSlug: book.slug,
				chapterSlug: '00',
				sectionSlug: getSectionPath(sec)
			});
		}
		for (const ch of toc.chapters) {
			const chapterSlug = String(ch.number).padStart(2, '0');
			for (const sec of ch.sections) {
				// Canonical slug = file basename for all sections (see getSectionPath)
				const sectionSlug = getSectionPath(sec);
				entries.push({
					bookSlug: book.slug,
					chapterSlug,
					sectionSlug
				});
			}
		}

		// Renamed slugs (§C9): prerender a redirect stub for each old URL. Once
		// efni prunes the superseded page the old slug leaves toc.json, so
		// nothing above would generate it. Deduped, because before that prune
		// the TOC still lists it and two entries for one path would have the
		// prerenderer write both the real page and the stub to the same file.
		for (const r of SECTION_REDIRECTS) {
			if (r.bookSlug !== book.slug) continue;
			const already = entries.some(
				(e) =>
					e.bookSlug === r.bookSlug &&
					e.chapterSlug === r.fromChapter &&
					e.sectionSlug === r.fromSlug
			);
			if (!already) {
				entries.push({
					bookSlug: r.bookSlug,
					chapterSlug: r.fromChapter,
					sectionSlug: r.fromSlug
				});
			}
		}
	}
	return entries;
}

export const load: PageLoad = async ({ params, fetch }) => {
	const { bookSlug, chapterSlug, sectionSlug } = params;

	try {
		// Load TOC first to get pre-parsed metadata
		const toc = await loadTableOfContents(bookSlug, fetch);

		// A Pass-1 title correction renames the rendered file, so the old URL
		// stops resolving. Check BEFORE findSectionBySlug: while both the stale
		// and corrected pages are still published, findSectionBySlug succeeds for
		// the old slug and a check placed in its 404 branch would never run.
		// Only redirect when the exact target is published — our own overlay can
		// delete the page efni recorded as the target.
		const rename = findSectionRedirect(bookSlug, chapterSlug, sectionSlug);
		if (rename && exactSectionExists(toc, rename.toChapter, rename.toSlug)) {
			// Trailing slash is required: trailingSlash is 'always', and the
			// prerenderer copies this Location verbatim into the redirect stub.
			throw redirect(301, `/${bookSlug}/kafli/${rename.toChapter}/${rename.toSlug}/`);
		}

		const result = findSectionBySlug(toc, chapterSlug, sectionSlug);

		if (!result) {
			throw error(404, { message: 'Kafli fannst ekki' });
		}

		const { chapter, section: currentSection } = result;

		// Get the actual folder name for content loading (supports both v1 and v2)
		const chapterFolder = getChapterFolder(chapter);

		// Load section content using the file name from toc.json
		const section = await loadSectionContent(
			bookSlug,
			chapterFolder,
			currentSection.file,
			fetch,
			currentSection.metadata
		);

		// Find chapter and section indices using file-based matching (handles supplementary pages with empty number)
		const chapterIndex = toc.chapters.findIndex((c) => c.number === chapter.number);
		const sectionIndex = chapter.sections.findIndex((s) => s.file === currentSection.file);

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
			sectionSlug,
			chapterNumber: chapter.number
		};
	} catch (e) {
		// isRedirect is essential: SvelteKit throws redirects as a Redirect, which
		// isHttpError does NOT match. Without it, the redirect above is swallowed
		// and turned into a 404 — silently, and with the build still green.
		if (isHttpError(e) || isRedirect(e)) throw e;
		console.error('Failed to load section:', e);

		// Handle offline errors with specific messaging
		if (e instanceof ContentLoadError && e.isOffline) {
			throw error(503, {
				message: e.message
			});
		}

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
