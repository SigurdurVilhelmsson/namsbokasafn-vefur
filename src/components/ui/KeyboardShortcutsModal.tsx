import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import {
  type KeyboardShortcut,
  formatShortcutKey,
  groupShortcutsByCategory,
  getCategoryDisplayName,
} from "@/hooks/useKeyboardShortcuts";

// =============================================================================
// TYPES
// =============================================================================

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const groupedShortcuts = groupShortcutsByCategory(shortcuts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-modal-overlay="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div className="mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-3">
            <Keyboard size={24} className="text-[var(--accent-color)]" />
            <h2
              id="shortcuts-modal-title"
              className="font-sans text-lg font-semibold text-[var(--text-primary)]"
            >
              Flýtilyklar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            aria-label="Loka"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {Array.from(groupedShortcuts.entries()).map(
              ([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="mb-3 font-sans text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {getCategoryDisplayName(category)}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut) => (
                      <div
                        key={shortcut.key}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-[var(--bg-primary)]"
                      >
                        <span className="text-[var(--text-primary)]">
                          {shortcut.descriptionIs}
                        </span>
                        <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded bg-[var(--bg-primary)] px-2 py-1 font-mono text-sm text-[var(--text-secondary)] shadow-sm">
                          {formatShortcutKey(shortcut.key)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-color)] px-6 py-4">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Ýttu á{" "}
            <kbd className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-xs">
              ?
            </kbd>{" "}
            hvar sem er til að opna þessa hjálp
          </p>
        </div>
      </div>
    </div>
  );
}
