/**
 * What a predict-first answer says about the learner's judgement (plan step S4.3, register
 * CODE-23): one rule, used by every place that compares a prediction with its outcome, so
 * the calibration view (P1.1) never re-derives it from the stored `wasCorrect`.
 */
import type { DifficultyRating } from '$lib/types/flashcard';

/**
 * Whether 'Erfitt' ('hard') counts as remembered. Decision D04 ruled the relabel by
 * correctness: 'Erfitt' becomes 'Að hluta' (partly), and srs.ts keeps scheduling it as a
 * lapse, so it is not a pass. Change it only with a new decision: it moves every 'hard'
 * review from one class to the other.
 */
export const HARD_COUNTS_AS_REMEMBERED = false;

/**
 * - knewIt: said 'Man það' and remembered it
 * - overconfident: said 'Man það' and did not
 * - underconfident: said 'Man það ekki' and remembered it after all
 * - knewGap: said 'Man það ekki' and was right not to
 */
export type PredictionClass = 'knewIt' | 'overconfident' | 'underconfident' | 'knewGap';

/** A flashcard review (a rating) or a binary outcome (inline practice: right or not) */
export type PredictionOutcome =
	| { predictedKnown: boolean; rating: DifficultyRating }
	| { predictedKnown: boolean; success: boolean };

/** Whether a rating counts as remembered under the rule above */
export function ratingRemembered(
	rating: DifficultyRating,
	hardCountsAsRemembered: boolean = HARD_COUNTS_AS_REMEMBERED
): boolean {
	if (rating === 'hard') return hardCountsAsRemembered;
	return rating === 'good' || rating === 'easy';
}

/**
 * Classify a prediction against its outcome. The second argument exists so a test can show
 * that changing the rule changes the 'hard' cases; callers leave it out.
 */
export function classifyPrediction(
	outcome: PredictionOutcome,
	hardCountsAsRemembered: boolean = HARD_COUNTS_AS_REMEMBERED
): PredictionClass {
	const remembered =
		'success' in outcome ? outcome.success : ratingRemembered(outcome.rating, hardCountsAsRemembered);
	if (outcome.predictedKnown) return remembered ? 'knewIt' : 'overconfident';
	return remembered ? 'underconfident' : 'knewGap';
}
