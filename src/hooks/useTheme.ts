import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

// Hook to manage theme and apply to document
export function useTheme() {
  const { theme, setTheme, toggleTheme } = useSettingsStore();

  // Apply theme on mount
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Check system preference if none saved
  useEffect(() => {
    const checkSystemPreference = () => {
      if (
        !localStorage.getItem("efnafraedi-settings") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        setTheme("dark");
      }
    };

    checkSystemPreference();
  }, [setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
  };
}
