/**
 * The rating tables (plan step S4.4, D04, PED-08). The quality a rating schedules with
 * (DIFFICULTY_TO_QUALITY here) and the one the buttons preview with (srs.ts's private
 * RATING_TO_QUALITY) must stay equal, or a button promises one interval and the store sets
 * another. srs.ts stays untouched under D04, so the tables are pinned by behaviour: each
 * rating's preview must equal what processReview schedules for it.
 */
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_TO_QUALITY, RATINGS, RATING_LABELS, type DifficultyRating, type FlashcardStudyRecord } from './flashcard';
import { previewRatingIntervals, processReview } from '$lib/utils/srs';

/** A copy of srs.ts's private formatIntervalShort, which the previews use */
function formatIntervalShort(days: number): string {
	if (days === 1) return '1 d';
	if (days < 7) return `${days} d`;
	if (days < 30) return `${Math.round(days / 7)} v`;
	if (days < 365) return `${Math.round(days / 30)} m`;
	return '1+ ár';
}

function record(interval: number, consecutiveCorrect: number, ease = 2.5): FlashcardStudyRecord {
	return {
		cardId: 'c',
		lastReviewed: '2026-11-01T00:00:00.000Z',
		nextReview: '2026-11-01T00:00:00.000Z',
		ease,
		interval,
		reviewCount: consecutiveCorrect + 1,
		consecutiveCorrect
	};
}

const STATES: [string, FlashcardStudyRecord | undefined][] = [
	['a new card', undefined],
	['after one pass (1 d)', record(1, 1)],
	['after two passes (6 d)', record(6, 2)],
	['after three passes (15 d)', record(15, 3)],
	['a hard-won card (ease 1.7, 6 d)', record(6, 2, 1.7)]
];

describe('the rating tables', () => {
	it.each(STATES)('%s: every preview equals what the store schedules', (_name, existing) => {
		const preview = previewRatingIntervals(existing);
		for (const rating of Object.keys(DIFFICULTY_TO_QUALITY) as DifficultyRating[]) {
			const scheduled = processReview('c', DIFFICULTY_TO_QUALITY[rating], existing).interval;
			expect([rating, preview[rating]]).toEqual([rating, formatIntervalShort(scheduled)]);
		}
	});

	it('labels the ratings by correctness, as D04 ruled', () => {
		expect(RATINGS.map((r) => r.label)).toEqual(['Rangt', 'Að hluta', 'Rétt', 'Auðvelt']);
	});

	it('keeps the labels and the order in one table', () => {
		expect(RATING_LABELS).toEqual({ again: 'Rangt', hard: 'Að hluta', good: 'Rétt', easy: 'Auðvelt' });
	});
});
