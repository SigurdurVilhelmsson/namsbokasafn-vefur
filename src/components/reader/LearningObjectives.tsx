import { CheckCircle2, Circle, Target } from "lucide-react";
import { useObjectivesStore } from "@/stores/objectivesStore";

interface LearningObjectivesProps {
  objectives: string[];
  chapterSlug: string;
  sectionSlug: string;
}

export default function LearningObjectives({
  objectives,
  chapterSlug,
  sectionSlug,
}: LearningObjectivesProps) {
  const {
    toggleObjective,
    isObjectiveCompleted,
    getSectionObjectivesProgress,
  } = useObjectivesStore();

  const progress = getSectionObjectivesProgress(
    chapterSlug,
    sectionSlug,
    objectives.length,
  );

  if (!objectives || objectives.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-[var(--accent-color)]" />
          <h3 className="font-sans text-lg font-semibold">Markmið kaflans</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">
            {progress.completed}/{progress.total}
          </span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--bg-primary)]">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Eftir að lesa þennan kafla ættir þú að geta:
      </p>

      {/* Objectives list */}
      <ul className="space-y-3">
        {objectives.map((objective, index) => {
          const isCompleted = isObjectiveCompleted(
            chapterSlug,
            sectionSlug,
            index,
          );

          return (
            <li key={index}>
              <button
                onClick={() =>
                  toggleObjective(chapterSlug, sectionSlug, index, objective)
                }
                className={`flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all ${
                  isCompleted
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : "hover:bg-[var(--bg-primary)]"
                }`}
                aria-label={
                  isCompleted
                    ? `Afmerkja markmið: ${objective}`
                    : `Merkja markmið sem lokið: ${objective}`
                }
              >
                <span className="mt-0.5 flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <Circle
                      size={20}
                      className="text-[var(--text-secondary)]"
                    />
                  )}
                </span>
                <span
                  className={`text-sm ${
                    isCompleted
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {objective}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Completion message */}
      {progress.percentage === 100 && (
        <div className="mt-4 rounded-lg bg-emerald-100 p-3 text-center text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          Vel gert! Þú hefur náð öllum markmiðum kaflans.
        </div>
      )}
    </div>
  );
}
