import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import type { Flashcard } from "@/types/flashcard";

interface FlashcardDeckProps {
  deckId: string;
}

export default function FlashcardDeck({ deckId }: FlashcardDeckProps) {
  const {
    getDeck,
    currentCardIndex,
    showAnswer,
    toggleAnswer,
    nextCard,
    previousCard,
  } = useFlashcardStore();

  const deck = getDeck(deckId);

  if (!deck || deck.cards.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">
          Engin kort í þessum búnka
        </p>
      </div>
    );
  }

  const currentCard = deck.cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / deck.cards.length) * 100;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            Kort {currentCardIndex + 1} af {deck.cards.length}
          </span>
          <span className="text-[var(--text-secondary)]">
            {Math.round(progress)}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--bg-primary)]"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Framvinda: Kort ${currentCardIndex + 1} af ${deck.cards.length}`}
        >
          <div
            className="h-full bg-[var(--accent-color)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ARIA live region for card navigation */}
      <div role="status" aria-live="polite" className="sr-only">
        Kort {currentCardIndex + 1} af {deck.cards.length}
      </div>

      {/* Flashcard */}
      <FlashcardComponent
        card={currentCard}
        showAnswer={showAnswer}
        onFlip={toggleAnswer}
      />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={previousCard}
          disabled={currentCardIndex === 0}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans font-medium transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={20} />
          Fyrra kort
        </button>

        <button
          onClick={toggleAnswer}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-6 py-2 font-sans font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <RotateCw size={20} />
          {showAnswer ? "Fela svar" : "Sýna svar"}
        </button>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === deck.cards.length - 1}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans font-medium transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Næsta kort
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Completion message */}
      {currentCardIndex === deck.cards.length - 1 && (
        <div className="rounded-lg border border-[var(--accent-color)] bg-[var(--accent-color)]/10 p-4 text-center">
          <p className="font-sans font-semibold">
            🎉 Þú hefur farið í gegnum öll kortin!
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Þú getur farið aftur í gegnum búnkann eða valið annan búnka
          </p>
        </div>
      )}
    </div>
  );
}

// Individual flashcard component with flip animation
interface FlashcardComponentProps {
  card: Flashcard;
  showAnswer: boolean;
  onFlip: () => void;
}

function FlashcardComponent({
  card,
  showAnswer,
  onFlip,
}: FlashcardComponentProps) {
  const [isFlipping, setIsFlipping] = useState(false);

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      onFlip();
      setIsFlipping(false);
    }, 150);
  };

  return (
    <div className="perspective-1000">
      <button
        onClick={handleFlip}
        aria-label={showAnswer ? "Fela svar" : "Sýna svar"}
        className={`relative h-96 w-full cursor-pointer rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg transition-all duration-300 hover:shadow-xl ${
          isFlipping ? "scale-95" : "scale-100"
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center p-8">
          {/* Front/Back indicator */}
          <div className="absolute left-4 top-4 rounded-full bg-[var(--accent-color)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-color)]">
            {showAnswer ? "Svar" : "Spurning"}
          </div>

          {/* Card content */}
          <div className="text-center">
            <p className="mb-4 font-sans text-3xl font-bold">
              {showAnswer ? card.back : card.front}
            </p>

            {!showAnswer && card.category && (
              <p className="text-sm text-[var(--text-secondary)]">
                {card.category}
              </p>
            )}
          </div>

          {/* Flip hint */}
          <div className="absolute bottom-4 text-sm text-[var(--text-secondary)]">
            Smelltu til að {showAnswer ? "fela svar" : "sjá svar"}
          </div>
        </div>
      </button>
    </div>
  );
}
