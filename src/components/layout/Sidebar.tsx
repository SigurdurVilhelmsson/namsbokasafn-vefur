import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  BookOpen,
  Brain,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useReaderStore } from "@/stores/readerStore";
import { loadTableOfContents } from "@/utils/contentLoader";
import type { TableOfContents, Chapter } from "@/types/content";

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useSettingsStore();
  const { isRead, getChapterProgress } = useReaderStore();
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const [manuallyExpandedChapters, setManuallyExpandedChapters] = useState<
    Set<number>
  >(new Set());
  const { chapterSlug, sectionSlug } = useParams();

  // Load table of contents on mount
  useEffect(() => {
    loadTableOfContents()
      .then(setToc)
      .catch((error) => {
        console.error("Gat ekki hlaðið efnisyfirliti:", error);
      });
  }, []);

  // Compute which chapters should be expanded (current chapter + manually expanded)
  const expandedChapters = new Set(manuallyExpandedChapters);
  if (toc && chapterSlug) {
    const currentChapter = toc.chapters.find((c) => c.slug === chapterSlug);
    if (currentChapter) {
      expandedChapters.add(currentChapter.number);
    }
  }
  // Always expand chapter 1 by default
  if (toc && toc.chapters.length > 0) {
    expandedChapters.add(1);
  }

  const toggleChapter = (chapterNumber: number) => {
    setManuallyExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterNumber)) {
        newSet.delete(chapterNumber);
      } else {
        newSet.add(chapterNumber);
      }
      return newSet;
    });
  };

  if (!toc) {
    return (
      <aside className="fixed left-0 top-14 lg:top-[7rem] z-30 h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-7rem)] w-80 overflow-y-auto bg-white p-4 shadow-none">
        <p className="text-gray-500">Hleður efnisyfirlit...</p>
      </aside>
    );
  }

  return (
    <>
      {/* Overlay (backdrop) */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        aria-hidden={!sidebarOpen ? "true" : undefined}
        className={`
          fixed
          inset-y-0 lg:top-[7rem] left-0
          z-50 lg:z-30
          w-80 bg-white
          transition-transform duration-300 ease-out
          overflow-y-auto
          lg:h-[calc(100vh-7rem)]
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
          lg:shadow-none
        `}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
            <h2 className="font-semibold text-gray-900">Efnisyfirlit</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 -mr-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              aria-label="Loka valmynd"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar content */}
          <nav className="flex-1 overflow-y-auto py-4" aria-label="Efnisyfirlit">
            <ul className="space-y-1 px-2">
              {toc.chapters.map((chapter) => (
                <ChapterItem
                  key={chapter.number}
                  chapter={chapter}
                  expanded={expandedChapters.has(chapter.number)}
                  onToggle={() => toggleChapter(chapter.number)}
                  currentChapter={chapterSlug}
                  currentSection={sectionSlug}
                  isRead={isRead}
                  progress={getChapterProgress(
                    chapter.slug,
                    chapter.sections.length,
                  )}
                />
              ))}
            </ul>

            {/* Bottom links */}
            <div className="mt-6 space-y-1 border-t border-gray-100 px-2 pt-4">
              <Link
                to="/ordabok"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <BookOpen size={20} />
                <span className="text-sm">Orðasafn</span>
              </Link>
              <Link
                to="/minniskort"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Brain size={20} />
                <span className="text-sm">Minniskort</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

// Chapter item component
interface ChapterItemProps {
  chapter: Chapter;
  expanded: boolean;
  onToggle: () => void;
  currentChapter?: string;
  currentSection?: string;
  isRead: (chapterSlug: string, sectionSlug: string) => boolean;
  progress: number;
}

function ChapterItem({
  chapter,
  expanded,
  onToggle,
  currentChapter,
  currentSection,
  isRead,
  progress,
}: ChapterItemProps) {
  const isCurrentChapter = currentChapter === chapter.slug;

  return (
    <li>
      {/* Chapter progress indicator */}
      {progress > 0 && (
        <div className="mb-2 px-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {chapter.number}. kafli
            </span>
            <span className="text-xs font-medium text-emerald-600">
              {progress}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`chapter-${chapter.number}-sections`}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>
            {chapter.number}. {chapter.title}
          </span>
        </span>
      </button>

      {/* Sections */}
      {expanded && (
        <ul
          id={`chapter-${chapter.number}-sections`}
          className="mt-1 space-y-1"
        >
          {chapter.sections.map((section) => {
            const isCurrent =
              isCurrentChapter && currentSection === section.slug;
            const isReadSection = isRead(chapter.slug, section.slug);

            return (
              <li key={section.slug}>
                <Link
                  to={`/kafli/${chapter.slug}/${section.slug}`}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isCurrent
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isReadSection ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check size={14} className="text-emerald-600" />
                    </span>
                  ) : isCurrent ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <span className="h-2 w-2 rounded-full bg-gray-300" />
                    </span>
                  )}
                  <span className="text-sm">
                    {section.number} {section.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
