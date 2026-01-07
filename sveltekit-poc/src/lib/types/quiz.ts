/**
 * Types for the quiz and practice problem system
 */

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  answers: QuizAnswer[];
  explanation?: string;
  chapterSlug: string;
  sectionSlug: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizSession {
  id: string;
  bookSlug: string;
  chapterSlug?: string;
  sectionSlug?: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> answerId
  startedAt: string;
  completedAt?: string;
  score?: number;
}

export interface QuizStats {
  totalAttempts: number;
  correctAnswers: number;
  averageScore: number;
  lastAttempt?: string;
}

export interface PracticeProblemProgress {
  problemId: string;
  chapterSlug: string;
  sectionSlug: string;
  viewed: boolean;
  viewedAt?: string;
  completed: boolean;
  completedAt?: string;
  attempts: number;
  lastAttemptCorrect?: boolean;
}

export type MasteryLevel = 'novice' | 'learning' | 'practicing' | 'proficient' | 'mastered';

export interface ProblemMastery {
  level: MasteryLevel;
  successRate: number;
  attempts: number;
}
