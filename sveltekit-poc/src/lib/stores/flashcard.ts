/**
 * Flashcard Store - Full SvelteKit implementation with SM-2 SRS
 * Ported from React/Zustand flashcardStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
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
import { getTodayDateString, getYesterdayDateString } from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:flashcards';

type StudyMode = 'all' | 'due' | 'new';

interface DeckStats {
	total: number;
	new: number;
	due: number;
	learning: number;
	review: number;
}

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
	lastStudyDate: null
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
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
				showAnswer: false
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
