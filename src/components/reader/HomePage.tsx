import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { loadTableOfContents } from "@/utils/contentLoader";
import { useReaderStore } from "@/stores/readerStore";
import ContentAttribution from "./ContentAttribution";
import type { TableOfContents } from "@/types/content";

export default function HomePage() {
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const { currentChapter, currentSection } = useReaderStore();

  useEffect(() => {
    loadTableOfContents()
      .then(setToc)
      .catch((error) => {
        console.error("Gat ekki hlaðið efnisyfirliti:", error);
      });
  }, []);

  if (!toc) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Hleður...</p>
      </div>
    );
  }

  // Finna síðasta lesna kafla eða byrja á fyrsta kaflanum
  const defaultChapter = toc.chapters[0];
  const defaultSection = defaultChapter.sections[0];

  const continueLink =
    currentChapter && currentSection
      ? `/kafli/${currentChapter}/${currentSection}`
      : `/kafli/${defaultChapter.slug}/${defaultSection.slug}`;

  const continueLinkText =
    currentChapter && currentSection ? "Halda áfram að lesa" : "Byrja að lesa";

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Haus (header) */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[var(--accent-color)]/10 p-6">
              <BookOpen size={48} className="text-[var(--accent-color)]" />
            </div>
          </div>
          <h1 className="mb-4 font-sans text-4xl font-bold text-[var(--text-primary)]">
            {toc.title}
          </h1>
          <p className="text-lg text-[var(--text-secondary)]">
            Gagnvirkur lesari fyrir efnafræðikennslubók
          </p>
        </div>

        {/* Halda áfram takki (continue reading button) */}
        <div className="mb-12 flex justify-center">
          <Link
            to={continueLink}
            className="group flex items-center gap-3 rounded-lg bg-[var(--accent-color)] px-8 py-4 font-sans text-lg font-semibold text-white shadow-lg transition-all hover:bg-[var(--accent-hover)] hover:shadow-xl"
          >
            {continueLinkText}
            <ArrowRight
              size={24}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* Kaflayfirlit (chapter overview) */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <h2 className="mb-6 font-sans text-2xl font-bold">Efnisyfirlit</h2>

          <div className="space-y-4">
            {toc.chapters.map((chapter) => (
              <Link
                key={chapter.number}
                to={`/kafli/${chapter.slug}`}
                className="block rounded-lg border border-[var(--border-color)] p-4 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
              >
                <h3 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  Kafli {chapter.number}: {chapter.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {chapter.sections.length}{" "}
                  {chapter.sections.length === 1 ? "kafli" : "kaflar"}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Fótur með upplýsingum (footer with info) */}
        <ContentAttribution variant="full" />
      </div>
    </div>
  );
}
