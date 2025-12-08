import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  ) => { completed: number; total: number; percentage: number };
  getChapterObjectivesProgress: (chapterSlug: string) => {
    completed: number;
    total: number;
    percentage: number;
  };
  getOverallObjectivesProgress: () => {
    completed: number;
    total: number;
    percentage: number;
  };

  // Get all objectives for a section
  getSectionObjectives: (
    chapterSlug: string,
    sectionSlug: string,
  ) => ObjectiveProgress[];
}

function generateKey(
  chapterSlug: string,
  sectionSlug: string,
  objectiveIndex: number,
): string {
  return `${chapterSlug}/${sectionSlug}/${objectiveIndex}`;
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
        const key = generateKey(chapterSlug, sectionSlug, objectiveIndex);
        set((state) => ({
          completedObjectives: {
            ...state.completedObjectives,
            [key]: {
              chapterSlug,
              sectionSlug,
              objectiveIndex,
              objectiveText,
              isCompleted: true,
              completedAt: new Date().toISOString(),
            },
          },
        }));
      },

      markObjectiveIncomplete: (chapterSlug, sectionSlug, objectiveIndex) => {
        const key = generateKey(chapterSlug, sectionSlug, objectiveIndex);
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
        const key = generateKey(chapterSlug, sectionSlug, objectiveIndex);
        return get().completedObjectives[key]?.isCompleted ?? false;
      },

      getSectionObjectivesProgress: (
        chapterSlug,
        sectionSlug,
        totalObjectives,
      ) => {
        const { completedObjectives } = get();
        const prefix = `${chapterSlug}/${sectionSlug}/`;
        const completed = Object.keys(completedObjectives).filter(
          (key) =>
            key.startsWith(prefix) && completedObjectives[key].isCompleted,
        ).length;

        return {
          completed,
          total: totalObjectives,
          percentage:
            totalObjectives > 0
              ? Math.round((completed / totalObjectives) * 100)
              : 0,
        };
      },

      getChapterObjectivesProgress: (chapterSlug) => {
        const { completedObjectives } = get();
        const chapterObjectives = Object.values(completedObjectives).filter(
          (obj) => obj.chapterSlug === chapterSlug,
        );
        const completed = chapterObjectives.filter(
          (obj) => obj.isCompleted,
        ).length;
        const total = chapterObjectives.length;

        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },

      getOverallObjectivesProgress: () => {
        const { completedObjectives } = get();
        const allObjectives = Object.values(completedObjectives);
        const completed = allObjectives.filter((obj) => obj.isCompleted).length;
        const total = allObjectives.length;

        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },

      getSectionObjectives: (chapterSlug, sectionSlug) => {
        const { completedObjectives } = get();
        return Object.values(completedObjectives).filter(
          (obj) =>
            obj.chapterSlug === chapterSlug && obj.sectionSlug === sectionSlug,
        );
      },
    }),
    {
      name: "efnafraedi-objectives",
    },
  ),
);
