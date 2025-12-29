import { useEffect, useRef } from "react";
import { Highlighter, MessageSquarePlus, X, Sparkles } from "lucide-react";
import type { HighlightColor, SelectionPosition } from "@/types/annotation";

// =============================================================================
// TYPES
// =============================================================================

interface SelectionPopupProps {
  position: SelectionPosition;
  onHighlight: (color: HighlightColor) => void;
  onAddNote: () => void;
  onCreateFlashcard: () => void;
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

export default function SelectionPopup({
  position,
  onHighlight,
  onAddNote,
  onCreateFlashcard,
  onClose,
}: SelectionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Delay to avoid immediate close from selection click
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Calculate position to keep popup in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.max(position.y - 50, 10),
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: "translateX(-50%)",
      }}
      role="dialog"
      aria-label="Valmöguleikar yfirstrokunar"
    >
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 shadow-lg">
        {/* Highlight color buttons */}
        <div className="flex items-center gap-1 border-r border-[var(--border-color)] pr-2">
          <Highlighter
            size={14}
            className="mr-1 text-[var(--text-secondary)]"
          />
          {HIGHLIGHT_COLORS.map(({ color, label, bg }) => (
            <button
              key={color}
              onClick={() => onHighlight(color)}
              className={`h-6 w-6 rounded-full ${bg} transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-2`}
              aria-label={`Yfirstrika með ${label.toLowerCase()}`}
              title={label}
            />
          ))}
        </div>

        {/* Add note button */}
        <button
          onClick={onAddNote}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          aria-label="Bæta við athugasemd"
          title="Bæta við athugasemd"
        >
          <MessageSquarePlus size={16} />
          <span className="hidden sm:inline">Athugasemd</span>
        </button>

        {/* Create flashcard button */}
        <button
          onClick={onCreateFlashcard}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          aria-label="Búa til minniskort"
          title="Búa til minniskort"
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">Minniskort</span>
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
          aria-label="Loka"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
