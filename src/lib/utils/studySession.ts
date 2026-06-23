/**
 * Study Session Planner - Pure functions for building structured study sessions.
 * Takes store state as input, returns a plan. Testable without store mocking.
 */

import type { TableOfContents, SectionType } from '$lib/types/content';
import type { ReadingProgress } from '$lib/stores/reader';
import type { PracticeProblem } from '$lib/stores/quiz';
import { getChapterPath, getSectionPath } from '$lib/utils/contentLoader';
import { createSectionKey } from '$lib/utils/storeHelpers';
import type { IconName } from '$lib/components/icons';

// Phase identifiers
export type PhaseId = 'review' | 'reading' | 'practice' | 'reflect';

// Phase labels (Icelandic UI)
export const PHASE_LABELS: Record<PhaseId, string> = {
	review: 'Endurtekningar',
	reading: 'Lestur',
	practice: 'Æfingar',
	reflect: 'Sjálfsmat'
};

// Phase icons (canonical Lucide names — rendered via <Icon>)
export const PHASE_ICONS: Record<PhaseId, IconName> = {
	review: 'refresh-cw',
	reading: 'book-open',
	practice: 'lightbulb',
	reflect: 'circle-check'
};

// Due flashcard info (pre-computed from store)
export interface DueFlashcard {
	deckId: string;
	deckName: string;
	cardId: string;
	front: string;
	back: string;
}

// Unread section info
export interface UnreadSection {
	chapterNumber: number;
	chapterTitle: string;
	chapterSlug: string;
	sectionNumber: string;
	sectionTitle: string;
	sectionFile: string;
	sectionSlug: string;
	readingTime: number;
}

// Objective needing review
export interface WeakObjective {
	key: string;
	chapterSlug: string;
	sectionSlug: string;
	objectiveIndex: number;
	objectiveText: string;
	confidence?: number;
}

// Input to the session planner (pre-computed from stores)
export interface SessionPlanInput {
	dueFlashcards: DueFlashcard[];
	reviewProblems: PracticeProblem[];
	unreadSections: UnreadSection[];
	adaptiveProblems: PracticeProblem[];
	weakObjectives: WeakObjective[];
}

// Phase base fields
interface PhaseBase {
	enabled: boolean;
	itemCount: number;
	estimatedMinutes: number;
}

export interface ReviewPhase extends PhaseBase {
	dueFlashcards: DueFlashcard[];
	reviewProblems: PracticeProblem[];
}

export interface ReadingPhase extends PhaseBase {
	sections: UnreadSection[];
}

export interface PracticePhase extends PhaseBase {
	problems: PracticeProblem[];
}

export interface ReflectPhase extends PhaseBase {
	objectives: WeakObjective[];
}

// Complete session plan
export interface SessionPlan {
	review: ReviewPhase;
	reading: ReadingPhase;
	practice: PracticePhase;
	reflect: ReflectPhase;
	enabledPhaseIds: PhaseId[];
	totalEstimatedMinutes: number;
	isEmpty: boolean;
}

// Caps
const MAX_FLASHCARDS = 10;
const MAX_REVIEW_PROBLEMS = 5;
const MAX_READING_SECTIONS = 2;
const MAX_ADAPTIVE_PROBLEMS = 5;
const MAX_OBJECTIVES = 5;

// Time estimates per item (minutes)
const FLASHCARD_MINUTES = 0.5;
const REVIEW_PROBLEM_MINUTES = 1;
const ADAPTIVE_PROBLEM_MINUTES = 2;
const OBJECTIVE_MINUTES = 0.5;

// Section types to skip when finding unread content
const SKIP_SECTION_TYPES: SectionType[] = [
	'introduction',
	'glossary',
	'equations',
	'summary',
	'exercises',
	'answer-key'
];

/**
 * Build a session plan from pre-computed diagnostics.
 * Pure function — no store access.
 */
export function buildSessionPlan(input: SessionPlanInput): SessionPlan {
	// Phase 1: Review
	const dueFlashcards = input.dueFlashcards.slice(0, MAX_FLASHCARDS);
	const reviewProblems = input.reviewProblems.slice(0, MAX_REVIEW_PROBLEMS);
	const reviewCount = dueFlashcards.length + reviewProblems.length;
	const reviewMinutes = Math.round(
		dueFlashcards.length * FLASHCARD_MINUTES +
			reviewProblems.length * REVIEW_PROBLEM_MINUTES
	);

	// Phase 2: Reading
	const readingSections = input.unreadSections.slice(0, MAX_READING_SECTIONS);
	const readingMinutes = readingSections.reduce((sum, s) => sum + (s.readingTime || 5), 0);

	// Phase 3: Practice
	const adaptiveProblems = input.adaptiveProblems.slice(0, MAX_ADAPTIVE_PROBLEMS);
	const practiceMinutes = adaptiveProblems.length * ADAPTIVE_PROBLEM_MINUTES;

	// Phase 4: Reflect
	const objectives = input.weakObjectives.slice(0, MAX_OBJECTIVES);
	const reflectMinutes = Math.round(objectives.length * OBJECTIVE_MINUTES);

	const review: ReviewPhase = {
		enabled: reviewCount > 0,
		itemCount: reviewCount,
		estimatedMinutes: reviewMinutes,
		dueFlashcards,
		reviewProblems
	};

	const reading: ReadingPhase = {
		enabled: readingSections.length > 0,
		itemCount: readingSections.length,
		estimatedMinutes: readingMinutes,
		sections: readingSections
	};

	const practice: PracticePhase = {
		enabled: adaptiveProblems.length > 0,
		itemCount: adaptiveProblems.length,
		estimatedMinutes: practiceMinutes,
		problems: adaptiveProblems
	};

	const reflect: ReflectPhase = {
		enabled: objectives.length > 0,
		itemCount: objectives.length,
		estimatedMinutes: reflectMinutes,
		objectives
	};

	const enabledPhaseIds: PhaseId[] = [];
	if (review.enabled) enabledPhaseIds.push('review');
	if (reading.enabled) enabledPhaseIds.push('reading');
	if (practice.enabled) enabledPhaseIds.push('practice');
	if (reflect.enabled) enabledPhaseIds.push('reflect');

	const totalEstimatedMinutes =
		reviewMinutes + readingMinutes + practiceMinutes + reflectMinutes;

	return {
		review,
		reading,
		practice,
		reflect,
		enabledPhaseIds,
		totalEstimatedMinutes,
		isEmpty: enabledPhaseIds.length === 0
	};
}

/**
 * Find unread content sections from TOC.
 * Pure function — takes reading progress and TOC as input.
 */
export function findUnreadSections(
	toc: TableOfContents,
	readingProgress: ReadingProgress,
	bookSlug: string,
	currentChapter: string | null,
	chapterFilter?: number
): UnreadSection[] {
	const unread: UnreadSection[] = [];

	let chapters = [...toc.chapters];
	if (chapterFilter !== undefined) {
		chapters = chapters.filter((c) => c.number === chapterFilter);
	}

	// If there's a current chapter, prioritize it
	if (currentChapter) {
		const currentNum = parseInt(currentChapter, 10);
		if (!isNaN(currentNum)) {
			const currentIdx = chapters.findIndex((c) => c.number === currentNum);
			if (currentIdx > 0) {
				const [current] = chapters.splice(currentIdx, 1);
				chapters.unshift(current);
			}
		}
	}

	for (const chapter of chapters) {
		const chapterSlug = getChapterPath(chapter);

		for (const section of chapter.sections) {
			// Skip non-content sections
			if (section.type && SKIP_SECTION_TYPES.includes(section.type)) {
				continue;
			}

			const sectionSlug = getSectionPath(section);
			const key = createSectionKey(bookSlug, chapterSlug, sectionSlug);

			if (!readingProgress[key]?.read) {
				unread.push({
					chapterNumber: chapter.number,
					chapterTitle: chapter.title,
					chapterSlug,
					sectionNumber: section.number,
					sectionTitle: section.title,
					sectionFile: section.file,
					sectionSlug,
					readingTime: section.metadata?.readingTime || 5
				});
			}
		}
	}

	return unread;
}

/**
 * Find objectives with low or no confidence rating.
 * Pure function.
 */
export function findWeakObjectives(
	completedObjectives: Record<
		string,
		{
			chapterSlug: string;
			sectionSlug: string;
			objectiveIndex: number;
			objectiveText: string;
			isCompleted: boolean;
			confidence?: number;
		}
	>,
	filter?: { bookSlug?: string; chapterSlug?: string }
): WeakObjective[] {
	return Object.entries(completedObjectives)
		.filter(([key, obj]) => {
			// Record keys are book-prefixed; values only carry chapter/section
			// slugs, which v2 books share — filter by key for the book
			if (filter?.bookSlug && !key.startsWith(`${filter.bookSlug}/`)) return false;
			if (filter?.chapterSlug && obj.chapterSlug !== filter.chapterSlug) return false;
			// Include if no confidence set, or confidence <= 2
			return obj.confidence === undefined || obj.confidence <= 2;
		})
		.map(([key, obj]) => ({
			key,
			chapterSlug: obj.chapterSlug,
			sectionSlug: obj.sectionSlug,
			objectiveIndex: obj.objectiveIndex,
			objectiveText: obj.objectiveText,
			confidence: obj.confidence
		}));
}
