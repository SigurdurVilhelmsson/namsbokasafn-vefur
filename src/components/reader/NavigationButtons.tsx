import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBook } from "@/hooks/useBook";
import type { NavigationContext } from "@/types/content";

interface NavigationButtonsProps {
  navigation: NavigationContext;
}

export default function NavigationButtons({
  navigation,
}: NavigationButtonsProps) {
  const { previous, next, current } = navigation;
  const { bookSlug } = useBook();

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <div className="mx-auto max-w-reading">
        {/* Brauðmolar (breadcrumb) */}
        <div className="mb-6 text-sm text-[var(--text-secondary)]">
          Kafli {current.chapter.number} › {current.section.number}{" "}
          {current.section.title}
        </div>

        {/* Leiðsöguhnappir (navigation buttons) */}
        <div className="flex items-center justify-between gap-4">
          {previous ? (
            <Link
              to={`/${bookSlug}/kafli/${previous.chapter.slug}/${previous.section.slug}`}
              className="group flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
            >
              <ChevronLeft
                size={20}
                className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
              />
              <div className="text-left">
                <div className="text-xs text-[var(--text-secondary)]">
                  Fyrri kafli
                </div>
                <div className="font-sans text-sm font-medium">
                  {previous.section.number} {previous.section.title}
                </div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {next ? (
            <Link
              to={`/${bookSlug}/kafli/${next.chapter.slug}/${next.section.slug}`}
              className="group flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-3 transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
            >
              <div className="text-right">
                <div className="text-xs text-[var(--text-secondary)]">
                  Næsti kafli
                </div>
                <div className="font-sans text-sm font-medium">
                  {next.section.number} {next.section.title}
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)]"
              />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
