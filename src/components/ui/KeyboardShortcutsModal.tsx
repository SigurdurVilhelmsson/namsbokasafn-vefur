import { useEffect, useState, useCallback } from "react";
import { X, Keyboard, RotateCcw, Edit2, Check } from "lucide-react";
import {
  type KeyboardShortcut,
  formatShortcutKey,
  groupShortcutsByCategory,
  getCategoryDisplayName,
  keyEventToString,
} from "@/hooks/useKeyboardShortcuts";
import {
  useSettingsStore,
  type ShortcutAction,
} from "@/stores/settingsStore";

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
  const { setShortcut, resetShortcut, resetAllShortcuts, shortcutPreferences } =
    useSettingsStore();

  const [editingAction, setEditingAction] = useState<ShortcutAction | null>(
    null,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const hasCustomizations = Object.keys(shortcutPreferences).length > 0;

  // Close on Escape key (only when not editing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editingAction) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, editingAction]);

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

  // Handle key capture when editing
  useEffect(() => {
    if (!editingAction) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Ignore modifier-only keys
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
        return;
      }

      const key = keyEventToString(event);

      // Handle multi-key sequences starting with 'g'
      if (key === "g" && keySequence.length === 0) {
        setKeySequence(["g"]);
        setPendingKey("g ...");
        return;
      }

      // Complete a two-key sequence
      if (keySequence.length === 1 && keySequence[0] === "g") {
        const fullSequence = `g ${key}`;
        setPendingKey(fullSequence);
        setKeySequence([]);

        // Save after a brief delay to show the key
        setTimeout(() => {
          setShortcut(editingAction, fullSequence);
          setEditingAction(null);
          setPendingKey(null);
        }, 300);
        return;
      }

      // Single key shortcut
      setPendingKey(key);
      setKeySequence([]);

      // Save after a brief delay to show the key
      setTimeout(() => {
        setShortcut(editingAction, key);
        setEditingAction(null);
        setPendingKey(null);
      }, 300);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [editingAction, keySequence, setShortcut]);

  // Cancel editing on click outside
  const handleCancelEdit = useCallback(() => {
    setEditingAction(null);
    setPendingKey(null);
    setKeySequence([]);
  }, []);

  // Start editing a shortcut
  const handleStartEdit = useCallback((action: ShortcutAction) => {
    setEditingAction(action);
    setPendingKey(null);
    setKeySequence([]);
  }, []);

  // Reset a single shortcut
  const handleResetShortcut = useCallback(
    (action: ShortcutAction) => {
      resetShortcut(action);
    },
    [resetShortcut],
  );

  // Reset all shortcuts
  const handleResetAll = useCallback(() => {
    resetAllShortcuts();
  }, [resetAllShortcuts]);

  if (!isOpen) return null;

  const groupedShortcuts = groupShortcutsByCategory(shortcuts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-modal-overlay="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (editingAction) {
            handleCancelEdit();
          } else {
            onClose();
          }
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
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
          <div className="flex items-center gap-2">
            {hasCustomizations && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                title="Endurstilla allt"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Endurstilla</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Loka"
            >
              <X size={20} />
            </button>
          </div>
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
                    {categoryShortcuts.map((shortcut) => {
                      const isEditing = editingAction === shortcut.action;
                      const displayKey = isEditing
                        ? pendingKey || "..."
                        : shortcut.key;

                      return (
                        <div
                          key={shortcut.action}
                          className={`flex items-center justify-between rounded-lg p-2 transition-colors ${
                            isEditing
                              ? "bg-[var(--accent-light)] ring-2 ring-[var(--accent-color)]"
                              : "hover:bg-[var(--bg-primary)]"
                          }`}
                        >
                          <span className="text-[var(--text-primary)]">
                            {shortcut.descriptionIs}
                          </span>
                          <div className="flex items-center gap-2">
                            {/* Show reset button if customized */}
                            {shortcut.isCustomized && !isEditing && (
                              <button
                                onClick={() =>
                                  handleResetShortcut(shortcut.action)
                                }
                                className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-color)]"
                                title={`Endurstilla (${formatShortcutKey(shortcut.defaultKey)})`}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}

                            {/* Key display / edit button */}
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  handleCancelEdit();
                                } else {
                                  handleStartEdit(shortcut.action);
                                }
                              }}
                              className={`inline-flex min-w-[3rem] items-center justify-center gap-1.5 rounded px-2 py-1 font-mono text-sm transition-colors ${
                                isEditing
                                  ? "bg-[var(--accent-color)] text-white"
                                  : shortcut.isCustomized
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm hover:bg-[var(--border-color)]"
                              }`}
                              title={
                                isEditing
                                  ? "Hætta við"
                                  : "Smelltu til að breyta"
                              }
                            >
                              {isEditing ? (
                                <>
                                  <span>{formatShortcutKey(displayKey)}</span>
                                  {pendingKey && <Check size={12} />}
                                </>
                              ) : (
                                <>
                                  <span>{formatShortcutKey(displayKey)}</span>
                                  <Edit2
                                    size={10}
                                    className="opacity-0 group-hover:opacity-100"
                                  />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-color)] px-6 py-4">
          <div className="text-center text-sm text-[var(--text-secondary)]">
            {editingAction ? (
              <span className="text-[var(--accent-color)]">
                Ýttu á nýjan lykil til að skipta um flýtilykil
              </span>
            ) : (
              <span>
                Smelltu á flýtilykil til að breyta honum. Ýttu á{" "}
                <kbd className="rounded bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-xs">
                  ?
                </kbd>{" "}
                hvar sem er til að opna þessa hjálp.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
