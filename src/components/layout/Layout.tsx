import { Outlet } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { fontSize, fontFamily } = useSettingsStore();

  return (
    <div
      className={`min-h-screen font-size-${fontSize} ${
        fontFamily === "sans" ? "font-sans" : "font-serif"
      }`}
    >
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--bg-secondary)] focus:text-[var(--text-primary)] focus:rounded-lg focus:border-2 focus:border-[var(--accent-color)] focus:outline-none"
      >
        Hoppa beint í efni
      </a>

      <Header />

      <div className="flex">
        <Sidebar />

        {/* Main content area with max-width for comfortable reading */}
        <main id="main-content" className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
