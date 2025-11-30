import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brain, Play } from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import { useGlossary } from "@/hooks/useGlossary";
import { generateFlashcardsFromGlossary } from "@/utils/flashcardGenerator";
import FlashcardDeck from "./FlashcardDeck";

export default function FlashcardsPage() {
  const { decks, addDeck, startStudySession, currentDeckId, resetSession } =
    useFlashcardStore();
  const { glossary, loading } = useGlossary();

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
              {decks.map((deck) => (
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

                  <div className="mb-4 text-sm text-[var(--text-secondary)]">
                    {deck.cards.length}{" "}
                    {deck.cards.length === 1 ? "kort" : "kort"}
                  </div>

                  <button
                    onClick={() => {
                      startStudySession(deck.id);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                  >
                    <Play size={18} />
                    Byrja að læra
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="mt-8 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
          <h3 className="mb-3 font-sans text-lg font-semibold">
            💡 Ábendingar
          </h3>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
            <li>
              • Farðu reglulega í gegnum minniskort til að efla langtímaminni
            </li>
            <li>• Reyndu að svara spurningunni áður en þú snýrð kortinu við</li>
            <li>• Ef þú áttar þig ekki á svari, farðu aftur yfir kaflann</li>
            <li>
              • Búnkar eru sjálfkrafa búnir til úr{" "}
              <Link
                to="/ordabok"
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
            to="/"
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}
