import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  List,
  X,
  Home,
  Maximize2,
} from "lucide-react";
import { loadTableOfContents, findSectionBySlug } from "@/utils/contentLoader";
import type { Chapter, Section, TableOfContents } from "@/types/content";

// =============================================================================
// TYPES
// =============================================================================

interface FocusModeNavProps {
  bookSlug: string;
  onExitFocusMode: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function FocusModeNav({
  bookSlug,
  onExitFocusMode,
}: FocusModeNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { chapterSlug, sectionSlug } = useParams<{
    chapterSlug: string;
    sectionSlug: string;
  }>();
  const [expanded, setExpanded] = useState(false);
  const [toc, setToc] = useState<TableOfContents | null>(null);

  // Load TOC for navigation
  useEffect(() => {
    loadTableOfContents(bookSlug)
      .then(setToc)
      .catch(() => setToc(null));
  }, [bookSlug]);

  // Calculate navigation based on current location (derived state)
  const nav = useMemo(() => {
    if (!toc || !chapterSlug || !sectionSlug) {
      return { previous: null, next: null, currentTitle: "" };
    }

    const result = findSectionBySlug(toc, chapterSlug, sectionSlug);
    if (!result) {
      return { previous: null, next: null, currentTitle: "" };
    }

    const { chapter, section } = result;
    const chapterIndex = toc.chapters.findIndex((c) => c.slug === chapterSlug);
    const sectionIndex = chapter.sections.findIndex(
      (s) => s.slug === sectionSlug,
    );

    let previous: { chapter: Chapter; section: Section } | null = null;
    let next: { chapter: Chapter; section: Section } | null = null;

    if (sectionIndex > 0) {
      previous = { chapter, section: chapter.sections[sectionIndex - 1] };
    } else if (chapterIndex > 0) {
      const prevChapter = toc.chapters[chapterIndex - 1];
      previous = {
        chapter: prevChapter,
        section: prevChapter.sections[prevChapter.sections.length - 1],
      };
    }

    if (sectionIndex < chapter.sections.length - 1) {
      next = { chapter, section: chapter.sections[sectionIndex + 1] };
    } else if (chapterIndex < toc.chapters.length - 1) {
      const nextChapter = toc.chapters[chapterIndex + 1];
      next = { chapter: nextChapter, section: nextChapter.sections[0] };
    }

    return {
      previous,
      next,
      currentTitle: section.title,
    };
  }, [toc, chapterSlug, sectionSlug]);

  const handleNavigate = (
    navItem: { chapter: Chapter; section: Section } | null,
  ) => {
    if (!navItem) return;
    navigate(
      `/${bookSlug}/kafli/${navItem.chapter.slug}/${navItem.section.slug}`,
    );
  };

  const handleGoHome = () => {
    navigate(`/${bookSlug}`);
    onExitFocusMode();
  };

  // Check if we're in a section view
  const isInSection = location.pathname.includes("/kafli/") && sectionSlug;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className={`flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1 shadow-lg transition-all ${
          expanded ? "px-2" : ""
        }`}
      >
        {expanded ? (
          <>
            {/* Home button */}
            <button
              onClick={handleGoHome}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Forsíða"
              title="Forsíða"
            >
              <Home size={18} />
            </button>

            {/* Previous button */}
            <button
              onClick={() => handleNavigate(nav.previous)}
              disabled={!nav.previous}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Fyrri kafli"
              title={nav.previous?.section.title || "Enginn fyrri kafli"}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Current section title */}
            {isInSection && nav.currentTitle && (
              <span className="max-w-[150px] truncate px-2 font-sans text-xs text-[var(--text-secondary)]">
                {nav.currentTitle}
              </span>
            )}

            {/* Next button */}
            <button
              onClick={() => handleNavigate(nav.next)}
              disabled={!nav.next}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Næsti kafli"
              title={nav.next?.section.title || "Enginn næsti kafli"}
            >
              <ChevronRight size={18} />
            </button>

            {/* TOC / Exit focus mode */}
            <button
              onClick={onExitFocusMode}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Sýna hliðarstiku"
              title="Hætta í einbeitingarham"
            >
              <List size={18} />
            </button>

            {/* Collapse button */}
            <button
              onClick={() => setExpanded(false)}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Fela valmynd"
              title="Fela"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            {/* Expand button */}
            <button
              onClick={() => setExpanded(true)}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
              aria-label="Sýna valmynd"
              title="Sýna valmynd"
            >
              <Maximize2 size={18} />
            </button>

            {/* Quick exit */}
            <button
              onClick={onExitFocusMode}
              className="rounded-full bg-[var(--accent-color)] px-3 py-1.5 font-sans text-xs font-medium text-white transition-opacity hover:opacity-90"
              aria-label="Hætta í einbeitingarham"
            >
              Hætta (F)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
