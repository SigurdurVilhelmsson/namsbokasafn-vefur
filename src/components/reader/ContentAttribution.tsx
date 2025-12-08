/**
 * ContentAttribution Component
 *
 * Displays CC BY 4.0 license attribution for OpenStax Chemistry 2e content.
 * Required for Creative Commons Attribution 4.0 International license compliance.
 */

interface ContentAttributionProps {
  variant?: "compact" | "full";
}

export default function ContentAttribution({
  variant = "full",
}: ContentAttributionProps) {
  if (variant === "compact") {
    return (
      <div className="mt-8 border-t border-[var(--border-color)] pt-4 text-xs text-[var(--text-secondary)]">
        <p>
          Efni byggt á{" "}
          <a
            href="https://openstax.org/details/books/chemistry-2e"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
          >
            Chemistry 2e
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
          ). Íslensk þýðing © 2025 Sigurður E. Vilhelmsson (CC BY 4.0).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)]">
      <p className="font-semibold text-[var(--text-primary)]">
        Íslensk þýðing á OpenStax Chemistry 2e
      </p>
      <p>
        Efni byggt á{" "}
        <a
          href="https://openstax.org/details/books/chemistry-2e"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-color)] underline hover:text-[var(--accent-hover)]"
        >
          Chemistry 2e
        </a>{" "}
        eftir Paul Flowers, Klaus Theopold, Richard Langley og William R.
        Robinson (OpenStax).
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
        Þýðing og aðlögun: Sigurður E. Vilhelmsson (2025)
      </p>
    </div>
  );
}
