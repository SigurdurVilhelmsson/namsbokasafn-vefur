import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  QuizQuestion,
  QuizAnswer,
  QuizSession,
  QuizStats,
  PracticeProblem,
} from "@/types/quiz";

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
  ) => { total: number; completed: number; percentage: number };
  getChapterProgress: (chapterSlug: string) => {
    total: number;
    completed: number;
    percentage: number;
  };
  getOverallProgress: () => {
    total: number;
    completed: number;
    percentage: number;
  };
}

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
        const statsKey = currentSession.sectionSlug
          ? `${currentSession.chapterSlug}/${currentSession.sectionSlug}`
          : currentSession.chapterSlug || "global";

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
        return stats[`${chapterSlug}/${sectionSlug}`] || createEmptyStats();
      },

      // Get stats for a chapter (aggregate all sections)
      getChapterStats: (chapterSlug) => {
        const { stats } = get();
        const chapterStats = createEmptyStats();

        Object.entries(stats).forEach(([key, sectionStats]) => {
          if (key.startsWith(`${chapterSlug}/`)) {
            chapterStats.totalAttempts += sectionStats.totalAttempts;
            chapterStats.questionsAnswered += sectionStats.questionsAnswered;
            chapterStats.correctAnswers += sectionStats.correctAnswers;
            chapterStats.bestScore = Math.max(
              chapterStats.bestScore,
              sectionStats.bestScore,
            );
            if (
              !chapterStats.lastAttempted ||
              (sectionStats.lastAttempted &&
                sectionStats.lastAttempted > chapterStats.lastAttempted)
            ) {
              chapterStats.lastAttempted = sectionStats.lastAttempted;
            }
          }
        });

        // Calculate average
        if (chapterStats.totalAttempts > 0) {
          chapterStats.averageScore = Math.round(
            (chapterStats.correctAnswers / chapterStats.questionsAnswered) *
              100,
          );
        }

        return chapterStats;
      },

      // Get total stats across all quizzes
      getTotalStats: () => {
        const { stats } = get();
        const totalStats = createEmptyStats();

        Object.values(stats).forEach((sectionStats) => {
          totalStats.totalAttempts += sectionStats.totalAttempts;
          totalStats.questionsAnswered += sectionStats.questionsAnswered;
          totalStats.correctAnswers += sectionStats.correctAnswers;
          totalStats.bestScore = Math.max(
            totalStats.bestScore,
            sectionStats.bestScore,
          );
          if (
            !totalStats.lastAttempted ||
            (sectionStats.lastAttempted &&
              sectionStats.lastAttempted > totalStats.lastAttempted)
          ) {
            totalStats.lastAttempted = sectionStats.lastAttempted;
          }
        });

        // Calculate average
        if (totalStats.questionsAnswered > 0) {
          totalStats.averageScore = Math.round(
            (totalStats.correctAnswers / totalStats.questionsAnswered) * 100,
          );
        }

        return totalStats;
      },

      // Get practice problem progress for a section
      getSectionProgress: (chapterSlug, sectionSlug) => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress).filter(
          (p) => p.chapterSlug === chapterSlug && p.sectionSlug === sectionSlug,
        );

        const total = problems.length;
        const completed = problems.filter((p) => p.isCompleted).length;
        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, percentage };
      },

      // Get practice problem progress for a chapter
      getChapterProgress: (chapterSlug) => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress).filter(
          (p) => p.chapterSlug === chapterSlug,
        );

        const total = problems.length;
        const completed = problems.filter((p) => p.isCompleted).length;
        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, percentage };
      },

      // Get overall practice problem progress
      getOverallProgress: () => {
        const { practiceProblemProgress } = get();
        const problems = Object.values(practiceProblemProgress);

        const total = problems.length;
        const completed = problems.filter((p) => p.isCompleted).length;
        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, percentage };
      },
    }),
    {
      name: "efnafraedi-quiz",
    },
  ),
);
