/**
 * Objectives Store - Learning objectives tracking with confidence levels
 * Ported from React/Zustand objectivesStore.ts
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import {
	type ProgressResult,
	createObjectiveKey,
	createSectionKey,
	calculateProgressFromCounts,
	filterItemsByChapter,
	filterItemsBySection,
	getCurrentTimestamp
} from '$lib/utils/storeHelpers';

const STORAGE_KEY = 'namsbokasafn:objectives';

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

interface ObjectiveProgress {
	chapterSlug: string;
	sectionSlug: string;
	objectiveIndex: number;
	objectiveText: string;
	isCompleted: boolean;
	completedAt?: string;
	confidence?: ConfidenceLevel;
	assessedAt?: string;
}

interface ObjectivesState {
	completedObjectives: Record<string, ObjectiveProgress>;
}

const defaultState: ObjectivesState = {
	completedObjectives: {}
};

function loadState(): ObjectivesState {
	if (!browser) return defaultState;

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return { ...defaultState, ...JSON.parse(stored) };
		}
	} catch (e) {
		console.warn('Failed to load objectives state:', e);
	}
	return defaultState;
}

function createObjectivesStore() {
	const { subscribe, set, update } = writable<ObjectivesState>(loadState());

	// Persist to localStorage
	if (browser) {
		subscribe((state) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		});
	}

	return {
		subscribe,

		markObjectiveComplete: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number,
			objectiveText: string
		) => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			update((state) => ({
				completedObjectives: {
					...state.completedObjectives,
					[key]: {
						chapterSlug,
						sectionSlug,
						objectiveIndex,
						objectiveText,
						isCompleted: true,
						completedAt: getCurrentTimestamp()
					}
				}
			}));
		},

		markObjectiveIncomplete: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number
		) => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			update((state) => {
				const { [key]: _removed, ...rest } = state.completedObjectives;
				return { completedObjectives: rest };
			});
		},

		toggleObjective: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number,
			objectiveText: string
		) => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			const state = get({ subscribe });
			const isCompleted = state.completedObjectives[key]?.isCompleted ?? false;

			if (isCompleted) {
				update((s) => {
					const { [key]: _removed, ...rest } = s.completedObjectives;
					return { completedObjectives: rest };
				});
			} else {
				update((s) => ({
					completedObjectives: {
						...s.completedObjectives,
						[key]: {
							chapterSlug,
							sectionSlug,
							objectiveIndex,
							objectiveText,
							isCompleted: true,
							completedAt: getCurrentTimestamp()
						}
					}
				}));
			}
		},

		isObjectiveCompleted: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number
		): boolean => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			return get({ subscribe }).completedObjectives[key]?.isCompleted ?? false;
		},

		getSectionObjectivesProgress: (
			chapterSlug: string,
			sectionSlug: string,
			totalObjectives: number
		): ProgressResult => {
			const { completedObjectives } = get({ subscribe });
			const prefix = `${createSectionKey(chapterSlug, sectionSlug)}/`;
			const completed = Object.keys(completedObjectives).filter(
				(key) => key.startsWith(prefix) && completedObjectives[key].isCompleted
			).length;

			return calculateProgressFromCounts(completed, totalObjectives);
		},

		getChapterObjectivesProgress: (chapterSlug: string): ProgressResult => {
			const { completedObjectives } = get({ subscribe });
			const chapterObjectives = filterItemsByChapter(
				Object.values(completedObjectives),
				chapterSlug
			);
			const completed = chapterObjectives.filter((obj) => obj.isCompleted).length;

			return calculateProgressFromCounts(completed, chapterObjectives.length);
		},

		getOverallObjectivesProgress: (): ProgressResult => {
			const { completedObjectives } = get({ subscribe });
			const allObjectives = Object.values(completedObjectives);
			const completed = allObjectives.filter((obj) => obj.isCompleted).length;

			return calculateProgressFromCounts(completed, allObjectives.length);
		},

		getSectionObjectives: (
			chapterSlug: string,
			sectionSlug: string
		): ObjectiveProgress[] => {
			const { completedObjectives } = get({ subscribe });
			return filterItemsBySection(Object.values(completedObjectives), chapterSlug, sectionSlug);
		},

		// Self-assessment
		setObjectiveConfidence: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number,
			confidence: ConfidenceLevel
		) => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			update((state) => {
				const existing = state.completedObjectives[key];
				if (!existing) return state;
				return {
					completedObjectives: {
						...state.completedObjectives,
						[key]: {
							...existing,
							confidence,
							assessedAt: getCurrentTimestamp()
						}
					}
				};
			});
		},

		getObjectiveConfidence: (
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number
		): ConfidenceLevel | undefined => {
			const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
			return get({ subscribe }).completedObjectives[key]?.confidence;
		},

		getLowConfidenceObjectives: (
			chapterSlug: string,
			sectionSlug: string
		): ObjectiveProgress[] => {
			const { completedObjectives } = get({ subscribe });
			return filterItemsBySection(Object.values(completedObjectives), chapterSlug, sectionSlug).filter(
				(obj) => obj.confidence !== undefined && obj.confidence <= 2
			);
		},

		reset: () => set(defaultState)
	};
}

export const objectivesStore = createObjectivesStore();

// Derived stores
export const totalCompletedObjectives = derived(
	objectivesStore,
	($store) => Object.values($store.completedObjectives).filter((obj) => obj.isCompleted).length
);

export const objectivesWithLowConfidence = derived(objectivesStore, ($store) =>
	Object.values($store.completedObjectives).filter(
		(obj) => obj.confidence !== undefined && obj.confidence <= 2
	)
);
