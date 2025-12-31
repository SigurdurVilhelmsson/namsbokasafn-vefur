import { useEffect, useCallback, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useSettingsStore,
  DEFAULT_SHORTCUTS,
  type ShortcutAction,
} from "@/stores/settingsStore";

// =============================================================================
// TYPES
// =============================================================================

export interface KeyboardShortcut {
  action: ShortcutAction;
  key: string;
  defaultKey: string;
  description: string;
  descriptionIs: string; // Icelandic description
  category: "navigation" | "reading" | "study" | "general";
  handler: () => void;
  isCustomized: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  bookSlug?: string;
  onToggleFocusMode?: () => void;
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
}

// Shortcut metadata (descriptions and categories)
const SHORTCUT_METADATA: Record<
  ShortcutAction,
  {
    description: string;
    descriptionIs: string;
    category: "navigation" | "reading" | "study" | "general";
  }
> = {
  prevSection: {
    description: "Previous section",
    descriptionIs: "Fyrri kafli",
    category: "navigation",
  },
  nextSection: {
    description: "Next section",
    descriptionIs: "Næsti kafli",
    category: "navigation",
  },
  goHome: {
    description: "Go home (book overview)",
    descriptionIs: "Fara á forsíðu bókar",
    category: "navigation",
  },
  goFlashcards: {
    description: "Go to flashcards",
    descriptionIs: "Fara í minniskort",
    category: "navigation",
  },
  goGlossary: {
    description: "Go to glossary",
    descriptionIs: "Fara í orðabók",
    category: "navigation",
  },
  toggleSidebar: {
    description: "Toggle sidebar",
    descriptionIs: "Opna/loka hliðarslá",
    category: "reading",
  },
  toggleFocusMode: {
    description: "Toggle focus mode",
    descriptionIs: "Einbeitingarhamur",
    category: "reading",
  },
  toggleTheme: {
    description: "Toggle theme (light/dark)",
    descriptionIs: "Skipta um þema",
    category: "reading",
  },
  openSearch: {
    description: "Open search",
    descriptionIs: "Opna leit",
    category: "general",
  },
  showShortcuts: {
    description: "Show keyboard shortcuts",
    descriptionIs: "Sýna flýtilykla",
    category: "general",
  },
  closeModal: {
    description: "Close modal/menu",
    descriptionIs: "Loka glugga",
    category: "general",
  },
};

// =============================================================================
// HOOK
// =============================================================================

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    bookSlug,
    onToggleFocusMode,
    onOpenSearch,
    onOpenShortcuts,
  } = options;

  const navigate = useNavigate();
  // location used for potential future enhancements
  useLocation();
  const { toggleSidebar, toggleTheme, getShortcut } =
    useSettingsStore();
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Check if user is typing in an input field
  const isTyping = useCallback(() => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable =
      activeElement.getAttribute("contenteditable") === "true";

    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      isEditable
    );
  }, []);

  // Navigate to previous/next section based on current URL
  const navigatePrevNext = useCallback((direction: "prev" | "next") => {
    // Find navigation buttons and click them
    const selector =
      direction === "prev"
        ? 'a[aria-label="Fyrri kafli"], button[aria-label="Fyrri kafli"]'
        : 'a[aria-label="Næsti kafli"], button[aria-label="Næsti kafli"]';

    const button = document.querySelector(selector) as HTMLElement;
    if (button && !button.hasAttribute("disabled")) {
      button.click();
    }
  }, []);

  // Create handlers map
  const handlers: Record<ShortcutAction, () => void> = useMemo(
    () => ({
      prevSection: () => navigatePrevNext("prev"),
      nextSection: () => navigatePrevNext("next"),
      goHome: () => {
        if (bookSlug) navigate(`/${bookSlug}`);
      },
      goFlashcards: () => {
        if (bookSlug) navigate(`/${bookSlug}/minniskort`);
      },
      goGlossary: () => {
        if (bookSlug) navigate(`/${bookSlug}/ordabok`);
      },
      toggleSidebar,
      toggleFocusMode: () => onToggleFocusMode?.(),
      toggleTheme,
      openSearch: () => onOpenSearch?.(),
      showShortcuts: () => {
        if (onOpenShortcuts) {
          onOpenShortcuts();
        } else {
          setShortcutsModalOpen(true);
        }
      },
      closeModal: () => {
        setShortcutsModalOpen(false);
        // Also try to close any open modals by clicking overlay
        const overlay = document.querySelector('[data-modal-overlay="true"]');
        if (overlay instanceof HTMLElement) {
          overlay.click();
        }
      },
    }),
    [
      navigatePrevNext,
      bookSlug,
      navigate,
      toggleSidebar,
      onToggleFocusMode,
      toggleTheme,
      onOpenSearch,
      onOpenShortcuts,
    ],
  );

  // Build shortcuts array with current key bindings
  const shortcuts: KeyboardShortcut[] = useMemo(() => {
    const actions: ShortcutAction[] = [
      "prevSection",
      "nextSection",
      "goHome",
      "goFlashcards",
      "goGlossary",
      "toggleSidebar",
      "toggleFocusMode",
      "toggleTheme",
      "openSearch",
      "showShortcuts",
      "closeModal",
    ];

    return actions.map((action) => {
      const currentKey = getShortcut(action);
      const defaultKey = DEFAULT_SHORTCUTS[action];
      const metadata = SHORTCUT_METADATA[action];

      return {
        action,
        key: currentKey,
        defaultKey,
        description: metadata.description,
        descriptionIs: metadata.descriptionIs,
        category: metadata.category,
        handler: handlers[action],
        isCustomized: currentKey !== defaultKey,
      };
    });
  }, [getShortcut, handlers]);

  // Track key sequence for multi-key shortcuts (like "g h")
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing
      if (isTyping()) return;

      // Don't handle if modifier keys are pressed (except Shift for ?)
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const key = event.key;

      // Handle Shift+/ for ?
      const effectiveKey = event.shiftKey && key === "/" ? "?" : key;

      // Update key sequence
      const newSequence = [...keySequence, effectiveKey];

      // Check for multi-key shortcuts
      const sequenceStr = newSequence.join(" ");
      const matchingShortcut = shortcuts.find((s) => s.key === sequenceStr);

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.handler();
        setKeySequence([]);
        return;
      }

      // Check for single-key shortcuts
      const singleKeyShortcut = shortcuts.find((s) => s.key === effectiveKey);
      if (singleKeyShortcut && !newSequence.some((k) => k === "g")) {
        event.preventDefault();
        singleKeyShortcut.handler();
        setKeySequence([]);
        return;
      }

      // If this could be the start of a sequence, track it
      if (effectiveKey === "g") {
        setKeySequence([effectiveKey]);
        // Clear after timeout
        setTimeout(() => setKeySequence([]), 1000);
        return;
      }

      // Clear sequence if no match
      setKeySequence([]);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, isTyping, shortcuts, keySequence]);

  return {
    shortcuts,
    shortcutsModalOpen,
    setShortcutsModalOpen,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format a shortcut key for display
 */
export function formatShortcutKey(key: string): string {
  const keyMap: Record<string, string> = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Escape: "Esc",
    " ": "Space",
  };

  return key
    .split(" ")
    .map((k) => keyMap[k] || k.toUpperCase())
    .join(" ");
}

/**
 * Group shortcuts by category
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcut[],
): Map<string, KeyboardShortcut[]> {
  const grouped = new Map<string, KeyboardShortcut[]>();

  shortcuts.forEach((shortcut) => {
    const existing = grouped.get(shortcut.category) || [];
    existing.push(shortcut);
    grouped.set(shortcut.category, existing);
  });

  return grouped;
}

/**
 * Get category display name in Icelandic
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    navigation: "Leiðsögn",
    reading: "Lestur",
    study: "Nám",
    general: "Almennt",
  };
  return names[category] || category;
}

/**
 * Check if a key string is valid for shortcuts
 */
export function isValidShortcutKey(key: string): boolean {
  // Allow single keys, arrow keys, and multi-key sequences like "g h"
  const validPatterns = [
    /^[a-zA-Z0-9/?=[\]\\;',./`-]$/, // Single printable chars (hyphen at end)
    /^Arrow(Left|Right|Up|Down)$/, // Arrow keys
    /^(Escape|Enter|Tab|Backspace|Delete|Home|End|PageUp|PageDown)$/, // Special keys
    /^[a-zA-Z] [a-zA-Z]$/, // Two-key sequences like "g h"
  ];

  return validPatterns.some((pattern) => pattern.test(key));
}

/**
 * Convert keyboard event to key string
 */
export function keyEventToString(event: KeyboardEvent): string {
  // Handle Shift+/ for ?
  if (event.shiftKey && event.key === "/") {
    return "?";
  }
  return event.key;
}
