/**
 * Content loading utilities with in-memory caching
 */

import type { TableOfContents, SectionContent, DifficultyLevel, SectionMetadata, Appendix } from '$lib/types/content';
import { browser } from '$app/environment';

const WORDS_PER_MINUTE = 180;

// ============================================
// In-memory content cache
// ============================================

const tocCache = new Map<string, TableOfContents>();
const sectionCache = new Map<string, SectionContent>();

/**
 * Clear all cached content (useful for debugging or forcing refresh)
 */
export function clearContentCache(): void {
	tocCache.clear();
	sectionCache.clear();
}

/**
 * Clear cached TOC for a specific book
 */
export function clearTocCache(bookSlug?: string): void {
	if (bookSlug) {
		tocCache.delete(bookSlug);
	} else {
		tocCache.clear();
	}
}

/**
 * Clear cached section content
 */
export function clearSectionCache(bookSlug?: string, chapterSlug?: string): void {
	if (!bookSlug) {
		sectionCache.clear();
		return;
	}

	const prefix = chapterSlug ? `${bookSlug}/${chapterSlug}/` : `${bookSlug}/`;
	for (const key of sectionCache.keys()) {
		if (key.startsWith(prefix)) {
			sectionCache.delete(key);
		}
	}
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { tocEntries: number; sectionEntries: number } {
	return {
		tocEntries: tocCache.size,
		sectionEntries: sectionCache.size
	};
}

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
 * Calculate reading time from markdown content
 */
export function calculateReadingTime(content: string): number {
  const cleanText = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/[*_~`]/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$]+\$/g, '')
    .replace(/:::[\s\S]*?:::/g, '')
    .trim();

  const wordCount = cleanText.split(/\s+/).filter((word) => word.length > 0).length;
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  return Math.max(1, Math.min(minutes, 60));
}

/**
 * Validate difficulty level
 */
function parseDifficulty(value: unknown): DifficultyLevel | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'beginner' || normalized === 'intermediate' || normalized === 'advanced') {
    return normalized;
  }
  return undefined;
}

/**
 * Load table of contents for a book (with caching)
 */
export async function loadTableOfContents(
	bookSlug: string,
	fetchFn: typeof fetch = fetch
): Promise<TableOfContents> {
	// Check cache first (browser only)
	if (browser) {
		const cached = tocCache.get(bookSlug);
		if (cached) {
			return cached;
		}
	}

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
		const toc: TableOfContents = await response.json();

		// Cache the result (browser only)
		if (browser) {
			tocCache.set(bookSlug, toc);
		}

		return toc;
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
 * Load section content for a book (with caching)
 *
 * Supports both HTML (.html) and Markdown (.md) files.
 * HTML files are loaded as pre-rendered content with embedded metadata.
 * If preloadedMetadata is provided (from toc.json), it will be used instead of
 * parsing frontmatter at runtime. This is more efficient and handles YAML properly.
 */
export async function loadSectionContent(
	bookSlug: string,
	chapterSlug: string,
	sectionFile: string,
	fetchFn: typeof fetch = fetch,
	preloadedMetadata?: SectionMetadata
): Promise<SectionContent> {
	// Create cache key
	const cacheKey = `${bookSlug}/${chapterSlug}/${sectionFile}`;

	// Check cache first (browser only)
	if (browser) {
		const cached = sectionCache.get(cacheKey);
		if (cached) {
			return cached;
		}
	}

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
	const isHtmlFile = sectionFile.endsWith('.html');

	// Transform relative image paths to absolute
	const basePath = `/content/${bookSlug}/chapters/${chapterSlug}`;

	let sectionContent: SectionContent;

	if (isHtmlFile) {
		// HTML content: pre-rendered from CNXML pipeline
		const pageData = extractHtmlPageData(fileContent);
		const articleContent = extractHtmlArticleContent(fileContent);

		// Get title from preloaded metadata, page-data, or extract from HTML
		const title = preloadedMetadata?.title || pageData.title || extractHtmlTitle(fileContent);

		// Get section number from preloaded metadata or page-data
		const section = preloadedMetadata?.section || pageData.section || '';

		// Get chapter number from preloaded metadata or page-data
		const chapter = preloadedMetadata?.chapter || pageData.chapter || 0;

		// For HTML content, we mark it as pre-rendered so the renderer knows
		// not to process it through remark/rehype
		sectionContent = {
			title,
			section,
			chapter,
			objectives: preloadedMetadata?.objectives || [],
			content: articleContent,
			readingTime: preloadedMetadata?.readingTime || 5, // Default reading time
			difficulty: preloadedMetadata?.difficulty,
			keywords: preloadedMetadata?.keywords,
			prerequisites: preloadedMetadata?.prerequisites,
			source: preloadedMetadata?.source,
			isHtml: true // Flag to indicate pre-rendered HTML
		};
	} else if (preloadedMetadata) {
		// Markdown with pre-parsed metadata from build time (preferred)
		// Just extract the content without frontmatter
		const contentMatch = fileContent.match(/^---[\s\S]*?---\n([\s\S]*)$/);
		const rawContent = contentMatch ? contentMatch[1] : fileContent;
		const transformedContent = rawContent.replace(
			/!\[([^\]]*)\]\(\.?\/?\/?images\//g,
			`![$1](${basePath}/images/`
		);

		sectionContent = {
			title: preloadedMetadata.title,
			section: preloadedMetadata.section,
			chapter: preloadedMetadata.chapter,
			objectives: preloadedMetadata.objectives || [],
			content: transformedContent,
			readingTime: preloadedMetadata.readingTime,
			difficulty: preloadedMetadata.difficulty,
			keywords: preloadedMetadata.keywords,
			prerequisites: preloadedMetadata.prerequisites,
			source: preloadedMetadata.source
		};
	} else {
		// Fallback: parse frontmatter at runtime (for offline/legacy content)
		const { metadata, content } = parseFrontmatter(fileContent);
		const transformedContent = content.replace(
			/!\[([^\]]*)\]\(\.?\/?\/?images\//g,
			`![$1](${basePath}/images/`
		);

		const readingTime = calculateReadingTime(transformedContent);
		const difficulty = parseDifficulty(metadata.difficulty);
		const keywords = Array.isArray(metadata.keywords) ? metadata.keywords : undefined;
		const prerequisites = Array.isArray(metadata.prerequisites) ? metadata.prerequisites : undefined;

		sectionContent = {
			title: typeof metadata.title === 'string' ? metadata.title : '',
			section: typeof metadata.section === 'string' ? metadata.section : '',
			chapter: typeof metadata.chapter === 'number' ? metadata.chapter : 0,
			objectives: Array.isArray(metadata.objectives) ? metadata.objectives : [],
			content: transformedContent,
			readingTime,
			difficulty,
			keywords,
			prerequisites
		};
	}

	// Cache the result (browser only)
	if (browser) {
		sectionCache.set(cacheKey, sectionContent);
	}

	return sectionContent;
}

/**
 * Parse frontmatter from markdown
 */
export function parseFrontmatter(markdown: string): {
  metadata: Record<string, string | number | string[]>;
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content: markdown };
  }

  const [, frontmatterStr, content] = match;
  const metadata: Record<string, string | number | string[]> = {};

  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let isArray = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) return;

    if (trimmedLine.startsWith('- ')) {
      if (isArray && currentKey && Array.isArray(metadata[currentKey])) {
        (metadata[currentKey] as string[]).push(trimmedLine.substring(2).trim());
      }
      return;
    }

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > -1) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      currentKey = key;

      if (!value) {
        metadata[key] = [];
        isArray = true;
      } else {
        isArray = false;
        metadata[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
  });

  return { metadata, content };
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
  // e.g., "1-0-introduction.md" → "1-0-introduction"
  // e.g., "1-key-terms.html" → "1-key-terms"
  if (section.file) {
    return section.file.replace(/\.(md|html)$/, '');
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
  const sectionNumber = sectionPath.replace('-', '.');
  section = chapter.sections.find((s) => s.number === sectionNumber);
  if (section) return { chapter, section };

  // For unnumbered sections (intro, EOC pages), try matching by file basename
  // e.g., sectionPath "1-0-introduction" matches file "1-0-introduction.md" or "1-0-introduction.html"
  section = chapter.sections.find((s) => {
    if (s.number === '' && s.file) {
      const fileBasename = s.file.replace(/\.(md|html)$/, '');
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
  const cacheKey = `${bookSlug}/appendix/${appendixFile}`;

  // Check cache first (browser only)
  if (browser) {
    const cached = sectionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  let response: Response;
  try {
    response = await fetchFn(`/content/${bookSlug}/chapters/appendix/${appendixFile}`);
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
  const isHtmlFile = appendixFile.endsWith('.html');
  const basePath = `/content/${bookSlug}/chapters/appendix`;

  let sectionContent: SectionContent;

  if (isHtmlFile) {
    // HTML content: pre-rendered from CNXML pipeline
    const pageData = extractHtmlPageData(fileContent);
    const articleContent = extractHtmlArticleContent(fileContent);
    const title = pageData.title || extractHtmlTitle(fileContent);

    sectionContent = {
      title,
      section: '',  // Appendices don't have section numbers
      chapter: 0,   // Appendices don't belong to chapters
      objectives: [],
      content: articleContent,
      readingTime: 5,
      isHtml: true
    };
  } else {
    // Markdown content
    const { metadata, content } = parseFrontmatter(fileContent);
    const transformedContent = content.replace(
      /!\[([^\]]*)\]\(\.?\/?\/?images\//g,
      `![$1](${basePath}/images/`
    );

    const readingTime = calculateReadingTime(transformedContent);

    sectionContent = {
      title: typeof metadata.title === 'string' ? metadata.title : '',
      section: '',  // Appendices don't have section numbers
      chapter: 0,   // Appendices don't belong to chapters
      objectives: Array.isArray(metadata.objectives) ? metadata.objectives : [],
      content: transformedContent,
      readingTime
    };
  }

  // Cache the result (browser only)
  if (browser) {
    sectionCache.set(cacheKey, sectionContent);
  }

  return sectionContent;
}
