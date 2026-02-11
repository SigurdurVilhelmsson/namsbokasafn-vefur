/**
 * Tests for quiz store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { QuizQuestion, QuizAnswer } from '$lib/types/quiz';

// Need to reset module between tests to get fresh store instances
let quizStore: typeof import('./quiz').quizStore;
let currentQuizSession: typeof import('./quiz').currentQuizSession;
let quizProgress: typeof import('./quiz').quizProgress;

// Helper to create quiz questions
function makeQuestion(id: string): QuizQuestion {
	return {
		id,
		question: `Question ${id}`,
		type: 'multiple-choice',
		options: ['A', 'B', 'C', 'D'],
		correctAnswer: 'A'
	};
}

// Helper to create quiz answers
function makeAnswer(id: string, isCorrect: boolean): QuizAnswer {
	return {
		id,
		questionId: id,
		selectedAnswer: isCorrect ? 'A' : 'B',
		isCorrect,
		timeSpent: 5000
	};
}

describe('quiz store', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./quiz');
		quizStore = module.quizStore;
		currentQuizSession = module.currentQuizSession;
		quizProgress = module.quizProgress;
	});

	describe('default values', () => {
		it('should start with no current session', () => {
			expect(get(currentQuizSession)).toBeNull();
		});

		it('should start with null quiz progress', () => {
			expect(get(quizProgress)).toBeNull();
		});

		it('should start with empty sessions and stats', () => {
			const state = get(quizStore);
			expect(state.sessions).toEqual([]);
			expect(state.stats).toEqual({});
			expect(state.practiceProblemProgress).toEqual({});
		});
	});

	describe('quiz session lifecycle', () => {
		it('should start a quiz session', () => {
			const questions = [makeQuestion('q1'), makeQuestion('q2')];
			quizStore.startQuizSession(questions, '01', '1-1');

			const session = get(currentQuizSession);
			expect(session).not.toBeNull();
			expect(session!.questions).toEqual(['q1', 'q2']);
			expect(session!.answers).toEqual([]);
			expect(session!.score).toBe(0);
			expect(session!.chapterSlug).toBe('01');
		});

		it('should track quiz progress', () => {
			quizStore.startQuizSession([makeQuestion('q1'), makeQuestion('q2')]);

			const progress = get(quizProgress);
			expect(progress).not.toBeNull();
			expect(progress!.current).toBe(1);
			expect(progress!.total).toBe(2);
		});

		it('should record answers and calculate score', () => {
			quizStore.startQuizSession([makeQuestion('q1'), makeQuestion('q2')]);

			quizStore.answerQuestion(makeAnswer('q1', true));
			const session = get(currentQuizSession);
			expect(session!.answers).toHaveLength(1);
			expect(session!.score).toBe(50); // 1/2 correct = 50%
		});

		it('should update existing answer if answered again', () => {
			quizStore.startQuizSession([makeQuestion('q1')]);

			quizStore.answerQuestion(makeAnswer('q1', false));
			expect(get(currentQuizSession)!.score).toBe(0);

			quizStore.answerQuestion(makeAnswer('q1', true));
			expect(get(currentQuizSession)!.answers).toHaveLength(1);
			expect(get(currentQuizSession)!.score).toBe(100);
		});

		it('should navigate between questions', () => {
			quizStore.startQuizSession([
				makeQuestion('q1'),
				makeQuestion('q2'),
				makeQuestion('q3')
			]);

			expect(get(quizStore).currentQuestionIndex).toBe(0);
			quizStore.nextQuestion();
			expect(get(quizStore).currentQuestionIndex).toBe(1);
			quizStore.nextQuestion();
			expect(get(quizStore).currentQuestionIndex).toBe(2);

			// Should not go beyond last question
			quizStore.nextQuestion();
			expect(get(quizStore).currentQuestionIndex).toBe(2);

			quizStore.previousQuestion();
			expect(get(quizStore).currentQuestionIndex).toBe(1);

			// Should not go below 0
			quizStore.previousQuestion();
			quizStore.previousQuestion();
			expect(get(quizStore).currentQuestionIndex).toBe(0);
		});

		it('should end session and update stats', () => {
			quizStore.startQuizSession([makeQuestion('q1'), makeQuestion('q2')], '01', '1-1');
			quizStore.answerQuestion(makeAnswer('q1', true));
			quizStore.answerQuestion(makeAnswer('q2', false));

			quizStore.endSession();

			expect(get(currentQuizSession)).toBeNull();
			expect(get(quizStore).sessions).toHaveLength(1);

			const stats = quizStore.getSectionStats('01', '1-1');
			expect(stats.totalAttempts).toBe(1);
			expect(stats.correctAnswers).toBe(1);
			expect(stats.averageScore).toBe(50);
		});

		it('should not crash when ending session with no active session', () => {
			quizStore.endSession();
			expect(get(currentQuizSession)).toBeNull();
		});

		it('should reset session without saving', () => {
			quizStore.startQuizSession([makeQuestion('q1')]);
			quizStore.answerQuestion(makeAnswer('q1', true));
			quizStore.resetSession();

			expect(get(currentQuizSession)).toBeNull();
			expect(get(quizStore).sessions).toHaveLength(0);
		});
	});

	describe('practice problem tracking', () => {
		it('should mark a problem as viewed', () => {
			quizStore.markPracticeProblemViewed(
				'pp-1', '01', '1-1', 'question?', 'answer'
			);
			const progress = quizStore.getPracticeProblemProgress('pp-1');
			expect(progress).toBeDefined();
			expect(progress!.isCompleted).toBe(false);
			expect(progress!.attempts).toBe(0);
		});

		it('should not overwrite existing progress on re-view', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemCompleted('pp-1');
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');

			const progress = quizStore.getPracticeProblemProgress('pp-1');
			expect(progress!.isCompleted).toBe(true); // not reset
		});

		it('should mark a problem as completed', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemCompleted('pp-1');

			const progress = quizStore.getPracticeProblemProgress('pp-1');
			expect(progress!.isCompleted).toBe(true);
			expect(progress!.attempts).toBe(1);
			expect(progress!.successfulAttempts).toBe(1);
		});

		it('should track attempt results', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemAttempt('pp-1', false);
			quizStore.markPracticeProblemAttempt('pp-1', true);
			quizStore.markPracticeProblemAttempt('pp-1', true);

			const progress = quizStore.getPracticeProblemProgress('pp-1');
			expect(progress!.attempts).toBe(3);
			expect(progress!.successfulAttempts).toBe(2);
			expect(progress!.isCompleted).toBe(true); // set on first success
		});

		it('should return undefined for unknown problems', () => {
			expect(quizStore.getPracticeProblemProgress('nonexistent')).toBeUndefined();
		});
	});

	describe('mastery tracking', () => {
		it('should return novice for unknown problems', () => {
			const mastery = quizStore.getProblemMastery('nonexistent');
			expect(mastery.level).toBe('novice');
			expect(mastery.attempts).toBe(0);
		});

		it('should return learning after first attempt', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemAttempt('pp-1', false);

			const mastery = quizStore.getProblemMastery('pp-1');
			expect(mastery.level).toBe('learning');
		});

		it('should return mastered with high success rate and enough attempts', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemAttempt('pp-1', true);
			quizStore.markPracticeProblemAttempt('pp-1', true);
			quizStore.markPracticeProblemAttempt('pp-1', true);

			const mastery = quizStore.getProblemMastery('pp-1');
			expect(mastery.level).toBe('mastered');
			expect(mastery.successRate).toBe(100);
		});

		it('should calculate section mastery across problems', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q1', 'a1');
			quizStore.markPracticeProblemViewed('pp-2', '01', '1-1', 'q2', 'a2');
			quizStore.markPracticeProblemAttempt('pp-1', true);
			quizStore.markPracticeProblemAttempt('pp-2', false);

			const mastery = quizStore.getSectionMastery('01', '1-1');
			expect(mastery.attempts).toBe(2);
			expect(mastery.successRate).toBe(50);
		});
	});

	describe('stats', () => {
		it('should return empty stats for sections with no data', () => {
			const stats = quizStore.getSectionStats('01', '1-1');
			expect(stats.totalAttempts).toBe(0);
			expect(stats.averageScore).toBe(0);
		});

		it('should aggregate chapter stats from sections', () => {
			// End two sessions in different sections of chapter 01
			quizStore.startQuizSession([makeQuestion('q1')], '01', '1-1');
			quizStore.answerQuestion(makeAnswer('q1', true));
			quizStore.endSession();

			quizStore.startQuizSession([makeQuestion('q2')], '01', '1-2');
			quizStore.answerQuestion(makeAnswer('q2', true));
			quizStore.endSession();

			const stats = quizStore.getChapterStats('01');
			expect(stats.totalAttempts).toBe(2);
			expect(stats.correctAnswers).toBe(2);
		});

		it('should return empty stats for chapters with no data', () => {
			const stats = quizStore.getChapterStats('99');
			expect(stats.totalAttempts).toBe(0);
		});
	});

	describe('progress', () => {
		it('should calculate section progress', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemViewed('pp-2', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemCompleted('pp-1');

			const progress = quizStore.getSectionProgress('01', '1-1');
			expect(progress.completed).toBe(1);
			expect(progress.total).toBe(2);
			expect(progress.percentage).toBe(50);
		});

		it('should calculate chapter progress', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.markPracticeProblemViewed('pp-2', '01', '1-2', 'q', 'a');
			quizStore.markPracticeProblemCompleted('pp-1');
			quizStore.markPracticeProblemCompleted('pp-2');

			const progress = quizStore.getChapterProgress('01');
			expect(progress.completed).toBe(2);
			expect(progress.total).toBe(2);
			expect(progress.percentage).toBe(100);
		});
	});

	describe('adaptive problems', () => {
		it('should prioritize novice problems', () => {
			// pp-1: novice (no attempts), pp-2: mastered
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q1', 'a1');
			quizStore.markPracticeProblemViewed('pp-2', '01', '1-1', 'q2', 'a2');
			quizStore.markPracticeProblemAttempt('pp-2', true);
			quizStore.markPracticeProblemAttempt('pp-2', true);
			quizStore.markPracticeProblemAttempt('pp-2', true);

			const adaptive = quizStore.getAdaptiveProblems('01', 5);
			expect(adaptive[0].id).toBe('pp-1'); // novice first
		});

		it('should filter by chapter', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q1', 'a1');
			quizStore.markPracticeProblemViewed('pp-2', '02', '2-1', 'q2', 'a2');

			const ch01 = quizStore.getAdaptiveProblems('01');
			expect(ch01).toHaveLength(1);
			expect(ch01[0].id).toBe('pp-1');
		});

		it('should limit results to maxProblems', () => {
			for (let i = 0; i < 10; i++) {
				quizStore.markPracticeProblemViewed(`pp-${i}`, '01', '1-1', `q${i}`, `a${i}`);
			}
			const problems = quizStore.getAdaptiveProblems('01', 3);
			expect(problems).toHaveLength(3);
		});
	});

	describe('problems for review', () => {
		it('should include problems with no lastAttempted', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			const problems = quizStore.getProblemsForReview();
			expect(problems).toHaveLength(1);
		});
	});

	describe('getProblemsForChapter', () => {
		it('should return all problems for a given chapter', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q1', 'a1');
			quizStore.markPracticeProblemViewed('pp-2', '01', '1-2', 'q2', 'a2');
			quizStore.markPracticeProblemViewed('pp-3', '02', '2-1', 'q3', 'a3');

			const ch01 = quizStore.getProblemsForChapter('01');
			expect(ch01).toHaveLength(2);
		});
	});

	describe('persistence', () => {
		it('should persist to localStorage', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			expect(localStorage.setItem).toHaveBeenCalled();
		});

		it('should load from localStorage', async () => {
			localStorage.setItem(
				'namsbokasafn:quiz',
				JSON.stringify({
					...get(quizStore),
					practiceProblemProgress: {
						'pp-saved': {
							id: 'pp-saved',
							content: 'saved',
							answer: 'a',
							chapterSlug: '01',
							sectionSlug: '1-1',
							isCompleted: true,
							attempts: 3,
							successfulAttempts: 2
						}
					}
				})
			);

			vi.resetModules();
			const module = await import('./quiz');
			const store = module.quizStore;
			const progress = store.getPracticeProblemProgress('pp-saved');
			expect(progress).toBeDefined();
			expect(progress!.isCompleted).toBe(true);
		});
	});

	describe('reset', () => {
		it('should reset to default state', () => {
			quizStore.markPracticeProblemViewed('pp-1', '01', '1-1', 'q', 'a');
			quizStore.startQuizSession([makeQuestion('q1')]);
			quizStore.reset();

			expect(get(currentQuizSession)).toBeNull();
			expect(get(quizStore).practiceProblemProgress).toEqual({});
			expect(get(quizStore).sessions).toEqual([]);
		});
	});
});
