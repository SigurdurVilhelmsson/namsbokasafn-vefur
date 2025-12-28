import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  QuizQuestion,
  QuizAnswer,
  QuizSession,
  QuizStats,
  PracticeProblem,
} from "@/types/quiz";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "efnafraedi-quiz";

// =============================================================================
// TYPES
// =============================================================================

interface ProgressResult {
  total: number;
  completed: number;
  percentage: number;
}

interface QuizState {
  // Current quiz session
  currentSession: QuizSession | null;
  currentQuestionIndex: number;
  showFeedback: boolean;

  // Practice problem tracking
  practiceProblemProgress: Record<string, PracticeProblem>;

  // Historical data
  sessions: QuizSession[];
  stats: Record<string, QuizStats>; // Keyed by chapterSlug/sectionSlug

  // Session management
  startQuizSession: (
    questions: QuizQuestion[],
    chapterSlug?: string,
    sectionSlug?: string,
  ) => void;
  answerQuestion: (answer: QuizAnswer) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  endSession: () => void;
  resetSession: () => void;

  // Practice problem tracking
  markPracticeProblemViewed: (
    id: string,
    chapterSlug: string,
    sectionSlug: string,
    content: string,
    answer: string,
  ) => void;
  markPracticeProblemCompleted: (id: string) => void;
  getPracticeProblemProgress: (id: string) => PracticeProblem | undefined;

  // Stats
  getSectionStats: (chapterSlug: string, sectionSlug: string) => QuizStats;
  getChapterStats: (chapterSlug: string) => QuizStats;
  getTotalStats: () => QuizStats;

  // Practice problem progress
  getSectionProgress: (
    chapterSlug: string,
    sectionSlug: string,
  ) => ProgressResult;
  getChapterProgress: (chapterSlug: string) => ProgressResult;
  getOverallProgress: () => ProgressResult;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyStats(): QuizStats {
  return {
    totalAttempts: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    averageScore: 0,
    bestScore: 0,
  };
}

/**
 * Calculate progress from a list of practice problems
 */
function calculateProgress(problems: PracticeProblem[]): ProgressResult {
  const total = problems.length;
  const completed = problems.filter((p) => p.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, percentage };
}

/**
 * Aggregate stats from multiple section stats
 */
function aggregateStats(statsArray: QuizStats[]): QuizStats {
  const aggregated = createEmptyStats();

  for (const sectionStats of statsArray) {
    aggregated.totalAttempts += sectionStats.totalAttempts;
    aggregated.questionsAnswered += sectionStats.questionsAnswered;
    aggregated.correctAnswers += sectionStats.correctAnswers;
    aggregated.bestScore = Math.max(aggregated.bestScore, sectionStats.bestScore);

    // Track latest attempt time
    if (
      sectionStats.lastAttempted &&
      (!aggregated.lastAttempted || sectionStats.lastAttempted > aggregated.lastAttempted)
    ) {
      aggregated.lastAttempted = sectionStats.lastAttempted;
    }
  }

  // Calculate average score
  if (aggregated.questionsAnswered > 0) {
    aggregated.averageScore = Math.round(
      (aggregated.correctAnswers / aggregated.questionsAnswered) * 100,
    );
  }

  return aggregated;
}

/**
 * Create a stats key from chapter and section slugs
 */
function createStatsKey(chapterSlug?: string, sectionSlug?: string): string {
  if (sectionSlug && chapterSlug) {
    return `${chapterSlug}/${sectionSlug}`;
  }
  return chapterSlug || "global";
}

// =============================================================================
// STORE
// =============================================================================

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      currentQuestionIndex: 0,
      showFeedback: false,
      practiceProblemProgress: {},
      sessions: [],
      stats: {},

      // Start a new quiz session
      startQuizSession: (questions, chapterSlug, sectionSlug) => {
        const session: QuizSession = {
          id: generateId(),
          startTime: new Date().toISOString(),
          questions: questions.map((q) => q.id),
          answers: [],
          score: 0,
          chapterSlug,
          sectionSlug,
        };

        set({
          currentSession: session,
          currentQuestionIndex: 0,
          showFeedback: false,
        });
      },

      // Record an answer to the current question
      answerQuestion: (answer) => {
        const { currentSession } = get();
        if (!currentSession) return;

        // Check if already answered this question
        const existingAnswerIndex = currentSession.answers.findIndex(
          (a) => a.questionId === answer.questionId,
        );

        let newAnswers: QuizAnswer[];
        if (existingAnswerIndex >= 0) {
          // Update existing answer
          newAnswers = [...currentSession.answers];
          newAnswers[existingAnswerIndex] = answer;
        } else {
          // Add new answer
          newAnswers = [...currentSession.answers, answer];
        }

        // Calculate score
        const correctCount = newAnswers.filter((a) => a.isCorrect).length;
        const score = Math.round(
          (correctCount / currentSession.questions.length) * 100,
        );

        set({
          currentSession: {
            ...currentSession,
            answers: newAnswers,
            score,
          },
          showFeedback: true,
        });
      },

      // Move to next question
      nextQuestion: () => {
        const { currentSession, currentQuestionIndex } = get();
        if (!currentSession) return;

        if (currentQuestionIndex < currentSession.questions.length - 1) {
          set({
            currentQuestionIndex: currentQuestionIndex + 1,
            showFeedback: false,
          });
        }
      },

      // Move to previous question
      previousQuestion: () => {
        const { currentQuestionIndex } = get();
        if (currentQuestionIndex > 0) {
          set({
            currentQuestionIndex: currentQuestionIndex - 1,
            showFeedback: true, // Show feedback for already answered questions
          });
        }
      },

      // End the current session and save stats
      endSession: () => {
        const { currentSession, sessions, stats } = get();
        if (!currentSession) return;

        const endedSession: QuizSession = {
          ...currentSession,
          endTime: new Date().toISOString(),
        };

        // Update stats
        const statsKey = createStatsKey(
          currentSession.chapterSlug,
          currentSession.sectionSlug,
        );

        const currentStats = stats[statsKey] || createEmptyStats();
        const correctCount = endedSession.answers.filter(
          (a) => a.isCorrect,
        ).length;

        const newStats: QuizStats = {
          totalAttempts: currentStats.totalAttempts + 1,
          questionsAnswered:
            currentStats.questionsAnswered + endedSession.answers.length,
          correctAnswers: currentStats.correctAnswers + correctCount,
          averageScore: Math.round(
            (currentStats.averageScore * currentStats.totalAttempts +
              endedSession.score) /
              (currentStats.totalAttempts + 1),
          ),
          bestScore: Math.max(currentStats.bestScore, endedSession.score),
          lastAttempted: endedSession.endTime,
        };

        set({
          sessions: [...sessions, endedSession],
          stats: { ...stats, [statsKey]: newStats },
          currentSession: null,
          currentQuestionIndex: 0,
          showFeedback: false,
        });
      },

      // Reset current session without saving
      resetSession: () => {
        set({
          currentSession: null,
          currentQuestionIndex: 0,
          showFeedback: false,
        });
      },

      // Track practice problem viewing
      markPracticeProblemViewed: (
        id,
        chapterSlug,
        sectionSlug,
        content,
        answer,
      ) => {
        const { practiceProblemProgress } = get();

        // Only create entry if it doesn't exist
        if (!practiceProblemProgress[id]) {
          set({
            practiceProblemProgress: {
              ...practiceProblemProgress,
              [id]: {
                id,
                content,
                answer,
                chapterSlug,
                sectionSlug,
                isCompleted: false,
                attempts: 0,
              },
            },
          });
        }
      },

      // Mark practice problem as completed
      markPracticeProblemCompleted: (id) => {
        const { practiceProblemProgress } = get();
        const problem = practiceProblemProgress[id];

        if (problem) {
          set({
            practiceProblemProgress: {
              ...practiceProblemProgress,
              [id]: {
                ...problem,
                isCompleted: true,
                attempts: problem.attempts + 1,
                lastAttempted: new Date().toISOString(),
              },
            },
          });
        }
      },

      // Get practice problem progress
      getPracticeProblemProgress: (id) => {
        return get().practiceProblemProgress[id];
      },

      // Get stats for a specific section
      getSectionStats: (chapterSlug, sectionSlug) => {
        const { stats } = get();
        const key = createStatsKey(chapterSlug, sectionSlug);
        return stats[key] || createEmptyStats();
      },

      // Get stats for a chapter (aggregate all sections)
      getChapterStats: (chapterSlug) => {
        const { stats } = get();
        const chapterPrefix = `${chapterSlug}/`;

        const sectionStats = Object.entries(stats)
          .filter(([key]) => key.startsWith(chapterPrefix))
          .map(([, value]) => value);

        return aggregateStats(sectionStats);
      },

      // Get total stats across all quizzes
      getTotalStats: () => {
        const { stats } = get();
        return aggregateStats(Object.values(stats));
      },

      // Get practice problem progress for a section
      getSectionProgress: (chapterSlug, sectionSlug) => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress).filter(
          (p) => p.chapterSlug === chapterSlug && p.sectionSlug === sectionSlug,
        );

        return calculateProgress(problems);
      },

      // Get practice problem progress for a chapter
      getChapterProgress: (chapterSlug) => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress).filter(
          (p) => p.chapterSlug === chapterSlug,
        );

        return calculateProgress(problems);
      },

      // Get overall practice problem progress
      getOverallProgress: () => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress);

        return calculateProgress(problems);
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
