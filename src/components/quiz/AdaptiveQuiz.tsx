import { useState, useMemo } from "react";
import {
  Brain,
  Target,
  Trophy,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useQuizStore, type MasteryLevel } from "@/stores/quizStore";

// =============================================================================
// TYPES
// =============================================================================

interface AdaptiveQuizProps {
  chapterSlug?: string;
  onComplete?: () => void;
  maxProblems?: number;
}

interface QuizState {
  currentIndex: number;
  answers: Map<string, boolean>;
  showingAnswer: boolean;
  completed: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MASTERY_LABELS: Record<MasteryLevel, { label: string; color: string; emoji: string }> = {
  novice: { label: "Nýbyrjaður", color: "text-gray-500", emoji: "🌱" },
  learning: { label: "Að læra", color: "text-amber-500", emoji: "📚" },
  practicing: { label: "Að æfa", color: "text-blue-500", emoji: "💪" },
  proficient: { label: "Góð tök", color: "text-emerald-500", emoji: "🎯" },
  mastered: { label: "Náð tökum", color: "text-purple-500", emoji: "🏆" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AdaptiveQuiz({
  chapterSlug,
  onComplete,
  maxProblems = 5,
}: AdaptiveQuizProps) {
  const {
    getAdaptiveProblems,
    getProblemsForReview,
    markPracticeProblemAttempt,
    getProblemMastery,
  } = useQuizStore();

  // Get adaptive problems on mount
  const problems = useMemo(() => {
    const adaptive = getAdaptiveProblems(chapterSlug, maxProblems);
    // If no adaptive problems, get problems for review
    if (adaptive.length === 0) {
      return getProblemsForReview(maxProblems);
    }
    return adaptive;
  }, [chapterSlug, maxProblems, getAdaptiveProblems, getProblemsForReview]);

  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    answers: new Map(),
    showingAnswer: false,
    completed: false,
  });

  const currentProblem = problems[state.currentIndex];
  const totalProblems = problems.length;

  const handleShowAnswer = () => {
    setState((prev) => ({ ...prev, showingAnswer: true }));
  };

  const handleAnswer = (success: boolean) => {
    if (!currentProblem) return;

    // Record the attempt
    markPracticeProblemAttempt(currentProblem.id, success);

    // Update local state
    const newAnswers = new Map(state.answers);
    newAnswers.set(currentProblem.id, success);

    setState((prev) => ({
      ...prev,
      answers: newAnswers,
      showingAnswer: false,
    }));

    // Move to next or complete
    if (state.currentIndex < totalProblems - 1) {
      setState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        showingAnswer: false,
      }));
    } else {
      setState((prev) => ({ ...prev, completed: true }));
    }
  };

  const handleRestart = () => {
    setState({
      currentIndex: 0,
      answers: new Map(),
      showingAnswer: false,
      completed: false,
    });
  };

  // Calculate results
  const correctCount = Array.from(state.answers.values()).filter(Boolean).length;
  const incorrectCount = state.answers.size - correctCount;
  const scorePercentage = state.answers.size > 0
    ? Math.round((correctCount / state.answers.size) * 100)
    : 0;

  // No problems available
  if (problems.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
        <Brain size={48} className="mx-auto mb-4 text-[var(--text-secondary)]" />
        <h3 className="mb-2 font-sans text-lg font-semibold text-[var(--text-primary)]">
          Engin æfingadæmi tiltæk
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Farðu í gegnum efnið og leysðu æfingadæmi til að byrja aðlögunarpróf.
        </p>
      </div>
    );
  }

  // Completed state
  if (state.completed) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <Trophy size={48} className="mx-auto mb-4 text-amber-500" />
          <h3 className="mb-2 font-sans text-xl font-bold text-[var(--text-primary)]">
            Prófi lokið!
          </h3>
          <p className="text-[var(--text-secondary)]">
            Þú hefur lokið við {totalProblems} dæmi
          </p>
        </div>

        {/* Score */}
        <div className="mb-6 rounded-lg bg-[var(--bg-primary)] p-4 text-center">
          <div className="mb-2 text-4xl font-bold text-[var(--accent-color)]">
            {scorePercentage}%
          </div>
          <div className="flex justify-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              {correctCount} rétt
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle size={16} />
              {incorrectCount} rangt
            </span>
          </div>
        </div>

        {/* Mastery progress */}
        <div className="mb-6 space-y-2">
          <h4 className="flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-secondary)]">
            <TrendingUp size={16} />
            Framfarir
          </h4>
          <div className="space-y-1">
            {problems.map((problem) => {
              const mastery = getProblemMastery(problem.id);
              const masteryInfo = MASTERY_LABELS[mastery.level];
              const wasCorrect = state.answers.get(problem.id);
              return (
                <div
                  key={problem.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-primary)] px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm text-[var(--text-primary)]">
                    {problem.content.substring(0, 50)}...
                  </span>
                  <div className="flex items-center gap-2">
                    {wasCorrect ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                    <span className={`text-xs ${masteryInfo.color}`}>
                      {masteryInfo.emoji} {masteryInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRestart}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
          >
            <RotateCcw size={16} />
            Byrja aftur
          </button>
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Loka
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active quiz state
  const mastery = currentProblem ? getProblemMastery(currentProblem.id) : null;
  const masteryInfo = mastery ? MASTERY_LABELS[mastery.level] : null;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-[var(--accent-color)]" />
          <span className="font-sans text-sm font-semibold text-[var(--text-primary)]">
            Aðlögunarpróf
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <span className="text-sm text-[var(--text-secondary)]">
            {state.currentIndex + 1} / {totalProblems}
          </span>
          {/* Progress bar */}
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full bg-[var(--accent-color)] transition-all duration-300"
              style={{ width: `${((state.currentIndex + 1) / totalProblems) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mastery indicator */}
      {masteryInfo && (
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Target size={14} className={masteryInfo.color} />
            <span className={masteryInfo.color}>
              {masteryInfo.emoji} {masteryInfo.label}
            </span>
          </div>
          {mastery && mastery.attempts > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">
              {mastery.successRate}% nákvæmni ({mastery.attempts} tilraunir)
            </span>
          )}
        </div>
      )}

      {/* Problem content */}
      <div className="p-6">
        <div className="mb-4">
          <h4 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-secondary)]">
            <Sparkles size={16} className="text-[var(--accent-color)]" />
            Dæmi {state.currentIndex + 1}
          </h4>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {currentProblem?.content}
          </div>
        </div>

        {/* Answer section */}
        {!state.showingAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent-color)] bg-[var(--accent-color)]/10 px-4 py-3 font-sans text-sm font-medium text-[var(--accent-color)] transition-colors hover:bg-[var(--accent-color)]/20"
          >
            Sýna svar
            <ChevronRight size={16} />
          </button>
        ) : (
          <div className="space-y-4">
            {/* Answer */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-900/20">
              <h5 className="mb-2 font-sans text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Svar
              </h5>
              <div className="prose prose-sm max-w-none text-emerald-800 dark:prose-invert dark:text-emerald-200">
                {currentProblem?.answer}
              </div>
            </div>

            {/* Self-assessment */}
            <div className="rounded-lg bg-[var(--bg-primary)] p-4">
              <p className="mb-3 text-center text-sm text-[var(--text-secondary)]">
                Hvernig gekk?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-4 py-2 font-medium text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                >
                  <CheckCircle2 size={18} />
                  Rétt
                </button>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-2 font-medium text-red-700 transition-all hover:border-red-400 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <XCircle size={18} />
                  Rangt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with current score */}
      {state.answers.size > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-2">
          <span className="text-sm text-[var(--text-secondary)]">
            Núverandi einkunn
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              {correctCount}
            </span>
            <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <XCircle size={14} />
              {incorrectCount}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
