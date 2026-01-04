import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookOpen, Trash2, ArrowRight } from "lucide-react";
import { useReaderStore } from "@/stores/readerStore";
import { useBook } from "@/hooks/useBook";

export default function BookmarksPage() {
  const { bookSlug } = useBook();
  const { bookmarks, removeBookmark } = useReaderStore();

  // Group bookmarks by chapter
  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, { chapterSlug: string; sectionSlug: string }[]> = {};

    for (const bookmarkId of bookmarks) {
      const [chapterSlug, sectionSlug] = bookmarkId.split("/");
      if (!groups[chapterSlug]) {
        groups[chapterSlug] = [];
      }
      groups[chapterSlug].push({ chapterSlug, sectionSlug });
    }

    return groups;
  }, [bookmarks]);

  const chapterKeys = Object.keys(groupedBookmarks).sort();
  const totalBookmarks = bookmarks.length;

  const handleRemoveBookmark = (chapterSlug: string, sectionSlug: string) => {
    removeBookmark(chapterSlug, sectionSlug);
  };

  return (
    <div className="min-h-[80vh] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-yellow-500/10 p-3">
              <Bookmark size={32} className="text-yellow-500" />
            </div>
            <div>
              <h1 className="font-sans text-4xl font-bold text-[var(--text-primary)]">
                Bókamerki
              </h1>
              <p className="text-[var(--text-secondary)]">
                {totalBookmarks === 0
                  ? "Engin bókamerki vistuð"
                  : `${totalBookmarks} bókamerk${totalBookmarks === 1 ? "i" : "i"} vistuð`}
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {totalBookmarks === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-12 text-center">
            <Bookmark
              size={64}
              className="mx-auto mb-4 text-[var(--text-secondary)] opacity-50"
            />
            <h2 className="mb-2 font-sans text-xl font-semibold text-[var(--text-primary)]">
              Engin bókamerki enn
            </h2>
            <p className="mb-6 text-[var(--text-secondary)]">
              Smelltu á bókamerkistáknið í efra hægra horni kafla til að vista hann.
            </p>
            <Link
              to={`/${bookSlug}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-color)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
            >
              <BookOpen size={20} />
              Byrja að lesa
            </Link>
          </div>
        ) : (
          /* Bookmarks grouped by chapter */
          <div className="space-y-6">
            {chapterKeys.map((chapterSlug) => (
              <div
                key={chapterSlug}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden"
              >
                {/* Chapter header */}
                <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3">
                  <h2 className="font-sans font-semibold text-[var(--text-primary)]">
                    {chapterSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </h2>
                </div>

                {/* Sections in chapter */}
                <div className="divide-y divide-[var(--border-color)]">
                  {groupedBookmarks[chapterSlug].map(({ sectionSlug }) => (
                    <div
                      key={`${chapterSlug}/${sectionSlug}`}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--bg-primary)]"
                    >
                      <div className="flex items-center gap-3">
                        <Bookmark
                          size={18}
                          className="text-yellow-500"
                          fill="currentColor"
                        />
                        <Link
                          to={`/${bookSlug}/kafli/${chapterSlug}/${sectionSlug}`}
                          className="font-medium text-[var(--text-primary)] hover:text-[var(--accent-color)]"
                        >
                          {sectionSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/${bookSlug}/kafli/${chapterSlug}/${sectionSlug}`}
                          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-color)]"
                          aria-label="Fara í kafla"
                        >
                          <ArrowRight size={18} />
                        </Link>
                        <button
                          onClick={() => handleRemoveBookmark(chapterSlug, sectionSlug)}
                          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          aria-label="Fjarlægja bókamerki"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link
            to={`/${bookSlug}`}
            className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] hover:underline"
          >
            ← Til baka á forsíðu
          </Link>
        </div>
      </div>
    </div>
  );
}
