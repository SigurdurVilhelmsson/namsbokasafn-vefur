/**
 * Shared utility functions for Zustand stores
 *
 * This module contains common helper functions used across multiple stores
 * to reduce code duplication and ensure consistent behavior.
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Standard progress result returned by progress calculation functions
 */
export interface ProgressResult {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Item that can be checked for completion
 */
export interface CompletableItem {
  isCompleted: boolean;
}

// =============================================================================
// KEY GENERATION
// =============================================================================

/**
 * Create a section key from chapter and section slugs
 * Format: "chapterSlug/sectionSlug"
 */
export function createSectionKey(
  chapterSlug: string,
  sectionSlug: string,
): string {
  return `${chapterSlug}/${sectionSlug}`;
}

/**
 * Create a stats key with optional chapter/section
 * Returns "chapterSlug/sectionSlug", "chapterSlug", or "global"
 */
export function createStatsKey(
  chapterSlug?: string,
  sectionSlug?: string,
): string {
  if (sectionSlug && chapterSlug) {
    return createSectionKey(chapterSlug, sectionSlug);
  }
  return chapterSlug || "global";
}

/**
 * Create an objective key with index
 * Format: "chapterSlug/sectionSlug/index"
 */
export function createObjectiveKey(
  chapterSlug: string,
  sectionSlug: string,
  objectiveIndex: number,
): string {
  return `${chapterSlug}/${sectionSlug}/${objectiveIndex}`;
}

/**
 * Create a chapter prefix for filtering
 * Format: "chapterSlug/"
 */
export function createChapterPrefix(chapterSlug: string): string {
  return `${chapterSlug}/`;
}

// =============================================================================
// PROGRESS CALCULATION
// =============================================================================

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
export function calculateProgressFromCounts(
  completed: number,
  total: number,
): ProgressResult {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

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
  return new Date().toISOString().split("T")[0];
}

/**
 * Get yesterday's date as an ISO date string (YYYY-MM-DD)
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

// =============================================================================
// FILTERING UTILITIES
// =============================================================================

/**
 * Filter record entries by chapter prefix
 */
export function filterByChapterPrefix<T>(
  record: Record<string, T>,
  chapterSlug: string,
): [string, T][] {
  const prefix = createChapterPrefix(chapterSlug);
  return Object.entries(record).filter(([key]) => key.startsWith(prefix));
}

/**
 * Filter items by chapter slug
 */
export function filterItemsByChapter<T extends { chapterSlug: string }>(
  items: T[],
  chapterSlug: string,
): T[] {
  return items.filter((item) => item.chapterSlug === chapterSlug);
}

/**
 * Filter items by chapter and section slugs
 */
export function filterItemsBySection<
  T extends { chapterSlug: string; sectionSlug: string },
>(items: T[], chapterSlug: string, sectionSlug: string): T[] {
  return items.filter(
    (item) =>
      item.chapterSlug === chapterSlug && item.sectionSlug === sectionSlug,
  );
}

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID using timestamp and random string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
