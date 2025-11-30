import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Check, X, BookOpen } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useReaderStore } from '@/stores/readerStore';
import { loadTableOfContents } from '@/utils/contentLoader';
import type { TableOfContents, Chapter } from '@/types/content';

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useSettingsStore();
  const { isRead, getChapterProgress } = useReaderStore();
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1]));
  const { chapterSlug, sectionSlug } = useParams();

  // Hlaða efnisyfirliti við upphaf (load TOC on mount)
  useEffect(() => {
    loadTableOfContents()
      .then(setToc)
      .catch((error) => {
        console.error('Gat ekki hlaðið efnisyfirliti:', error);
      });
  }, []);

  // Víkka út kafla sem verið er að lesa (expand current chapter)
  useEffect(() => {
    if (toc && chapterSlug) {
      const chapter = toc.chapters.find((c) => c.slug === chapterSlug);
      if (chapter) {
        setExpandedChapters((prev) => new Set(prev).add(chapter.number));
      }
    }
  }, [chapterSlug, toc]);

  const toggleChapter = (chapterNumber: number) => {
    setExpandedChapters((prev) => {
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
      <aside className="w-80 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <p className="text-[var(--text-secondary)]">Hleður efnisyfirlit...</p>
      </aside>
    );
  }

  return (
    <>
      {/* Yfirlag fyrir farsíma (mobile overlay) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hliðarspjald (sidebar) */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 border-r border-[var(--border-color)] bg-[var(--bg-secondary)]
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4">
          {/* Loka takki fyrir farsíma (close button for mobile) */}
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h2 className="font-sans text-lg font-semibold">Efnisyfirlit</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 hover:bg-[var(--bg-primary)]"
              aria-label="Loka valmynd"
            >
              <X size={20} />
            </button>
          </div>

          {/* Efnisyfirlit (table of contents) */}
          <nav aria-label="Efnisyfirlit">
            <h2 className="mb-4 hidden font-sans text-lg font-semibold lg:block">
              Efnisyfirlit
            </h2>

            <ul className="space-y-2">
              {toc.chapters.map((chapter) => (
                <ChapterItem
                  key={chapter.number}
                  chapter={chapter}
                  expanded={expandedChapters.has(chapter.number)}
                  onToggle={() => toggleChapter(chapter.number)}
                  currentChapter={chapterSlug}
                  currentSection={sectionSlug}
                  isRead={isRead}
                  progress={getChapterProgress(chapter.slug, chapter.sections.length)}
                />
              ))}
            </ul>

            {/* Orðasafn tengill (glossary link) */}
            <div className="mt-6 border-t border-[var(--border-color)] pt-4">
              <Link
                to="/ordabok"
                className="flex items-center gap-2 rounded-lg p-2 font-sans font-medium transition-colors hover:bg-[var(--bg-primary)]"
              >
                <BookOpen size={18} />
                <span>Orðasafn</span>
              </Link>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}

// Hluti fyrir kafla (chapter item component)
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
      <button
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between rounded-lg p-2
          text-left font-sans font-medium transition-colors
          hover:bg-[var(--bg-primary)]
          ${isCurrentChapter ? 'bg-[var(--bg-primary)]' : ''}
        `}
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>
            {chapter.number}. {chapter.title}
          </span>
        </span>
        {progress > 0 && (
          <span className="text-xs text-[var(--text-secondary)]">{progress}%</span>
        )}
      </button>

      {/* Kaflahlutar (sections) */}
      {expanded && (
        <ul className="ml-6 mt-1 space-y-1 border-l-2 border-[var(--border-color)] pl-3">
          {chapter.sections.map((section) => {
            const isCurrent =
              isCurrentChapter && currentSection === section.slug;
            const isReadSection = isRead(chapter.slug, section.slug);

            return (
              <li key={section.slug}>
                <Link
                  to={`/kafli/${chapter.slug}/${section.slug}`}
                  className={`
                    flex items-center gap-2 rounded-lg p-2 text-sm
                    transition-colors hover:bg-[var(--bg-primary)]
                    ${isCurrent ? 'bg-[var(--accent-color)]/10 font-medium text-[var(--accent-color)]' : ''}
                  `}
                >
                  {isReadSection && (
                    <Check size={14} className="text-green-600 dark:text-green-400" />
                  )}
                  <span>
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
