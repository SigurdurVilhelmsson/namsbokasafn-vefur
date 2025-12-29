import { useState, useCallback } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import { BookContext, useBookFromParams } from "@/hooks/useBook";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import Header from "./Header";
import Sidebar from "./Sidebar";
import FocusModeNav from "./FocusModeNav";
import KeyboardShortcutsModal from "@/components/ui/KeyboardShortcutsModal";

export default function BookLayout() {
  const { fontSize, fontFamily } = useSettingsStore();
  const bookContext = useBookFromParams();

  // Focus mode state
  const [focusMode, setFocusMode] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Toggle focus mode callback
  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  // Open shortcuts modal callback
  const handleOpenShortcuts = useCallback(() => {
    setShowShortcutsModal(true);
  }, []);

  // Keyboard shortcuts
  const { shortcuts } = useKeyboardShortcuts({
    enabled: true,
    bookSlug: bookContext.bookSlug,
    onToggleFocusMode: handleToggleFocusMode,
    onOpenShortcuts: handleOpenShortcuts,
  });

  // If book doesn't exist, redirect to landing page
  if (!bookContext.book) {
    return <Navigate to="/" replace />;
  }

  return (
    <BookContext.Provider value={bookContext}>
      <div
        className={`min-h-screen font-size-${fontSize} ${
          fontFamily === "sans" ? "font-sans" : "font-serif"
        } ${focusMode ? "focus-mode" : ""}`}
      >
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--bg-secondary)] focus:text-[var(--text-primary)] focus:rounded-lg focus:border-2 focus:border-[var(--accent-color)] focus:outline-none"
        >
          Hoppa beint í efni
        </a>

        {/* Hide header in focus mode */}
        {!focusMode && <Header />}

        <div className="flex">
          {/* Hide sidebar in focus mode */}
          {!focusMode && <Sidebar />}

          {/* Main content area with max-width for comfortable reading */}
          <main
            id="main-content"
            className={`flex-1 overflow-x-hidden ${
              focusMode ? "" : "lg:ml-80"
            }`}
          >
            <div className="mx-auto max-w-7xl px-4 py-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Focus mode floating navigation */}
        {focusMode && (
          <FocusModeNav
            bookSlug={bookContext.bookSlug}
            onExitFocusMode={handleToggleFocusMode}
          />
        )}

        {/* Keyboard shortcuts modal */}
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
          shortcuts={shortcuts}
        />
      </div>
    </BookContext.Provider>
  );
}
