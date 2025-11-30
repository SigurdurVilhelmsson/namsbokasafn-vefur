import { useState } from "react";
import { Moon, Sun, Menu, Search, Settings } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import { Link } from "react-router-dom";
import SettingsModal from "@/components/ui/SettingsModal";
import SearchModal from "@/components/ui/SearchModal";

export default function Header() {
  const { toggleTheme, isDark } = useTheme();
  const { toggleSidebar } = useSettingsStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm">
        <div className="flex h-16 items-center justify-between px-4">
          {/* Left side: Hamburger menu for mobile and title */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 hover:bg-[var(--bg-primary)] lg:hidden"
              aria-label="Opna/loka valmynd"
            >
              <Menu size={24} />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-sans text-[var(--text-primary)]">
                Efnafræðilesari
              </h1>
            </Link>
          </div>

          {/* Right side: Search button, theme button, settings button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
              aria-label="Leita"
              title="Leita (Ctrl+K)"
            >
              <Search size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
              aria-label={
                isDark ? "Skipta yfir í ljóst þema" : "Skipta yfir í dökkt þema"
              }
              title={isDark ? "Ljóst þema" : "Dökkt þema"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg p-2 hover:bg-[var(--bg-primary)] transition-colors"
              aria-label="Stillingar"
              title="Stillingar"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
