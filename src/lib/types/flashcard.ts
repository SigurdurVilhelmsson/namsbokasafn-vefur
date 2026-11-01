/**
 * Types for the flashcard and spaced repetition system
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  source?: string;
  created: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  cards: Flashcard[];
  created: string;
}

// SM-2 algorithm uses 0-5 quality scores
export type StudyQuality = 0 | 1 | 2 | 3 | 4 | 5;

// User-friendly rating options
export type DifficultyRating = 'again' | 'hard' | 'good' | 'easy';

// Map user ratings to SM-2 quality scores
export const DIFFICULTY_TO_QUALITY: Record<DifficultyRating, StudyQuality> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5
};

/**
 * The ratings in the order the buttons show them, with their labels: by correctness, as
 * decision D04 ruled ('Erfitt' became 'Að hluta', 'Gott' became 'Rétt'; srs.ts and the
 * qualities above are unchanged). Every place that shows a rating reads this table.
 */
// D20: proposed wording (D04, PED-08): 'Rangt', 'Að hluta' and 'Rétt' ('Auðvelt' is unchanged).
export const RATINGS: { value: DifficultyRating; label: string }[] = [
  { value: 'again', label: 'Rangt' },
  { value: 'hard', label: 'Að hluta' },
  { value: 'good', label: 'Rétt' },
  { value: 'easy', label: 'Auðvelt' }
];

export const RATING_LABELS = Object.fromEntries(RATINGS.map((r) => [r.value, r.label])) as Record<
  DifficultyRating,
  string
>;

// SM-2 SRS study record
export interface FlashcardStudyRecord {
  cardId: string;
  lastReviewed: string;
  nextReview: string;
  ease: number;
  interval: number;
  reviewCount: number;
  consecutiveCorrect: number;
}

// Deck statistics
export interface DeckStats {
  totalCards: number;
  newCards: number;
  dueCards: number;
  learningCards: number;
  reviewCards: number;
}

export interface StudySession {
  cardsStudied: number;
  correctCount: number;
  startTime: string;
  endTime?: string;
}
