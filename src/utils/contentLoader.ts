import type { TableOfContents, SectionContent } from "@/types/content";

// Load table of contents for a specific book
export async function loadTableOfContents(bookSlug: string): Promise<TableOfContents> {
  try {
    const response = await fetch(`/content/${bookSlug}/toc.json`);
    if (!response.ok) {
      throw new Error("Gat ekki hlaðið efnisyfirliti");
    }
    return await response.json();
  } catch (error) {
    console.error("Villa við að hlaða efnisyfirliti:", error);
    throw error;
  }
}

// Load section content for a specific book
export async function loadSectionContent(
  bookSlug: string,
  chapterSlug: string,
  sectionFile: string,
): Promise<SectionContent> {
  try {
    const response = await fetch(
      `/content/${bookSlug}/chapters/${chapterSlug}/${sectionFile}`,
    );
    if (!response.ok) {
      throw new Error(`Gat ekki hlaðið kafla: ${chapterSlug}/${sectionFile}`);
    }
    const markdown = await response.text();

    // Parse frontmatter and content
    const { metadata, content } = parseFrontmatter(markdown);

    // Transform relative image paths to absolute paths
    const basePath = `/content/${bookSlug}/chapters/${chapterSlug}`;
    const transformedContent = content.replace(
      /!\[([^\]]*)\]\(images\//g,
      `![$1](${basePath}/images/`,
    );

    return {
      title: typeof metadata.title === "string" ? metadata.title : "",
      section: typeof metadata.section === "string" ? metadata.section : "",
      chapter: typeof metadata.chapter === "number" ? metadata.chapter : 0,
      objectives: Array.isArray(metadata.objectives) ? metadata.objectives : [],
      content: transformedContent,
    };
  } catch (error) {
    console.error("Villa við að hlaða kaflahlutefni:", error);
    throw error;
  }
}

// Parse frontmatter from markdown
function parseFrontmatter(markdown: string): {
  metadata: Record<string, string | number | string[]>;
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
  const metadata: Record<string, string | number | string[]> = {};

  // Simple YAML parsing
  const lines = frontmatterStr.split("\n");
  let currentKey = "";
  let isArray = false;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) return;

    // Check if array value
    if (trimmedLine.startsWith("- ")) {
      if (isArray && currentKey && Array.isArray(metadata[currentKey])) {
        (metadata[currentKey] as string[]).push(
          trimmedLine.substring(2).trim(),
        );
      }
      return;
    }

    // Check if key: value pair
    const colonIndex = trimmedLine.indexOf(":");
    if (colonIndex > -1) {
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      currentKey = key;

      if (!value) {
        // Next value is probably array
        metadata[key] = [];
        isArray = true;
      } else {
        // Simple values
        isArray = false;
        // Try to convert to number if possible
        metadata[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
  });

  return { metadata, content };
}

// Find chapter by slug
export function findChapterBySlug(toc: TableOfContents, slug: string) {
  return toc.chapters.find((chapter) => chapter.slug === slug);
}

// Find section by slug
export function findSectionBySlug(
  toc: TableOfContents,
  chapterSlug: string,
  sectionSlug: string,
) {
  const chapter = findChapterBySlug(toc, chapterSlug);
  if (!chapter) return null;

  const section = chapter.sections.find((s) => s.slug === sectionSlug);
  if (!section) return null;

  return { chapter, section };
}
