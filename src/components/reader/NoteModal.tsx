import { useState, useRef, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { HighlightColor } from "@/types/annotation";

// =============================================================================
// TYPES
// =============================================================================

interface NoteModalProps {
  selectedText: string;
  initialNote?: string;
  initialColor?: HighlightColor;
  onSave: (note: string, color: HighlightColor) => void;
  onClose: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const HIGHLIGHT_COLORS: { color: HighlightColor; label: string; bg: string }[] =
  [
    { color: "yellow", label: "Gulur", bg: "bg-yellow-300" },
    { color: "green", label: "Grænn", bg: "bg-green-300" },
    { color: "blue", label: "Blár", bg: "bg-blue-300" },
    { color: "pink", label: "Bleikur", bg: "bg-pink-300" },
  ];

// =============================================================================
// COMPONENT
// =============================================================================

export default function NoteModal({
  selectedText,
  initialNote = "",
  initialColor = "yellow",
  onSave,
  onClose,
}: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const [color, setColor] = useState<HighlightColor>(initialColor);
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
    onSave(note.trim(), color);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Save with Ctrl/Cmd + Enter
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-modal-overlay="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <div className="mx-4 w-full max-w-lg rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <h2
            id="note-modal-title"
            className="font-sans text-lg font-semibold text-[var(--text-primary)]"
          >
            Bæta við athugasemd
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
          {/* Selected text preview */}
          <div className="mb-4">
            <label className="mb-2 block font-sans text-sm font-medium text-[var(--text-secondary)]">
              Valinn texti
            </label>
            <blockquote className="rounded-lg border-l-4 border-[var(--accent-color)] bg-[var(--bg-primary)] p-3 text-sm italic text-[var(--text-secondary)]">
              "{selectedText.length > 200 ? `${selectedText.slice(0, 200)}...` : selectedText}"
            </blockquote>
          </div>

          {/* Color selector */}
          <div className="mb-4">
            <label className="mb-2 block font-sans text-sm font-medium text-[var(--text-secondary)]">
              Litur yfirstrokunar
            </label>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map(({ color: c, label, bg }) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ${bg} transition-all ${
                    color === c
                      ? "ring-2 ring-[var(--accent-color)] ring-offset-2"
                      : "hover:scale-110"
                  }`}
                  aria-label={label}
                  aria-pressed={color === c}
                  title={label}
                />
              ))}
            </div>
          </div>

          {/* Note textarea */}
          <div className="mb-4">
            <label
              htmlFor="annotation-note"
              className="mb-2 block font-sans text-sm font-medium text-[var(--text-secondary)]"
            >
              Athugasemd (valfrjálst)
            </label>
            <textarea
              ref={textareaRef}
              id="annotation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skrifaðu athugasemd hér..."
              className="min-h-[100px] w-full resize-y rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
            />
            <p className="mt-1 font-sans text-xs text-[var(--text-secondary)]">
              Ýttu á Ctrl+Enter til að vista
            </p>
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
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-4 py-2 font-sans text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Save size={16} />
            Vista
          </button>
        </div>
      </div>
    </div>
  );
}
