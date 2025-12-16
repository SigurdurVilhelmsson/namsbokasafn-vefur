import { useState, useEffect } from "react";
import { Moon, Sun, Menu, Search, Settings, ChevronLeft, Home } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "@/hooks/useTheme";
import { useBook } from "@/hooks/useBook";
import { Link, useParams } from "react-router-dom";
import SettingsModal from "@/components/ui/SettingsModal";
import SearchModal from "@/components/ui/SearchModal";
import { loadTableOfContents } from "@/utils/contentLoader";
import type { TableOfContents } from "@/types/content";

export default function Header() {
  const { toggleTheme, isDark } = useTheme();
  const { toggleSidebar } = useSettingsStore();
  const { book, bookSlug } = useBook();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const { chapterSlug, sectionSlug } = useParams();

  // Load table of contents to get section titles
  useEffect(() => {
    if (!bookSlug) return;
    loadTableOfContents(bookSlug)
      .then(setToc)
      .catch((error) => {
        console.error("Gat ekki hlaðið efnisyfirliti:", error);
      });
  }, [bookSlug]);

  // Find current chapter and section titles
  const currentChapter = toc?.chapters.find((c) => c.slug === chapterSlug);
  const currentSection = currentChapter?.sections.find(
    (s) => s.slug === sectionSlug,
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        {/* Top bar with logo and controls */}
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left side: Hamburger menu for mobile and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="-ml-2 rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white lg:hidden"
              aria-label="Opna/loka valmynd"
            >
              <Menu size={20} />
            </button>

            {/* Link to catalog */}
            <Link
              to="/"
              className="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              aria-label="Til baka í bókasafn"
              title="Til baka í bókasafn"
            >
              <Home size={20} />
            </Link>

            <Link
              to={`/${bookSlug}`}
              className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100 no-underline transition-opacity hover:opacity-80"
            >
              {book?.title ?? 'Lesari'}
            </Link>
          </div>

          {/* Right side: Search button, theme button, settings button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              aria-label="Leita"
              title="Leita (Ctrl+K)"
            >
              <Search size={20} />
            </button>

            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              aria-label={
                isDark ? "Skipta yfir í ljóst þema" : "Skipta yfir í dökkt þema"
              }
              title={isDark ? "Ljóst þema" : "Dökkt þema"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
              aria-label="Stillingar"
              title="Stillingar"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Colored banner with current section (only show when viewing a section) */}
        {currentChapter && currentSection && (
          <div className="bg-[var(--header-banner)] text-[var(--header-banner-text)] px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <Link
                to={`/${bookSlug}`}
                className="text-[var(--header-banner-text)] hover:opacity-80 transition-opacity no-underline"
                aria-label="Til baka á heim síðu"
              >
                <ChevronLeft size={20} />
              </Link>
              <div>
                <div className="text-sm opacity-90 font-sans">
                  {currentChapter.number}. {currentChapter.title}
                </div>
                <div className="text-lg font-bold font-sans">
                  {currentSection.number} {currentSection.title}
                </div>
              </div>
            </div>
          </div>
        )}
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
