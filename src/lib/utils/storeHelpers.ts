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
 * Create a section key from book, chapter and section slugs.
 * Format: "bookSlug/chapterSlug/sectionSlug"
 */
export function createSectionKey(bookSlug: string, chapterSlug: string, sectionSlug: string): string {
  return `${bookSlug}/${chapterSlug}/${sectionSlug}`;
}

/**
 * Create a stats key with book prefix and optional chapter/section
 */
export function createStatsKey(bookSlug: string, chapterSlug?: string, sectionSlug?: string): string {
  if (sectionSlug && chapterSlug) {
    return createSectionKey(bookSlug, chapterSlug, sectionSlug);
  }
  if (chapterSlug) {
    return `${bookSlug}/${chapterSlug}`;
  }
  return `${bookSlug}/global`;
}

/**
 * Create an objective key with index
 */
export function createObjectiveKey(
  bookSlug: string,
  chapterSlug: string,
  sectionSlug: string,
  objectiveIndex: number
): string {
  return `${bookSlug}/${chapterSlug}/${sectionSlug}/${objectiveIndex}`;
}

/**
 * Create a chapter prefix for filtering
 */
export function createChapterPrefix(bookSlug: string, chapterSlug: string): string {
  return `${bookSlug}/${chapterSlug}/`;
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
 * Format a Date as a local date string (YYYY-MM-DD).
 * Uses the user's local timezone, not UTC.
 */
export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Get today's date as a local date string (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return formatLocalDate(new Date());
}

/**
 * Get yesterday's date as a local date string (YYYY-MM-DD)
 */
export function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}

/**
 * Filter record entries by chapter prefix
 */
export function filterByChapterPrefix<T>(
  record: Record<string, T>,
  bookSlug: string,
  chapterSlug: string
): [string, T][] {
  const prefix = createChapterPrefix(bookSlug, chapterSlug);
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
  return crypto.randomUUID();
}

/**
 * Default book slug for migrating legacy localStorage data that lacked a book prefix.
 * All existing data belongs to 'efnafraedi' since it was the only available book.
 */
const LEGACY_BOOK_SLUG = 'efnafraedi';

/**
 * Migrate a Record's keys from legacy format (chapterSlug/sectionSlug)
 * to new format (bookSlug/chapterSlug/sectionSlug).
 * Keys already containing 3+ segments are left untouched.
 */
export function migrateRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  const migrated: Record<string, T> = {};
  let needsMigration = false;

  for (const [key, value] of Object.entries(record)) {
    // Legacy keys have format "chapterSlug/sectionSlug" (1 slash) or "chapterSlug" (0 slashes)
    // New keys have format "bookSlug/chapterSlug/sectionSlug" (2+ slashes)
    // Special case: "global" key becomes "bookSlug/global"
    const slashCount = (key.match(/\//g) || []).length;
    if (slashCount < 2 && key !== '') {
      migrated[`${LEGACY_BOOK_SLUG}/${key}`] = value;
      needsMigration = true;
    } else {
      migrated[key] = value;
    }
  }

  return needsMigration ? migrated : record;
}

/**
 * Migrate a bookmarks array from legacy format to new format.
 * Legacy: ["chapterSlug/sectionSlug"], New: ["bookSlug/chapterSlug/sectionSlug"]
 */
export function migrateBookmarkKeys(bookmarks: string[]): string[] {
  let needsMigration = false;
  const migrated = bookmarks.map((key) => {
    const slashCount = (key.match(/\//g) || []).length;
    if (slashCount < 2) {
      needsMigration = true;
      return `${LEGACY_BOOK_SLUG}/${key}`;
    }
    return key;
  });
  return needsMigration ? migrated : bookmarks;
}
