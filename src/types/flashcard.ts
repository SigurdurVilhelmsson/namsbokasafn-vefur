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

// Study session for a flashcard
export interface FlashcardStudyRecord {
  cardId: string;
  lastReviewed: string; // ISO date string
  ease: number; // Difficulty rating (1-5 or easy/medium/hard)
  reviewCount: number;
}
