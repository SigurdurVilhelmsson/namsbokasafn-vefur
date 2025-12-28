import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ProgressResult,
  createObjectiveKey,
  createSectionKey,
  calculateProgressFromCounts,
  filterItemsByChapter,
  filterItemsBySection,
  getCurrentTimestamp,
} from "@/utils/storeHelpers";

interface ObjectiveProgress {
  chapterSlug: string;
  sectionSlug: string;
  objectiveIndex: number;
  objectiveText: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface ObjectivesState {
  // Track completed objectives: key is "chapterSlug/sectionSlug/index"
  completedObjectives: Record<string, ObjectiveProgress>;

  // Actions
  markObjectiveComplete: (
    chapterSlug: string,
    sectionSlug: string,
    objectiveIndex: number,
    objectiveText: string,
  ) => void;
  markObjectiveIncomplete: (
    chapterSlug: string,
    sectionSlug: string,
    objectiveIndex: number,
  ) => void;
  toggleObjective: (
    chapterSlug: string,
    sectionSlug: string,
    objectiveIndex: number,
    objectiveText: string,
  ) => void;
  isObjectiveCompleted: (
    chapterSlug: string,
    sectionSlug: string,
    objectiveIndex: number,
  ) => boolean;

  // Progress functions
  getSectionObjectivesProgress: (
    chapterSlug: string,
    sectionSlug: string,
    totalObjectives: number,
  ) => ProgressResult;
  getChapterObjectivesProgress: (chapterSlug: string) => ProgressResult;
  getOverallObjectivesProgress: () => ProgressResult;

  // Get all objectives for a section
  getSectionObjectives: (
    chapterSlug: string,
    sectionSlug: string,
  ) => ObjectiveProgress[];
}

export const useObjectivesStore = create<ObjectivesState>()(
  persist(
    (set, get) => ({
      completedObjectives: {},

      markObjectiveComplete: (
        chapterSlug,
        sectionSlug,
        objectiveIndex,
        objectiveText,
      ) => {
        const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
        set((state) => ({
          completedObjectives: {
            ...state.completedObjectives,
            [key]: {
              chapterSlug,
              sectionSlug,
              objectiveIndex,
              objectiveText,
              isCompleted: true,
              completedAt: getCurrentTimestamp(),
            },
          },
        }));
      },

      markObjectiveIncomplete: (chapterSlug, sectionSlug, objectiveIndex) => {
        const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
        set((state) => {
          const { [key]: _removed, ...rest } = state.completedObjectives;
          void _removed; // Explicitly mark as intentionally unused
          return { completedObjectives: rest };
        });
      },

      toggleObjective: (
        chapterSlug,
        sectionSlug,
        objectiveIndex,
        objectiveText,
      ) => {
        const {
          isObjectiveCompleted,
          markObjectiveComplete,
          markObjectiveIncomplete,
        } = get();
        if (isObjectiveCompleted(chapterSlug, sectionSlug, objectiveIndex)) {
          markObjectiveIncomplete(chapterSlug, sectionSlug, objectiveIndex);
        } else {
          markObjectiveComplete(
            chapterSlug,
            sectionSlug,
            objectiveIndex,
            objectiveText,
          );
        }
      },

      isObjectiveCompleted: (chapterSlug, sectionSlug, objectiveIndex) => {
        const key = createObjectiveKey(chapterSlug, sectionSlug, objectiveIndex);
        return get().completedObjectives[key]?.isCompleted ?? false;
      },

      getSectionObjectivesProgress: (
        chapterSlug,
        sectionSlug,
        totalObjectives,
      ) => {
        const { completedObjectives } = get();
        const prefix = `${createSectionKey(chapterSlug, sectionSlug)}/`;
        const completed = Object.keys(completedObjectives).filter(
          (key) =>
            key.startsWith(prefix) && completedObjectives[key].isCompleted,
        ).length;

        return calculateProgressFromCounts(completed, totalObjectives);
      },

      getChapterObjectivesProgress: (chapterSlug) => {
        const { completedObjectives } = get();
        const chapterObjectives = filterItemsByChapter(
          Object.values(completedObjectives),
          chapterSlug,
        );
        const completed = chapterObjectives.filter(
          (obj) => obj.isCompleted,
        ).length;

        return calculateProgressFromCounts(completed, chapterObjectives.length);
      },

      getOverallObjectivesProgress: () => {
        const { completedObjectives } = get();
        const allObjectives = Object.values(completedObjectives);
        const completed = allObjectives.filter((obj) => obj.isCompleted).length;

        return calculateProgressFromCounts(completed, allObjectives.length);
      },

      getSectionObjectives: (chapterSlug, sectionSlug) => {
        const { completedObjectives } = get();
        return filterItemsBySection(
          Object.values(completedObjectives),
          chapterSlug,
          sectionSlug,
        );
      },
    }),
    {
      name: "efnafraedi-objectives",
    },
  ),
);
