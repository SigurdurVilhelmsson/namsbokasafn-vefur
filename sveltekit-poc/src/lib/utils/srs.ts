/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * Based on the SuperMemo SM-2 algorithm by Piotr Wozniak
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

import type { StudyQuality, FlashcardStudyRecord, DifficultyRating } from '$lib/types/flashcard';
import { addDays, isAfter, startOfDay } from 'date-fns';

// Algorithm constants
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_INTERVAL_DAYS = 365;
const INITIAL_INTERVAL = 1;
const SECOND_INTERVAL = 6;
const MIN_CORRECT_QUALITY: StudyQuality = 3;
const LEARNING_PHASE_THRESHOLD_DAYS = 7;

// Ease factor adjustment constants
const EASE_BASE_ADJUSTMENT = 0.1;
const EASE_LINEAR_COEFFICIENT = 0.08;
const EASE_QUADRATIC_COEFFICIENT = 0.02;

// Rating to quality mapping
const RATING_TO_QUALITY: Record<DifficultyRating, StudyQuality> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5
};

/**
 * Calculate the new ease factor based on the quality of recall
 */
export function calculateNewEaseFactor(currentEase: number, quality: StudyQuality): number {
  const qualityDelta = 5 - quality;
  const adjustment =
    EASE_BASE_ADJUSTMENT -
    qualityDelta * (EASE_LINEAR_COEFFICIENT + qualityDelta * EASE_QUADRATIC_COEFFICIENT);

  return Math.max(MIN_EASE_FACTOR, currentEase + adjustment);
}

/**
 * Calculate the next interval based on SM-2 algorithm
 */
export function calculateNextInterval(
  consecutiveCorrect: number,
  currentInterval: number,
  easeFactor: number,
  quality: StudyQuality
): number {
  if (quality < MIN_CORRECT_QUALITY) {
    return INITIAL_INTERVAL;
  }

  if (consecutiveCorrect === 0) {
    return INITIAL_INTERVAL;
  }

  if (consecutiveCorrect === 1) {
    return SECOND_INTERVAL;
  }

  const newInterval = Math.round(currentInterval * easeFactor);
  return Math.min(newInterval, MAX_INTERVAL_DAYS);
}

/**
 * Process a card review and return updated study record
 */
export function processReview(
  cardId: string,
  quality: StudyQuality,
  existingRecord?: FlashcardStudyRecord
): FlashcardStudyRecord {
  const now = new Date();
  const nowISO = now.toISOString();

  const currentEase = existingRecord?.ease ?? DEFAULT_EASE_FACTOR;
  const currentInterval = existingRecord?.interval ?? 0;
  const currentConsecutive = existingRecord?.consecutiveCorrect ?? 0;
  const reviewCount = (existingRecord?.reviewCount ?? 0) + 1;

  const newEase = calculateNewEaseFactor(currentEase, quality);
  const newConsecutive = quality >= MIN_CORRECT_QUALITY ? currentConsecutive + 1 : 0;

  const newInterval = calculateNextInterval(currentConsecutive, currentInterval, newEase, quality);

  const nextReviewDate = addDays(startOfDay(now), newInterval);

  return {
    cardId,
    lastReviewed: nowISO,
    nextReview: nextReviewDate.toISOString(),
    ease: newEase,
    interval: newInterval,
    reviewCount,
    consecutiveCorrect: newConsecutive
  };
}

/**
 * Check if a card is due for review
 */
export function isCardDue(record: FlashcardStudyRecord | undefined): boolean {
  if (!record) return true;

  const now = startOfDay(new Date());
  const nextReview = new Date(record.nextReview);

  return !isAfter(nextReview, now);
}

/**
 * Check if a card is in the learning phase
 */
function isInLearningPhase(record: FlashcardStudyRecord): boolean {
  return record.interval < LEARNING_PHASE_THRESHOLD_DAYS;
}

/**
 * Sort cards by priority for studying
 */
export function sortCardsByPriority(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): string[] {
  return [...cardIds].sort((a, b) => {
    const recordA = records[a];
    const recordB = records[b];

    const isNewA = !recordA;
    const isNewB = !recordB;

    if (isNewA && isNewB) return 0;
    if (isNewA) return 1;
    if (isNewB) return -1;

    const dueA = isCardDue(recordA);
    const dueB = isCardDue(recordB);

    if (dueA && !dueB) return -1;
    if (!dueA && dueB) return 1;

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
  records: Record<string, FlashcardStudyRecord>
): string[] {
  return cardIds.filter((id) => isCardDue(records[id]));
}

/**
 * Get new cards (never reviewed)
 */
export function getNewCards(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
): string[] {
  return cardIds.filter((id) => !records[id]);
}

/**
 * Calculate deck statistics
 */
export function calculateDeckStats(
  cardIds: string[],
  records: Record<string, FlashcardStudyRecord>
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

    if (isInLearningPhase(record)) {
      learningCount++;
      if (isDue) dueCount++;
    } else {
      reviewCount++;
      if (isDue) dueCount++;
    }
  }

  return {
    total: cardIds.length,
    new: newCount,
    due: dueCount,
    learning: learningCount,
    review: reviewCount
  };
}

/**
 * Format interval as short Icelandic text
 */
function formatIntervalShort(days: number): string {
  if (days === 1) return '1 d';
  if (days < LEARNING_PHASE_THRESHOLD_DAYS) return `${days} d`;
  if (days < 30) return `${Math.round(days / 7)} v`;
  if (days < MAX_INTERVAL_DAYS) return `${Math.round(days / 30)} m`;
  return '1+ ár';
}

/**
 * Preview what intervals each rating would give
 */
export function previewRatingIntervals(
  existingRecord?: FlashcardStudyRecord
): Record<DifficultyRating, string> {
  const currentEase = existingRecord?.ease ?? DEFAULT_EASE_FACTOR;
  const currentConsecutive = existingRecord?.consecutiveCorrect ?? 0;
  const currentInterval = existingRecord?.interval ?? 0;

  const ratings: DifficultyRating[] = ['again', 'hard', 'good', 'easy'];
  const result: Record<DifficultyRating, string> = {
    again: '',
    hard: '',
    good: '',
    easy: ''
  };

  for (const rating of ratings) {
    const quality = RATING_TO_QUALITY[rating];
    const newEase = calculateNewEaseFactor(currentEase, quality);

    const interval = calculateNextInterval(
      quality >= MIN_CORRECT_QUALITY ? currentConsecutive : 0,
      currentInterval,
      newEase,
      quality
    );

    result[rating] = formatIntervalShort(interval);
  }

  return result;
}
