import type { TableOfContents } from "$lib/types/content";
import { findSectionBySlug } from "$lib/utils/contentLoader";
import {
  calculateProgressFromCounts,
  type ProgressResult,
} from "$lib/utils/storeHelpers";

/** Total number of learning objectives across a book's sections (from toc.json). */
export function countBookObjectives(toc: TableOfContents): number {
  let n = 0;
  for (const ch of toc.chapters) {
    for (const sec of ch.sections) {
      n += sec.metadata?.objectives?.length ?? 0;
    }
  }
  return n;
}

/** Coverage = assessed objectives / real total. */
export function coverage(assessed: number, total: number): ProgressResult {
  return calculateProgressFromCounts(assessed, total);
}

/**
 * The stored objective entries that still name an objective in this book's toc. A tick is keyed
 * book/chapter/section/index (createObjectiveKey); it stays stored when its objective goes (efni's
 * H2 empties the chapter introductions' lists), but it no longer counts. The section is resolved
 * as the section route resolves it, so a tick the reader can see is never left out. Other books'
 * entries pass through, and with no toc every entry does: there is nothing to judge them by.
 */
export function currentObjectives<T>(
  stored: Record<string, T>,
  toc: TableOfContents | null,
  bookSlug: string,
): Record<string, T> {
  if (!toc) return stored;
  const prefix = `${bookSlug}/`;
  return Object.fromEntries(
    Object.entries(stored).filter(([key]) => {
      if (!key.startsWith(prefix)) return true;
      const parts = key.slice(prefix.length).split("/");
      if (parts.length !== 3 || !/^\d+$/.test(parts[2])) return false;
      const found = findSectionBySlug(toc, parts[0], parts[1]);
      return Number(parts[2]) < (found?.section.metadata?.objectives?.length ?? 0);
    }),
  );
}
