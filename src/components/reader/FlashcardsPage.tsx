import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Play, Clock, Sparkles, BookOpen, Flame } from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import { useGlossary } from "@/hooks/useGlossary";
import { useBook } from "@/hooks/useBook";
import { generateFlashcardsFromGlossary } from "@/utils/flashcardGenerator";
import FlashcardDeck from "./FlashcardDeck";

type StudyMode = "all" | "due" | "new";

export default function FlashcardsPage() {
  const { bookSlug } = useBook();
  const {
    decks,
    addDeck,
    startStudySession,
    currentDeckId,
    resetSession,
    getDeckStats,
    studyStreak,
    todayStudied,
  } = useFlashcardStore();
  const { glossary, loading } = useGlossary(bookSlug);
  const [selectedMode, setSelectedMode] = useState<StudyMode>("all");

  // Auto-generate glossary deck if it doesn't exist
  useEffect(() => {
    if (glossary && !loading) {
      const glossaryDeckExists = decks.some((d) => d.id === "glossary-deck");

      if (!glossaryDeckExists) {
        const glossaryDeck = generateFlashcardsFromGlossary(glossary);
        addDeck(glossaryDeck);
      }
    }
  }, [glossary, loading, decks, addDeck]);

  // If studying, show the deck
  if (currentDeckId) {
    return (
      <div className="min-h-[80vh] p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-sans text-3xl font-bold">Minniskort</h1>
            <button
              onClick={resetSession}
              className="rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans font-medium transition-colors hover:bg-[var(--bg-primary)]"
            >
              ← Til baka í búnkaval
            </button>
          </div>

          {/* Flashcard deck */}
          <FlashcardDeck deckId={currentDeckId} />
        </div>
      </div>
    );
  }

  // Deck selection view
  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-[var(--accent-color)]/10 p-3">
              <Brain size={32} className="text-[var(--accent-color)]" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Minniskort
              </h1>
              <p className="text-[var(--text-secondary)]">
                Náðu tökum á efninu með gagnvirkum minniskortum
              </p>
            </div>
          </div>
        </div>

        {/* Study streak banner */}
        {(studyStreak > 0 || todayStudied > 0) && (
          <div className="mb-6 flex items-center justify-center gap-6 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            {studyStreak > 0 && (
              <div className="flex items-center gap-2 text-orange-500">
                <Flame size={24} />
                <div>
                  <div className="font-sans font-bold text-lg">
                    {studyStreak}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    daga röð
                  </div>
                </div>
              </div>
            )}
            {todayStudied > 0 && (
              <div className="flex items-center gap-2 text-[var(--accent-color)]">
                <BookOpen size={24} />
                <div>
                  <div className="font-sans font-bold text-lg">
                    {todayStudied}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    kort í dag
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available decks */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-2xl font-semibold">
              Tiltækir búnkar
            </h2>
            {/* Future: Add custom deck creation */}
          </div>

          {loading ? (
            <p className="text-center text-[var(--text-secondary)]">
              Hleður búnka...
            </p>
          ) : decks.length === 0 ? (
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center">
              <p className="text-[var(--text-secondary)]">
                Engir búnkar tiltækir. Búnkar eru sjálfkrafa búnir til úr
                orðasafninu.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {decks.map((deck) => {
                const stats = getDeckStats(deck.id);
                return (
                  <div
                    key={deck.id}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 transition-all hover:border-[var(--accent-color)] hover:shadow-lg"
                  >
                    <h3 className="mb-2 font-sans text-lg font-semibold">
                      {deck.name}
                    </h3>
                    {deck.description && (
                      <p className="mb-4 text-sm text-[var(--text-secondary)]">
                        {deck.description}
                      </p>
                    )}

                    {/* Deck statistics */}
                    <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-[var(--bg-primary)] p-2">
                        <div className="flex items-center justify-center gap-1 text-blue-500">
                          <Sparkles size={14} />
                          <span className="font-bold">{stats.new}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Ný
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-primary)] p-2">
                        <div className="flex items-center justify-center gap-1 text-orange-500">
                          <Clock size={14} />
                          <span className="font-bold">{stats.due}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Á dag
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-primary)] p-2">
                        <div className="font-bold text-[var(--text-secondary)]">
                          {stats.total}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Alls
                        </div>
                      </div>
                    </div>

                    {/* Study mode selection */}
                    <div className="mb-4 flex gap-2">
                      <button
                        onClick={() => setSelectedMode("all")}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          selectedMode === "all"
                            ? "bg-[var(--accent-color)] text-white"
                            : "border border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                        }`}
                      >
                        Öll
                      </button>
                      <button
                        onClick={() => setSelectedMode("due")}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          selectedMode === "due"
                            ? "bg-orange-500 text-white"
                            : "border border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                        }`}
                      >
                        Á dag ({stats.due})
                      </button>
                      <button
                        onClick={() => setSelectedMode("new")}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          selectedMode === "new"
                            ? "bg-blue-500 text-white"
                            : "border border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                        }`}
                      >
                        Ný ({stats.new})
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        startStudySession(deck.id, selectedMode);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                    >
                      <Play size={18} />
                      Byrja að læra
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-3 font-sans text-lg font-semibold">
            💡 Um SRS (Spaced Repetition System)
          </h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li>
              • <strong>Aftur</strong> - Þú mannst ekki svarið. Kortið birtist
              aftur á morgun.
            </li>
            <li>
              • <strong>Erfitt</strong> - Þú mannst svarið en með erfiðleikum.
              Stuttur tími þar til næsta endurtekningu.
            </li>
            <li>
              • <strong>Gott</strong> - Þú mannst svarið með smá hugsun. Meðal
              tími þar til næsta endurtekningu.
            </li>
            <li>
              • <strong>Auðvelt</strong> - Þú mannst svarið strax. Lengri tími
              þar til næsta endurtekningu.
            </li>
            <li className="pt-2">
              • Kerfið lærir hvaða kort þarf að endurtaka oftar og aðlagar sig
              sjálfkrafa!
            </li>
            <li>
              • Búnkar eru sjálfkrafa búnir til úr{" "}
              <Link
                to={`/${bookSlug}/ordabok`}
                className="text-[var(--accent-color)] hover:underline"
              >
                orðasafninu
              </Link>
            </li>
          </ul>
        </div>

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
