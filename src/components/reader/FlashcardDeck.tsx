import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Flame,
  Clock,
} from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import type { Flashcard, DifficultyRating } from "@/types/flashcard";

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
    studyQueue,
    rateCard,
    getPreviewIntervals,
    getCardRecord,
    studyStreak,
    todayStudied,
  } = useFlashcardStore();

  const deck = getDeck(deckId);

  if (!deck || studyQueue.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">
            Engin kort til að æfa núna
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Öll kort hafa verið æfð. Komdu aftur síðar!
          </p>
        </div>
      </div>
    );
  }

  // Get current card from study queue
  const currentCardId = studyQueue[currentCardIndex];
  const currentCard = deck.cards.find((c) => c.id === currentCardId);

  if (!currentCard) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Villa: Kort fannst ekki</p>
      </div>
    );
  }

  const progress = ((currentCardIndex + 1) / studyQueue.length) * 100;
  const intervals = getPreviewIntervals(currentCardId);
  const cardRecord = getCardRecord(currentCardId);
  const isSessionComplete =
    currentCardIndex >= studyQueue.length - 1 && showAnswer;

  const handleRate = (rating: DifficultyRating) => {
    rateCard(currentCardId, rating);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Study stats bar */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          {studyStreak > 0 && (
            <div className="flex items-center gap-1.5 text-orange-500">
              <Flame size={16} />
              <span className="font-medium">{studyStreak} daga röð</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Clock size={16} />
            <span>{todayStudied} kort í dag</span>
          </div>
        </div>
        {cardRecord && (
          <div className="text-xs text-[var(--text-secondary)]">
            Æfð {cardRecord.reviewCount}x
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            Kort {currentCardIndex + 1} af {studyQueue.length}
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
          aria-label={`Framvinda: Kort ${currentCardIndex + 1} af ${studyQueue.length}`}
        >
          <div
            className="h-full bg-[var(--accent-color)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ARIA live region for card navigation */}
      <div role="status" aria-live="polite" className="sr-only">
        Kort {currentCardIndex + 1} af {studyQueue.length}
      </div>

      {/* Flashcard */}
      <FlashcardComponent
        card={currentCard}
        showAnswer={showAnswer}
        onFlip={toggleAnswer}
      />

      {/* Rating buttons (shown when answer is visible) */}
      {showAnswer ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Hversu vel mannstu þetta?
          </p>
          <div className="grid grid-cols-4 gap-2">
            <RatingButton
              rating="again"
              label="Aftur"
              interval={intervals.again}
              onClick={() => handleRate("again")}
              color="red"
            />
            <RatingButton
              rating="hard"
              label="Erfitt"
              interval={intervals.hard}
              onClick={() => handleRate("hard")}
              color="orange"
            />
            <RatingButton
              rating="good"
              label="Gott"
              interval={intervals.good}
              onClick={() => handleRate("good")}
              color="green"
            />
            <RatingButton
              rating="easy"
              label="Auðvelt"
              interval={intervals.easy}
              onClick={() => handleRate("easy")}
              color="blue"
            />
          </div>
        </div>
      ) : (
        /* Show answer button when answer is hidden */
        <div className="flex justify-center">
          <button
            onClick={toggleAnswer}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-8 py-3 font-sans font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <RotateCw size={20} />
            Sýna svar
          </button>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={previousCard}
          disabled={currentCardIndex === 0}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={18} />
          Fyrra
        </button>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === studyQueue.length - 1}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans text-sm font-medium transition-colors hover:bg-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Næsta
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Completion message */}
      {isSessionComplete && (
        <div className="rounded-lg border border-[var(--accent-color)] bg-[var(--accent-color)]/10 p-4 text-center">
          <p className="font-sans font-semibold">
            🎉 Þú hefur lokið æfingunni!
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Þú æfðir {studyQueue.length} kort. Vel gert!
          </p>
        </div>
      )}
    </div>
  );
}

// Rating button component
interface RatingButtonProps {
  rating: DifficultyRating;
  label: string;
  interval: string;
  onClick: () => void;
  color: "red" | "orange" | "green" | "blue";
}

function RatingButton({ label, interval, onClick, color }: RatingButtonProps) {
  const colorClasses = {
    red: "border-red-300 hover:bg-red-50 hover:border-red-400 text-red-700 dark:border-red-800 dark:hover:bg-red-900/20 dark:text-red-400",
    orange:
      "border-orange-300 hover:bg-orange-50 hover:border-orange-400 text-orange-700 dark:border-orange-800 dark:hover:bg-orange-900/20 dark:text-orange-400",
    green:
      "border-green-300 hover:bg-green-50 hover:border-green-400 text-green-700 dark:border-green-800 dark:hover:bg-green-900/20 dark:text-green-400",
    blue: "border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border-2 px-3 py-2 transition-all ${colorClasses[color]}`}
    >
      <span className="font-sans font-semibold">{label}</span>
      <span className="text-xs opacity-75">{interval}</span>
    </button>
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
