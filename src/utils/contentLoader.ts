import type { TableOfContents, SectionContent } from '@/types/content';

// Hlaða efnisyfirliti (load table of contents)
export async function loadTableOfContents(): Promise<TableOfContents> {
  try {
    const response = await fetch('/content/toc.json');
    if (!response.ok) {
      throw new Error('Gat ekki hlaðið efnisyfirliti');
    }
    return await response.json();
  } catch (error) {
    console.error('Villa við að hlaða efnisyfirliti:', error);
    throw error;
  }
}

// Hlaða kaflahlutefni (load section content)
export async function loadSectionContent(
  chapterSlug: string,
  sectionFile: string
): Promise<SectionContent> {
  try {
    const response = await fetch(`/content/chapters/${chapterSlug}/${sectionFile}`);
    if (!response.ok) {
      throw new Error(`Gat ekki hlaðið kafla: ${chapterSlug}/${sectionFile}`);
    }
    const markdown = await response.text();

    // Greina frontmatter og efni (parse frontmatter and content)
    const { metadata, content } = parseFrontmatter(markdown);

    return {
      title: metadata.title || '',
      section: metadata.section || '',
      chapter: metadata.chapter || 0,
      objectives: metadata.objectives || [],
      content,
    };
  } catch (error) {
    console.error('Villa við að hlaða kaflahlutefni:', error);
    throw error;
  }
}

// Greina frontmatter úr markdown (parse frontmatter from markdown)
function parseFrontmatter(markdown: string): {
  metadata: Record<string, any>;
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {
      metadata: {},
      content: markdown,
    };
  }

  const [, frontmatterStr, content] = match;
  const metadata: Record<string, any> = {};

  // Einföld YAML greining (simple YAML parsing)
  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let isArray = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) return;

    // Athuga hvort þetta sé array gildi (check if array value)
    if (trimmedLine.startsWith('- ')) {
      if (isArray && currentKey) {
        metadata[currentKey].push(trimmedLine.substring(2).trim());
      }
      return;
    }

    // Athuga hvort þetta sé key: value par (check if key: value pair)
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex > -1) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      currentKey = key;

      if (!value) {
        // Næsta gildi er líklega array (next value is probably array)
        metadata[key] = [];
        isArray = true;
      } else {
        // Einföld gildi (simple values)
        isArray = false;
        // Reyna að breyta í tölu ef mögulegt (try to convert to number if possible)
        metadata[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
  });

  return { metadata, content };
}

// Finna kafla eftir slug (find chapter by slug)
export function findChapterBySlug(toc: TableOfContents, slug: string) {
  return toc.chapters.find((chapter) => chapter.slug === slug);
}

// Finna kaflahlutu eftir slug (find section by slug)
export function findSectionBySlug(
  toc: TableOfContents,
  chapterSlug: string,
  sectionSlug: string
) {
  const chapter = findChapterBySlug(toc, chapterSlug);
  if (!chapter) return null;

  const section = chapter.sections.find((s) => s.slug === sectionSlug);
  if (!section) return null;

  return { chapter, section };
}
