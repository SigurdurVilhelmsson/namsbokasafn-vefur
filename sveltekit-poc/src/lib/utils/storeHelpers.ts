/**
 * Shared utility functions for Svelte stores
 */

// Progress result type
export interface ProgressResult {
  total: number;
  completed: number;
  percentage: number;
}

// Completable item interface
export interface CompletableItem {
  isCompleted: boolean;
}

/**
 * Create a section key from chapter and section slugs
 */
export function createSectionKey(chapterSlug: string, sectionSlug: string): string {
  return `${chapterSlug}/${sectionSlug}`;
}

/**
 * Create a stats key with optional chapter/section
 */
export function createStatsKey(chapterSlug?: string, sectionSlug?: string): string {
  if (sectionSlug && chapterSlug) {
    return createSectionKey(chapterSlug, sectionSlug);
  }
  return chapterSlug || 'global';
}

/**
 * Create an objective key with index
 */
export function createObjectiveKey(
  chapterSlug: string,
  sectionSlug: string,
  objectiveIndex: number
): string {
  return `${chapterSlug}/${sectionSlug}/${objectiveIndex}`;
}

/**
 * Create a chapter prefix for filtering
 */
export function createChapterPrefix(chapterSlug: string): string {
  return `${chapterSlug}/`;
}

/**
 * Calculate progress from a list of completable items
 */
export function calculateProgress(items: CompletableItem[]): ProgressResult {
  const total = items.length;
  const completed = items.filter((item) => item.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

/**
 * Calculate progress from counts
 */
export function calculateProgressFromCounts(completed: number, total: number): ProgressResult {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

/**
 * Get current timestamp as ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get today's date as an ISO date string (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date as an ISO date string
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Filter record entries by chapter prefix
 */
export function filterByChapterPrefix<T>(
  record: Record<string, T>,
  chapterSlug: string
): [string, T][] {
  const prefix = createChapterPrefix(chapterSlug);
  return Object.entries(record).filter(([key]) => key.startsWith(prefix));
}

/**
 * Filter items by chapter slug
 */
export function filterItemsByChapter<T extends { chapterSlug: string }>(
  items: T[],
  chapterSlug: string
): T[] {
  return items.filter((item) => item.chapterSlug === chapterSlug);
}

/**
 * Filter items by chapter and section slugs
 */
export function filterItemsBySection<T extends { chapterSlug: string; sectionSlug: string }>(
  items: T[],
  chapterSlug: string,
  sectionSlug: string
): T[] {
  return items.filter(
    (item) => item.chapterSlug === chapterSlug && item.sectionSlug === sectionSlug
  );
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
