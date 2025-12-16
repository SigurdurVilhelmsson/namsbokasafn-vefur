import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  BookOpen,
  TrendingUp,
  Target,
} from "lucide-react";
import { useQuizStore } from "@/stores/quizStore";
import { useBook } from "@/hooks/useBook";

export default function PracticeProgressPage() {
  const { bookSlug } = useBook();
  const {
    practiceProblemProgress,
    getSectionProgress,
    getChapterProgress,
    getOverallProgress,
  } = useQuizStore();

  // Group problems by chapter and section
  const problemsByChapter = new Map<
    string,
    Map<string, (typeof practiceProblemProgress)[string][]>
  >();

  Object.values(practiceProblemProgress).forEach((problem) => {
    if (!problemsByChapter.has(problem.chapterSlug)) {
      problemsByChapter.set(problem.chapterSlug, new Map());
    }
    const chapterMap = problemsByChapter.get(problem.chapterSlug)!;
    if (!chapterMap.has(problem.sectionSlug)) {
      chapterMap.set(problem.sectionSlug, []);
    }
    chapterMap.get(problem.sectionSlug)!.push(problem);
  });

  const overallProgress = getOverallProgress();
  const hasPracticeProblems = Object.keys(practiceProblemProgress).length > 0;

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <Target size={32} className="text-emerald-500" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Æfingadæmi
              </h1>
              <p className="text-[var(--text-secondary)]">
                Fylgstu með framvindu þinni í æfingadæmum
              </p>
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mb-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-500" />
                <span className="font-sans font-semibold">
                  Heildarframvinda
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-sans text-2xl font-bold text-emerald-500">
                {overallProgress.completed} / {overallProgress.total}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {overallProgress.total > 0
                  ? `${Math.round(overallProgress.percentage)}% lokið`
                  : "Engin dæmi skoðuð enn"}
              </div>
            </div>
          </div>

          {overallProgress.total > 0 && (
            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${overallProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Practice problems by chapter/section */}
        {!hasPracticeProblems ? (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
            <BookOpen
              size={48}
              className="mx-auto mb-4 text-[var(--text-secondary)]"
            />
            <h3 className="mb-2 font-sans text-lg font-semibold">
              Engin æfingadæmi skoðuð enn
            </h3>
            <p className="mb-4 text-[var(--text-secondary)]">
              Farðu í lesefnið og æfðu þig í dæmunum sem þar eru.
            </p>
            <Link
              to={`/${bookSlug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Byrja að lesa
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="font-sans text-2xl font-semibold">
              Æfingadæmi eftir köflum
            </h2>

            {Array.from(problemsByChapter.entries()).map(
              ([chapterSlug, sections]) => {
                const chapterProgress = getChapterProgress(chapterSlug);

                // Get chapter display name from first problem
                const firstSection = sections.values().next().value;
                const chapterName =
                  firstSection?.[0]?.chapterSlug
                    ?.replace(/-/g, " ")
                    ?.replace(/^\d+/, (m) => `${m}.`) || chapterSlug;

                return (
                  <div
                    key={chapterSlug}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
                  >
                    {/* Chapter header */}
                    <div className="mb-4 flex items-center justify-between">
                      <Link
                        to={`/${bookSlug}/kafli/${chapterSlug}`}
                        className="font-sans text-lg font-semibold capitalize hover:text-[var(--accent-color)]"
                      >
                        {chapterName}
                      </Link>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={`font-medium ${
                            chapterProgress.percentage === 100
                              ? "text-emerald-500"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {chapterProgress.completed}/{chapterProgress.total}
                        </span>
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${chapterProgress.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sections */}
                    <div className="space-y-3">
                      {Array.from(sections.entries()).map(
                        ([sectionSlug, problems]) => {
                          const sectionProgress = getSectionProgress(
                            chapterSlug,
                            sectionSlug,
                          );

                          // Format section name
                          const sectionName =
                            sectionSlug
                              ?.replace(/-/g, " ")
                              ?.replace(/^\d+/, (m) => `${m}.`) || sectionSlug;

                          return (
                            <div
                              key={sectionSlug}
                              className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <Link
                                  to={`/${bookSlug}/kafli/${chapterSlug}/${sectionSlug}`}
                                  className="font-medium capitalize hover:text-[var(--accent-color)]"
                                >
                                  {sectionName}
                                </Link>
                                <span className="text-sm text-[var(--text-secondary)]">
                                  {sectionProgress.completed}/
                                  {sectionProgress.total} lokið
                                </span>
                              </div>

                              {/* Individual problems */}
                              <div className="grid gap-2 sm:grid-cols-2">
                                {problems.map((problem, index) => (
                                  <div
                                    key={problem.id}
                                    className={`flex items-start gap-2 rounded-lg p-2 text-sm ${
                                      problem.isCompleted
                                        ? "bg-emerald-50 dark:bg-emerald-900/20"
                                        : "bg-[var(--bg-secondary)]"
                                    }`}
                                  >
                                    {problem.isCompleted ? (
                                      <CheckCircle2
                                        size={16}
                                        className="mt-0.5 flex-shrink-0 text-emerald-500"
                                      />
                                    ) : (
                                      <Circle
                                        size={16}
                                        className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)]"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`truncate ${
                                          problem.isCompleted
                                            ? "text-emerald-700 dark:text-emerald-400"
                                            : "text-[var(--text-primary)]"
                                        }`}
                                        title={problem.content}
                                      >
                                        Dæmi {index + 1}
                                        {problem.content &&
                                          `: ${problem.content.slice(0, 40)}...`}
                                      </p>
                                      {problem.lastAttempted && (
                                        <p className="text-xs text-[var(--text-secondary)]">
                                          Síðast:{" "}
                                          {new Date(
                                            problem.lastAttempted,
                                          ).toLocaleDateString("is-IS")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link
            to={`/${bookSlug}`}
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}
