/**
 * Content loading utilities
 *
 * No in-memory cache — the service worker (NetworkFirst for HTML/JSON)
 * handles caching correctly, serving fresh content when online and
 * falling back to cache when offline.
 */

import type { TableOfContents, SectionContent, SectionMetadata, Appendix } from '$lib/types/content';
import { browser } from '$app/environment';

/**
 * Custom error for content loading failures
 */
export class ContentLoadError extends Error {
	readonly isOffline: boolean;
	readonly statusCode: number;

	constructor(message: string, statusCode: number = 0, isOffline: boolean = false) {
		super(message);
		this.name = 'ContentLoadError';
		this.statusCode = statusCode;
		this.isOffline = isOffline;
	}
}

/**
 * Check if we're likely offline
 */
function checkOffline(): boolean {
	return browser && !navigator.onLine;
}


/**
 * Load table of contents for a book
 */
export async function loadTableOfContents(
	bookSlug: string,
	fetchFn: typeof fetch = fetch
): Promise<TableOfContents> {
	try {
		const response = await fetchFn(`/content/${bookSlug}/toc.json`);
		if (!response.ok) {
			const isOffline = checkOffline();
			throw new ContentLoadError(
				isOffline
					? 'Gat ekki hlaðið efnisyfirliti. Þú ert án nettengingar.'
					: 'Gat ekki hlaðið efnisyfirliti',
				response.status,
				isOffline
			);
		}
		return await response.json();
	} catch (e) {
		if (e instanceof ContentLoadError) throw e;
		const isOffline = checkOffline();
		throw new ContentLoadError(
			isOffline
				? 'Gat ekki hlaðið efnisyfirliti. Þú ert án nettengingar.'
				: 'Gat ekki hlaðið efnisyfirliti',
			0,
			isOffline
		);
	}
}

/**
 * Extract page-data JSON from HTML content
 * HTML files may include embedded metadata in a script tag with id="page-data"
 */
function extractHtmlPageData(html: string): {
	moduleId?: string;
	chapter?: number;
	section?: string;
	title?: string;
	equations?: string[];
	terms?: Record<string, string>;
} {
	const match = html.match(/<script[^>]*id="page-data"[^>]*>([\s\S]*?)<\/script>/);
	if (!match) return {};
	try {
		return JSON.parse(match[1]);
	} catch {
		return {};
	}
}

/**
 * Extract title from HTML content (from h1 or title tag)
 */
function extractHtmlTitle(html: string): string {
	// Try h1 first
	const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
	if (h1Match) return h1Match[1].trim();

	// Try title tag
	const titleMatch = html.match(/<title>([^<]+)<\/title>/);
	if (titleMatch) return titleMatch[1].trim();

	return '';
}

/**
 * Extract article content from HTML (the main content without wrapper)
 */
function extractHtmlArticleContent(html: string): string {
	// Extract content between <article> and </article>
	const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
	if (articleMatch) return articleMatch[0];

	// Fallback: extract body content
	const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
	if (bodyMatch) return bodyMatch[1];

	return html;
}

/**
 * Load section content for a book
 *
 * Loads pre-rendered HTML content with embedded metadata.
 * If preloadedMetadata is provided (from toc.json), it will be used instead of
 * extracting metadata from the HTML at runtime.
 */
export async function loadSectionContent(
	bookSlug: string,
	chapterSlug: string,
	sectionFile: string,
	fetchFn: typeof fetch = fetch,
	preloadedMetadata?: SectionMetadata
): Promise<SectionContent> {
	let response: Response;
	try {
		response = await fetchFn(`/content/${bookSlug}/chapters/${chapterSlug}/${sectionFile}`);
	} catch (e) {
		const isOffline = checkOffline();
		throw new ContentLoadError(
			isOffline
				? 'Gat ekki hlaðið kafla. Þú ert án nettengingar og efnið er ekki í skyndiminni.'
				: `Gat ekki hlaðið kafla: ${chapterSlug}/${sectionFile}`,
			0,
			isOffline
		);
	}

	if (!response.ok) {
		const isOffline = checkOffline();
		throw new ContentLoadError(
			isOffline
				? 'Gat ekki hlaðið kafla. Þú ert án nettengingar og efnið er ekki í skyndiminni.'
				: `Gat ekki hlaðið kafla: ${chapterSlug}/${sectionFile}`,
			response.status,
			isOffline
		);
	}

	const fileContent = await response.text();

	// HTML content: pre-rendered from CNXML pipeline
	const pageData = extractHtmlPageData(fileContent);
	const articleContent = extractHtmlArticleContent(fileContent);

	// Get title from preloaded metadata, page-data, or extract from HTML
	const title = preloadedMetadata?.title || pageData.title || extractHtmlTitle(fileContent);

	// Get section number from preloaded metadata or page-data
	const section = preloadedMetadata?.section || pageData.section || '';

	// Get chapter number from preloaded metadata or page-data
	const chapter = preloadedMetadata?.chapter || pageData.chapter || 0;

	const sectionContent: SectionContent = {
		title,
		section,
		chapter,
		objectives: preloadedMetadata?.objectives || [],
		content: articleContent,
		readingTime: preloadedMetadata?.readingTime || 5,
		difficulty: preloadedMetadata?.difficulty,
		keywords: preloadedMetadata?.keywords,
		prerequisites: preloadedMetadata?.prerequisites,
		source: preloadedMetadata?.source
	};

	return sectionContent;
}

// ============================================
// Path generation helpers (v2 number-based routing)
// ============================================

/**
 * Get URL path segment for a chapter (zero-padded number)
 * Example: chapter 2 → "02"
 */
export function getChapterPath(chapter: { number: number; slug?: string }): string {
  return String(chapter.number).padStart(2, '0');
}

/**
 * Get URL path segment for a section (number with hyphen)
 * Example: "2.1" → "2-1", "1.10" → "1-10"
 * For unnumbered sections (intro, EOC pages), uses file basename
 */
export function getSectionPath(section: { number: string; slug?: string; file?: string; type?: string }): string {
  // For numbered sections, use the number
  if (section.number && section.number !== '') {
    return section.number.replace('.', '-');
  }

  // For unnumbered sections (intro, glossary, etc.), derive from filename
  // e.g., "1-key-terms.html" → "1-key-terms"
  if (section.file) {
    return section.file.replace(/\.html$/, '');
  }

  // Fallback to slug if available
  return section.slug || '';
}

/**
 * Get folder name for chapter (used for file system paths)
 * In v2, this is the zero-padded number; in v1, it was the slug
 */
export function getChapterFolder(chapter: { number: number; slug?: string }): string {
  // Use slug if present (v1 format), otherwise use padded number (v2)
  return chapter.slug || getChapterPath(chapter);
}

// ============================================
// Chapter and section lookup functions
// ============================================

/**
 * Find chapter by path (supports both v1 slugs and v2 numbers)
 * @param toc - Table of contents
 * @param path - Chapter path (e.g., "02" or "02-atom-og-sameindir")
 */
export function findChapterBySlug(toc: TableOfContents, path: string) {
  // First try exact slug match (v1)
  const bySlug = toc.chapters.find((chapter) => chapter.slug === path);
  if (bySlug) return bySlug;

  // Then try number match (v2) - path might be "02" or "2"
  const num = parseInt(path, 10);
  if (!isNaN(num)) {
    return toc.chapters.find((chapter) => chapter.number === num);
  }

  return undefined;
}

/**
 * Find section by path (supports both v1 slugs and v2 numbers)
 * @param toc - Table of contents
 * @param chapterPath - Chapter path (e.g., "02" or "02-atom-og-sameindir")
 * @param sectionPath - Section path (e.g., "2-1" or "2-1-fyrstu-hugmyndir")
 */
export function findSectionBySlug(toc: TableOfContents, chapterPath: string, sectionPath: string) {
  const chapter = findChapterBySlug(toc, chapterPath);
  if (!chapter) return null;

  // First try exact slug match (v1)
  let section = chapter.sections.find((s) => s.slug === sectionPath);
  if (section) return { chapter, section };

  // Then try number match (v2) - convert "2-1" back to "2.1"
  const sectionNumber = sectionPath.replaceAll('-', '.');
  section = chapter.sections.find((s) => s.number === sectionNumber);
  if (section) return { chapter, section };

  // For unnumbered sections (intro, EOC pages), try matching by file basename
  // e.g., sectionPath "1-0-introduction" matches file "1-0-introduction.md" or "1-0-introduction.html"
  section = chapter.sections.find((s) => {
    if (s.number === '' && s.file) {
      const fileBasename = s.file.replace(/\.html$/, '');
      return fileBasename === sectionPath;
    }
    return false;
  });
  if (section) return { chapter, section };

  return null;
}

// ============================================
// Appendix helpers
// ============================================

/**
 * Get URL path segment for an appendix
 * Example: appendix with letter "A" → "A"
 */
export function getAppendixPath(appendix: Appendix): string {
  return appendix.letter;
}

/**
 * Find appendix by letter
 */
export function findAppendixByLetter(toc: TableOfContents, letter: string): Appendix | undefined {
  if (!toc.appendices) return undefined;
  return toc.appendices.find((a) => a.letter.toUpperCase() === letter.toUpperCase());
}

/**
 * Load appendix content
 */
export async function loadAppendixContent(
  bookSlug: string,
  appendixFile: string,
  fetchFn: typeof fetch = fetch
): Promise<SectionContent> {
  let response: Response;
  try {
    response = await fetchFn(`/content/${bookSlug}/chapters/${appendixFile}`);
  } catch (e) {
    const isOffline = checkOffline();
    throw new ContentLoadError(
      isOffline
        ? 'Gat ekki hlaðið viðauka. Þú ert án nettengingar.'
        : `Gat ekki hlaðið viðauka: ${appendixFile}`,
      0,
      isOffline
    );
  }

  if (!response.ok) {
    const isOffline = checkOffline();
    throw new ContentLoadError(
      isOffline
        ? 'Gat ekki hlaðið viðauka. Þú ert án nettengingar.'
        : `Gat ekki hlaðið viðauka: ${appendixFile}`,
      response.status,
      isOffline
    );
  }

  const fileContent = await response.text();

  // HTML content: pre-rendered from CNXML pipeline
  const pageData = extractHtmlPageData(fileContent);
  const articleContent = extractHtmlArticleContent(fileContent);
  const title = pageData.title || extractHtmlTitle(fileContent);

  const sectionContent: SectionContent = {
    title,
    section: '',  // Appendices don't have section numbers
    chapter: 0,   // Appendices don't belong to chapters
    objectives: [],
    content: articleContent,
    readingTime: 5
  };

  return sectionContent;
}
