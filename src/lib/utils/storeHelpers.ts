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
 * Current book slug used for migrating legacy localStorage data.
 * Legacy data (no book prefix) and data under the old 'efnafraedi' slug
 * are both migrated to 'efnafraedi-2e'.
 */
const CURRENT_BOOK_SLUG = 'efnafraedi-2e';
const OLD_BOOK_SLUG = 'efnafraedi';
const OLD_SLUG_PREFIX = `${OLD_BOOK_SLUG}/`;

/**
 * Migrate a Record's keys through two stages:
 * 1. Legacy keys (no book prefix) → prefixed with current book slug
 * 2. Old slug keys (efnafraedi/...) → renamed to efnafraedi-2e/...
 */
export function migrateRecordKeys<T>(record: Record<string, T>): Record<string, T> {
  const migrated: Record<string, T> = {};
  let needsMigration = false;

  for (const [key, value] of Object.entries(record)) {
    const slashCount = (key.match(/\//g) || []).length;
    if (slashCount < 2 && key !== '') {
      // Legacy key without book prefix
      migrated[`${CURRENT_BOOK_SLUG}/${key}`] = value;
      needsMigration = true;
    } else if (key.startsWith(OLD_SLUG_PREFIX)) {
      // Old slug: efnafraedi/... → efnafraedi-2e/...
      migrated[`${CURRENT_BOOK_SLUG}/${key.slice(OLD_SLUG_PREFIX.length)}`] = value;
      needsMigration = true;
    } else {
      migrated[key] = value;
    }
  }

  return needsMigration ? migrated : record;
}

/**
 * Migrate a bookmarks array from legacy or old-slug format to current format.
 */
export function migrateBookmarkKeys(bookmarks: string[]): string[] {
  let needsMigration = false;
  const migrated = bookmarks.map((key) => {
    const slashCount = (key.match(/\//g) || []).length;
    if (slashCount < 2) {
      needsMigration = true;
      return `${CURRENT_BOOK_SLUG}/${key}`;
    }
    if (key.startsWith(OLD_SLUG_PREFIX)) {
      needsMigration = true;
      return `${CURRENT_BOOK_SLUG}/${key.slice(OLD_SLUG_PREFIX.length)}`;
    }
    return key;
  });
  return needsMigration ? migrated : bookmarks;
}
