import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  QuizQuestion,
  QuizAnswer,
  QuizSession,
  QuizStats,
  PracticeProblem,
} from "@/types/quiz";
import {
  type ProgressResult,
  createStatsKey,
  calculateProgress,
  filterByChapterPrefix,
  filterItemsByChapter,
  filterItemsBySection,
  generateId,
} from "@/utils/storeHelpers";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "efnafraedi-quiz";

// Mastery levels based on success rate and attempts
export type MasteryLevel = "novice" | "learning" | "practicing" | "proficient" | "mastered";

export interface MasteryInfo {
  level: MasteryLevel;
  successRate: number; // 0-100
  attempts: number;
  lastAttempted?: string;
}

// Thresholds for mastery levels
const MASTERY_THRESHOLDS = {
  mastered: { minSuccessRate: 90, minAttempts: 3 },
  proficient: { minSuccessRate: 75, minAttempts: 2 },
  practicing: { minSuccessRate: 50, minAttempts: 2 },
  learning: { minSuccessRate: 0, minAttempts: 1 },
  novice: { minSuccessRate: 0, minAttempts: 0 },
};

/**
 * Calculate mastery level from success rate and attempts
 */
function calculateMasteryLevel(successRate: number, attempts: number): MasteryLevel {
  if (attempts >= MASTERY_THRESHOLDS.mastered.minAttempts && successRate >= MASTERY_THRESHOLDS.mastered.minSuccessRate) {
    return "mastered";
  }
  if (attempts >= MASTERY_THRESHOLDS.proficient.minAttempts && successRate >= MASTERY_THRESHOLDS.proficient.minSuccessRate) {
    return "proficient";
  }
  if (attempts >= MASTERY_THRESHOLDS.practicing.minAttempts && successRate >= MASTERY_THRESHOLDS.practicing.minSuccessRate) {
    return "practicing";
  }
  if (attempts >= MASTERY_THRESHOLDS.learning.minAttempts) {
    return "learning";
  }
  return "novice";
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
  markPracticeProblemAttempt: (id: string, success: boolean) => void;
  getPracticeProblemProgress: (id: string) => PracticeProblem | undefined;

  // Mastery tracking
  getProblemMastery: (id: string) => MasteryInfo;
  getSectionMastery: (chapterSlug: string, sectionSlug: string) => MasteryInfo;
  getChapterMastery: (chapterSlug: string) => MasteryInfo;
  getProblemsForReview: (limit?: number) => PracticeProblem[];
  getAdaptiveProblems: (chapterSlug?: string, limit?: number) => PracticeProblem[];

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
                successfulAttempts: 0,
              },
            },
          });
        }
      },

      // Mark practice problem as completed (successful)
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
                successfulAttempts: problem.successfulAttempts + 1,
                lastAttempted: new Date().toISOString(),
              },
            },
          });
        }
      },

      // Record attempt with success/failure
      markPracticeProblemAttempt: (id, success) => {
        const { practiceProblemProgress } = get();
        const problem = practiceProblemProgress[id];

        if (problem) {
          set({
            practiceProblemProgress: {
              ...practiceProblemProgress,
              [id]: {
                ...problem,
                isCompleted: success ? true : problem.isCompleted,
                attempts: problem.attempts + 1,
                successfulAttempts: success ? problem.successfulAttempts + 1 : problem.successfulAttempts,
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

      // Get mastery info for a specific problem
      getProblemMastery: (id) => {
        const problem = get().practiceProblemProgress[id];
        if (!problem) {
          return { level: "novice" as MasteryLevel, successRate: 0, attempts: 0 };
        }
        const successRate = problem.attempts > 0
          ? Math.round((problem.successfulAttempts / problem.attempts) * 100)
          : 0;
        return {
          level: calculateMasteryLevel(successRate, problem.attempts),
          successRate,
          attempts: problem.attempts,
          lastAttempted: problem.lastAttempted,
        };
      },

      // Get mastery info for a section
      getSectionMastery: (chapterSlug, sectionSlug) => {
        const { practiceProblemProgress } = get();
        const problems = filterItemsBySection(
          Object.values(practiceProblemProgress),
          chapterSlug,
          sectionSlug,
        );

        if (problems.length === 0) {
          return { level: "novice" as MasteryLevel, successRate: 0, attempts: 0 };
        }

        const totalAttempts = problems.reduce((sum, p) => sum + p.attempts, 0);
        const totalSuccessful = problems.reduce((sum, p) => sum + p.successfulAttempts, 0);
        const successRate = totalAttempts > 0
          ? Math.round((totalSuccessful / totalAttempts) * 100)
          : 0;

        const lastAttempted = problems
          .map(p => p.lastAttempted)
          .filter(Boolean)
          .sort()
          .pop();

        return {
          level: calculateMasteryLevel(successRate, Math.min(...problems.map(p => p.attempts))),
          successRate,
          attempts: totalAttempts,
          lastAttempted,
        };
      },

      // Get mastery info for a chapter
      getChapterMastery: (chapterSlug) => {
        const { practiceProblemProgress } = get();
        const problems = filterItemsByChapter(
          Object.values(practiceProblemProgress),
          chapterSlug,
        );

        if (problems.length === 0) {
          return { level: "novice" as MasteryLevel, successRate: 0, attempts: 0 };
        }

        const totalAttempts = problems.reduce((sum, p) => sum + p.attempts, 0);
        const totalSuccessful = problems.reduce((sum, p) => sum + p.successfulAttempts, 0);
        const successRate = totalAttempts > 0
          ? Math.round((totalSuccessful / totalAttempts) * 100)
          : 0;

        const lastAttempted = problems
          .map(p => p.lastAttempted)
          .filter(Boolean)
          .sort()
          .pop();

        return {
          level: calculateMasteryLevel(successRate, Math.min(...problems.map(p => p.attempts))),
          successRate,
          attempts: totalAttempts,
          lastAttempted,
        };
      },

      // Get problems that need review (low mastery or recently failed)
      getProblemsForReview: (limit = 10) => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress);

        // Sort by priority: not completed, low success rate, then oldest attempted
        return problems
          .filter(p => p.attempts > 0) // Only include problems that have been attempted
          .sort((a, b) => {
            // Prioritize not completed
            if (!a.isCompleted && b.isCompleted) return -1;
            if (a.isCompleted && !b.isCompleted) return 1;

            // Then by success rate (lower = higher priority)
            const aRate = a.attempts > 0 ? a.successfulAttempts / a.attempts : 0;
            const bRate = b.attempts > 0 ? b.successfulAttempts / b.attempts : 0;
            if (aRate !== bRate) return aRate - bRate;

            // Then by oldest attempt (older = higher priority)
            const aTime = a.lastAttempted ? new Date(a.lastAttempted).getTime() : 0;
            const bTime = b.lastAttempted ? new Date(b.lastAttempted).getTime() : 0;
            return aTime - bTime;
          })
          .slice(0, limit);
      },

      // Get problems for adaptive practice (mix of mastery levels)
      getAdaptiveProblems: (chapterSlug, limit = 5) => {
        const { practiceProblemProgress } = get();
        let problems = Object.values(practiceProblemProgress);

        // Filter by chapter if provided
        if (chapterSlug) {
          problems = filterItemsByChapter(problems, chapterSlug);
        }

        // Categorize by mastery
        const byMastery: Record<MasteryLevel, PracticeProblem[]> = {
          novice: [],
          learning: [],
          practicing: [],
          proficient: [],
          mastered: [],
        };

        problems.forEach(p => {
          const successRate = p.attempts > 0 ? (p.successfulAttempts / p.attempts) * 100 : 0;
          const level = calculateMasteryLevel(successRate, p.attempts);
          byMastery[level].push(p);
        });

        // Build adaptive set: prioritize lower mastery, but include some higher
        const result: PracticeProblem[] = [];
        const distribution = [
          { level: "novice" as MasteryLevel, count: 2 },
          { level: "learning" as MasteryLevel, count: 2 },
          { level: "practicing" as MasteryLevel, count: 1 },
        ];

        for (const { level, count } of distribution) {
          const available = byMastery[level];
          // Shuffle for variety
          const shuffled = [...available].sort(() => Math.random() - 0.5);
          result.push(...shuffled.slice(0, count));
        }

        // Fill remaining slots with any unattempted or low-mastery problems
        if (result.length < limit) {
          const remaining = [...byMastery.novice, ...byMastery.learning]
            .filter(p => !result.includes(p))
            .sort(() => Math.random() - 0.5);
          result.push(...remaining.slice(0, limit - result.length));
        }

        return result.slice(0, limit);
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
        const sectionStats = filterByChapterPrefix(stats, chapterSlug).map(
          ([, value]) => value,
        );
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
        const problems = filterItemsBySection(
          Object.values(practiceProblemProgress),
          chapterSlug,
          sectionSlug,
        );
        return calculateProgress(problems);
      },

      // Get practice problem progress for a chapter
      getChapterProgress: (chapterSlug) => {
        const { practiceProblemProgress } = get();
        const problems = filterItemsByChapter(
          Object.values(practiceProblemProgress),
          chapterSlug,
        );
        return calculateProgress(problems);
      },

      // Get overall practice problem progress
      getOverallProgress: () => {
        const { practiceProblemProgress } = get();
        return calculateProgress(Object.values(practiceProblemProgress));
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
