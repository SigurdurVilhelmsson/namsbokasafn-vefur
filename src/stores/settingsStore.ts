import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types for settings
export type Theme = "light" | "dark";
export type FontSize = "small" | "medium" | "large" | "xlarge";
export type FontFamily = "serif" | "sans";

// Shortcut action identifiers
export type ShortcutAction =
  | "prevSection"
  | "nextSection"
  | "goHome"
  | "goFlashcards"
  | "goGlossary"
  | "toggleSidebar"
  | "toggleFocusMode"
  | "toggleTheme"
  | "openSearch"
  | "showShortcuts"
  | "closeModal";

// Default keyboard shortcuts
export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string> = {
  prevSection: "ArrowLeft",
  nextSection: "ArrowRight",
  goHome: "g h",
  goFlashcards: "g f",
  goGlossary: "g o",
  toggleSidebar: "s",
  toggleFocusMode: "f",
  toggleTheme: "t",
  openSearch: "/",
  showShortcuts: "?",
  closeModal: "Escape",
};

// Custom shortcut preferences (only stores overrides)
export type ShortcutPreferences = Partial<Record<ShortcutAction, string>>;

interface SettingsState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Font size
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

  // Font family
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;

  // Sidebar open/closed state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Keyboard shortcut preferences
  shortcutPreferences: ShortcutPreferences;
  setShortcut: (action: ShortcutAction, key: string) => void;
  resetShortcut: (action: ShortcutAction) => void;
  resetAllShortcuts: () => void;
  getShortcut: (action: ShortcutAction) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default values
      theme: "light",
      fontSize: "medium",
      fontFamily: "serif",
      sidebarOpen: false, // Closed by default on mobile; desktop overrides with lg:translate-x-0
      shortcutPreferences: {},

      // Theme methods
      setTheme: (theme) => {
        set({ theme });
        // Update dark class on html element
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          if (newTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return { theme: newTheme };
        }),

      // Font size methods
      setFontSize: (fontSize) => set({ fontSize }),

      // Font family methods
      setFontFamily: (fontFamily) => set({ fontFamily }),

      // Sidebar methods
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Keyboard shortcut methods
      setShortcut: (action, key) =>
        set((state) => ({
          shortcutPreferences: {
            ...state.shortcutPreferences,
            [action]: key,
          },
        })),

      resetShortcut: (action) =>
        set((state) => {
          const newPrefs = { ...state.shortcutPreferences };
          delete newPrefs[action];
          return { shortcutPreferences: newPrefs };
        }),

      resetAllShortcuts: () => set({ shortcutPreferences: {} }),

      getShortcut: (action) => {
        const { shortcutPreferences } = get();
        return shortcutPreferences[action] || DEFAULT_SHORTCUTS[action];
      },
    }),
    {
      name: "efnafraedi-settings",
    },
  ),
);
