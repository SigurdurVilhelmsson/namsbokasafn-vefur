import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Check, Bookmark, Highlighter, Volume2, Maximize2, Minimize2 } from "lucide-react";
import {
  loadTableOfContents,
  loadSectionContent,
  findSectionBySlug,
} from "@/utils/contentLoader";
import { useReaderStore } from "@/stores/readerStore";
import { useReferenceStore } from "@/stores/referenceStore";
import { useBook } from "@/hooks/useBook";
import { useReadingSession } from "@/hooks/useReadingSession";
import MarkdownRenderer from "./MarkdownRenderer";
import NavigationButtons from "./NavigationButtons";
import LearningObjectives from "./LearningObjectives";
import ContentAttribution from "./ContentAttribution";
import TextHighlighter from "./TextHighlighter";
import TTSControls from "./TTSControls";
import AnnotationSidebar from "./AnnotationSidebar";
import InlineFlashcardReview from "./InlineFlashcardReview";
import SectionMetadata from "./SectionMetadata";
import type {
  SectionContent,
  NavigationContext,
  Chapter,
  Section,
} from "@/types/content";

// Context type from BookLayout
interface BookLayoutContext {
  onToggleFocusMode: () => void;
  focusMode: boolean;
}

export default function SectionView() {
  const { chapterSlug, sectionSlug } = useParams<{
    chapterSlug: string;
    sectionSlug: string;
  }>();
  const { bookSlug } = useBook();
  const [content, setContent] = useState<SectionContent | null>(null);
  const [navigation, setNavigation] = useState<NavigationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get focus mode context from BookLayout
  const { onToggleFocusMode, focusMode } = useOutletContext<BookLayoutContext>() || {};

  // New Phase 1 state
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);
  const [showTTSControls, setShowTTSControls] = useState(false);

  const {
    markAsRead,
    isRead,
    setCurrentLocation,
    isBookmarked,
    addBookmark,
    removeBookmark,
  } = useReaderStore();

  const buildIndexFromContent = useReferenceStore(
    (state) => state.buildIndexFromContent
  );

  // Track reading time for analytics
  useReadingSession(
    bookSlug,
    chapterSlug || "",
    sectionSlug || ""
  );

  // Hlaða efni kafla (load section content)
  useEffect(() => {
    if (!chapterSlug || !sectionSlug || !bookSlug) return;

    // Setja núverandi staðsetningu
    setCurrentLocation(chapterSlug, sectionSlug);

    // Async loading function
    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // First load TOC to find the section's file
        const toc = await loadTableOfContents(bookSlug);

        // Find section by slug to get the file name
        const result = findSectionBySlug(toc, chapterSlug, sectionSlug);
        if (!result) {
          setError("Kafli fannst ekki");
          setLoading(false);
          return;
        }

        const { chapter, section } = result;

        // Now load the section content using the file name
        const sectionContent = await loadSectionContent(bookSlug, chapterSlug, section.file);
        setContent(sectionContent);

        // Build reference index from content for cross-references
        const chapterNumber = parseInt(chapterSlug.replace(/\D/g, ""), 10) || 1;
        buildIndexFromContent(
          chapterSlug,
          sectionSlug,
          sectionContent.content,
          chapterNumber
        );

        // Find navigation context
        const chapterIndex = toc.chapters.findIndex(
          (c) => c.slug === chapterSlug,
        );
        const sectionIndex = chapter.sections.findIndex(
          (s) => s.slug === sectionSlug,
        );

        // Finna fyrri og næsta kafla
        let previous: { chapter: Chapter; section: Section } | undefined =
          undefined;
        let next: { chapter: Chapter; section: Section } | undefined =
          undefined;

        if (sectionIndex > 0) {
          // Fyrri kafli í sama chapter
          previous = {
            chapter,
            section: chapter.sections[sectionIndex - 1],
          };
        } else if (chapterIndex > 0) {
          // Síðasti kafli í fyrri chapter
          const prevChapter = toc.chapters[chapterIndex - 1];
          previous = {
            chapter: prevChapter,
            section: prevChapter.sections[prevChapter.sections.length - 1],
          };
        }

        if (sectionIndex < chapter.sections.length - 1) {
          // Næsti kafli í sama chapter
          next = {
            chapter,
            section: chapter.sections[sectionIndex + 1],
          };
        } else if (chapterIndex < toc.chapters.length - 1) {
          // Fyrsti kafli í næsta chapter
          const nextChapter = toc.chapters[chapterIndex + 1];
          next = {
            chapter: nextChapter,
            section: nextChapter.sections[0],
          };
        }

        setNavigation({
          current: { chapter, section },
          previous,
          next,
        });

        setLoading(false);
      } catch (err) {
        console.error("Villa við að hlaða kafla:", err);
        setError("Gat ekki hlaðið kaflann. Vinsamlegast reyndu aftur.");
        setLoading(false);
      }
    };

    loadContent();
  }, [chapterSlug, sectionSlug, bookSlug, setCurrentLocation, buildIndexFromContent]);

  // Merkja sem lesið þegar notandi skrollar niður (mark as read when scrolling down)
  useEffect(() => {
    if (!chapterSlug || !sectionSlug || loading) return;

    const handleScroll = () => {
      const scrollPercentage =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;

      // Merkja sem lesið ef notandi hefur skrollað 80% niður
      if (scrollPercentage > 80 && !isRead(chapterSlug, sectionSlug)) {
        markAsRead(chapterSlug, sectionSlug);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [chapterSlug, sectionSlug, loading, isRead, markAsRead]);

  const handleToggleBookmark = () => {
    if (!chapterSlug || !sectionSlug) return;

    if (isBookmarked(chapterSlug, sectionSlug)) {
      removeBookmark(chapterSlug, sectionSlug);
    } else {
      addBookmark(chapterSlug, sectionSlug);
    }
  };

  const handleMarkAsRead = () => {
    if (!chapterSlug || !sectionSlug) return;
    markAsRead(chapterSlug, sectionSlug);
  };

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Hleður kafla...</p>
      </div>
    );
  }

  if (error || !content || !navigation) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg text-red-600 dark:text-red-400">
            {error || "Villa kom upp"}
          </p>
          <a href={`/${bookSlug}`} className="text-[var(--accent-color)] hover:underline">
            Fara til baka á forsíðu
          </a>
        </div>
      </div>
    );
  }

  const sectionRead =
    chapterSlug && sectionSlug && isRead(chapterSlug, sectionSlug);
  const bookmarked =
    chapterSlug && sectionSlug && isBookmarked(chapterSlug, sectionSlug);

  return (
    <div className="min-h-screen">
      {/* Efni kafla (section content) */}
      <article className="px-6 py-8">
        <div className="mx-auto max-w-reading">
          {/* Aðgerðir (actions) */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMarkAsRead}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-sans font-medium transition-colors ${
                  sectionRead
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "border border-[var(--border-color)] hover:bg-[var(--bg-primary)]"
                }`}
                disabled={!!sectionRead}
              >
                <Check size={16} />
                {sectionRead ? "Lesið" : "Merkja sem lesið"}
              </button>

              {/* Annotation sidebar toggle */}
              <button
                onClick={() => setShowAnnotationSidebar(!showAnnotationSidebar)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-sans font-medium transition-colors ${
                  showAnnotationSidebar
                    ? "bg-[var(--accent-light)] text-[var(--accent-color)]"
                    : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                }`}
                aria-label="Athugasemdir"
                aria-expanded={showAnnotationSidebar}
                title="Athugasemdir og yfirstrikun"
              >
                <Highlighter size={16} />
                <span className="hidden sm:inline">Athugasemdir</span>
              </button>

              {/* TTS toggle */}
              <button
                onClick={() => setShowTTSControls(!showTTSControls)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-sans font-medium transition-colors ${
                  showTTSControls
                    ? "bg-[var(--accent-light)] text-[var(--accent-color)]"
                    : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                }`}
                aria-label="Lesa upphátt"
                aria-expanded={showTTSControls}
                title="Lesa upphátt"
              >
                <Volume2 size={16} />
                <span className="hidden sm:inline">Lesa upphátt</span>
              </button>

              {/* Focus mode toggle */}
              {onToggleFocusMode && (
                <button
                  onClick={onToggleFocusMode}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-sans font-medium transition-colors ${
                    focusMode
                      ? "bg-[var(--accent-light)] text-[var(--accent-color)]"
                      : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                  }`}
                  aria-label={focusMode ? "Loka einbeitingarham" : "Einbeitingarhamur"}
                  title={focusMode ? "Loka einbeitingarham (f)" : "Einbeitingarhamur (f)"}
                >
                  {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span className="hidden sm:inline">
                    {focusMode ? "Loka" : "Einbeiting"}
                  </span>
                </button>
              )}

              {/* ARIA live region for screen readers */}
              <div role="status" aria-live="polite" className="sr-only">
                {sectionRead ? "Kafli merktur sem lesinn" : ""}
              </div>
            </div>

            <button
              onClick={handleToggleBookmark}
              className={`rounded-lg p-2 transition-colors ${
                bookmarked
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
              }`}
              aria-label={
                bookmarked ? "Fjarlægja bókamerki" : "Bæta við bókamerki"
              }
              title={bookmarked ? "Fjarlægja bókamerki" : "Bæta við bókamerki"}
            >
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* TTS Controls (when visible) */}
          {showTTSControls && content && chapterSlug && sectionSlug && (
            <div className="mb-6">
              <TTSControls
                content={content.content}
                bookSlug={bookSlug}
                chapterSlug={chapterSlug}
                sectionSlug={sectionSlug}
              />
            </div>
          )}

          {/* Section metadata: reading time, difficulty, keywords */}
          <SectionMetadata
            readingTime={content.readingTime}
            difficulty={content.difficulty}
            keywords={content.keywords}
          />

          {/* Markmið kafla (learning objectives) */}
          {content.objectives &&
            content.objectives.length > 0 &&
            chapterSlug &&
            sectionSlug && (
              <LearningObjectives
                objectives={content.objectives}
                chapterSlug={chapterSlug}
                sectionSlug={sectionSlug}
              />
            )}

          {/* Markdown efni (markdown content) - wrapped with TextHighlighter for annotations */}
          {chapterSlug && sectionSlug ? (
            <TextHighlighter chapterSlug={chapterSlug} sectionSlug={sectionSlug}>
              <MarkdownRenderer content={content.content} />
            </TextHighlighter>
          ) : (
            <MarkdownRenderer content={content.content} />
          )}

          {/* Inline flashcard review at section end */}
          {chapterSlug && sectionSlug && (
            <InlineFlashcardReview
              bookSlug={bookSlug}
              chapterSlug={chapterSlug}
              sectionSlug={sectionSlug}
            />
          )}

          {/* Content attribution (CC BY 4.0 license compliance) */}
          <ContentAttribution variant="compact" />
        </div>
      </article>

      {/* Leiðsöguhnappar (navigation buttons) */}
      {navigation && <NavigationButtons navigation={navigation} />}

      {/* Annotation Sidebar */}
      <AnnotationSidebar
        isOpen={showAnnotationSidebar}
        onClose={() => setShowAnnotationSidebar(false)}
        currentChapter={chapterSlug}
        currentSection={sectionSlug}
      />
    </div>
  );
}
