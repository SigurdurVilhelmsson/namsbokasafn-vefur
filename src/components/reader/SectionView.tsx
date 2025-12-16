import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Bookmark } from "lucide-react";
import {
  loadTableOfContents,
  loadSectionContent,
  findSectionBySlug,
} from "@/utils/contentLoader";
import { useReaderStore } from "@/stores/readerStore";
import { useBook } from "@/hooks/useBook";
import MarkdownRenderer from "./MarkdownRenderer";
import NavigationButtons from "./NavigationButtons";
import LearningObjectives from "./LearningObjectives";
import ContentAttribution from "./ContentAttribution";
import type {
  SectionContent,
  NavigationContext,
  Chapter,
  Section,
} from "@/types/content";

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

  const {
    markAsRead,
    isRead,
    setCurrentLocation,
    isBookmarked,
    addBookmark,
    removeBookmark,
  } = useReaderStore();

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
  }, [chapterSlug, sectionSlug, bookSlug, setCurrentLocation]);

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
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
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

          {/* Markdown efni (markdown content) */}
          <MarkdownRenderer content={content.content} />

          {/* Content attribution (CC BY 4.0 license compliance) */}
          <ContentAttribution variant="compact" />
        </div>
      </article>

      {/* Leiðsöguhnappar (navigation buttons) */}
      {navigation && <NavigationButtons navigation={navigation} />}
    </div>
  );
}
