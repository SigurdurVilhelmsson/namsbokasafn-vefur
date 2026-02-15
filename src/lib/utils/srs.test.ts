/**
 * Tests for SM-2 Spaced Repetition Algorithm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlashcardStudyRecord, StudyQuality } from '$lib/types/flashcard';
import {
	calculateNewEaseFactor,
	calculateNextInterval,
	processReview,
	isCardDue,
	sortCardsByPriority,
	getDueCards,
	getNewCards,
	calculateDeckStats,
	previewRatingIntervals
} from './srs';

// Helper to create a study record with sensible defaults
function makeRecord(overrides: Partial<FlashcardStudyRecord> = {}): FlashcardStudyRecord {
	return {
		cardId: 'card-1',
		lastReviewed: new Date().toISOString(),
		nextReview: new Date().toISOString(),
		ease: 2.5,
		interval: 1,
		reviewCount: 1,
		consecutiveCorrect: 1,
		...overrides
	};
}

describe('srs utilities', () => {
	describe('calculateNewEaseFactor', () => {
		it('should increase ease for perfect quality (5)', () => {
			const newEase = calculateNewEaseFactor(2.5, 5);
			expect(newEase).toBeGreaterThan(2.5);
		});

		it('should keep ease roughly the same for good quality (4)', () => {
			const newEase = calculateNewEaseFactor(2.5, 4);
			// quality 4: delta=1, adjustment = 0.1 - 1*(0.08 + 1*0.02) = 0.0
			expect(newEase).toBe(2.5);
		});

		it('should decrease ease for quality 3', () => {
			const newEase = calculateNewEaseFactor(2.5, 3);
			expect(newEase).toBeLessThan(2.5);
		});

		it('should decrease ease significantly for quality 0', () => {
			const newEase = calculateNewEaseFactor(2.5, 0);
			expect(newEase).toBeLessThan(2.0);
		});

		it('should never go below minimum ease factor of 1.3', () => {
			// Even with worst quality and already low ease
			const newEase = calculateNewEaseFactor(1.3, 0 as StudyQuality);
			expect(newEase).toBe(1.3);
		});

		it('should recover ease from minimum over repeated good reviews', () => {
			let ease = 1.3;
			for (let i = 0; i < 10; i++) {
				ease = calculateNewEaseFactor(ease, 5);
			}
			expect(ease).toBeGreaterThan(1.3);
		});
	});

	describe('calculateNextInterval', () => {
		it('should return 1 day for failed recall (quality < 3)', () => {
			expect(calculateNextInterval(5, 30, 2.5, 2)).toBe(1);
			expect(calculateNextInterval(5, 30, 2.5, 0)).toBe(1);
		});

		it('should return 1 day for first correct review', () => {
			expect(calculateNextInterval(0, 0, 2.5, 4)).toBe(1);
		});

		it('should return 6 days for second correct review', () => {
			expect(calculateNextInterval(1, 1, 2.5, 4)).toBe(6);
		});

		it('should multiply by ease factor for subsequent reviews', () => {
			const result = calculateNextInterval(2, 6, 2.5, 4);
			expect(result).toBe(Math.round(6 * 2.5)); // 15
		});

		it('should cap at 365 days', () => {
			const result = calculateNextInterval(10, 300, 2.5, 5);
			expect(result).toBeLessThanOrEqual(365);
		});
	});

	describe('processReview', () => {
		it('should create a new record for first review', () => {
			const record = processReview('card-1', 4);
			expect(record.cardId).toBe('card-1');
			expect(record.reviewCount).toBe(1);
			expect(record.consecutiveCorrect).toBe(1);
			expect(record.interval).toBe(1); // first correct → 1 day
			expect(record.lastReviewed).toBeDefined();
			expect(record.nextReview).toBeDefined();
		});

		it('should reset consecutive on failed recall', () => {
			const existing = makeRecord({ consecutiveCorrect: 5, interval: 30 });
			const record = processReview('card-1', 0, existing);
			expect(record.consecutiveCorrect).toBe(0);
			expect(record.interval).toBe(1);
		});

		it('should increment review count', () => {
			const existing = makeRecord({ reviewCount: 3 });
			const record = processReview('card-1', 4, existing);
			expect(record.reviewCount).toBe(4);
		});

		it('should increment consecutiveCorrect on good quality', () => {
			const existing = makeRecord({ consecutiveCorrect: 2 });
			const record = processReview('card-1', 4, existing);
			expect(record.consecutiveCorrect).toBe(3);
		});

		it('should set nextReview in the future', () => {
			const record = processReview('card-1', 4);
			const nextReview = new Date(record.nextReview);
			const now = new Date();
			expect(nextReview.getTime()).toBeGreaterThan(now.getTime() - 1000);
		});
	});

	describe('isCardDue', () => {
		it('should return true for new cards (no record)', () => {
			expect(isCardDue(undefined)).toBe(true);
		});

		it('should return true for cards with past nextReview', () => {
			const record = makeRecord({
				nextReview: new Date(Date.now() - 86400000).toISOString() // yesterday
			});
			expect(isCardDue(record)).toBe(true);
		});

		it('should return false for cards with future nextReview', () => {
			const record = makeRecord({
				nextReview: new Date(Date.now() + 86400000 * 2).toISOString() // day after tomorrow
			});
			expect(isCardDue(record)).toBe(false);
		});

		it('should return true for cards due today', () => {
			// Cards due today (start of today) should be due
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const record = makeRecord({ nextReview: today.toISOString() });
			expect(isCardDue(record)).toBe(true);
		});
	});

	describe('sortCardsByPriority', () => {
		it('should sort due cards before non-due cards', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-a': makeRecord({
					cardId: 'card-a',
					nextReview: new Date(Date.now() + 86400000 * 10).toISOString()
				}),
				'card-b': makeRecord({
					cardId: 'card-b',
					nextReview: new Date(Date.now() - 86400000).toISOString()
				})
			};
			const sorted = sortCardsByPriority(['card-a', 'card-b'], records);
			expect(sorted[0]).toBe('card-b'); // due card first
		});

		it('should place new cards after due cards', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-due': makeRecord({
					cardId: 'card-due',
					nextReview: new Date(Date.now() - 86400000).toISOString()
				})
			};
			const sorted = sortCardsByPriority(['card-new', 'card-due'], records);
			expect(sorted[0]).toBe('card-due');
			expect(sorted[1]).toBe('card-new');
		});

		it('should sort by nextReview date among same-priority cards', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-a': makeRecord({
					cardId: 'card-a',
					nextReview: new Date(Date.now() - 86400000 * 3).toISOString()
				}),
				'card-b': makeRecord({
					cardId: 'card-b',
					nextReview: new Date(Date.now() - 86400000 * 1).toISOString()
				})
			};
			const sorted = sortCardsByPriority(['card-b', 'card-a'], records);
			expect(sorted[0]).toBe('card-a'); // older due card first
		});
	});

	describe('getDueCards', () => {
		it('should return only due cards', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-a': makeRecord({
					cardId: 'card-a',
					nextReview: new Date(Date.now() - 86400000).toISOString()
				}),
				'card-b': makeRecord({
					cardId: 'card-b',
					nextReview: new Date(Date.now() + 86400000 * 10).toISOString()
				})
			};
			const due = getDueCards(['card-a', 'card-b'], records);
			expect(due).toContain('card-a');
			expect(due).not.toContain('card-b');
		});

		it('should include new cards (no record)', () => {
			const due = getDueCards(['card-new'], {});
			expect(due).toContain('card-new');
		});
	});

	describe('getNewCards', () => {
		it('should return cards with no study record', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-studied': makeRecord({ cardId: 'card-studied' })
			};
			const newCards = getNewCards(['card-new', 'card-studied'], records);
			expect(newCards).toEqual(['card-new']);
		});

		it('should return empty array when all cards have records', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				'card-a': makeRecord({ cardId: 'card-a' })
			};
			expect(getNewCards(['card-a'], records)).toEqual([]);
		});
	});

	describe('calculateDeckStats', () => {
		it('should count new cards', () => {
			const stats = calculateDeckStats(['a', 'b', 'c'], {});
			expect(stats.total).toBe(3);
			expect(stats.new).toBe(3);
			expect(stats.due).toBe(0);
		});

		it('should count learning cards (interval < 7)', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				a: makeRecord({
					cardId: 'a',
					interval: 3,
					nextReview: new Date(Date.now() - 86400000).toISOString()
				})
			};
			const stats = calculateDeckStats(['a'], records);
			expect(stats.learning).toBe(1);
			expect(stats.due).toBe(1);
		});

		it('should count review cards (interval >= 7)', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				a: makeRecord({
					cardId: 'a',
					interval: 15,
					nextReview: new Date(Date.now() + 86400000 * 10).toISOString()
				})
			};
			const stats = calculateDeckStats(['a'], records);
			expect(stats.review).toBe(1);
			expect(stats.due).toBe(0);
		});

		it('should handle mixed deck correctly', () => {
			const records: Record<string, FlashcardStudyRecord> = {
				learning: makeRecord({
					cardId: 'learning',
					interval: 1,
					nextReview: new Date(Date.now() - 86400000).toISOString()
				}),
				review: makeRecord({
					cardId: 'review',
					interval: 30,
					nextReview: new Date(Date.now() + 86400000 * 20).toISOString()
				})
			};
			const stats = calculateDeckStats(['new-card', 'learning', 'review'], records);
			expect(stats.total).toBe(3);
			expect(stats.new).toBe(1);
			expect(stats.learning).toBe(1);
			expect(stats.review).toBe(1);
			expect(stats.due).toBe(1);
		});
	});

	describe('previewRatingIntervals', () => {
		it('should return interval strings for all ratings', () => {
			const preview = previewRatingIntervals();
			expect(preview.again).toBeDefined();
			expect(preview.hard).toBeDefined();
			expect(preview.good).toBeDefined();
			expect(preview.easy).toBeDefined();
		});

		it('should show "1 d" for again on a new card', () => {
			const preview = previewRatingIntervals();
			expect(preview.again).toBe('1 d');
		});

		it('should show longer intervals for cards with history', () => {
			const record = makeRecord({
				consecutiveCorrect: 5,
				interval: 30,
				ease: 2.5
			});
			const preview = previewRatingIntervals(record);
			// "again" resets to 1 day
			expect(preview.again).toBe('1 d');
			// "good" should be several weeks/months out
			expect(preview.good).not.toBe('1 d');
		});

		it('should format weeks correctly', () => {
			const record = makeRecord({
				consecutiveCorrect: 2,
				interval: 6,
				ease: 2.5
			});
			const preview = previewRatingIntervals(record);
			// good: interval = round(6 * 2.5) = 15 days → "2 v" (2 weeks)
			expect(preview.good).toBe('2 v');
		});
	});
});
