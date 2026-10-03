/**
 * Quiz Store - Quiz sessions, practice problems, and mastery tracking
 * Ported from React/Zustand quizStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem, onStorageChange } from '$lib/utils/localStorage';
import { validateStoreData, isArray, isObject, isNumber, isBoolean } from '$lib/utils/storeValidation';
import type { QuizQuestion, QuizAnswer, QuizStats } from '$lib/types/quiz';
import type { MasteryLevel } from '$lib/types/quiz';
import {
	type ProgressResult,
	createStatsKey,
	calculateProgress,
	filterByChapterPrefix,
	generateId
} from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:quiz';

interface MasteryInfo {
	level: MasteryLevel;
	successRate: number;
	attempts: number;
	lastAttempted?: string;
}

export interface PracticeProblem {
	id: string;
	content: string;
	answer: string;
	bookSlug: string;
	chapterSlug: string;
	sectionSlug: string;
	source: 'inline' | 'bank';
	isCompleted: boolean;
	attempts: number;
	successfulAttempts: number;
	lastAttempted?: string;
}

const MASTERY_THRESHOLDS = {
	mastered: { minSuccessRate: 90, minAttempts: 3 },
	proficient: { minSuccessRate: 75, minAttempts: 2 },
	practicing: { minSuccessRate: 50, minAttempts: 2 },
	learning: { minSuccessRate: 0, minAttempts: 1 },
	novice: { minSuccessRate: 0, minAttempts: 0 }
};

function calculateMasteryLevel(successRate: number, attempts: number): MasteryLevel {
	if (
		attempts >= MASTERY_THRESHOLDS.mastered.minAttempts &&
		successRate >= MASTERY_THRESHOLDS.mastered.minSuccessRate
	) {
		return 'mastered';
	}
	if (
		attempts >= MASTERY_THRESHOLDS.proficient.minAttempts &&
		successRate >= MASTERY_THRESHOLDS.proficient.minSuccessRate
	) {
		return 'proficient';
	}
	if (
		attempts >= MASTERY_THRESHOLDS.practicing.minAttempts &&
		successRate >= MASTERY_THRESHOLDS.practicing.minSuccessRate
	) {
		return 'practicing';
	}
	if (attempts >= MASTERY_THRESHOLDS.learning.minAttempts) {
		return 'learning';
	}
	return 'novice';
}

function createEmptyStats(): QuizStats {
	return {
		totalAttempts: 0,
		correctAnswers: 0,
		averageScore: 0,
		lastAttempt: undefined
	};
}

interface QuizSessionInternal {
	id: string;
	startTime: string;
	endTime?: string;
	questions: string[];
	answers: QuizAnswer[];
	score: number;
	bookSlug?: string;
	chapterSlug?: string;
	sectionSlug?: string;
}

interface QuizState {
	currentSession: QuizSessionInternal | null;
	currentQuestionIndex: number;
	showFeedback: boolean;
	practiceProblemProgress: Record<string, PracticeProblem>;
	sessions: QuizSessionInternal[];
	stats: Record<string, QuizStats>;
}

const defaultState: QuizState = {
	currentSession: null,
	currentQuestionIndex: 0,
	showFeedback: false,
	practiceProblemProgress: {},
	sessions: [],
	stats: {}
};

const isNullOrObject = (v: unknown): boolean => v === null || isObject(v);

const quizValidators = {
	currentSession: isNullOrObject,
	currentQuestionIndex: isNumber,
	showFeedback: isBoolean,
	practiceProblemProgress: isObject,
	sessions: isArray,
	stats: isObject
};

function loadState(): QuizState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			// No key migration here: quiz stats keys legitimately contain a
			// single slash ("<book>/global", "<book>/<chapter>"), which the
			// generic legacy-key migration would corrupt by double-prefixing
			return validateStoreData(JSON.parse(stored), defaultState, quizValidators);
		}
	} catch (e) {
		console.warn('Failed to load quiz state:', e);
	}
	return defaultState;
}

/**
 * Filter problems by book (+ optional chapter/section). v2 chapter slugs are
 * zero-padded numbers shared by every book, so chapter-only filtering would
 * bleed progress across books.
 */
function filterProblems(
	problems: PracticeProblem[],
	bookSlug: string,
	chapterSlug?: string,
	sectionSlug?: string
): PracticeProblem[] {
	return problems.filter(
		(p) =>
			p.bookSlug === bookSlug &&
			(chapterSlug === undefined || p.chapterSlug === chapterSlug) &&
			(sectionSlug === undefined || p.sectionSlug === sectionSlug)
	);
}

function createQuizStore() {
	const { subscribe, set, update } = writable<QuizState>(loadState());

	// Persist to localStorage
	let _externalUpdate = false;
	if (browser) {
		subscribe((state) => {
			if (!_externalUpdate) {
				safeSetItem(STORAGE_KEY, JSON.stringify(state));
			}
		});

		// Cross-tab synchronization
		onStorageChange(STORAGE_KEY, (newValue) => {
			try {
				_externalUpdate = true;
				set(validateStoreData(JSON.parse(newValue), defaultState, quizValidators));
			} catch { /* ignore */ }
			finally { _externalUpdate = false; }
		});
	}

	return {
		subscribe,

		// Start a new quiz session
		startQuizSession: (
			questions: QuizQuestion[],
			bookSlug?: string,
			chapterSlug?: string,
			sectionSlug?: string
		) => {
			const session: QuizSessionInternal = {
				id: generateId(),
				startTime: new Date().toISOString(),
				questions: questions.map((q) => q.id),
				answers: [],
				score: 0,
				bookSlug,
				chapterSlug,
				sectionSlug
			};

			update((state) => ({
				...state,
				currentSession: session,
				currentQuestionIndex: 0,
				showFeedback: false
			}));
		},

		// Record an answer to the current question
		answerQuestion: (answer: QuizAnswer) => {
			update((state) => {
				if (!state.currentSession) return state;

				// Replace a previous answer to the same question (dedupe by
				// question, not by chosen answer option — re-answering with a
				// different choice must not double-count the question)
				const answerKey = answer.questionId ?? answer.id;
				const existingAnswerIndex = state.currentSession.answers.findIndex(
					(a) => (a.questionId ?? a.id) === answerKey
				);

				let newAnswers: QuizAnswer[];
				if (existingAnswerIndex >= 0) {
					newAnswers = [...state.currentSession.answers];
					newAnswers[existingAnswerIndex] = answer;
				} else {
					newAnswers = [...state.currentSession.answers, answer];
				}

				const correctCount = newAnswers.filter((a) => a.isCorrect).length;
				const score = Math.round((correctCount / state.currentSession.questions.length) * 100);

				return {
					...state,
					currentSession: {
						...state.currentSession,
						answers: newAnswers,
						score
					},
					showFeedback: true
				};
			});
		},

		nextQuestion: () => {
			update((state) => {
				if (!state.currentSession) return state;
				if (state.currentQuestionIndex < state.currentSession.questions.length - 1) {
					return {
						...state,
						currentQuestionIndex: state.currentQuestionIndex + 1,
						showFeedback: false
					};
				}
				return state;
			});
		},

		previousQuestion: () => {
			update((state) => {
				if (state.currentQuestionIndex > 0) {
					return {
						...state,
						currentQuestionIndex: state.currentQuestionIndex - 1,
						showFeedback: true
					};
				}
				return state;
			});
		},

		endSession: () => {
			update((state) => {
				if (!state.currentSession) return state;

				const endedSession: QuizSessionInternal = {
					...state.currentSession,
					endTime: new Date().toISOString()
				};

				const statsKey = createStatsKey(
					state.currentSession.bookSlug || 'efnafraedi-2e',
					state.currentSession.chapterSlug,
					state.currentSession.sectionSlug
				);

				const currentStats = state.stats[statsKey] || createEmptyStats();
				const correctCount = endedSession.answers.filter((a) => a.isCorrect).length;

				const newStats: QuizStats = {
					totalAttempts: currentStats.totalAttempts + 1,
					correctAnswers: currentStats.correctAnswers + correctCount,
					averageScore: Math.round(
						(currentStats.averageScore * currentStats.totalAttempts + endedSession.score) /
							(currentStats.totalAttempts + 1)
					),
					lastAttempt: endedSession.endTime
				};

				return {
					...state,
					sessions: [...state.sessions, endedSession].slice(-500),
					stats: { ...state.stats, [statsKey]: newStats },
					currentSession: null,
					currentQuestionIndex: 0,
					showFeedback: false
				};
			});
		},

		resetSession: () => {
			update((state) => ({
				...state,
				currentSession: null,
				currentQuestionIndex: 0,
				showFeedback: false
			}));
		},

		// Practice problem tracking
		markPracticeProblemViewed: (
			id: string,
			bookSlug: string,
			chapterSlug: string,
			sectionSlug: string,
			content: string,
			answer: string,
			source: 'inline' | 'bank' = 'inline'
		) => {
			update((state) => {
				if (state.practiceProblemProgress[id]) return state;

				return {
					...state,
					practiceProblemProgress: {
						...state.practiceProblemProgress,
						[id]: {
							id,
							content,
							answer,
							bookSlug,
							chapterSlug,
							sectionSlug,
							source,
							isCompleted: false,
							attempts: 0,
							successfulAttempts: 0
						}
					}
				};
			});
		},

		markPracticeProblemCompleted: (id: string) => {
			update((state) => {
				const problem = state.practiceProblemProgress[id];
				if (!problem) return state;

				return {
					...state,
					practiceProblemProgress: {
						...state.practiceProblemProgress,
						[id]: {
							...problem,
							isCompleted: true,
							attempts: problem.attempts + 1,
							successfulAttempts: problem.successfulAttempts + 1,
							lastAttempted: new Date().toISOString()
						}
					}
				};
			});
		},

		markPracticeProblemAttempt: (id: string, success: boolean) => {
			update((state) => {
				const problem = state.practiceProblemProgress[id];
				if (!problem) return state;

				return {
					...state,
					practiceProblemProgress: {
						...state.practiceProblemProgress,
						[id]: {
							...problem,
							isCompleted: success ? true : problem.isCompleted,
							attempts: problem.attempts + 1,
							successfulAttempts: success
								? problem.successfulAttempts + 1
								: problem.successfulAttempts,
							lastAttempted: new Date().toISOString()
						}
					}
				};
			});
		},

		getPracticeProblemProgress: (id: string): PracticeProblem | undefined => {
			return get({ subscribe }).practiceProblemProgress[id];
		},

		// Mastery tracking
		getProblemMastery: (id: string): MasteryInfo => {
			const problem = get({ subscribe }).practiceProblemProgress[id];
			if (!problem) {
				return { level: 'novice', successRate: 0, attempts: 0 };
			}
			const successRate =
				problem.attempts > 0
					? Math.round((problem.successfulAttempts / problem.attempts) * 100)
					: 0;
			return {
				level: calculateMasteryLevel(successRate, problem.attempts),
				successRate,
				attempts: problem.attempts,
				lastAttempted: problem.lastAttempted
			};
		},

		getSectionMastery: (bookSlug: string, chapterSlug: string, sectionSlug: string): MasteryInfo => {
			const { practiceProblemProgress } = get({ subscribe });
			const problems = filterProblems(
				Object.values(practiceProblemProgress),
				bookSlug,
				chapterSlug,
				sectionSlug
			);

			if (problems.length === 0) {
				return { level: 'novice', successRate: 0, attempts: 0 };
			}

			const totalAttempts = problems.reduce((sum, p) => sum + p.attempts, 0);
			const totalSuccessful = problems.reduce((sum, p) => sum + p.successfulAttempts, 0);
			const successRate =
				totalAttempts > 0 ? Math.round((totalSuccessful / totalAttempts) * 100) : 0;

			const lastAttempted = problems
				.map((p) => p.lastAttempted)
				.filter(Boolean)
				.sort()
				.pop();

			// Level, successRate and attempts all use the same totals so the
			// numbers shown can reproduce the level shown (one merely-viewed
			// problem no longer pins the whole section at novice)
			return {
				level: calculateMasteryLevel(successRate, totalAttempts),
				successRate,
				attempts: totalAttempts,
				lastAttempted
			};
		},

		// Stats
		getSectionStats: (bookSlug: string, chapterSlug: string, sectionSlug: string): QuizStats => {
			const key = createStatsKey(bookSlug, chapterSlug, sectionSlug);
			return get({ subscribe }).stats[key] || createEmptyStats();
		},

		getChapterStats: (bookSlug: string, chapterSlug: string): QuizStats => {
			const { stats } = get({ subscribe });
			const sectionStats = filterByChapterPrefix(stats, bookSlug, chapterSlug).map(([, value]) => value);

			if (sectionStats.length === 0) return createEmptyStats();

			const aggregated = createEmptyStats();
			for (const s of sectionStats) {
				aggregated.totalAttempts += s.totalAttempts;
				aggregated.correctAnswers += s.correctAnswers;
				if (s.lastAttempt && (!aggregated.lastAttempt || s.lastAttempt > aggregated.lastAttempt)) {
					aggregated.lastAttempt = s.lastAttempt;
				}
			}
			if (aggregated.totalAttempts > 0) {
				aggregated.averageScore = Math.round(
					sectionStats.reduce((sum, s) => sum + s.averageScore * s.totalAttempts, 0) /
						aggregated.totalAttempts
				);
			}
			return aggregated;
		},

		// Progress
		getSectionProgress: (
			bookSlug: string,
			chapterSlug: string,
			sectionSlug: string
		): ProgressResult => {
			const { practiceProblemProgress } = get({ subscribe });
			const problems = filterProblems(
				Object.values(practiceProblemProgress),
				bookSlug,
				chapterSlug,
				sectionSlug
			);
			return calculateProgress(problems);
		},

		getChapterProgress: (bookSlug: string, chapterSlug: string): ProgressResult => {
			const { practiceProblemProgress } = get({ subscribe });
			const problems = filterProblems(
				Object.values(practiceProblemProgress),
				bookSlug,
				chapterSlug
			);
			return calculateProgress(problems);
		},

		// Get adaptive problems based on mastery - prioritize problems that need work
		getAdaptiveProblems: (
			bookSlug: string,
			chapterSlug?: string,
			maxProblems: number = 5
		): PracticeProblem[] => {
			const { practiceProblemProgress } = get({ subscribe });
			const problems = filterProblems(
				Object.values(practiceProblemProgress),
				bookSlug,
				chapterSlug
			);

			// Sort by priority: novice > learning > practicing > proficient > mastered
			// Also consider time since last attempt (older = higher priority)
			const priorityOrder: Record<MasteryLevel, number> = {
				novice: 0,
				learning: 1,
				practicing: 2,
				proficient: 3,
				mastered: 4
			};

			const scored = problems.map((problem) => {
				const successRate =
					problem.attempts > 0
						? Math.round((problem.successfulAttempts / problem.attempts) * 100)
						: 0;
				const level = calculateMasteryLevel(successRate, problem.attempts);
				const daysSinceAttempt = problem.lastAttempted
					? (Date.now() - new Date(problem.lastAttempted).getTime()) / (1000 * 60 * 60 * 24)
					: 999;

				return {
					problem,
					priority: priorityOrder[level],
					daysSinceAttempt
				};
			});

			// Sort: lower priority first, then by days since attempt (older first)
			scored.sort((a, b) => {
				if (a.priority !== b.priority) return a.priority - b.priority;
				return b.daysSinceAttempt - a.daysSinceAttempt;
			});

			return scored.slice(0, maxProblems).map((s) => s.problem);
		},

		// Get problems due for review (spaced repetition style)
		getProblemsForReview: (bookSlug: string, maxProblems: number = 5): PracticeProblem[] => {
			const { practiceProblemProgress } = get({ subscribe });
			const problems = filterProblems(Object.values(practiceProblemProgress), bookSlug);

			// Calculate review intervals based on mastery
			const reviewIntervals: Record<MasteryLevel, number> = {
				novice: 0, // Always review
				learning: 1, // Review after 1 day
				practicing: 3, // Review after 3 days
				proficient: 7, // Review after 7 days
				mastered: 14 // Review after 14 days
			};

			const now = Date.now();
			const dueForReview = problems.filter((problem) => {
				if (!problem.lastAttempted) return true;

				const successRate =
					problem.attempts > 0
						? Math.round((problem.successfulAttempts / problem.attempts) * 100)
						: 0;
				const level = calculateMasteryLevel(successRate, problem.attempts);
				const daysSinceAttempt =
					(now - new Date(problem.lastAttempted).getTime()) / (1000 * 60 * 60 * 24);

				return daysSinceAttempt >= reviewIntervals[level];
			});

			// Sort by urgency (most overdue first)
			dueForReview.sort((a, b) => {
				const aTime = a.lastAttempted ? new Date(a.lastAttempted).getTime() : 0;
				const bTime = b.lastAttempted ? new Date(b.lastAttempted).getTime() : 0;
				return aTime - bTime;
			});

			return dueForReview.slice(0, maxProblems);
		},

		// Get all problems for a chapter
		getProblemsForChapter: (bookSlug: string, chapterSlug: string): PracticeProblem[] => {
			const { practiceProblemProgress } = get({ subscribe });
			return filterProblems(Object.values(practiceProblemProgress), bookSlug, chapterSlug);
		},

		reset: () => set(defaultState)
	};
}

export const quizStore = createQuizStore();

// Derived stores
export const currentQuizSession = derived(quizStore, ($store) => $store.currentSession);

export const quizProgress = derived(quizStore, ($store) => {
	if (!$store.currentSession) return null;
	return {
		current: $store.currentQuestionIndex + 1,
		total: $store.currentSession.questions.length,
		score: $store.currentSession.score,
		isComplete: $store.currentQuestionIndex >= $store.currentSession.questions.length - 1
	};
});
