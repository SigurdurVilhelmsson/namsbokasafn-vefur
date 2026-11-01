/**
 * classifyPrediction (plan step S4.3, CODE-23): the 8 cases of a prediction against a rating,
 * with 'Erfitt' as decision D04 rules, the rule as one constant, and the binary outcome.
 */
import { describe, expect, it } from 'vitest';
import { HARD_COUNTS_AS_REMEMBERED, classifyPrediction } from './prediction';
import type { DifficultyRating } from '$lib/types/flashcard';

const CASES: [boolean, DifficultyRating, string][] = [
	[true, 'again', 'overconfident'],
	[true, 'hard', 'overconfident'],
	[true, 'good', 'knewIt'],
	[true, 'easy', 'knewIt'],
	[false, 'again', 'knewGap'],
	[false, 'hard', 'knewGap'],
	[false, 'good', 'underconfident'],
	[false, 'easy', 'underconfident']
];

describe('classifyPrediction', () => {
	it.each(CASES)('predictedKnown %s, rating %s: %s', (predictedKnown, rating, expected) => {
		expect(classifyPrediction({ predictedKnown, rating })).toBe(expected);
	});

	it("follows D04: 'Erfitt' does not count as remembered", () => {
		expect(HARD_COUNTS_AS_REMEMBERED).toBe(false);
	});

	it("flipping the rule flips both 'hard' cases, and only those", () => {
		const flipped = CASES.map(([predictedKnown, rating]) => classifyPrediction({ predictedKnown, rating }, true));
		expect(flipped).toEqual([
			'overconfident',
			'knewIt',
			'knewIt',
			'knewIt',
			'knewGap',
			'underconfident',
			'underconfident',
			'underconfident'
		]);
	});

	it.each([
		[true, true, 'knewIt'],
		[true, false, 'overconfident'],
		[false, true, 'underconfident'],
		[false, false, 'knewGap']
	] as const)('a binary outcome (predictedKnown %s, success %s) classifies as %s', (predictedKnown, success, expected) => {
		expect(classifyPrediction({ predictedKnown, success })).toBe(expected);
	});
});
