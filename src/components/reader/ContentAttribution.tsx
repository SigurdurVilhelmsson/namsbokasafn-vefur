/**
 * ContentAttribution Component
 *
 * Displays CC BY 4.0 license attribution for OpenStax content.
 * Required for Creative Commons Attribution 4.0 International license compliance.
 * Dynamically uses book configuration for correct attribution.
 */

import { useBook } from "@/hooks/useBook";
import { getBook } from "@/config/books";

interface ContentAttributionProps {
  variant?: "compact" | "full";
}

export default function ContentAttribution({
  variant = "full",
}: ContentAttributionProps) {
  const { bookSlug } = useBook();
  const book = bookSlug ? getBook(bookSlug) : null;

  // Fallback values if book not found
  const sourceTitle = book?.source.title ?? "OpenStax";
  const sourceUrl = book?.source.url ?? "https://openstax.org";
  const authors = book?.source.authors?.join(", ") ?? "";
  const translator = book?.translator ?? "";
  const translationYear = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <div className="mt-8 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-secondary)]">
        <p>
          Efni byggt á{" "}
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
          >
            {sourceTitle}
          </a>{" "}
          (OpenStax,{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
          >
            CC BY 4.0
          </a>
          ). Íslensk þýðing © {translationYear} {translator} (CC BY 4.0).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)]">
      <p className="font-semibold text-[var(--text-primary)]">
        Íslensk þýðing á OpenStax {sourceTitle}
      </p>
      <p>
        Efni byggt á{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
        >
          {sourceTitle}
        </a>{" "}
        {authors && <>eftir {authors} </>}(OpenStax).
      </p>
      <p>
        Upprunalegt efni og þessi þýðing eru gefin út undir{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
        >
          Creative Commons Attribution 4.0 International leyfi
        </a>
        .
      </p>
      <p className="text-xs">
        Þýðing og aðlögun: {translator} ({translationYear})
      </p>
    </div>
  );
}
