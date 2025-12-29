// Quiz question types
export type QuestionType = "multiple-choice" | "fill-blank" | "true-false";

// A single quiz question
export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string; // The question text (can include markdown)
  options?: QuizOption[]; // For multiple-choice
  correctAnswer?: string; // For fill-blank (the expected answer)
  explanation?: string; // Explanation shown after answering
  difficulty?: "easy" | "medium" | "hard";
  chapterSlug?: string;
  sectionSlug?: string;
}

// Multiple choice option
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string; // Feedback shown when this option is selected
}

// User's answer to a question
export interface QuizAnswer {
  questionId: string;
  selectedOptionId?: string; // For multiple-choice
  textAnswer?: string; // For fill-blank
  isCorrect: boolean;
  timestamp: string;
}

// A quiz session (a set of questions answered together)
export interface QuizSession {
  id: string;
  startTime: string;
  endTime?: string;
  questions: string[]; // Question IDs
  answers: QuizAnswer[];
  score: number; // Percentage (0-100)
  chapterSlug?: string;
  sectionSlug?: string;
}

// Quiz statistics per section/chapter
export interface QuizStats {
  totalAttempts: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageScore: number;
  bestScore: number;
  lastAttempted?: string;
}

// Practice problem extracted from content
export interface PracticeProblem {
  id: string;
  content: string; // The problem markdown
  answer: string; // The answer markdown
  chapterSlug: string;
  sectionSlug: string;
  isCompleted: boolean;
  attempts: number;
  successfulAttempts: number; // Track successful completions for mastery
  lastAttempted?: string;
}
