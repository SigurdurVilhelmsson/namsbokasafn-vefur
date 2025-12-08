/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * The algorithm schedules flashcard reviews based on how well
 * the user remembered the answer.
 */

import type {
  StudyQuality,
  FlashcardStudyRecord,
  DifficultyRating,
} from "@/types/flashcard";
import { addDays, isAfter, startOfDay } from "date-fns";

// Default ease factor for new cards
const DEFAULT_EASE_FACTOR = 2.5;

// Minimum ease factor (prevents cards from becoming too hard)
const MIN_EASE_FACTOR = 1.3;

// Initial interval for first review (in days)
const INITIAL_INTERVAL = 1;

// Second review interval
const SECOND_INTERVAL = 6;

/**
 * Calculate the new ease factor based on the quality of recall
 * Formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 * where q is the quality of response (0-5)
 */
export function calculateNewEaseFactor(
  currentEase: number,
  quality: StudyQuality,
): number {
  const newEase =
    currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ensure ease factor doesn't go below minimum
  return Math.max(MIN_EASE_FACTOR, newEase);
}

/**
 * Calculate the next interval based on SM-2 algorithm
 *
 * @param consecutiveCorrect - Number of consecutive correct answers (quality >= 3)
 * @param currentInterval - Current interval in days
 * @param easeFactor - Current ease factor
 * @param quality - Quality of the current response
 */
export function calculateNextInterval(
  consecutiveCorrect: number,
  currentInterval: number,
  easeFactor: number,
  quality: StudyQuality,
): number {
  // If quality < 3, reset to beginning (wrong answer)
  if (quality < 3) {
    return INITIAL_INTERVAL;
  }

  // First correct answer
  if (consecutiveCorrect === 0) {
    return INITIAL_INTERVAL;
  }

  // Second correct answer
  if (consecutiveCorrect === 1) {
    return SECOND_INTERVAL;
  }

  // Subsequent reviews: multiply previous interval by ease factor
  const newInterval = Math.round(currentInterval * easeFactor);

  // Cap maximum interval at 365 days (1 year)
  return Math.min(newInterval, 365);
}

/**
 * Process a card review and return updated study record
 */
export function processReview(
  cardId: string,
  quality: StudyQuality,
  existingRecord?: FlashcardStudyRecord,
): FlashcardStudyRecord {
  const now = new Date();
  const nowISO = now.toISOString();

  // Get current values or use defaults
  const currentEase = existingRecord?.ease ?? DEFAULT_EASE_FACTOR;
  const currentInterval = existingRecord?.interval ?? 0;
  const currentConsecutive = existingRecord?.consecutiveCorrect ?? 0;
  const reviewCount = (existingRecord?.reviewCount ?? 0) + 1;

  // Calculate new ease factor
  const newEase = calculateNewEaseFactor(currentEase, quality);

  // Update consecutive correct count
  const newConsecutive = quality >= 3 ? currentConsecutive + 1 : 0;

  // Calculate new interval
  const newInterval = calculateNextInterval(
    currentConsecutive,
    currentInterval,
    newEase,
    quality,
  );

  // Calculate next review date
  const nextReviewDate = addDays(startOfDay(now), newInterval);

  return {
    cardId,
    lastReviewed: nowISO,
    nextReview: nextReviewDate.toISOString(),
    ease: newEase,
    interval: newInterval,
    reviewCount,
    consecutiveCorrect: newConsecutive,
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(record: FlashcardStudyRecord | undefined): boolean {
  if (!record) {
    // New card, always due
    return true;
  }

  const now = startOfDay(new Date());
  const nextReview = new Date(record.nextReview);

  return !isAfter(nextReview, now);
}

/**
 * Sort cards by priority for studying
 * Priority: 1) Overdue cards (oldest first), 2) New cards, 3) Future cards
 */
export function sortCardsByPriority(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>,
): string[] {
  return [...cardIds].sort((a, b) => {
    const recordA = records[a];
    const recordB = records[b];

    // New cards (no record)
    const isNewA = !recordA;
    const isNewB = !recordB;

    if (isNewA && isNewB) return 0;
    if (isNewA) return 1; // New cards after due cards
    if (isNewB) return -1;

    // Check if due
    const dueA = isCardDue(recordA);
    const dueB = isCardDue(recordB);

    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

    // Both due or both not due - sort by next review date
    const dateA = new Date(recordA.nextReview);
    const dateB = new Date(recordB.nextReview);

    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get cards that are due for review today
 */
export function getDueCards(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>,
): string[] {
  return cardIds.filter((id) => isCardDue(records[id]));
}

/**
 * Get new cards (never reviewed)
 */
export function getNewCards(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>,
): string[] {
  return cardIds.filter((id) => !records[id]);
}

/**
 * Calculate deck statistics
 */
export function calculateDeckStats(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>,
): {
  total: number;
  new: number;
  due: number;
  learning: number;
  review: number;
} {
  let newCount = 0;
  let dueCount = 0;
  let learningCount = 0;
  let reviewCount = 0;

  for (const cardId of cardIds) {
    const record = records[cardId];

    if (!record) {
      newCount++;
      continue;
    }

    const isDue = isCardDue(record);

    if (record.interval < 7) {
      // Learning phase
      learningCount++;
      if (isDue) dueCount++;
    } else {
      // Review phase
      reviewCount++;
      if (isDue) dueCount++;
    }
  }

  return {
    total: cardIds.length,
    new: newCount,
    due: dueCount,
    learning: learningCount,
    review: reviewCount,
  };
}

/**
 * Get estimated next review times for display
 * Returns human-readable strings in Icelandic
 */
export function getNextReviewText(
  _interval: number,
  quality: StudyQuality,
  existingRecord?: FlashcardStudyRecord,
): string {
  // Calculate what the interval would be
  const currentEase = existingRecord?.ease ?? DEFAULT_EASE_FACTOR;
  const currentConsecutive = existingRecord?.consecutiveCorrect ?? 0;
  const currentInterval = existingRecord?.interval ?? 0;

  const newInterval = calculateNextInterval(
    quality >= 3 ? currentConsecutive : 0,
    currentInterval,
    calculateNewEaseFactor(currentEase, quality),
    quality,
  );

  if (newInterval === 1) {
    return "1 dagur";
  } else if (newInterval < 7) {
    return `${newInterval} dagar`;
  } else if (newInterval < 30) {
    const weeks = Math.round(newInterval / 7);
    return weeks === 1 ? "1 vika" : `${weeks} vikur`;
  } else if (newInterval < 365) {
    const months = Math.round(newInterval / 30);
    return months === 1 ? "1 mánuður" : `${months} mánuðir`;
  } else {
    return "1+ ár";
  }
}

/**
 * Preview what intervals each rating would give
 */
export function previewRatingIntervals(
  existingRecord?: FlashcardStudyRecord,
): Record<DifficultyRating, string> {
  const currentEase = existingRecord?.ease ?? DEFAULT_EASE_FACTOR;
  const currentConsecutive = existingRecord?.consecutiveCorrect ?? 0;
  const currentInterval = existingRecord?.interval ?? 0;

  const ratings: DifficultyRating[] = ["again", "hard", "good", "easy"];
  const qualityMap: Record<DifficultyRating, StudyQuality> = {
    again: 0,
    hard: 2,
    good: 4,
    easy: 5,
  };

  const result: Record<DifficultyRating, string> = {
    again: "",
    hard: "",
    good: "",
    easy: "",
  };

  for (const rating of ratings) {
    const quality = qualityMap[rating];
    const newEase = calculateNewEaseFactor(currentEase, quality);

    const interval = calculateNextInterval(
      quality >= 3 ? currentConsecutive : 0,
      currentInterval,
      newEase,
      quality,
    );

    result[rating] = formatInterval(interval);
  }

  return result;
}

/**
 * Format interval as human-readable Icelandic text
 */
function formatInterval(days: number): string {
  if (days === 1) {
    return "1 d";
  } else if (days < 7) {
    return `${days} d`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} v`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} m`;
  } else {
    return "1+ ár";
  }
}
