import { useState, useRef, useEffect } from "react";
import { X, Save, Plus, BookOpen } from "lucide-react";
import { useFlashcardStore } from "@/stores/flashcardStore";
import type { Flashcard, FlashcardDeck } from "@/types/flashcard";

// =============================================================================
// TYPES
// =============================================================================

interface FlashcardModalProps {
  selectedText: string;
  bookSlug: string;
  chapterSlug?: string;
  sectionSlug?: string;
  onSave: () => void;
  onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function FlashcardModal({
  selectedText,
  bookSlug,
  chapterSlug,
  sectionSlug,
  onSave,
  onClose,
}: FlashcardModalProps) {
  const { decks, addDeck, addCardToDeck } = useFlashcardStore();
  const [back, setBack] = useState("");
  // Initialize with first deck or empty if no decks
  const [selectedDeckId, setSelectedDeckId] = useState<string>(() =>
    decks.length > 0 ? decks[0].id : "",
  );
  // Show new deck form if no existing decks
  const [showNewDeck, setShowNewDeck] = useState(() => decks.length === 0);
  const [newDeckName, setNewDeckName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    if (!back.trim()) return;

    let deckId = selectedDeckId;

    // Create new deck if needed
    if (showNewDeck && newDeckName.trim()) {
      const newDeck: FlashcardDeck = {
        id: `deck-${Date.now()}`,
        name: newDeckName.trim(),
        description: `Minniskort frá ${bookSlug}`,
        cards: [],
        created: new Date().toISOString(),
      };
      addDeck(newDeck);
      deckId = newDeck.id;
    }

    if (!deckId) return;

    // Create the flashcard
    const card: Flashcard = {
      id: `card-${Date.now()}`,
      front: selectedText,
      back: back.trim(),
      category: chapterSlug || bookSlug,
      source: sectionSlug
        ? `${bookSlug}/${chapterSlug}/${sectionSlug}`
        : "highlight",
      created: new Date().toISOString(),
    };

    addCardToDeck(deckId, card);
    onSave();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Save with Ctrl/Cmd + Enter
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  const canSave =
    back.trim() && (selectedDeckId || (showNewDeck && newDeckName.trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-modal-overlay="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="flashcard-modal-title"
    >
      <div className="mx-4 w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2
            id="flashcard-modal-title"
            className="font-sans text-lg font-semibold text-[var(--text-primary)]"
          >
            Búa til minniskort
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Loka"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Front of card (selected text) */}
          <div className="mb-4">
            <label className="mb-2 flex items-center gap-2 font-sans text-sm font-medium text-[var(--text-secondary)]">
              <BookOpen size={14} />
              Fremri hlið (spurning/hugtak)
            </label>
            <blockquote className="rounded-lg border-l-4 border-[var(--accent-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)]">
              {selectedText.length > 300
                ? `${selectedText.slice(0, 300)}...`
                : selectedText}
            </blockquote>
          </div>

          {/* Back of card (user input) */}
          <div className="mb-4">
            <label
              htmlFor="flashcard-back"
              className="mb-2 block font-sans text-sm font-medium text-[var(--text-secondary)]"
            >
              Aftari hlið (svar/skilgreining) *
            </label>
            <textarea
              ref={textareaRef}
              id="flashcard-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skrifaðu svarið eða skilgreininguna hér..."
              className="min-h-[100px] w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
              required
            />
            <p className="mt-1 font-sans text-xs text-[var(--text-secondary)]">
              Ýttu á Ctrl+Enter til að vista
            </p>
          </div>

          {/* Deck selection */}
          <div className="mb-4">
            <label className="mb-2 block font-sans text-sm font-medium text-[var(--text-secondary)]">
              Veldu stokkinn
            </label>

            {decks.length > 0 && !showNewDeck && (
              <div className="space-y-2">
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name} ({deck.cards.length} kort)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewDeck(true)}
                  className="flex items-center gap-1 text-sm text-[var(--accent-color)] hover:underline"
                >
                  <Plus size={14} />
                  Búa til nýjan stokk
                </button>
              </div>
            )}

            {(showNewDeck || decks.length === 0) && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Nafn á nýjum stokk..."
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
                />
                {decks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewDeck(false);
                      setNewDeckName("");
                    }}
                    className="text-sm text-[var(--text-secondary)] hover:underline"
                  >
                    Hætta við og velja núverandi stokk
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-[var(--border-color)] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border-color)] px-4 py-2 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
          >
            Hætta við
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} />
            Vista minniskort
          </button>
        </div>
      </div>
    </div>
  );
}
