import { create } from "zustand";
import { persist } from "zustand/middleware";

// Types for settings
export type Theme = "light" | "dark";
export type FontSize = "small" | "medium" | "large" | "xlarge";
export type FontFamily = "serif" | "sans";

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      theme: "light",
      fontSize: "medium",
      fontFamily: "serif",
      sidebarOpen: false, // Closed by default on mobile; desktop overrides with lg:translate-x-0

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
    }),
    {
      name: "efnafraedi-settings",
    },
  ),
);
