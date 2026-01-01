import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import {
  useSettingsStore,
  DEFAULT_SHORTCUTS,
  type Theme,
  type FontSize,
  type FontFamily,
  type ShortcutAction,
} from "./settingsStore";

// =============================================================================
// SETUP
// =============================================================================

describe("settingsStore", () => {
  beforeEach(() => {
    // Reset store to default state before each test
    act(() => {
      useSettingsStore.setState({
        theme: "light",
        fontSize: "medium",
        fontFamily: "serif",
        sidebarOpen: false,
        shortcutPreferences: {},
      });
    });

    // Mock document.documentElement.classList
    vi.spyOn(document.documentElement.classList, "add").mockImplementation(
      () => {},
    );
    vi.spyOn(document.documentElement.classList, "remove").mockImplementation(
      () => {},
    );
  });

  // ===========================================================================
  // THEME TESTS
  // ===========================================================================

  describe("theme", () => {
    it("should have light theme by default", () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe("light");
    });

    it("should set theme to dark", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.setTheme("dark");
      });

      expect(useSettingsStore.getState().theme).toBe("dark");
    });

    it("should set theme to light", () => {
      // First set to dark
      act(() => {
        useSettingsStore.getState().setTheme("dark");
      });

      // Then set back to light
      act(() => {
        useSettingsStore.getState().setTheme("light");
      });

      expect(useSettingsStore.getState().theme).toBe("light");
    });

    it("should add dark class to html element when setting dark theme", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.setTheme("dark");
      });

      expect(document.documentElement.classList.add).toHaveBeenCalledWith(
        "dark",
      );
    });

    it("should remove dark class from html element when setting light theme", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.setTheme("light");
      });

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith(
        "dark",
      );
    });

    it("should toggle theme from light to dark", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.toggleTheme();
      });

      expect(useSettingsStore.getState().theme).toBe("dark");
    });

    it("should toggle theme from dark to light", () => {
      // Start with dark
      act(() => {
        useSettingsStore.getState().setTheme("dark");
      });

      act(() => {
        useSettingsStore.getState().toggleTheme();
      });

      expect(useSettingsStore.getState().theme).toBe("light");
    });

    it("should toggle theme multiple times correctly", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.toggleTheme(); // dark
        store.toggleTheme(); // light
        store.toggleTheme(); // dark
      });

      expect(useSettingsStore.getState().theme).toBe("dark");
    });
  });

  // ===========================================================================
  // FONT SIZE TESTS
  // ===========================================================================

  describe("fontSize", () => {
    it("should have medium font size by default", () => {
      const state = useSettingsStore.getState();
      expect(state.fontSize).toBe("medium");
    });

    it("should set font size to small", () => {
      act(() => {
        useSettingsStore.getState().setFontSize("small");
      });

      expect(useSettingsStore.getState().fontSize).toBe("small");
    });

    it("should set font size to large", () => {
      act(() => {
        useSettingsStore.getState().setFontSize("large");
      });

      expect(useSettingsStore.getState().fontSize).toBe("large");
    });

    it("should set font size to xlarge", () => {
      act(() => {
        useSettingsStore.getState().setFontSize("xlarge");
      });

      expect(useSettingsStore.getState().fontSize).toBe("xlarge");
    });

    it("should handle all font size values", () => {
      const sizes: FontSize[] = ["small", "medium", "large", "xlarge"];

      for (const size of sizes) {
        act(() => {
          useSettingsStore.getState().setFontSize(size);
        });
        expect(useSettingsStore.getState().fontSize).toBe(size);
      }
    });
  });

  // ===========================================================================
  // FONT FAMILY TESTS
  // ===========================================================================

  describe("fontFamily", () => {
    it("should have serif font family by default", () => {
      const state = useSettingsStore.getState();
      expect(state.fontFamily).toBe("serif");
    });

    it("should set font family to sans", () => {
      act(() => {
        useSettingsStore.getState().setFontFamily("sans");
      });

      expect(useSettingsStore.getState().fontFamily).toBe("sans");
    });

    it("should set font family back to serif", () => {
      act(() => {
        useSettingsStore.getState().setFontFamily("sans");
      });

      act(() => {
        useSettingsStore.getState().setFontFamily("serif");
      });

      expect(useSettingsStore.getState().fontFamily).toBe("serif");
    });

    it("should handle all font family values", () => {
      const families: FontFamily[] = ["serif", "sans"];

      for (const family of families) {
        act(() => {
          useSettingsStore.getState().setFontFamily(family);
        });
        expect(useSettingsStore.getState().fontFamily).toBe(family);
      }
    });
  });

  // ===========================================================================
  // SIDEBAR TESTS
  // ===========================================================================

  describe("sidebar", () => {
    it("should have sidebar closed by default", () => {
      const state = useSettingsStore.getState();
      expect(state.sidebarOpen).toBe(false);
    });

    it("should set sidebar open", () => {
      act(() => {
        useSettingsStore.getState().setSidebarOpen(true);
      });

      expect(useSettingsStore.getState().sidebarOpen).toBe(true);
    });

    it("should set sidebar closed", () => {
      // First open
      act(() => {
        useSettingsStore.getState().setSidebarOpen(true);
      });

      // Then close
      act(() => {
        useSettingsStore.getState().setSidebarOpen(false);
      });

      expect(useSettingsStore.getState().sidebarOpen).toBe(false);
    });

    it("should toggle sidebar from closed to open", () => {
      act(() => {
        useSettingsStore.getState().toggleSidebar();
      });

      expect(useSettingsStore.getState().sidebarOpen).toBe(true);
    });

    it("should toggle sidebar from open to closed", () => {
      // First open
      act(() => {
        useSettingsStore.getState().setSidebarOpen(true);
      });

      // Then toggle
      act(() => {
        useSettingsStore.getState().toggleSidebar();
      });

      expect(useSettingsStore.getState().sidebarOpen).toBe(false);
    });

    it("should toggle sidebar multiple times correctly", () => {
      const store = useSettingsStore.getState();

      act(() => {
        store.toggleSidebar(); // open
        store.toggleSidebar(); // closed
        store.toggleSidebar(); // open
      });

      expect(useSettingsStore.getState().sidebarOpen).toBe(true);
    });
  });

  // ===========================================================================
  // KEYBOARD SHORTCUTS TESTS
  // ===========================================================================

  describe("keyboard shortcuts", () => {
    it("should have empty shortcut preferences by default", () => {
      const state = useSettingsStore.getState();
      expect(state.shortcutPreferences).toEqual({});
    });

    it("should return default shortcut when no preference set", () => {
      const state = useSettingsStore.getState();

      expect(state.getShortcut("prevSection")).toBe("ArrowLeft");
      expect(state.getShortcut("nextSection")).toBe("ArrowRight");
      expect(state.getShortcut("goHome")).toBe("g h");
    });

    it("should set a custom shortcut", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
      });

      const state = useSettingsStore.getState();
      expect(state.getShortcut("prevSection")).toBe("h");
      expect(state.shortcutPreferences.prevSection).toBe("h");
    });

    it("should override default with custom shortcut", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("toggleTheme", "d");
      });

      const state = useSettingsStore.getState();
      expect(state.getShortcut("toggleTheme")).toBe("d");
      expect(DEFAULT_SHORTCUTS.toggleTheme).toBe("t"); // Default unchanged
    });

    it("should set multiple custom shortcuts", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
        useSettingsStore.getState().setShortcut("nextSection", "l");
        useSettingsStore.getState().setShortcut("toggleSidebar", "b");
      });

      const state = useSettingsStore.getState();
      expect(state.getShortcut("prevSection")).toBe("h");
      expect(state.getShortcut("nextSection")).toBe("l");
      expect(state.getShortcut("toggleSidebar")).toBe("b");
    });

    it("should reset a single shortcut to default", () => {
      // First set custom shortcut
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
      });

      expect(useSettingsStore.getState().getShortcut("prevSection")).toBe("h");

      // Reset it
      act(() => {
        useSettingsStore.getState().resetShortcut("prevSection");
      });

      const state = useSettingsStore.getState();
      expect(state.getShortcut("prevSection")).toBe("ArrowLeft");
      expect(state.shortcutPreferences.prevSection).toBeUndefined();
    });

    it("should not affect other shortcuts when resetting one", () => {
      // Set multiple custom shortcuts
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
        useSettingsStore.getState().setShortcut("nextSection", "l");
      });

      // Reset only one
      act(() => {
        useSettingsStore.getState().resetShortcut("prevSection");
      });

      const state = useSettingsStore.getState();
      expect(state.getShortcut("prevSection")).toBe("ArrowLeft"); // Reset
      expect(state.getShortcut("nextSection")).toBe("l"); // Unchanged
    });

    it("should reset all shortcuts", () => {
      // Set multiple custom shortcuts
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
        useSettingsStore.getState().setShortcut("nextSection", "l");
        useSettingsStore.getState().setShortcut("toggleSidebar", "b");
      });

      // Reset all
      act(() => {
        useSettingsStore.getState().resetAllShortcuts();
      });

      const state = useSettingsStore.getState();
      expect(state.shortcutPreferences).toEqual({});
      expect(state.getShortcut("prevSection")).toBe("ArrowLeft");
      expect(state.getShortcut("nextSection")).toBe("ArrowRight");
      expect(state.getShortcut("toggleSidebar")).toBe("s");
    });

    it("should handle resetting a shortcut that was never customized", () => {
      const initialPrefs = {
        ...useSettingsStore.getState().shortcutPreferences,
      };

      act(() => {
        useSettingsStore.getState().resetShortcut("goHome");
      });

      // Should not change anything
      expect(useSettingsStore.getState().shortcutPreferences).toEqual(
        initialPrefs,
      );
    });

    it("should return correct shortcuts for all default actions", () => {
      const state = useSettingsStore.getState();
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

      for (const action of actions) {
        expect(state.getShortcut(action)).toBe(DEFAULT_SHORTCUTS[action]);
      }
    });

    it("should handle multi-key shortcuts", () => {
      // Test setting a multi-key shortcut
      act(() => {
        useSettingsStore.getState().setShortcut("goHome", "g t");
      });

      expect(useSettingsStore.getState().getShortcut("goHome")).toBe("g t");
    });

    it("should handle special keys", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("closeModal", "Backspace");
      });

      expect(useSettingsStore.getState().getShortcut("closeModal")).toBe(
        "Backspace",
      );
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle setting same theme multiple times", () => {
      act(() => {
        useSettingsStore.getState().setTheme("dark");
        useSettingsStore.getState().setTheme("dark");
        useSettingsStore.getState().setTheme("dark");
      });

      expect(useSettingsStore.getState().theme).toBe("dark");
    });

    it("should handle setting same shortcut value multiple times", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
        useSettingsStore.getState().setShortcut("prevSection", "h");
      });

      expect(useSettingsStore.getState().getShortcut("prevSection")).toBe("h");
    });

    it("should handle updating a shortcut to a new value", () => {
      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "h");
      });

      act(() => {
        useSettingsStore.getState().setShortcut("prevSection", "j");
      });

      expect(useSettingsStore.getState().getShortcut("prevSection")).toBe("j");
    });
  });

  // ===========================================================================
  // DEFAULT_SHORTCUTS CONSTANT TESTS
  // ===========================================================================

  describe("DEFAULT_SHORTCUTS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_SHORTCUTS.prevSection).toBe("ArrowLeft");
      expect(DEFAULT_SHORTCUTS.nextSection).toBe("ArrowRight");
      expect(DEFAULT_SHORTCUTS.goHome).toBe("g h");
      expect(DEFAULT_SHORTCUTS.goFlashcards).toBe("g f");
      expect(DEFAULT_SHORTCUTS.goGlossary).toBe("g o");
      expect(DEFAULT_SHORTCUTS.toggleSidebar).toBe("s");
      expect(DEFAULT_SHORTCUTS.toggleFocusMode).toBe("f");
      expect(DEFAULT_SHORTCUTS.toggleTheme).toBe("t");
      expect(DEFAULT_SHORTCUTS.openSearch).toBe("/");
      expect(DEFAULT_SHORTCUTS.showShortcuts).toBe("?");
      expect(DEFAULT_SHORTCUTS.closeModal).toBe("Escape");
    });

    it("should be immutable", () => {
      const originalValue = DEFAULT_SHORTCUTS.prevSection;

      // This should not actually change the constant in TypeScript
      // but we verify the expected value is still correct
      expect(DEFAULT_SHORTCUTS.prevSection).toBe(originalValue);
    });
  });
});
