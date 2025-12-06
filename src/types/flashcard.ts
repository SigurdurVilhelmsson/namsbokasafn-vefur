// Flashcard type
export interface Flashcard {
  id: string;
  front: string; // Question or term
  back: string; // Answer or definition
  category?: string; // e.g., "Chapter 1", "Glossary"
  source?: string; // e.g., "glossary", "custom"
  created: string; // ISO date string
}

// Flashcard deck
export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  cards: Flashcard[];
  created: string;
}

// Study quality ratings (SM-2 algorithm uses 0-5)
export type StudyQuality = 0 | 1 | 2 | 3 | 4 | 5;

// User-friendly rating options
export type DifficultyRating = "again" | "hard" | "good" | "easy";

// Map user ratings to SM-2 quality scores
export const DIFFICULTY_TO_QUALITY: Record<DifficultyRating, StudyQuality> = {
  again: 0, // Complete blackout, wrong answer
  hard: 2, // Correct but with difficulty
  good: 4, // Correct with some hesitation
  easy: 5, // Perfect recall
};

// Study session for a flashcard (SM-2 SRS data)
export interface FlashcardStudyRecord {
  cardId: string;
  lastReviewed: string; // ISO date string
  nextReview: string; // ISO date string - when the card is due
  ease: number; // SM-2 ease factor (starts at 2.5, minimum 1.3)
  interval: number; // Days until next review
  reviewCount: number; // Number of times reviewed
  consecutiveCorrect: number; // Streak of correct answers (quality >= 3)
}

// Statistics for a deck
export interface DeckStats {
  totalCards: number;
  newCards: number; // Never reviewed
  dueCards: number; // Due for review today
  learningCards: number; // Recently started learning (interval < 7)
  reviewCards: number; // In review cycle (interval >= 7)
}
