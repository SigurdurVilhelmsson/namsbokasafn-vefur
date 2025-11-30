import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { loadTableOfContents } from "@/utils/contentLoader";
import { useReaderStore } from "@/stores/readerStore";
import type { Chapter } from "@/types/content";
import { Check } from "lucide-react";

export default function ChapterView() {
  const { chapterSlug } = useParams<{ chapterSlug: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const { isRead } = useReaderStore();

  useEffect(() => {
    if (!chapterSlug) return;

    loadTableOfContents()
      .then((toc) => {
        const foundChapter = toc.chapters.find((c) => c.slug === chapterSlug);
        setChapter(foundChapter || null);
      })
      .catch((error) => {
        console.error("Gat ekki hlaðið kafla:", error);
      });
  }, [chapterSlug]);

  if (!chapter) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Hleður kafla...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-reading">
        {/* Haus kafla (chapter header) */}
        <div className="mb-8">
          <h1 className="mb-2 font-sans text-4xl font-bold text-[var(--text-primary)]">
            Kafli {chapter.number}
          </h1>
          <h2 className="text-2xl text-[var(--text-secondary)]">
            {chapter.title}
          </h2>
        </div>

        {/* Listi yfir kaflahlutar (section list) */}
        <div className="space-y-3">
          <h3 className="mb-4 font-sans text-xl font-semibold">Kaflar</h3>

          {chapter.sections.map((section) => {
            const sectionRead = isRead(chapter.slug, section.slug);

            return (
              <Link
                key={section.slug}
                to={`/kafli/${chapter.slug}/${section.slug}`}
                className="block rounded-lg border border-[var(--border-color)] p-4 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
              >
                <div className="flex items-start gap-3">
                  {sectionRead && (
                    <Check
                      size={20}
                      className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-sans font-semibold text-[var(--text-primary)]">
                      {section.number} {section.title}
                    </h4>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Tengill til baka (back link) */}
        <div className="mt-8">
          <Link
            to="/"
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}
