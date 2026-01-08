/**
 * Content loading utilities
 */

import type { TableOfContents, SectionContent, DifficultyLevel } from '$lib/types/content';

const WORDS_PER_MINUTE = 180;

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
 * Load table of contents for a book
 */
export async function loadTableOfContents(
  bookSlug: string,
  fetchFn: typeof fetch = fetch
): Promise<TableOfContents> {
  const response = await fetchFn(`/content/${bookSlug}/toc.json`);
  if (!response.ok) {
    throw new Error('Gat ekki hlaðið efnisyfirliti');
  }
  return await response.json();
}

/**
 * Load section content for a book
 */
export async function loadSectionContent(
  bookSlug: string,
  chapterSlug: string,
  sectionFile: string,
  fetchFn: typeof fetch = fetch
): Promise<SectionContent> {
  const response = await fetchFn(`/content/${bookSlug}/chapters/${chapterSlug}/${sectionFile}`);
  if (!response.ok) {
    throw new Error(`Gat ekki hlaðið kafla: ${chapterSlug}/${sectionFile}`);
  }
  const markdown = await response.text();

  const { metadata, content } = parseFrontmatter(markdown);

  // Transform relative image paths to absolute
  const basePath = `/content/${bookSlug}/chapters/${chapterSlug}`;
  const transformedContent = content.replace(
    /!\[([^\]]*)\]\(\.?\/?\/?images\//g,
    `![$1](${basePath}/images/`
  );

  const readingTime = calculateReadingTime(transformedContent);
  const difficulty = parseDifficulty(metadata.difficulty);
  const keywords = Array.isArray(metadata.keywords) ? metadata.keywords : undefined;
  const prerequisites = Array.isArray(metadata.prerequisites) ? metadata.prerequisites : undefined;

  return {
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

/**
 * Find chapter by slug
 */
export function findChapterBySlug(toc: TableOfContents, slug: string) {
  return toc.chapters.find((chapter) => chapter.slug === slug);
}

/**
 * Find section by slug
 */
export function findSectionBySlug(toc: TableOfContents, chapterSlug: string, sectionSlug: string) {
  const chapter = findChapterBySlug(toc, chapterSlug);
  if (!chapter) return null;

  const section = chapter.sections.find((s) => s.slug === sectionSlug);
  if (!section) return null;

  return { chapter, section };
}
