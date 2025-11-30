import type { TableOfContents } from '@/types/content';

// Gerð fyrir leitarniðurstöðu (search result type)
export interface SearchResult {
  chapterSlug: string;
  sectionSlug: string;
  chapterTitle: string;
  sectionTitle: string;
  sectionNumber: string;
  snippet: string;
  matches: number;
}

// Einfalda textann fyrir leit (normalize text for search)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Aðskilja accents frá stöfum
    .replace(/[\u0300-\u036f]/g, '') // Fjarlægja accents
    .replace(/[^\w\s]/g, ' ') // Fjarlægja greinarmerki
    .replace(/\s+/g, ' ') // Sameina bil
    .trim();
}

// Búa til snippet með highlighted query (create snippet with highlighted query)
function createSnippet(text: string, query: string, contextLength: number = 100): string {
  const normalized = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  const index = normalized.indexOf(normalizedQuery);
  if (index === -1) return '';

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);

  let snippet = text.substring(start, end);

  // Bæta við ... ef við erum ekki við byrjun/enda
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

// Leita í efni (search content)
export async function searchContent(
  query: string,
  toc: TableOfContents
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const normalizedQuery = normalizeText(query);
  const results: SearchResult[] = [];

  // Fara í gegnum alla kafla (iterate through all chapters)
  for (const chapter of toc.chapters) {
    for (const section of chapter.sections) {
      try {
        // Hlaða efni kaflans (load section content)
        const response = await fetch(
          `/content/chapters/${chapter.slug}/${section.file}`
        );
        if (!response.ok) continue;

        const markdown = await response.text();

        // Fjarlægja frontmatter (remove frontmatter)
        const contentWithoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n/, '');

        // Fjarlægja markdown syntax til að fá hreinan texta
        const plainText = contentWithoutFrontmatter
          .replace(/#{1,6}\s/g, '') // Headings
          .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
          .replace(/\*(.+?)\*/g, '$1') // Italic
          .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
          .replace(/`{1,3}[^`]+`{1,3}/g, '') // Code
          .replace(/^\|.+\|$/gm, '') // Tables
          .replace(/:::.+?:::/gs, ''); // Custom blocks

        const normalizedContent = normalizeText(plainText);

        // Athuga hvort query sé í textanum (check if query is in the text)
        if (normalizedContent.includes(normalizedQuery)) {
          // Telja fjölda matches (count matches)
          const matches = (normalizedContent.match(new RegExp(normalizedQuery, 'g')) || []).length;

          // Búa til snippet (create snippet)
          const snippet = createSnippet(plainText, query);

          results.push({
            chapterSlug: chapter.slug,
            sectionSlug: section.slug,
            chapterTitle: chapter.title,
            sectionTitle: section.title,
            sectionNumber: section.number,
            snippet,
            matches,
          });
        }
      } catch (error) {
        console.error(`Villa við að leita í ${chapter.slug}/${section.slug}:`, error);
      }
    }
  }

  // Raða niðurstöðum eftir fjölda matches (sort by number of matches)
  results.sort((a, b) => b.matches - a.matches);

  return results;
}

// Highlight query í texta (highlight query in text)
export function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;

  const normalizedQuery = normalizeText(query);
  const parts: string[] = [];
  let lastIndex = 0;

  const normalized = normalizeText(text);
  let searchIndex = 0;

  while (true) {
    const index = normalized.indexOf(normalizedQuery, searchIndex);
    if (index === -1) break;

    // Bæta við texta fyrir match
    parts.push(text.substring(lastIndex, index));

    // Bæta við highlighted match
    const matchedText = text.substring(index, index + query.length);
    parts.push(`<mark class="bg-yellow-200 dark:bg-yellow-900/50">${matchedText}</mark>`);

    lastIndex = index + query.length;
    searchIndex = index + query.length;
  }

  // Bæta við afganginum
  parts.push(text.substring(lastIndex));

  return parts.join('');
}
