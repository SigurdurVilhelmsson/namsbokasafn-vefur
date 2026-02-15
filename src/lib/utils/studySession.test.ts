import { describe, it, expect } from 'vitest';
import {
	buildSessionPlan,
	findUnreadSections,
	findWeakObjectives,
	type SessionPlanInput,
	type DueFlashcard,
	type UnreadSection,
	type WeakObjective
} from './studySession';
import type { TableOfContents, SectionType } from '$lib/types/content';
import type { ReadingProgress } from '$lib/stores/reader';
import type { PracticeProblem } from '$lib/stores/quiz';

// Helpers
function makeDueFlashcard(id: string, deckId = 'deck-1'): DueFlashcard {
	return {
		deckId,
		deckName: 'Test Deck',
		cardId: id,
		front: `Question ${id}`,
		back: `Answer ${id}`
	};
}

function makePracticeProblem(id: string, chapter = '01', section = '1-1'): PracticeProblem {
	return {
		id,
		content: `Problem ${id}`,
		answer: `Solution ${id}`,
		chapterSlug: chapter,
		sectionSlug: section,
		isCompleted: false,
		attempts: 1,
		successfulAttempts: 0
	};
}

function makeUnreadSection(
	chapterNum: number,
	sectionNum: string,
	readingTime = 5
): UnreadSection {
	const chapterSlug = String(chapterNum).padStart(2, '0');
	return {
		chapterNumber: chapterNum,
		chapterTitle: `Chapter ${chapterNum}`,
		chapterSlug,
		sectionNumber: sectionNum,
		sectionTitle: `Section ${sectionNum}`,
		sectionFile: `${sectionNum.replace('.', '-')}.html`,
		sectionSlug: sectionNum.replace('.', '-'),
		readingTime
	};
}

function makeWeakObjective(
	index: number,
	chapter = '01',
	section = '1-1',
	confidence?: number
): WeakObjective {
	return {
		key: `${chapter}/${section}/${index}`,
		chapterSlug: chapter,
		sectionSlug: section,
		objectiveIndex: index,
		objectiveText: `Objective ${index}`,
		confidence
	};
}

function makeEmptyInput(): SessionPlanInput {
	return {
		dueFlashcards: [],
		reviewProblems: [],
		unreadSections: [],
		adaptiveProblems: [],
		weakObjectives: []
	};
}

function makeToc(chapters: { number: number; title: string; sections: { number: string; title: string; file: string; type?: string }[] }[]): TableOfContents {
	return {
		title: 'Test Book',
		chapters: chapters.map((c) => ({
			number: c.number,
			title: c.title,
			sections: c.sections.map((s) => ({
				number: s.number,
				title: s.title,
				file: s.file,
				type: s.type as SectionType | undefined
			}))
		}))
	};
}

// ================================================================
// buildSessionPlan
// ================================================================

describe('buildSessionPlan', () => {
	it('returns empty plan when all inputs are empty', () => {
		const plan = buildSessionPlan(makeEmptyInput());

		expect(plan.isEmpty).toBe(true);
		expect(plan.enabledPhaseIds).toEqual([]);
		expect(plan.totalEstimatedMinutes).toBe(0);
		expect(plan.review.enabled).toBe(false);
		expect(plan.reading.enabled).toBe(false);
		expect(plan.practice.enabled).toBe(false);
		expect(plan.reflect.enabled).toBe(false);
	});

	it('enables review phase when there are due flashcards', () => {
		const input = makeEmptyInput();
		input.dueFlashcards = [makeDueFlashcard('1'), makeDueFlashcard('2')];

		const plan = buildSessionPlan(input);

		expect(plan.review.enabled).toBe(true);
		expect(plan.review.dueFlashcards).toHaveLength(2);
		expect(plan.review.itemCount).toBe(2);
		expect(plan.review.estimatedMinutes).toBe(1); // 2 * 0.5
		expect(plan.enabledPhaseIds).toContain('review');
	});

	it('enables review phase when there are review problems', () => {
		const input = makeEmptyInput();
		input.reviewProblems = [makePracticeProblem('p1')];

		const plan = buildSessionPlan(input);

		expect(plan.review.enabled).toBe(true);
		expect(plan.review.reviewProblems).toHaveLength(1);
		expect(plan.review.itemCount).toBe(1);
		expect(plan.review.estimatedMinutes).toBe(1); // 1 * 1
	});

	it('combines flashcards and review problems in review count', () => {
		const input = makeEmptyInput();
		input.dueFlashcards = [makeDueFlashcard('1'), makeDueFlashcard('2')];
		input.reviewProblems = [makePracticeProblem('p1')];

		const plan = buildSessionPlan(input);

		expect(plan.review.itemCount).toBe(3);
		expect(plan.review.estimatedMinutes).toBe(2); // round(2*0.5 + 1*1) = 2
	});

	it('caps flashcards at 10', () => {
		const input = makeEmptyInput();
		input.dueFlashcards = Array.from({ length: 15 }, (_, i) =>
			makeDueFlashcard(`card-${i}`)
		);

		const plan = buildSessionPlan(input);

		expect(plan.review.dueFlashcards).toHaveLength(10);
	});

	it('caps review problems at 5', () => {
		const input = makeEmptyInput();
		input.reviewProblems = Array.from({ length: 8 }, (_, i) =>
			makePracticeProblem(`prob-${i}`)
		);

		const plan = buildSessionPlan(input);

		expect(plan.review.reviewProblems).toHaveLength(5);
	});

	it('enables reading phase with correct time estimate', () => {
		const input = makeEmptyInput();
		input.unreadSections = [makeUnreadSection(1, '1.1', 8), makeUnreadSection(1, '1.2', 12)];

		const plan = buildSessionPlan(input);

		expect(plan.reading.enabled).toBe(true);
		expect(plan.reading.sections).toHaveLength(2);
		expect(plan.reading.estimatedMinutes).toBe(20); // 8 + 12
	});

	it('caps reading sections at 2', () => {
		const input = makeEmptyInput();
		input.unreadSections = [
			makeUnreadSection(1, '1.1'),
			makeUnreadSection(1, '1.2'),
			makeUnreadSection(1, '1.3'),
			makeUnreadSection(2, '2.1')
		];

		const plan = buildSessionPlan(input);

		expect(plan.reading.sections).toHaveLength(2);
	});

	it('enables practice phase', () => {
		const input = makeEmptyInput();
		input.adaptiveProblems = [makePracticeProblem('a1'), makePracticeProblem('a2')];

		const plan = buildSessionPlan(input);

		expect(plan.practice.enabled).toBe(true);
		expect(plan.practice.problems).toHaveLength(2);
		expect(plan.practice.estimatedMinutes).toBe(4); // 2 * 2
	});

	it('caps adaptive problems at 5', () => {
		const input = makeEmptyInput();
		input.adaptiveProblems = Array.from({ length: 10 }, (_, i) =>
			makePracticeProblem(`ap-${i}`)
		);

		const plan = buildSessionPlan(input);

		expect(plan.practice.problems).toHaveLength(5);
	});

	it('enables reflect phase', () => {
		const input = makeEmptyInput();
		input.weakObjectives = [makeWeakObjective(0), makeWeakObjective(1)];

		const plan = buildSessionPlan(input);

		expect(plan.reflect.enabled).toBe(true);
		expect(plan.reflect.objectives).toHaveLength(2);
		expect(plan.reflect.estimatedMinutes).toBe(1); // round(2 * 0.5)
	});

	it('caps objectives at 5', () => {
		const input = makeEmptyInput();
		input.weakObjectives = Array.from({ length: 8 }, (_, i) =>
			makeWeakObjective(i)
		);

		const plan = buildSessionPlan(input);

		expect(plan.reflect.objectives).toHaveLength(5);
	});

	it('computes total estimated minutes across all phases', () => {
		const input: SessionPlanInput = {
			dueFlashcards: [makeDueFlashcard('1'), makeDueFlashcard('2')], // 1 min
			reviewProblems: [makePracticeProblem('p1')], // 1 min
			unreadSections: [makeUnreadSection(1, '1.1', 10)], // 10 min
			adaptiveProblems: [makePracticeProblem('a1')], // 2 min
			weakObjectives: [makeWeakObjective(0), makeWeakObjective(1)] // 1 min
		};

		const plan = buildSessionPlan(input);

		expect(plan.totalEstimatedMinutes).toBe(15); // 2 + 10 + 2 + 1
	});

	it('lists enabled phases in correct order', () => {
		const input: SessionPlanInput = {
			dueFlashcards: [],
			reviewProblems: [],
			unreadSections: [makeUnreadSection(1, '1.1')],
			adaptiveProblems: [makePracticeProblem('a1')],
			weakObjectives: [makeWeakObjective(0)]
		};

		const plan = buildSessionPlan(input);

		// No review phase, but reading, practice, reflect should be in order
		expect(plan.enabledPhaseIds).toEqual(['reading', 'practice', 'reflect']);
	});

	it('defaults reading time to 5 when not set', () => {
		const input = makeEmptyInput();
		input.unreadSections = [makeUnreadSection(1, '1.1', 0)];

		const plan = buildSessionPlan(input);

		// readingTime 0 falls through to default 5 via || 5
		expect(plan.reading.estimatedMinutes).toBe(5);
	});
});

// ================================================================
// findUnreadSections
// ================================================================

describe('findUnreadSections', () => {
	const basicToc = makeToc([
		{
			number: 1,
			title: 'Kafli 1',
			sections: [
				{ number: '1.1', title: 'Inngangur', file: '1-0-introduction.html', type: 'introduction' },
				{ number: '1.1', title: 'Efnafræði', file: '1-1.html' },
				{ number: '1.2', title: 'Frumeindafræði', file: '1-2.html' },
				{ number: '', title: 'Lykilhugtök', file: '1-key-terms.html', type: 'glossary' }
			]
		},
		{
			number: 2,
			title: 'Kafli 2',
			sections: [
				{ number: '2.1', title: 'Atóm', file: '2-1.html' },
				{ number: '2.2', title: 'Sameind', file: '2-2.html' }
			]
		}
	]);

	it('returns unread content sections, skipping non-content types', () => {
		const progress: ReadingProgress = {};

		const unread = findUnreadSections(basicToc, progress, null);

		// Should skip introduction and glossary
		const titles = unread.map((s) => s.sectionTitle);
		expect(titles).toContain('Efnafræði');
		expect(titles).toContain('Frumeindafræði');
		expect(titles).toContain('Atóm');
		expect(titles).toContain('Sameind');
		expect(titles).not.toContain('Inngangur');
		expect(titles).not.toContain('Lykilhugtök');
	});

	it('excludes already-read sections', () => {
		const progress: ReadingProgress = {
			'01/1-1': { read: true, lastVisited: '2025-01-01' }
		};

		const unread = findUnreadSections(basicToc, progress, null);

		const slugs = unread.map((s) => s.sectionSlug);
		expect(slugs).not.toContain('1-1');
		expect(slugs).toContain('1-2');
	});

	it('filters by chapter when chapterFilter is set', () => {
		const progress: ReadingProgress = {};

		const unread = findUnreadSections(basicToc, progress, null, 2);

		expect(unread.every((s) => s.chapterNumber === 2)).toBe(true);
		expect(unread).toHaveLength(2);
	});

	it('prioritizes current chapter', () => {
		const progress: ReadingProgress = {};

		const unread = findUnreadSections(basicToc, progress, '02');

		// Chapter 2 sections should come first
		expect(unread[0].chapterNumber).toBe(2);
	});

	it('returns empty array when all sections are read', () => {
		const progress: ReadingProgress = {
			'01/1-1': { read: true, lastVisited: '2025-01-01' },
			'01/1-2': { read: true, lastVisited: '2025-01-01' },
			'02/2-1': { read: true, lastVisited: '2025-01-01' },
			'02/2-2': { read: true, lastVisited: '2025-01-01' }
		};

		const unread = findUnreadSections(basicToc, progress, null);

		expect(unread).toHaveLength(0);
	});

	it('includes correct chapter/section slugs', () => {
		const progress: ReadingProgress = {};

		const unread = findUnreadSections(basicToc, progress, null);

		const first = unread[0];
		expect(first.chapterSlug).toBe('01');
		expect(first.sectionSlug).toBe('1-1');
	});

	it('defaults reading time to 5 when metadata is missing', () => {
		const progress: ReadingProgress = {};

		const unread = findUnreadSections(basicToc, progress, null);

		expect(unread[0].readingTime).toBe(5);
	});
});

// ================================================================
// findWeakObjectives
// ================================================================

describe('findWeakObjectives', () => {
	it('returns objectives with no confidence rating', () => {
		const objectives = {
			'01/1-1/0': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 0,
				objectiveText: 'Understand atoms',
				isCompleted: true
			}
		};

		const weak = findWeakObjectives(objectives);

		expect(weak).toHaveLength(1);
		expect(weak[0].confidence).toBeUndefined();
	});

	it('returns objectives with confidence <= 2', () => {
		const objectives = {
			'01/1-1/0': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 0,
				objectiveText: 'Understand atoms',
				isCompleted: true,
				confidence: 1
			},
			'01/1-1/1': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 1,
				objectiveText: 'Understand molecules',
				isCompleted: true,
				confidence: 2
			}
		};

		const weak = findWeakObjectives(objectives);

		expect(weak).toHaveLength(2);
	});

	it('excludes objectives with confidence > 2', () => {
		const objectives = {
			'01/1-1/0': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 0,
				objectiveText: 'Understand atoms',
				isCompleted: true,
				confidence: 3
			},
			'01/1-1/1': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 1,
				objectiveText: 'Understand molecules',
				isCompleted: true,
				confidence: 5
			}
		};

		const weak = findWeakObjectives(objectives);

		expect(weak).toHaveLength(0);
	});

	it('filters by chapter when chapterFilter is set', () => {
		const objectives = {
			'01/1-1/0': {
				chapterSlug: '01',
				sectionSlug: '1-1',
				objectiveIndex: 0,
				objectiveText: 'Ch1 objective',
				isCompleted: true,
				confidence: 1
			},
			'02/2-1/0': {
				chapterSlug: '02',
				sectionSlug: '2-1',
				objectiveIndex: 0,
				objectiveText: 'Ch2 objective',
				isCompleted: true,
				confidence: 1
			}
		};

		const weak = findWeakObjectives(objectives, '01');

		expect(weak).toHaveLength(1);
		expect(weak[0].objectiveText).toBe('Ch1 objective');
	});

	it('returns empty array when no weak objectives exist', () => {
		const weak = findWeakObjectives({});

		expect(weak).toHaveLength(0);
	});
});
