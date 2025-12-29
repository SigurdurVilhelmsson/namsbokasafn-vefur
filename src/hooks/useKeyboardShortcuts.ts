import { useEffect, useCallback, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";

// =============================================================================
// TYPES
// =============================================================================

export interface KeyboardShortcut {
  key: string;
  description: string;
  descriptionIs: string; // Icelandic description
  category: "navigation" | "reading" | "study" | "general";
  handler: () => void;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  bookSlug?: string;
  onToggleFocusMode?: () => void;
  onOpenSearch?: () => void;
  onOpenShortcuts?: () => void;
}

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
  const { toggleSidebar, toggleTheme } = useSettingsStore();
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
  const navigatePrevNext = useCallback(
    (direction: "prev" | "next") => {
      // Find navigation buttons and click them
      const selector =
        direction === "prev"
          ? 'a[aria-label="Fyrri kafli"], button[aria-label="Fyrri kafli"]'
          : 'a[aria-label="Næsti kafli"], button[aria-label="Næsti kafli"]';

      const button = document.querySelector(selector) as HTMLElement;
      if (button && !button.hasAttribute("disabled")) {
        button.click();
      }
    },
    [],
  );

  // Define all shortcuts with useMemo to prevent recreation on every render
  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      // Navigation
      {
        key: "ArrowLeft",
        description: "Previous section",
        descriptionIs: "Fyrri kafli",
        category: "navigation" as const,
        handler: () => navigatePrevNext("prev"),
      },
      {
        key: "ArrowRight",
        description: "Next section",
        descriptionIs: "Næsti kafli",
        category: "navigation" as const,
        handler: () => navigatePrevNext("next"),
      },
      {
        key: "g h",
        description: "Go home (book overview)",
        descriptionIs: "Fara á forsíðu bókar",
        category: "navigation" as const,
        handler: () => {
          if (bookSlug) navigate(`/${bookSlug}`);
        },
      },
      {
        key: "g f",
        description: "Go to flashcards",
        descriptionIs: "Fara í minniskort",
        category: "navigation" as const,
        handler: () => {
          if (bookSlug) navigate(`/${bookSlug}/minniskort`);
        },
      },
      {
        key: "g o",
        description: "Go to glossary",
        descriptionIs: "Fara í orðabók",
        category: "navigation" as const,
        handler: () => {
          if (bookSlug) navigate(`/${bookSlug}/ordabok`);
        },
      },

      // Reading
      {
        key: "s",
        description: "Toggle sidebar",
        descriptionIs: "Opna/loka hliðarslá",
        category: "reading" as const,
        handler: toggleSidebar,
      },
      {
        key: "f",
        description: "Toggle focus mode",
        descriptionIs: "Einbeitingarhamur",
        category: "reading" as const,
        handler: () => onToggleFocusMode?.(),
      },
      {
        key: "t",
        description: "Toggle theme (light/dark)",
        descriptionIs: "Skipta um þema",
        category: "reading" as const,
        handler: toggleTheme,
      },

      // General
      {
        key: "/",
        description: "Open search",
        descriptionIs: "Opna leit",
        category: "general" as const,
        handler: () => onOpenSearch?.(),
      },
      {
        key: "?",
        description: "Show keyboard shortcuts",
        descriptionIs: "Sýna flýtilykla",
        category: "general" as const,
        handler: () => {
          if (onOpenShortcuts) {
            onOpenShortcuts();
          } else {
            setShortcutsModalOpen(true);
          }
        },
      },
      {
        key: "Escape",
        description: "Close modal/menu",
        descriptionIs: "Loka glugga",
        category: "general" as const,
        handler: () => {
          setShortcutsModalOpen(false);
          // Also try to close any open modals by clicking overlay
          const overlay = document.querySelector('[data-modal-overlay="true"]');
          if (overlay instanceof HTMLElement) {
            overlay.click();
          }
        },
      },
    ],
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
  }, [enabled, isTyping, shortcuts, keySequence, navigatePrevNext]);

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
