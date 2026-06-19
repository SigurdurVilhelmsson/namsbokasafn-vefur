import type { TableOfContents } from "$lib/types/content";
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
