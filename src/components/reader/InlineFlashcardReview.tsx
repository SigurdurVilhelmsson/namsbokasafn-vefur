import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import type { Flashcard, DifficultyRating } from "@/types/flashcard";

// =============================================================================
// TYPES
// =============================================================================

interface InlineFlashcardReviewProps {
  bookSlug: string;
  chapterSlug?: string;
  sectionSlug?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const RATING_BUTTONS: {
  rating: DifficultyRating;
  label: string;
  className: string;
}[] = [
  {
    rating: "again",
    label: "Aftur",
    className:
      "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20",
  },
  {
    rating: "hard",
    label: "Erfitt",
    className:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20",
  },
  {
    rating: "good",
    label: "Gott",
    className:
      "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20",
  },
  {
    rating: "easy",
    label: "Auðvelt",
    className:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function InlineFlashcardReview({
  bookSlug,
  chapterSlug,
  sectionSlug,
}: InlineFlashcardReviewProps) {
  const { decks, rateCard, getPreviewIntervals, isCardDue } =
    useFlashcardStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Get cards relevant to the current section
  const relevantCards = useMemo(() => {
    const sourcePattern = sectionSlug
      ? `${bookSlug}/${chapterSlug}/${sectionSlug}`
      : chapterSlug
        ? `${bookSlug}/${chapterSlug}`
        : bookSlug;

    const cards: Flashcard[] = [];
    for (const deck of decks) {
      for (const card of deck.cards) {
        if (card.source?.startsWith(sourcePattern) || card.category === chapterSlug) {
          cards.push(card);
        }
      }
    }

    // Prioritize due cards
    return cards.sort((a, b) => {
      const aDue = isCardDue(a.id);
      const bDue = isCardDue(b.id);
      if (aDue && !bDue) return -1;
      if (!aDue && bDue) return 1;
      return 0;
    });
  }, [decks, bookSlug, chapterSlug, sectionSlug, isCardDue]);

  // No cards to review
  if (relevantCards.length === 0) {
    return null;
  }

  const currentCard = relevantCards[currentIndex];
  const intervals = getPreviewIntervals(currentCard.id);
  const isDue = isCardDue(currentCard.id);

  const handleRate = (rating: DifficultyRating) => {
    rateCard(currentCard.id, rating);
    setShowAnswer(false);

    // Move to next card if available
    if (currentIndex < relevantCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Wrap around to first card
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : relevantCards.length - 1);
    setShowAnswer(false);
  };

  const handleNext = () => {
    setCurrentIndex(currentIndex < relevantCards.length - 1 ? currentIndex + 1 : 0);
    setShowAnswer(false);
  };

  return (
    <div className="my-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--accent-color)]" />
          <h3 className="font-sans text-sm font-semibold text-[var(--text-primary)]">
            Minniskort úr þessum kafla
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-[var(--text-secondary)]">
            {currentIndex + 1} / {relevantCards.length}
          </span>
          {isDue && (
            <span className="rounded-full bg-orange-500/10 px-2 py-0.5 font-sans text-xs text-orange-600 dark:text-orange-400">
              Til endurtekningar
            </span>
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative min-h-[120px] cursor-pointer rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
        onClick={() => setShowAnswer(!showAnswer)}
        role="button"
        aria-label={showAnswer ? "Fela svar" : "Sýna svar"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowAnswer(!showAnswer);
          }
        }}
      >
        <div className="text-center">
          {!showAnswer ? (
            <>
              <p className="font-sans text-sm text-[var(--text-primary)]">
                {currentCard.front}
              </p>
              <p className="mt-3 font-sans text-xs text-[var(--text-secondary)]">
                Smelltu til að sjá svarið
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 font-sans text-xs text-[var(--text-secondary)]">
                Spurning:
              </p>
              <p className="mb-3 font-sans text-sm text-[var(--text-secondary)]">
                {currentCard.front}
              </p>
              <div className="border-t border-[var(--border-color)] pt-3">
                <p className="mb-2 font-sans text-xs text-[var(--accent-color)]">
                  Svar:
                </p>
                <p className="font-sans text-sm font-medium text-[var(--text-primary)]">
                  {currentCard.back}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      {showAnswer ? (
        <div className="mt-3">
          <p className="mb-2 text-center font-sans text-xs text-[var(--text-secondary)]">
            Hversu erfitt var þetta?
          </p>
          <div className="flex justify-center gap-2">
            {RATING_BUTTONS.map(({ rating, label, className }) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                className={`rounded-lg px-3 py-1.5 font-sans text-xs font-medium transition-colors ${className}`}
                title={intervals[rating]}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            aria-label="Fyrra kort"
          >
            <ChevronLeft size={14} />
            Fyrra
          </button>
          <button
            onClick={() => setCurrentIndex(0)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            aria-label="Byrja aftur"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            aria-label="Næsta kort"
          >
            Næsta
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
