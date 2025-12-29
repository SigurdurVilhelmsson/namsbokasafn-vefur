import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  CheckCircle2,
  Circle,
  TrendingUp,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useObjectivesStore, type ConfidenceLevel } from "@/stores/objectivesStore";
import { useFlashcardStore } from "@/stores/flashcardStore";
import { useBook } from "@/hooks/useBook";
import { generateId } from "@/utils/storeHelpers";
import type { Flashcard, FlashcardDeck } from "@/types/flashcard";

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFIDENCE_LABELS: Record<ConfidenceLevel, { label: string; emoji: string; color: string }> = {
  1: { label: "Mjög óviss", emoji: "😰", color: "text-red-500" },
  2: { label: "Nokkuð óviss", emoji: "😕", color: "text-orange-500" },
  3: { label: "Í meðallagi", emoji: "😐", color: "text-yellow-500" },
  4: { label: "Nokkuð örugg/ur", emoji: "🙂", color: "text-lime-500" },
  5: { label: "Mjög örugg/ur", emoji: "😊", color: "text-emerald-500" },
};

// =============================================================================
// TYPES
// =============================================================================

interface ObjectiveWithInfo {
  key: string;
  chapterSlug: string;
  sectionSlug: string;
  objectiveIndex: number;
  objectiveText: string;
  isCompleted: boolean;
  completedAt?: string;
  confidence?: ConfidenceLevel;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ObjectivesDashboardPage() {
  const { bookSlug } = useBook();
  const { completedObjectives, getOverallObjectivesProgress } = useObjectivesStore();
  const { decks, addDeck, addCardToDeck } = useFlashcardStore();

  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [creatingFlashcard, setCreatingFlashcard] = useState<string | null>(null);

  // Group objectives by chapter and section
  const objectivesByChapter = useMemo(() => {
    const grouped = new Map<string, Map<string, ObjectiveWithInfo[]>>();

    Object.entries(completedObjectives).forEach(([key, objective]) => {
      const { chapterSlug, sectionSlug } = objective;

      if (!grouped.has(chapterSlug)) {
        grouped.set(chapterSlug, new Map());
      }
      const chapterMap = grouped.get(chapterSlug)!;

      if (!chapterMap.has(sectionSlug)) {
        chapterMap.set(sectionSlug, []);
      }

      chapterMap.get(sectionSlug)!.push({
        key,
        ...objective,
      });
    });

    // Sort objectives within each section by index
    grouped.forEach((sections) => {
      sections.forEach((objectives) => {
        objectives.sort((a, b) => a.objectiveIndex - b.objectiveIndex);
      });
    });

    return grouped;
  }, [completedObjectives]);

  const overallProgress = getOverallObjectivesProgress();
  const hasObjectives = Object.keys(completedObjectives).length > 0;

  // Calculate confidence stats
  const confidenceStats = useMemo(() => {
    const objectives = Object.values(completedObjectives);
    const withConfidence = objectives.filter((o) => o.confidence !== undefined);
    const lowConfidence = withConfidence.filter((o) => o.confidence && o.confidence <= 2);
    const avgConfidence = withConfidence.length > 0
      ? withConfidence.reduce((sum, o) => sum + (o.confidence || 0), 0) / withConfidence.length
      : 0;

    return {
      total: objectives.length,
      assessed: withConfidence.length,
      lowConfidence: lowConfidence.length,
      avgConfidence: avgConfidence.toFixed(1),
    };
  }, [completedObjectives]);

  const toggleChapter = (chapterSlug: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterSlug)) {
        next.delete(chapterSlug);
      } else {
        next.add(chapterSlug);
      }
      return next;
    });
  };

  // Helper to get or create the "Markmið" deck
  const getOrCreateObjectivesDeck = useCallback((): FlashcardDeck => {
    const targetDeck = decks.find((d) => d.name === "Markmið");
    if (!targetDeck) {
      const newDeck: FlashcardDeck = {
        id: generateId(),
        name: "Markmið",
        description: "Minniskort búin til úr námsmarkmiðum",
        cards: [],
        created: new Date().toISOString(),
      };
      addDeck(newDeck);
      return newDeck;
    }
    return targetDeck;
  }, [decks, addDeck]);

  // Create flashcard from objective
  const handleCreateFlashcard = useCallback((objective: ObjectiveWithInfo) => {
    setCreatingFlashcard(objective.key);

    const targetDeck = getOrCreateObjectivesDeck();

    // Create flashcard
    const card: Flashcard = {
      id: generateId(),
      front: `Getur þú útskýrt þetta markmið?\n\n"${objective.objectiveText}"`,
      back: `Markmið úr kafla ${objective.chapterSlug}/${objective.sectionSlug}.\n\nEndurskoðaðu efnið ef þú ert óviss/óviss.`,
      category: `${objective.chapterSlug}`,
      source: "objective",
      created: new Date().toISOString(),
    };

    addCardToDeck(targetDeck.id, card);

    // Clear creating state after animation
    setTimeout(() => setCreatingFlashcard(null), 1000);
  }, [getOrCreateObjectivesDeck, addCardToDeck]);

  // Create flashcards for all low-confidence objectives
  const handleCreateLowConfidenceFlashcards = useCallback(() => {
    const lowConfidenceObjectives = Object.values(completedObjectives).filter(
      (o) => o.confidence !== undefined && o.confidence <= 2
    );

    if (lowConfidenceObjectives.length === 0) return;

    const targetDeck = getOrCreateObjectivesDeck();

    // Create flashcards for each low-confidence objective
    lowConfidenceObjectives.forEach((objective) => {
      const card: Flashcard = {
        id: generateId(),
        front: `Getur þú útskýrt þetta markmið?\n\n"${objective.objectiveText}"`,
        back: `Markmið úr kafla ${objective.chapterSlug}/${objective.sectionSlug}.\n\nEndurskoðaðu efnið ef þú ert óviss/óviss.`,
        category: `${objective.chapterSlug}`,
        source: "objective",
        created: new Date().toISOString(),
      };

      addCardToDeck(targetDeck.id, card);
    });
  }, [completedObjectives, getOrCreateObjectivesDeck, addCardToDeck]);

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-purple-500/10 p-3">
              <Target size={32} className="text-purple-500" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Námsmarkmið
              </h1>
              <p className="text-[var(--text-secondary)]">
                Fylgstu með framvindu þinni í námsmarkmiðum
              </p>
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-purple-500" />
                <span className="font-sans font-semibold">Heildarframvinda</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-sans text-2xl font-bold text-purple-500">
                {overallProgress.completed} / {overallProgress.total}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {overallProgress.total > 0
                  ? `${Math.round(overallProgress.percentage)}% lokið`
                  : "Engin markmið merkt enn"}
              </div>
            </div>
          </div>

          {overallProgress.total > 0 && (
            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                <div
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: `${overallProgress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confidence stats */}
        {confidenceStats.assessed > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-center">
              <div className="font-sans text-2xl font-bold text-[var(--accent-color)]">
                {confidenceStats.avgConfidence}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                Meðal sjálfstraust
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-center">
              <div className="font-sans text-2xl font-bold text-emerald-500">
                {confidenceStats.assessed}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                Markmið metin
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-center">
              <div className="font-sans text-2xl font-bold text-orange-500">
                {confidenceStats.lowConfidence}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                Lágt sjálfstraust
              </div>
            </div>
          </div>
        )}

        {/* Create flashcards for low confidence */}
        {confidenceStats.lowConfidence > 0 && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800/50 dark:bg-orange-900/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-sans font-medium text-orange-700 dark:text-orange-400">
                  <Sparkles size={18} />
                  {confidenceStats.lowConfidence} markmið með lágt sjálfstraust
                </div>
                <p className="mt-1 text-sm text-orange-600 dark:text-orange-300">
                  Búðu til minniskort til að æfa þig á þessum markmiðum
                </p>
              </div>
              <button
                onClick={handleCreateLowConfidenceFlashcards}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-orange-600"
              >
                <Plus size={16} />
                Búa til minniskort ({confidenceStats.lowConfidence})
              </button>
            </div>
          </div>
        )}

        {/* Objectives by chapter */}
        {!hasObjectives ? (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
            <BookOpen size={48} className="mx-auto mb-4 text-[var(--text-secondary)]" />
            <h3 className="mb-2 font-sans text-lg font-semibold">
              Engin markmið merkt enn
            </h3>
            <p className="mb-4 text-[var(--text-secondary)]">
              Farðu í lesefnið og merktu við markmið þegar þú hefur náð þeim.
            </p>
            <Link
              to={`/${bookSlug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              Byrja að lesa
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="font-sans text-2xl font-semibold">
              Markmið eftir köflum
            </h2>

            {Array.from(objectivesByChapter.entries()).map(([chapterSlug, sections]) => {
              const isExpanded = expandedChapters.has(chapterSlug);
              const chapterObjectives = Array.from(sections.values()).flat();
              const completedCount = chapterObjectives.filter((o) => o.isCompleted).length;
              const chapterName = chapterSlug
                .replace(/-/g, " ")
                .replace(/^\d+/, (m) => `${m}.`);

              return (
                <div
                  key={chapterSlug}
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
                >
                  {/* Chapter header */}
                  <button
                    onClick={() => toggleChapter(chapterSlug)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronRight size={20} className="text-[var(--text-secondary)]" />
                      )}
                      <span className="font-sans text-lg font-semibold capitalize">
                        {chapterName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium ${
                          completedCount === chapterObjectives.length
                            ? "text-purple-500"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {completedCount}/{chapterObjectives.length}
                      </span>
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{
                            width: `${chapterObjectives.length > 0 ? (completedCount / chapterObjectives.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Sections */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border-color)] p-4 space-y-4">
                      {Array.from(sections.entries()).map(([sectionSlug, objectives]) => {
                        const sectionName = sectionSlug
                          .replace(/-/g, " ")
                          .replace(/^\d+/, (m) => `${m}.`);
                        const sectionCompleted = objectives.filter((o) => o.isCompleted).length;

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
                                {sectionCompleted}/{objectives.length} lokið
                              </span>
                            </div>

                            {/* Individual objectives */}
                            <div className="space-y-2">
                              {objectives.map((objective) => {
                                const confidenceInfo = objective.confidence
                                  ? CONFIDENCE_LABELS[objective.confidence]
                                  : null;

                                return (
                                  <div
                                    key={objective.key}
                                    className={`flex items-start gap-3 rounded-lg p-3 ${
                                      objective.isCompleted
                                        ? "bg-purple-50 dark:bg-purple-900/20"
                                        : "bg-[var(--bg-secondary)]"
                                    }`}
                                  >
                                    {objective.isCompleted ? (
                                      <CheckCircle2
                                        size={18}
                                        className="mt-0.5 flex-shrink-0 text-purple-500"
                                      />
                                    ) : (
                                      <Circle
                                        size={18}
                                        className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)]"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm ${
                                          objective.isCompleted
                                            ? "text-purple-700 dark:text-purple-400"
                                            : "text-[var(--text-primary)]"
                                        }`}
                                      >
                                        {objective.objectiveText}
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        {confidenceInfo && (
                                          <span
                                            className={`text-xs ${confidenceInfo.color}`}
                                            title={confidenceInfo.label}
                                          >
                                            {confidenceInfo.emoji} {confidenceInfo.label}
                                          </span>
                                        )}
                                        {objective.completedAt && (
                                          <span className="text-xs text-[var(--text-secondary)]">
                                            Lokið:{" "}
                                            {new Date(objective.completedAt).toLocaleDateString("is-IS")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {/* Create flashcard button */}
                                    <button
                                      onClick={() => handleCreateFlashcard(objective)}
                                      className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                                        creatingFlashcard === objective.key
                                          ? "bg-emerald-500 text-white"
                                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-color)]"
                                      }`}
                                      title="Búa til minniskort"
                                    >
                                      {creatingFlashcard === objective.key ? (
                                        <CheckCircle2 size={16} />
                                      ) : (
                                        <Plus size={16} />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={`/${bookSlug}`}
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
          {hasObjectives && (
            <Link
              to={`/${bookSlug}/minniskort`}
              className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
            >
              Sjá minniskort →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
