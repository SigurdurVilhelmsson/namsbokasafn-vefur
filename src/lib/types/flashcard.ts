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
