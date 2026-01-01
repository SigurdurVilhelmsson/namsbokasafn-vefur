import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { useQuizStore, type MasteryLevel } from "./quizStore";
import type { QuizQuestion, QuizAnswer } from "@/types/quiz";

// =============================================================================
// TEST DATA
// =============================================================================

const mockQuestions: QuizQuestion[] = [
  {
    id: "q1",
    type: "multiple-choice",
    question: "Hvað er atóm?",
    options: [
      { id: "a", text: "Minnsta eining efnis", isCorrect: true },
      { id: "b", text: "Stærsta eining efnis", isCorrect: false },
    ],
    chapterSlug: "01-grunnhugmyndir",
    sectionSlug: "1-1-efnafraedi",
  },
  {
    id: "q2",
    type: "multiple-choice",
    question: "Hvað er sameind?",
    options: [
      { id: "a", text: "Eitt atóm", isCorrect: false },
      { id: "b", text: "Tveir eða fleiri atómar", isCorrect: true },
    ],
    chapterSlug: "01-grunnhugmyndir",
    sectionSlug: "1-1-efnafraedi",
  },
  {
    id: "q3",
    type: "true-false",
    question: "Vatn er sameind",
    chapterSlug: "01-grunnhugmyndir",
    sectionSlug: "1-2-sameindir",
  },
];

function createAnswer(
  questionId: string,
  isCorrect: boolean,
  selectedOptionId?: string,
): QuizAnswer {
  return {
    questionId,
    selectedOptionId,
    isCorrect,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// SETUP
// =============================================================================

describe("quizStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useQuizStore.getState();
    act(() => {
      store.resetSession();
    });
    // Clear persisted data
    useQuizStore.setState({
      currentSession: null,
      currentQuestionIndex: 0,
      showFeedback: false,
      practiceProblemProgress: {},
      sessions: [],
      stats: {},
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // SESSION MANAGEMENT TESTS
  // ===========================================================================

  describe("startQuizSession", () => {
    it("should create a new session with questions", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession(mockQuestions, "01-grunnhugmyndir", "1-1-efnafraedi");
      });

      const state = useQuizStore.getState();
      expect(state.currentSession).not.toBeNull();
      expect(state.currentSession?.questions).toHaveLength(3);
      expect(state.currentSession?.chapterSlug).toBe("01-grunnhugmyndir");
      expect(state.currentSession?.sectionSlug).toBe("1-1-efnafraedi");
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.showFeedback).toBe(false);
    });

    it("should set score to 0 initially", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession(mockQuestions);
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.score).toBe(0);
      expect(state.currentSession?.answers).toHaveLength(0);
    });

    it("should record start time", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession(mockQuestions);
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.startTime).toContain("2024-01-15");
    });
  });

  // ===========================================================================
  // ANSWER QUESTION TESTS
  // ===========================================================================

  describe("answerQuestion", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();
      act(() => {
        store.startQuizSession(mockQuestions);
      });
    });

    it("should record a correct answer", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.answerQuestion(createAnswer("q1", true, "a"));
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.answers).toHaveLength(1);
      expect(state.currentSession?.answers[0].isCorrect).toBe(true);
      expect(state.showFeedback).toBe(true);
    });

    it("should record an incorrect answer", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.answerQuestion(createAnswer("q1", false, "b"));
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.answers).toHaveLength(1);
      expect(state.currentSession?.answers[0].isCorrect).toBe(false);
    });

    it("should calculate score correctly", () => {
      const store = useQuizStore.getState();

      // Answer 2 out of 3 correctly
      act(() => {
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.answerQuestion(createAnswer("q2", true, "b"));
        store.answerQuestion(createAnswer("q3", false, "a"));
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.score).toBe(67); // 2/3 = 66.67% rounded to 67%
    });

    it("should update existing answer when re-answering", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.answerQuestion(createAnswer("q1", false, "b"));
      });

      // Change answer
      act(() => {
        store.answerQuestion(createAnswer("q1", true, "a"));
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.answers).toHaveLength(1);
      expect(state.currentSession?.answers[0].isCorrect).toBe(true);
    });

    it("should not record answer without active session", () => {
      // Reset session first
      act(() => {
        useQuizStore.getState().resetSession();
      });

      const store = useQuizStore.getState();

      act(() => {
        store.answerQuestion(createAnswer("q1", true, "a"));
      });

      const state = useQuizStore.getState();
      expect(state.currentSession).toBeNull();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe("navigation", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();
      act(() => {
        store.startQuizSession(mockQuestions);
      });
    });

    it("should move to next question", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.nextQuestion();
      });

      expect(useQuizStore.getState().currentQuestionIndex).toBe(1);
      expect(useQuizStore.getState().showFeedback).toBe(false);
    });

    it("should not go past last question", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.nextQuestion();
        store.nextQuestion();
        store.nextQuestion(); // Try to go past the end
      });

      expect(useQuizStore.getState().currentQuestionIndex).toBe(2);
    });

    it("should move to previous question", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.nextQuestion();
        store.previousQuestion();
      });

      expect(useQuizStore.getState().currentQuestionIndex).toBe(0);
      expect(useQuizStore.getState().showFeedback).toBe(true);
    });

    it("should not go before first question", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.previousQuestion();
      });

      expect(useQuizStore.getState().currentQuestionIndex).toBe(0);
    });
  });

  // ===========================================================================
  // END SESSION TESTS
  // ===========================================================================

  describe("endSession", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();
      act(() => {
        store.startQuizSession(mockQuestions, "01-grunnhugmyndir", "1-1-efnafraedi");
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.answerQuestion(createAnswer("q2", true, "b"));
      });
    });

    it("should save session to history", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.endSession();
      });

      const state = useQuizStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].endTime).toBeDefined();
    });

    it("should clear current session", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.endSession();
      });

      const state = useQuizStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.showFeedback).toBe(false);
    });

    it("should update stats", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.endSession();
      });

      const state = useQuizStore.getState();
      const stats = state.getSectionStats("01-grunnhugmyndir", "1-1-efnafraedi");

      expect(stats.totalAttempts).toBe(1);
      expect(stats.questionsAnswered).toBe(2);
      expect(stats.correctAnswers).toBe(2);
    });

    it("should not end session if none active", () => {
      act(() => {
        useQuizStore.getState().resetSession();
      });

      const initialSessions = useQuizStore.getState().sessions.length;

      act(() => {
        useQuizStore.getState().endSession();
      });

      expect(useQuizStore.getState().sessions.length).toBe(initialSessions);
    });
  });

  // ===========================================================================
  // RESET SESSION TESTS
  // ===========================================================================

  describe("resetSession", () => {
    it("should clear session without saving", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession(mockQuestions);
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.resetSession();
      });

      const state = useQuizStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.sessions).toHaveLength(0);
    });
  });

  // ===========================================================================
  // PRACTICE PROBLEM TESTS
  // ===========================================================================

  describe("practice problems", () => {
    it("should mark problem as viewed", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "Reiknaðu...",
          "Svarið er 42",
        );
      });

      const state = useQuizStore.getState();
      const problem = state.getPracticeProblemProgress("prob-1");

      expect(problem).toBeDefined();
      expect(problem?.isCompleted).toBe(false);
      expect(problem?.attempts).toBe(0);
    });

    it("should not overwrite existing problem progress", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "Original content",
          "Original answer",
        );
        store.markPracticeProblemCompleted("prob-1");
        // Try to overwrite
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "New content",
          "New answer",
        );
      });

      const state = useQuizStore.getState();
      const problem = state.getPracticeProblemProgress("prob-1");

      expect(problem?.content).toBe("Original content");
      expect(problem?.isCompleted).toBe(true);
    });

    it("should mark problem as completed", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "Content",
          "Answer",
        );
        store.markPracticeProblemCompleted("prob-1");
      });

      const state = useQuizStore.getState();
      const problem = state.getPracticeProblemProgress("prob-1");

      expect(problem?.isCompleted).toBe(true);
      expect(problem?.attempts).toBe(1);
      expect(problem?.lastAttempted).toBeDefined();
    });

    it("should increment attempts on multiple completions", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "Content",
          "Answer",
        );
        store.markPracticeProblemCompleted("prob-1");
        store.markPracticeProblemCompleted("prob-1");
        store.markPracticeProblemCompleted("prob-1");
      });

      const state = useQuizStore.getState();
      const problem = state.getPracticeProblemProgress("prob-1");

      expect(problem?.attempts).toBe(3);
    });
  });

  // ===========================================================================
  // STATS TESTS
  // ===========================================================================

  describe("stats", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      // Complete two sessions in section 1-1
      act(() => {
        store.startQuizSession(
          [mockQuestions[0], mockQuestions[1]],
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
        );
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.answerQuestion(createAnswer("q2", true, "b"));
        store.endSession();

        store.startQuizSession(
          [mockQuestions[0], mockQuestions[1]],
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
        );
        store.answerQuestion(createAnswer("q1", false, "b"));
        store.answerQuestion(createAnswer("q2", true, "b"));
        store.endSession();
      });

      // Complete one session in section 1-2
      act(() => {
        store.startQuizSession(
          [mockQuestions[2]],
          "01-grunnhugmyndir",
          "1-2-sameindir",
        );
        store.answerQuestion(createAnswer("q3", true, "a"));
        store.endSession();
      });
    });

    it("should get section stats", () => {
      const state = useQuizStore.getState();
      const stats = state.getSectionStats("01-grunnhugmyndir", "1-1-efnafraedi");

      expect(stats.totalAttempts).toBe(2);
      expect(stats.questionsAnswered).toBe(4);
      expect(stats.correctAnswers).toBe(3);
      expect(stats.bestScore).toBe(100);
    });

    it("should get chapter stats (aggregated)", () => {
      const state = useQuizStore.getState();
      const stats = state.getChapterStats("01-grunnhugmyndir");

      expect(stats.totalAttempts).toBe(3); // 2 + 1
      expect(stats.questionsAnswered).toBe(5); // 4 + 1
      expect(stats.correctAnswers).toBe(4); // 3 + 1
    });

    it("should get total stats", () => {
      const state = useQuizStore.getState();
      const stats = state.getTotalStats();

      expect(stats.totalAttempts).toBe(3);
      expect(stats.questionsAnswered).toBe(5);
      expect(stats.correctAnswers).toBe(4);
    });

    it("should return empty stats for non-existent section", () => {
      const state = useQuizStore.getState();
      const stats = state.getSectionStats("99-fake", "fake-section");

      expect(stats.totalAttempts).toBe(0);
      expect(stats.questionsAnswered).toBe(0);
    });
  });

  // ===========================================================================
  // PROGRESS TESTS
  // ===========================================================================

  describe("progress", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      act(() => {
        // Add problems to section 1-1
        store.markPracticeProblemViewed("p1", "01", "1-1", "P1", "A1");
        store.markPracticeProblemViewed("p2", "01", "1-1", "P2", "A2");
        store.markPracticeProblemCompleted("p1");

        // Add problems to section 1-2
        store.markPracticeProblemViewed("p3", "01", "1-2", "P3", "A3");
        store.markPracticeProblemCompleted("p3");

        // Add problems to chapter 02
        store.markPracticeProblemViewed("p4", "02", "2-1", "P4", "A4");
      });
    });

    it("should get section progress", () => {
      const state = useQuizStore.getState();
      const progress = state.getSectionProgress("01", "1-1");

      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBe(50);
    });

    it("should get chapter progress", () => {
      const state = useQuizStore.getState();
      const progress = state.getChapterProgress("01");

      expect(progress.total).toBe(3); // p1, p2, p3
      expect(progress.completed).toBe(2); // p1, p3
      expect(progress.percentage).toBe(67); // 2/3 rounded
    });

    it("should get overall progress", () => {
      const state = useQuizStore.getState();
      const progress = state.getOverallProgress();

      expect(progress.total).toBe(4); // All problems
      expect(progress.completed).toBe(2); // p1, p3
      expect(progress.percentage).toBe(50);
    });

    it("should return zero progress for empty section", () => {
      const state = useQuizStore.getState();
      const progress = state.getSectionProgress("99", "fake");

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });

  // ===========================================================================
  // PRACTICE PROBLEM ATTEMPT TRACKING
  // ===========================================================================

  describe("markPracticeProblemAttempt", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();
      act(() => {
        store.markPracticeProblemViewed(
          "prob-1",
          "01-grunnhugmyndir",
          "1-1-efnafraedi",
          "Reiknaðu massa",
          "42 g",
        );
      });
    });

    it("should record a successful attempt", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemAttempt("prob-1", true);
      });

      const problem = useQuizStore.getState().getPracticeProblemProgress("prob-1");
      expect(problem?.attempts).toBe(1);
      expect(problem?.successfulAttempts).toBe(1);
      expect(problem?.isCompleted).toBe(true);
      expect(problem?.lastAttempted).toBeDefined();
    });

    it("should record a failed attempt", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemAttempt("prob-1", false);
      });

      const problem = useQuizStore.getState().getPracticeProblemProgress("prob-1");
      expect(problem?.attempts).toBe(1);
      expect(problem?.successfulAttempts).toBe(0);
      expect(problem?.isCompleted).toBe(false);
    });

    it("should track multiple attempts", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemAttempt("prob-1", false); // fail
        store.markPracticeProblemAttempt("prob-1", false); // fail
        store.markPracticeProblemAttempt("prob-1", true); // success
      });

      const problem = useQuizStore.getState().getPracticeProblemProgress("prob-1");
      expect(problem?.attempts).toBe(3);
      expect(problem?.successfulAttempts).toBe(1);
      expect(problem?.isCompleted).toBe(true);
    });

    it("should not affect non-existent problem", () => {
      const store = useQuizStore.getState();
      const initialState = { ...store.practiceProblemProgress };

      act(() => {
        store.markPracticeProblemAttempt("non-existent", true);
      });

      expect(useQuizStore.getState().practiceProblemProgress).toEqual(initialState);
    });

    it("should keep isCompleted true once set", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemAttempt("prob-1", true); // completes it
        store.markPracticeProblemAttempt("prob-1", false); // fail shouldn't un-complete
      });

      const problem = useQuizStore.getState().getPracticeProblemProgress("prob-1");
      expect(problem?.isCompleted).toBe(true);
    });
  });

  // ===========================================================================
  // MASTERY TRACKING TESTS
  // ===========================================================================

  describe("getProblemMastery", () => {
    it("should return novice for non-existent problem", () => {
      const state = useQuizStore.getState();
      const mastery = state.getProblemMastery("non-existent");

      expect(mastery.level).toBe("novice");
      expect(mastery.successRate).toBe(0);
      expect(mastery.attempts).toBe(0);
    });

    it("should return novice for unattempted problem", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.level).toBe("novice");
      expect(mastery.attempts).toBe(0);
    });

    it("should return learning for 1 attempt with low success", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
        store.markPracticeProblemAttempt("prob-1", false);
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.level).toBe("learning");
      expect(mastery.successRate).toBe(0);
    });

    it("should return practicing for 2+ attempts with 50%+ success", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", false);
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.level).toBe("practicing");
      expect(mastery.successRate).toBe(50);
    });

    it("should return proficient for 2+ attempts with 75%+ success", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", false);
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.level).toBe("proficient");
      expect(mastery.successRate).toBe(75);
    });

    it("should return mastered for 3+ attempts with 90%+ success", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", true);
        store.markPracticeProblemAttempt("prob-1", true);
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.level).toBe("mastered");
      expect(mastery.successRate).toBe(100);
    });

    it("should include lastAttempted in mastery info", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.markPracticeProblemViewed("prob-1", "01", "1-1", "Content", "Answer");
        store.markPracticeProblemAttempt("prob-1", true);
      });

      const mastery = useQuizStore.getState().getProblemMastery("prob-1");
      expect(mastery.lastAttempted).toBe("2024-01-15T12:00:00.000Z");
    });
  });

  describe("getSectionMastery", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      act(() => {
        // Add problems to section 1-1
        store.markPracticeProblemViewed("p1", "01", "1-1", "P1", "A1");
        store.markPracticeProblemViewed("p2", "01", "1-1", "P2", "A2");
        // p1: 2 attempts, 2 successful
        store.markPracticeProblemAttempt("p1", true);
        store.markPracticeProblemAttempt("p1", true);
        // p2: 2 attempts, 1 successful
        store.markPracticeProblemAttempt("p2", true);
        store.markPracticeProblemAttempt("p2", false);
      });
    });

    it("should return aggregate mastery for section", () => {
      const state = useQuizStore.getState();
      const mastery = state.getSectionMastery("01", "1-1");

      // Total: 4 attempts, 3 successful = 75%
      expect(mastery.successRate).toBe(75);
      expect(mastery.attempts).toBe(4);
      expect(mastery.level).toBe("proficient"); // 75%+ with 2+ attempts
    });

    it("should return novice for empty section", () => {
      const state = useQuizStore.getState();
      const mastery = state.getSectionMastery("99", "fake");

      expect(mastery.level).toBe("novice");
      expect(mastery.successRate).toBe(0);
      expect(mastery.attempts).toBe(0);
    });

    it("should include lastAttempted from most recent problem", () => {
      const state = useQuizStore.getState();
      const mastery = state.getSectionMastery("01", "1-1");

      expect(mastery.lastAttempted).toBeDefined();
    });
  });

  describe("getChapterMastery", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      act(() => {
        // Chapter 01, section 1-1
        store.markPracticeProblemViewed("p1", "01", "1-1", "P1", "A1");
        store.markPracticeProblemAttempt("p1", true);
        store.markPracticeProblemAttempt("p1", true);

        // Chapter 01, section 1-2
        store.markPracticeProblemViewed("p2", "01", "1-2", "P2", "A2");
        store.markPracticeProblemAttempt("p2", true);
        store.markPracticeProblemAttempt("p2", false);
      });
    });

    it("should return aggregate mastery for chapter", () => {
      const state = useQuizStore.getState();
      const mastery = state.getChapterMastery("01");

      // Total: 4 attempts, 3 successful = 75%
      expect(mastery.successRate).toBe(75);
      expect(mastery.attempts).toBe(4);
    });

    it("should return novice for empty chapter", () => {
      const state = useQuizStore.getState();
      const mastery = state.getChapterMastery("99");

      expect(mastery.level).toBe("novice");
      expect(mastery.successRate).toBe(0);
    });
  });

  // ===========================================================================
  // PROBLEMS FOR REVIEW TESTS
  // ===========================================================================

  describe("getProblemsForReview", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      act(() => {
        // Problem 1: completed, high success rate
        store.markPracticeProblemViewed("p1", "01", "1-1", "P1", "A1");
        store.markPracticeProblemAttempt("p1", true);
        store.markPracticeProblemAttempt("p1", true);

        // Problem 2: not completed, low success rate (priority)
        store.markPracticeProblemViewed("p2", "01", "1-1", "P2", "A2");
        store.markPracticeProblemAttempt("p2", false);
        store.markPracticeProblemAttempt("p2", false);

        // Problem 3: completed, medium success rate
        store.markPracticeProblemViewed("p3", "01", "1-2", "P3", "A3");
        store.markPracticeProblemAttempt("p3", true);
        store.markPracticeProblemAttempt("p3", false);

        // Problem 4: never attempted (should not appear)
        store.markPracticeProblemViewed("p4", "01", "1-2", "P4", "A4");
      });
    });

    it("should return problems sorted by priority", () => {
      const state = useQuizStore.getState();
      const problems = state.getProblemsForReview();

      // Should only include attempted problems
      expect(problems.length).toBe(3);

      // First should be p2 (not completed, 0% success)
      expect(problems[0].id).toBe("p2");
    });

    it("should respect limit parameter", () => {
      const state = useQuizStore.getState();
      const problems = state.getProblemsForReview(2);

      expect(problems.length).toBe(2);
    });

    it("should exclude unattempted problems", () => {
      const state = useQuizStore.getState();
      const problems = state.getProblemsForReview();

      const ids = problems.map(p => p.id);
      expect(ids).not.toContain("p4");
    });

    it("should prioritize not completed over completed", () => {
      const state = useQuizStore.getState();
      const problems = state.getProblemsForReview();

      // p2 is not completed, should be before p1 and p3 which are completed
      const p2Index = problems.findIndex(p => p.id === "p2");
      const p1Index = problems.findIndex(p => p.id === "p1");

      expect(p2Index).toBeLessThan(p1Index);
    });
  });

  // ===========================================================================
  // ADAPTIVE PROBLEMS TESTS
  // ===========================================================================

  describe("getAdaptiveProblems", () => {
    beforeEach(() => {
      const store = useQuizStore.getState();

      act(() => {
        // Novice problems (never attempted or very few)
        store.markPracticeProblemViewed("novice1", "01", "1-1", "N1", "A1");
        store.markPracticeProblemViewed("novice2", "01", "1-1", "N2", "A2");
        store.markPracticeProblemViewed("novice3", "01", "1-1", "N3", "A3");

        // Learning problems (1 attempt)
        store.markPracticeProblemViewed("learn1", "01", "1-2", "L1", "A1");
        store.markPracticeProblemAttempt("learn1", false);
        store.markPracticeProblemViewed("learn2", "01", "1-2", "L2", "A2");
        store.markPracticeProblemAttempt("learn2", true);

        // Practicing problems (2+ attempts, 50%+)
        store.markPracticeProblemViewed("prac1", "01", "1-3", "Pr1", "A1");
        store.markPracticeProblemAttempt("prac1", true);
        store.markPracticeProblemAttempt("prac1", false);

        // Mastered problems (high success)
        store.markPracticeProblemViewed("mast1", "01", "1-4", "M1", "A1");
        store.markPracticeProblemAttempt("mast1", true);
        store.markPracticeProblemAttempt("mast1", true);
        store.markPracticeProblemAttempt("mast1", true);

        // Chapter 02 problem
        store.markPracticeProblemViewed("ch2-1", "02", "2-1", "C2", "A1");
      });
    });

    it("should return problems for adaptive practice", () => {
      const state = useQuizStore.getState();
      const problems = state.getAdaptiveProblems();

      expect(problems.length).toBeGreaterThan(0);
      expect(problems.length).toBeLessThanOrEqual(5);
    });

    it("should filter by chapter when specified", () => {
      const state = useQuizStore.getState();
      const problems = state.getAdaptiveProblems("02");

      // Only ch2-1 is in chapter 02
      expect(problems.every(p => p.chapterSlug === "02")).toBe(true);
    });

    it("should respect limit parameter", () => {
      const state = useQuizStore.getState();
      const problems = state.getAdaptiveProblems(undefined, 3);

      expect(problems.length).toBeLessThanOrEqual(3);
    });

    it("should prioritize lower mastery levels", () => {
      const state = useQuizStore.getState();
      const problems = state.getAdaptiveProblems("01", 10);

      const ids = problems.map(p => p.id);

      // Should not include mastered problem in limited results
      // (mastered is lowest priority)
      if (problems.length < 8) {
        // If not all problems fit, mastered should be excluded
        expect(ids).not.toContain("mast1");
      }
    });

    it("should return empty array for empty chapter", () => {
      const state = useQuizStore.getState();
      const problems = state.getAdaptiveProblems("99");

      expect(problems).toHaveLength(0);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle session with no chapter/section specified", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession(mockQuestions);
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.endSession();
      });

      const state = useQuizStore.getState();
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].chapterSlug).toBeUndefined();
    });

    it("should handle empty questions array", () => {
      const store = useQuizStore.getState();

      act(() => {
        store.startQuizSession([]);
      });

      const state = useQuizStore.getState();
      expect(state.currentSession?.questions).toHaveLength(0);
    });

    it("should calculate average score correctly over multiple attempts", () => {
      const store = useQuizStore.getState();

      // First attempt: 100%
      act(() => {
        store.startQuizSession([mockQuestions[0]], "01", "1-1");
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.endSession();
      });

      // Second attempt: 0%
      act(() => {
        store.startQuizSession([mockQuestions[0]], "01", "1-1");
        store.answerQuestion(createAnswer("q1", false, "b"));
        store.endSession();
      });

      const state = useQuizStore.getState();
      const stats = state.getSectionStats("01", "1-1");

      expect(stats.averageScore).toBe(50); // (100 + 0) / 2
      expect(stats.bestScore).toBe(100);
    });

    it("should handle nextQuestion when no session is active", () => {
      // Ensure no session is active
      act(() => {
        useQuizStore.getState().resetSession();
      });

      const initialIndex = useQuizStore.getState().currentQuestionIndex;

      // Try to navigate without a session
      act(() => {
        useQuizStore.getState().nextQuestion();
      });

      // Should not change anything
      expect(useQuizStore.getState().currentQuestionIndex).toBe(initialIndex);
    });

    it("should handle markPracticeProblemCompleted for non-existent problem", () => {
      const store = useQuizStore.getState();
      const initialProgress = { ...store.practiceProblemProgress };

      // Try to complete a problem that doesn't exist
      act(() => {
        store.markPracticeProblemCompleted("non-existent-id");
      });

      // Should not change anything
      const state = useQuizStore.getState();
      expect(state.practiceProblemProgress).toEqual(initialProgress);
    });

    it("should return zero average score when no questions answered in aggregated stats", () => {
      // Get chapter stats for a chapter with no quiz attempts
      const state = useQuizStore.getState();
      const stats = state.getChapterStats("non-existent-chapter");

      expect(stats.averageScore).toBe(0);
      expect(stats.questionsAnswered).toBe(0);
    });

    it("should track lastAttempted in aggregated stats", () => {
      const store = useQuizStore.getState();

      // Complete sessions in two different sections
      act(() => {
        store.startQuizSession([mockQuestions[0]], "01", "1-1");
        store.answerQuestion(createAnswer("q1", true, "a"));
        store.endSession();
      });

      // Advance time
      vi.advanceTimersByTime(1000);

      act(() => {
        store.startQuizSession([mockQuestions[1]], "01", "1-2");
        store.answerQuestion(createAnswer("q2", true, "b"));
        store.endSession();
      });

      const state = useQuizStore.getState();
      const chapterStats = state.getChapterStats("01");

      // Should have the latest attempt time
      expect(chapterStats.lastAttempted).toBeDefined();
    });
  });
});
