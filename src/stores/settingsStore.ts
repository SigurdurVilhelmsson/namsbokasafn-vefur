import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Gerðir fyrir stillingar
export type Theme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type FontFamily = 'serif' | 'sans';

interface SettingsState {
  // Þema (theme)
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Leturstærð (font size)
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;

  // Leturgerð (font family)
  fontFamily: FontFamily;
  setFontFamily: (family: FontFamily) => void;

  // Hliðarspjald opið/lokað (sidebar open/closed)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Sjálfgefin gildi (defaults)
      theme: 'light',
      fontSize: 'medium',
      fontFamily: 'serif',
      sidebarOpen: true,

      // Þema aðferðir (theme methods)
      setTheme: (theme) => {
        set({ theme });
        // Uppfæra dark class á html elementinu
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { theme: newTheme };
        }),

      // Leturstærð aðferðir (font size methods)
      setFontSize: (fontSize) => set({ fontSize }),

      // Leturgerð aðferðir (font family methods)
      setFontFamily: (fontFamily) => set({ fontFamily }),

      // Hliðarspjald aðferðir (sidebar methods)
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: 'efnafraedi-settings',
    }
  )
);
