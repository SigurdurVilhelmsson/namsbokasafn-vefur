import { useState } from "react";
import { X, Target, Sparkles, CheckCircle2 } from "lucide-react";
import {
  useObjectivesStore,
  type ConfidenceLevel,
} from "@/stores/objectivesStore";

// =============================================================================
// TYPES
// =============================================================================

interface SelfAssessmentModalProps {
  objectives: string[];
  chapterSlug: string;
  sectionSlug: string;
  onClose: () => void;
  onCreateFlashcards?: (objectives: string[]) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIDENCE_LEVELS: {
  level: ConfidenceLevel;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    level: 1,
    label: "Mjög óviss",
    emoji: "😰",
    description: "Þarf að endurskoða efnið",
  },
  {
    level: 2,
    label: "Nokkuð óviss",
    emoji: "😕",
    description: "Þarf meiri æfingu",
  },
  {
    level: 3,
    label: "Í meðallagi",
    emoji: "😐",
    description: "Skil grunn en þarf endurtekingu",
  },
  {
    level: 4,
    label: "Nokkuð örugg/ur",
    emoji: "🙂",
    description: "Góð tök en gæti verið betra",
  },
  {
    level: 5,
    label: "Mjög örugg/ur",
    emoji: "😊",
    description: "Hef góð tök á efninu",
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function SelfAssessmentModal({
  objectives,
  chapterSlug,
  sectionSlug,
  onClose,
  onCreateFlashcards,
}: SelfAssessmentModalProps) {
  const { setObjectiveConfidence, getObjectiveConfidence } =
    useObjectivesStore();

  // Initialize ratings from store or undefined
  const [ratings, setRatings] = useState<(ConfidenceLevel | undefined)[]>(() =>
    objectives.map((_, index) =>
      getObjectiveConfidence(chapterSlug, sectionSlug, index),
    ),
  );
  const [showSummary, setShowSummary] = useState(false);

  const handleRatingChange = (index: number, level: ConfidenceLevel) => {
    const newRatings = [...ratings];
    newRatings[index] = level;
    setRatings(newRatings);
  };

  const handleSave = () => {
    // Save all ratings to store
    ratings.forEach((rating, index) => {
      if (rating !== undefined) {
        setObjectiveConfidence(chapterSlug, sectionSlug, index, rating);
      }
    });
    setShowSummary(true);
  };

  const allRated = ratings.every((r) => r !== undefined);
  const lowConfidenceObjectives = objectives.filter(
    (_, index) => ratings[index] !== undefined && ratings[index]! <= 2,
  );

  const handleCreateFlashcards = () => {
    if (onCreateFlashcards && lowConfidenceObjectives.length > 0) {
      onCreateFlashcards(lowConfidenceObjectives);
    }
    onClose();
  };

  // Summary view after saving
  if (showSummary) {
    const avgConfidence =
      ratings.reduce((sum, r) => sum + (r ?? 0), 0) / ratings.length;
    const confidenceMessage =
      avgConfidence >= 4
        ? "Frábært! Þú virðist hafa góð tök á efninu."
        : avgConfidence >= 3
          ? "Góður grunnur! Haldtu áfram að æfa þig."
          : "Gott að þú veist hvar þú þarft að bæta þig!";

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assessment-summary-title"
      >
        <div className="mx-4 w-full max-w-md rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <h2
                id="assessment-summary-title"
                className="font-sans text-lg font-semibold text-[var(--text-primary)]"
              >
                Sjálfsmat lokið
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Loka"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="mb-4 text-center text-[var(--text-primary)]">
              {confidenceMessage}
            </p>

            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-[var(--bg-primary)] px-4 py-2">
                <span className="font-sans text-sm text-[var(--text-secondary)]">
                  Meðal sjálfstraust:{" "}
                </span>
                <span className="font-sans text-lg font-semibold text-[var(--accent-color)]">
                  {avgConfidence.toFixed(1)}/5
                </span>
              </div>
            </div>

            {lowConfidenceObjectives.length > 0 && onCreateFlashcards && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/50 dark:bg-orange-900/20">
                <p className="mb-3 flex items-center gap-2 font-sans text-sm font-medium text-orange-700 dark:text-orange-400">
                  <Sparkles size={16} />
                  {lowConfidenceObjectives.length} markmið með lágt sjálfstraust
                </p>
                <p className="mb-3 font-sans text-sm text-orange-600 dark:text-orange-300">
                  Viltu búa til minniskort fyrir þessi markmið til að æfa þig?
                </p>
                <button
                  onClick={handleCreateFlashcards}
                  className="w-full rounded-lg bg-orange-500 px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  Búa til minniskort ({lowConfidenceObjectives.length})
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border-color)] px-6 py-4">
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Loka
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rating view
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assessment-modal-title"
    >
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Target size={20} className="text-[var(--accent-color)]" />
            <h2
              id="assessment-modal-title"
              className="font-sans text-lg font-semibold text-[var(--text-primary)]"
            >
              Sjálfsmat á markmiðum
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Loka"
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-3">
          <p className="font-sans text-sm text-[var(--text-secondary)]">
            Mettu hversu örugg/ur þú ert með hvert markmið. Þetta hjálpar þér að
            finna hvar þú þarft að æfa þig meira.
          </p>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-4">
            {objectives.map((objective, index) => (
              <div
                key={index}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <p className="mb-3 font-sans text-sm text-[var(--text-primary)]">
                  {objective}
                </p>
                <div className="flex flex-wrap gap-2">
                  {CONFIDENCE_LEVELS.map(({ level, label, emoji }) => (
                    <button
                      key={level}
                      onClick={() => handleRatingChange(index, level)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 font-sans text-xs transition-all ${
                        ratings[index] === level
                          ? "bg-[var(--accent-color)] text-white"
                          : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--text-primary)]"
                      }`}
                      title={
                        CONFIDENCE_LEVELS.find((c) => c.level === level)
                          ?.description
                      }
                    >
                      <span>{emoji}</span>
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{level}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 border-t border-[var(--border-color)] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
          >
            Hætta við
          </button>
          <button
            onClick={handleSave}
            disabled={!allRated}
            className="rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vista mat ({ratings.filter((r) => r !== undefined).length}/
            {objectives.length})
          </button>
        </div>
      </div>
    </div>
  );
}
