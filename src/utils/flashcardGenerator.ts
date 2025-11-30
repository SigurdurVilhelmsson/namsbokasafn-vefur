import type { Glossary } from "@/types/glossary";
import type { Flashcard, FlashcardDeck } from "@/types/flashcard";

/**
 * Generate flashcards from glossary terms
 */
export function generateFlashcardsFromGlossary(
  glossary: Glossary,
): FlashcardDeck {
  const cards: Flashcard[] = glossary.terms.map((term) => ({
    id: `glossary-${term.term.toLowerCase().replace(/\s+/g, "-")}`,
    front: term.term,
    back: term.definition,
    category: `Kafli ${term.chapter}`,
    source: "glossary",
    created: new Date().toISOString(),
  }));

  return {
    id: "glossary-deck",
    name: "Orðasafn - Öll hugtök",
    description: `${cards.length} hugtök úr orðasafninu`,
    cards,
    created: new Date().toISOString(),
  };
}

/**
 * Generate flashcards from glossary terms filtered by chapter
 */
export function generateFlashcardsByChapter(
  glossary: Glossary,
  chapter: string,
): FlashcardDeck {
  const filteredTerms = glossary.terms.filter(
    (term) => term.chapter === chapter,
  );

  const cards: Flashcard[] = filteredTerms.map((term) => ({
    id: `glossary-${chapter}-${term.term.toLowerCase().replace(/\s+/g, "-")}`,
    front: term.term,
    back: term.definition,
    category: `Kafli ${term.chapter}`,
    source: "glossary",
    created: new Date().toISOString(),
  }));

  return {
    id: `glossary-chapter-${chapter}`,
    name: `Orðasafn - Kafli ${chapter}`,
    description: `${cards.length} hugtök úr kafla ${chapter}`,
    cards,
    created: new Date().toISOString(),
  };
}

/**
 * Create a custom flashcard
 */
export function createCustomFlashcard(
  front: string,
  back: string,
  category?: string,
): Flashcard {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    front,
    back,
    category,
    source: "custom",
    created: new Date().toISOString(),
  };
}

/**
 * Shuffle flashcards array
 */
export function shuffleCards(cards: Flashcard[]): Flashcard[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
