import { describe, it, expect } from 'vitest';
import { answerLinks } from './answerLinks';

/** An .eoc-exercise element; omit `hasAnswer` to simulate a pre-re-render page. */
function makeExercise(opts: { id: string; number: string; hasAnswer?: 'true' | 'false' }) {
	const div = document.createElement('div');
	div.className = 'eoc-exercise';
	div.dataset.exerciseId = opts.id;
	div.dataset.exerciseNumber = opts.number;
	if (opts.hasAnswer !== undefined) div.dataset.hasAnswer = opts.hasAnswer;
	return div;
}

function runOnExercisesPage(exercises: HTMLElement[]) {
	const node = document.createElement('div');
	exercises.forEach((e) => node.appendChild(e));
	answerLinks(node, {
		bookSlug: 'efnafraedi-2e',
		chapterSlug: '15',
		sectionSlug: '15-exercises',
		sectionType: 'exercises',
		chapterNumber: 15
	});
	return node;
}

const hasSeeAnswerLink = (ex: HTMLElement) => !!ex.querySelector('a.exercise-number-link');

describe('answerLinks — data-has-answer is the ground truth', () => {
	it('links an EVEN-numbered exercise that has an answer (old parity heuristic would wrongly skip it)', () => {
		const ex = makeExercise({ id: 'fs-idm55438304', number: '15.62', hasAnswer: 'true' });
		runOnExercisesPage([ex]);
		expect(hasSeeAnswerLink(ex)).toBe(true);
	});

	it('does NOT link an ODD-numbered exercise with no answer (old parity heuristic would emit a dead link)', () => {
		const ex = makeExercise({ id: 'fs-idm212489824', number: '15.61', hasAnswer: 'false' });
		runOnExercisesPage([ex]);
		expect(hasSeeAnswerLink(ex)).toBe(false);
	});
});

describe('answerLinks — legacy parity fallback when data-has-answer is absent (un-re-rendered pages)', () => {
	it('links odd, skips even', () => {
		const odd = makeExercise({ id: 'fs-id-odd', number: '15.1' });
		const even = makeExercise({ id: 'fs-id-even', number: '15.2' });
		runOnExercisesPage([odd, even]);
		expect(hasSeeAnswerLink(odd)).toBe(true);
		expect(hasSeeAnswerLink(even)).toBe(false);
	});
});
