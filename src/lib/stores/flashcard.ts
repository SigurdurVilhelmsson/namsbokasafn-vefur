/**
 * Flashcard Store - Full SvelteKit implementation with SM-2 SRS
 * Ported from React/Zustand flashcardStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { safeSetItem } from '$lib/utils/localStorage';
import type {
	Flashcard,
	FlashcardDeck,
	FlashcardStudyRecord,
	DifficultyRating
} from '$lib/types/flashcard';
import { DIFFICULTY_TO_QUALITY } from '$lib/types/flashcard';
import {
	processReview,
	isCardDue,
	sortCardsByPriority,
	getDueCards,
	getNewCards,
	calculateDeckStats,
	previewRatingIntervals
} from '$lib/utils/srs';
import { getTodayDateString, getYesterdayDateString, getCurrentTimestamp } from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:flashcards';

type StudyMode = 'all' | 'due' | 'new';

interface DeckStats {
	total: number;
	new: number;
	due: number;
	learning: number;
	review: number;
}

// Review history for analytics
export interface FlashcardReviewEntry {
	cardId: string;
	timestamp: string;
	rating: DifficultyRating;
	wasCorrect: boolean; // quality >= 3 (good or easy)
}

// Daily flashcard stats for tracking
export interface FlashcardDailyStats {
	date: string;
	cardsReviewed: number;
	correctCount: number;
	againCount: number;
	hardCount: number;
	goodCount: number;
	easyCount: number;
}

// Max entries to keep in review history
const MAX_REVIEW_HISTORY = 500;

interface FlashcardState {
	decks: FlashcardDeck[];
	studyRecords: Record<string, FlashcardStudyRecord>;
	currentDeckId: string | null;
	currentCardIndex: number;
	showAnswer: boolean;
	studyQueue: string[];
	todayStudied: number;
	studyStreak: number;
	lastStudyDate: string | null;
	reviewHistory: FlashcardReviewEntry[];
	dailyFlashcardStats: Record<string, FlashcardDailyStats>;
}

const defaultState: FlashcardState = {
	decks: [],
	studyRecords: {},
	currentDeckId: null,
	currentCardIndex: 0,
	showAnswer: false,
	studyQueue: [],
	todayStudied: 0,
	studyStreak: 0,
	lastStudyDate: null,
	reviewHistory: [],
	dailyFlashcardStats: {}
};

function calculateStudyStreak(lastStudyDate: string | null, currentStreak: number): number {
	const today = getTodayDateString();

	if (lastStudyDate === today) {
		return currentStreak;
	}

	if (lastStudyDate === getYesterdayDateString()) {
		return currentStreak + 1;
	}

	return 1;
}

function createEmptyFlashcardDailyStats(date: string): FlashcardDailyStats {
	return {
		date,
		cardsReviewed: 0,
		correctCount: 0,
		againCount: 0,
		hardCount: 0,
		goodCount: 0,
		easyCount: 0
	};
}

function buildStudyQueue(
	cardIds: string[],
	studyRecords: Record<string, FlashcardStudyRecord>,
	studyMode: StudyMode
): string[] {
	switch (studyMode) {
		case 'due':
			return getDueCards(cardIds, studyRecords);
		case 'new':
			return getNewCards(cardIds, studyRecords);
		default:
			return sortCardsByPriority(cardIds, studyRecords);
	}
}

function loadState(): FlashcardState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultState, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.warn('Failed to load flashcard state:', e);
	}
	return defaultState;
}

function createFlashcardStore() {
	const { subscribe, set, update } = writable<FlashcardState>(loadState());

	// Persist to localStorage
	if (browser) {
		subscribe((state) => {
			safeSetItem(STORAGE_KEY, JSON.stringify(state));
		});
	}

	const getDeck = (deckId: string): FlashcardDeck | undefined => {
		return get({ subscribe }).decks.find((d) => d.id === deckId);
	};

	return {
		subscribe,

		// Deck management
		addDeck: (deck: FlashcardDeck) => {
			update((state) => ({
				...state,
				decks: [...state.decks, deck]
			}));
		},

		removeDeck: (deckId: string) => {
			update((state) => ({
				...state,
				decks: state.decks.filter((d) => d.id !== deckId),
				currentDeckId: state.currentDeckId === deckId ? null : state.currentDeckId
			}));
		},

		getDeck,

		// Card management
		addCardToDeck: (deckId: string, card: Flashcard) => {
			update((state) => ({
				...state,
				decks: state.decks.map((deck) =>
					deck.id === deckId ? { ...deck, cards: [...deck.cards, card] } : deck
				)
			}));
		},

		removeCardFromDeck: (deckId: string, cardId: string) => {
			update((state) => ({
				...state,
				decks: state.decks.map((deck) =>
					deck.id === deckId ? { ...deck, cards: deck.cards.filter((c) => c.id !== cardId) } : deck
				)
			}));
		},

		// Study session
		startStudySession: (deckId: string, studyMode: StudyMode = 'all') => {
			const deck = getDeck(deckId);
			if (!deck) return;

			const state = get({ subscribe });
			const cardIds = deck.cards.map((c) => c.id);
			const queue = buildStudyQueue(cardIds, state.studyRecords, studyMode);

			update((s) => ({
				...s,
				currentDeckId: deckId,
				currentCardIndex: 0,
				showAnswer: false,
				studyQueue: queue
			}));
		},

		nextCard: () => {
			update((state) => {
				const nextIndex = state.currentCardIndex + 1;
				if (nextIndex < state.studyQueue.length) {
					return {
						...state,
						currentCardIndex: nextIndex,
						showAnswer: false
					};
				}
				return state;
			});
		},

		previousCard: () => {
			update((state) => {
				if (state.currentCardIndex > 0) {
					return {
						...state,
						currentCardIndex: state.currentCardIndex - 1,
						showAnswer: false
					};
				}
				return state;
			});
		},

		toggleAnswer: () => {
			update((state) => ({
				...state,
				showAnswer: !state.showAnswer
			}));
		},

		// SRS functions
		rateCard: (cardId: string, rating: DifficultyRating) => {
			const quality = DIFFICULTY_TO_QUALITY[rating];
			const state = get({ subscribe });
			const existingRecord = state.studyRecords[cardId];
			const newRecord = processReview(cardId, quality, existingRecord);

			const today = getTodayDateString();
			const isNewDay = state.lastStudyDate !== today;
			const newStreak = isNewDay
				? calculateStudyStreak(state.lastStudyDate, state.studyStreak)
				: state.studyStreak;
			const newTodayStudied = isNewDay ? 1 : state.todayStudied + 1;

			// Create review history entry
			const reviewEntry: FlashcardReviewEntry = {
				cardId,
				timestamp: getCurrentTimestamp(),
				rating,
				wasCorrect: quality >= 3 // good or easy
			};

			// Update daily stats
			const todayStats = state.dailyFlashcardStats[today] || createEmptyFlashcardDailyStats(today);
			const updatedTodayStats: FlashcardDailyStats = {
				...todayStats,
				cardsReviewed: todayStats.cardsReviewed + 1,
				correctCount: todayStats.correctCount + (quality >= 3 ? 1 : 0),
				againCount: todayStats.againCount + (rating === 'again' ? 1 : 0),
				hardCount: todayStats.hardCount + (rating === 'hard' ? 1 : 0),
				goodCount: todayStats.goodCount + (rating === 'good' ? 1 : 0),
				easyCount: todayStats.easyCount + (rating === 'easy' ? 1 : 0)
			};

			update((s) => ({
				...s,
				studyRecords: {
					...s.studyRecords,
					[cardId]: newRecord
				},
				lastStudyDate: today,
				studyStreak: newStreak,
				todayStudied: newTodayStudied,
				currentCardIndex: s.currentCardIndex + 1,
				showAnswer: false,
				// Keep last MAX_REVIEW_HISTORY entries
				reviewHistory: [...s.reviewHistory, reviewEntry].slice(-MAX_REVIEW_HISTORY),
				dailyFlashcardStats: {
					...s.dailyFlashcardStats,
					[today]: updatedTodayStats
				}
			}));
		},

		getCardRecord: (cardId: string): FlashcardStudyRecord | undefined => {
			return get({ subscribe }).studyRecords[cardId];
		},

		isCardDue: (cardId: string): boolean => {
			const record = get({ subscribe }).studyRecords[cardId];
			return isCardDue(record);
		},

		getDeckStats: (deckId: string): DeckStats => {
			const deck = getDeck(deckId);
			if (!deck) {
				return { total: 0, new: 0, due: 0, learning: 0, review: 0 };
			}

			const cardIds = deck.cards.map((c) => c.id);
			return calculateDeckStats(cardIds, get({ subscribe }).studyRecords);
		},

		getPreviewIntervals: (cardId: string): Record<DifficultyRating, string> => {
			const record = get({ subscribe }).studyRecords[cardId];
			return previewRatingIntervals(record);
		},

		resetSession: () => {
			update((state) => ({
				...state,
				currentDeckId: null,
				currentCardIndex: 0,
				showAnswer: false,
				studyQueue: []
			}));
		},

		// Get daily stats for a specific date
		getDailyFlashcardStats: (date?: string): FlashcardDailyStats => {
			const targetDate = date || getTodayDateString();
			return get({ subscribe }).dailyFlashcardStats[targetDate] || createEmptyFlashcardDailyStats(targetDate);
		},

		// Get stats for the last N days
		getFlashcardStatsForPeriod: (days: number): FlashcardDailyStats[] => {
			const state = get({ subscribe });
			const stats: FlashcardDailyStats[] = [];
			const today = new Date();

			for (let i = days - 1; i >= 0; i--) {
				const d = new Date(today);
				d.setDate(d.getDate() - i);
				const dateStr = d.toISOString().split('T')[0];
				stats.push(state.dailyFlashcardStats[dateStr] || createEmptyFlashcardDailyStats(dateStr));
			}

			return stats;
		},

		// Get recent review history
		getRecentReviews: (limit = 50): FlashcardReviewEntry[] => {
			return get({ subscribe }).reviewHistory.slice(-limit).reverse();
		},

		reset: () => set(defaultState)
	};
}

export const flashcardStore = createFlashcardStore();

// Derived stores
export const currentDeck = derived(flashcardStore, ($store) =>
	$store.currentDeckId ? $store.decks.find((d) => d.id === $store.currentDeckId) : null
);

export const currentCard = derived([flashcardStore, currentDeck], ([$store, $deck]) => {
	if (!$deck) return null;
	const cardId = $store.studyQueue[$store.currentCardIndex];
	return $deck.cards.find((c) => c.id === cardId) ?? null;
});

export const studyProgress = derived(flashcardStore, ($store) => ({
	current: $store.currentCardIndex,
	total: $store.studyQueue.length,
	isComplete: $store.currentCardIndex >= $store.studyQueue.length
}));

export const studyStats = derived(flashcardStore, ($store) => ({
	todayStudied: $store.todayStudied,
	studyStreak: $store.studyStreak,
	lastStudyDate: $store.lastStudyDate
}));

// Derived store for overall success rate from recent history
export const flashcardSuccessRate = derived(flashcardStore, ($store) => {
	const history = $store.reviewHistory;
	if (history.length === 0) {
		return { rate: 0, total: 0, correct: 0 };
	}

	const correct = history.filter((r) => r.wasCorrect).length;
	return {
		rate: Math.round((correct / history.length) * 100),
		total: history.length,
		correct
	};
});

// Derived store for daily flashcard stats (last 7 days)
export const weeklyFlashcardStats = derived(flashcardStore, ($store) => {
	const stats: FlashcardDailyStats[] = [];
	const today = new Date();

	for (let i = 6; i >= 0; i--) {
		const d = new Date(today);
		d.setDate(d.getDate() - i);
		const dateStr = d.toISOString().split('T')[0];
		stats.push($store.dailyFlashcardStats[dateStr] || createEmptyFlashcardDailyStats(dateStr));
	}

	return stats;
});
