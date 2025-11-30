import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

// Hook til að stjórna þema og beita því á documentið (manage theme and apply to document)
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useSettingsStore();

  // Beita þema við upphaf (apply theme on mount)
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Athuga kerfisval ef ekkert er vistað (check system preference if none saved)
  useEffect(() => {
    const checkSystemPreference = () => {
      if (
        !localStorage.getItem('efnafraedi-settings') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        setTheme('dark');
      }
    };

    checkSystemPreference();
  }, [setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}
