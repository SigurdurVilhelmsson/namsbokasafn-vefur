/**
 * Tests for flashcard store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import type { FlashcardDeck, Flashcard } from '$lib/types/flashcard';

// Need to reset module between tests to get fresh store instances
let flashcardStore: typeof import('./flashcard').flashcardStore;
let currentDeck: typeof import('./flashcard').currentDeck;
let currentCard: typeof import('./flashcard').currentCard;
let studyProgress: typeof import('./flashcard').studyProgress;
let studyStats: typeof import('./flashcard').studyStats;

// Helper to create test decks and cards
function createTestCard(id: string, front: string = 'Front', back: string = 'Back'): Flashcard {
	return {
		id,
		front,
		back,
		created: new Date().toISOString()
	};
}

function createTestDeck(id: string, name: string, cards: Flashcard[] = []): FlashcardDeck {
	return {
		id,
		name,
		cards,
		created: new Date().toISOString()
	};
}

describe('flashcard store', () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.resetModules();
		const module = await import('./flashcard');
		flashcardStore = module.flashcardStore;
		currentDeck = module.currentDeck;
		currentCard = module.currentCard;
		studyProgress = module.studyProgress;
		studyStats = module.studyStats;
	});

	describe('default values', () => {
		it('should have empty decks initially', () => {
			const state = get(flashcardStore);
			expect(state.decks).toEqual([]);
		});

		it('should have no current deck', () => {
			expect(get(currentDeck)).toBeNull();
		});

		it('should have no current card', () => {
			expect(get(currentCard)).toBeNull();
		});

		it('should have zero study stats', () => {
			const stats = get(studyStats);
			expect(stats.todayStudied).toBe(0);
			expect(stats.studyStreak).toBe(0);
			expect(stats.lastStudyDate).toBeNull();
		});
	});

	describe('deck management', () => {
		it('should add a deck', () => {
			const deck = createTestDeck('deck-1', 'Test Deck');
			flashcardStore.addDeck(deck);

			const state = get(flashcardStore);
			expect(state.decks).toHaveLength(1);
			expect(state.decks[0].name).toBe('Test Deck');
		});

		it('should remove a deck', () => {
			const deck = createTestDeck('deck-1', 'Test Deck');
			flashcardStore.addDeck(deck);
			flashcardStore.removeDeck('deck-1');

			const state = get(flashcardStore);
			expect(state.decks).toHaveLength(0);
		});

		it('should get deck by id', () => {
			const deck = createTestDeck('deck-1', 'Test Deck');
			flashcardStore.addDeck(deck);

			const retrieved = flashcardStore.getDeck('deck-1');
			expect(retrieved).toBeDefined();
			expect(retrieved?.name).toBe('Test Deck');
		});

		it('should return undefined for non-existent deck', () => {
			expect(flashcardStore.getDeck('non-existent')).toBeUndefined();
		});

		it('should clear currentDeckId when removing current deck', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');
			flashcardStore.removeDeck('deck-1');

			const state = get(flashcardStore);
			expect(state.currentDeckId).toBeNull();
		});
	});

	describe('card management', () => {
		it('should add card to deck', () => {
			const deck = createTestDeck('deck-1', 'Test Deck');
			flashcardStore.addDeck(deck);

			const card = createTestCard('card-1', 'What is H2O?', 'Water');
			flashcardStore.addCardToDeck('deck-1', card);

			const retrieved = flashcardStore.getDeck('deck-1');
			expect(retrieved?.cards).toHaveLength(1);
			expect(retrieved?.cards[0].front).toBe('What is H2O?');
		});

		it('should remove card from deck', () => {
			const card = createTestCard('card-1');
			const deck = createTestDeck('deck-1', 'Test Deck', [card]);
			flashcardStore.addDeck(deck);
			flashcardStore.removeCardFromDeck('deck-1', 'card-1');

			const retrieved = flashcardStore.getDeck('deck-1');
			expect(retrieved?.cards).toHaveLength(0);
		});
	});

	describe('study session', () => {
		it('should start study session', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			const state = get(flashcardStore);
			expect(state.currentDeckId).toBe('deck-1');
			expect(state.currentCardIndex).toBe(0);
			expect(state.showAnswer).toBe(false);
			expect(state.studyQueue.length).toBeGreaterThan(0);
		});

		it('should get current deck after starting session', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			const current = get(currentDeck);
			expect(current).not.toBeNull();
			expect(current?.name).toBe('Test Deck');
		});

		it('should get current card after starting session', () => {
			const cards = [createTestCard('card-1', 'Front 1')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			const card = get(currentCard);
			expect(card).not.toBeNull();
			expect(card?.front).toBe('Front 1');
		});

		it('should toggle answer', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			expect(get(flashcardStore).showAnswer).toBe(false);
			flashcardStore.toggleAnswer();
			expect(get(flashcardStore).showAnswer).toBe(true);
			flashcardStore.toggleAnswer();
			expect(get(flashcardStore).showAnswer).toBe(false);
		});

		it('should navigate to next card', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			expect(get(flashcardStore).currentCardIndex).toBe(0);
			flashcardStore.nextCard();
			expect(get(flashcardStore).currentCardIndex).toBe(1);
		});

		it('should not go past last card', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			// Start at 0, advance to 1, then 1 should stay at 1 (can't go to index 2 with only 2 cards)
			flashcardStore.nextCard();
			expect(get(flashcardStore).currentCardIndex).toBe(1);
			flashcardStore.nextCard();
			expect(get(flashcardStore).currentCardIndex).toBe(1); // should stay at 1
		});

		it('should navigate to previous card', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			flashcardStore.nextCard();
			expect(get(flashcardStore).currentCardIndex).toBe(1);
			flashcardStore.previousCard();
			expect(get(flashcardStore).currentCardIndex).toBe(0);
		});

		it('should not go before first card', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			flashcardStore.previousCard();
			expect(get(flashcardStore).currentCardIndex).toBe(0);
		});

		it('should track study progress', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2'), createTestCard('card-3')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			const progress = get(studyProgress);
			expect(progress.current).toBe(0);
			expect(progress.total).toBe(3);
			expect(progress.isComplete).toBe(false);
		});
	});

	describe('SRS rating', () => {
		it('should rate card and create study record', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			flashcardStore.rateCard('card-1', 'good');

			const record = flashcardStore.getCardRecord('card-1');
			expect(record).toBeDefined();
			expect(record?.cardId).toBe('card-1');
			expect(record?.reviewCount).toBe(1);
		});

		it('should update study stats when rating', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			flashcardStore.rateCard('card-1', 'good');

			const stats = get(studyStats);
			expect(stats.todayStudied).toBe(1);
			expect(stats.lastStudyDate).not.toBeNull();
		});

		it('should advance to next card after rating', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			expect(get(flashcardStore).currentCardIndex).toBe(0);
			flashcardStore.rateCard('card-1', 'good');
			expect(get(flashcardStore).currentCardIndex).toBe(1);
		});

		it('should get deck stats', () => {
			const cards = [createTestCard('card-1'), createTestCard('card-2')];
			const deck = createTestDeck('deck-1', 'Test Deck', cards);
			flashcardStore.addDeck(deck);

			const stats = flashcardStore.getDeckStats('deck-1');
			expect(stats.total).toBe(2);
			expect(stats.new).toBe(2);
		});

		it('should return empty stats for non-existent deck', () => {
			const stats = flashcardStore.getDeckStats('non-existent');
			expect(stats.total).toBe(0);
		});
	});

	describe('session management', () => {
		it('should reset session', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');

			flashcardStore.resetSession();

			const state = get(flashcardStore);
			expect(state.currentDeckId).toBeNull();
			expect(state.currentCardIndex).toBe(0);
			expect(state.studyQueue).toEqual([]);
		});
	});

	describe('persistence', () => {
		it('should persist to localStorage', () => {
			const deck = createTestDeck('deck-1', 'Test Deck');
			flashcardStore.addDeck(deck);

			expect(localStorage.setItem).toHaveBeenCalled();

			const stored = localStorage.getItem('namsbokasafn:flashcards');
			expect(stored).not.toBeNull();

			const parsed = JSON.parse(stored!);
			expect(parsed.decks).toHaveLength(1);
		});

		it('should load from localStorage', async () => {
			localStorage.setItem(
				'namsbokasafn:flashcards',
				JSON.stringify({
					decks: [
						{
							id: 'deck-1',
							name: 'Saved Deck',
							cards: [],
							created: '2025-01-01'
						}
					],
					studyRecords: {},
					currentDeckId: null,
					currentCardIndex: 0,
					showAnswer: false,
					studyQueue: [],
					todayStudied: 5,
					studyStreak: 3,
					lastStudyDate: '2025-01-01'
				})
			);

			vi.resetModules();
			const module = await import('./flashcard');

			const state = get(module.flashcardStore);
			expect(state.decks).toHaveLength(1);
			expect(state.decks[0].name).toBe('Saved Deck');
			expect(state.todayStudied).toBe(5);
			expect(state.studyStreak).toBe(3);
		});
	});

	describe('reset', () => {
		it('should reset all state', () => {
			const deck = createTestDeck('deck-1', 'Test Deck', [createTestCard('card-1')]);
			flashcardStore.addDeck(deck);
			flashcardStore.startStudySession('deck-1');
			flashcardStore.rateCard('card-1', 'good');

			flashcardStore.reset();

			const state = get(flashcardStore);
			expect(state.decks).toEqual([]);
			expect(state.studyRecords).toEqual({});
			expect(state.currentDeckId).toBeNull();
			expect(state.todayStudied).toBe(0);
		});
	});
});
