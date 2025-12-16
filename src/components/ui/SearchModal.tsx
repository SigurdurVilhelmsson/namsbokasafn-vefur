import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, FileText } from "lucide-react";
import Modal from "./Modal";
import {
  searchContent,
  highlightQuery,
  SearchResult,
} from "@/utils/searchIndex";
import { useBook } from "@/hooks/useBook";
import { loadTableOfContents } from "@/utils/contentLoader";
import type { TableOfContents } from "@/types/content";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bookSlug } = useBook();

  // Hlaða TOC við upphaf (load TOC on mount)
  useEffect(() => {
    if (!bookSlug) return;
    loadTableOfContents(bookSlug).then(setToc);
  }, [bookSlug]);

  // Focus á input þegar modal opnast (focus input when modal opens)
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          // Opna modal
          setQuery("");
          setResults([]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Leita þegar query breytist (search when query changes)
  useEffect(() => {
    const performSearch = async () => {
      if (!toc || query.length < 2 || !bookSlug) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults = await searchContent(query, toc, bookSlug);
      setResults(searchResults);
      setLoading(false);
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [query, toc, bookSlug]);

  const handleResultClick = (result: SearchResult) => {
    navigate(`/${bookSlug}/kafli/${result.chapterSlug}/${result.sectionSlug}`);
    onClose();
    setQuery("");
    setResults([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leita í bókinni">
      <div className="space-y-4">
        {/* Leitarreitur (search input) */}
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">
            Leita að efni
          </label>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            size={20}
          />
          <input
            id="search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Leitaðu að efni..."
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
          />
          {loading && (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--accent-color)]"
              size={20}
            />
          )}
        </div>

        {/* Ábending (hint) */}
        {query.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Sláðu inn að minnsta kosti 2 stafi til að leita
          </p>
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Sláðu inn fleiri stafi...
          </p>
        )}

        {/* Niðurstöður (results) */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Engar niðurstöður fundust fyrir "{query}"
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)]">
              {results.length}{" "}
              {results.length === 1 ? "niðurstaða" : "niðurstöður"} fundust
            </p>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.chapterSlug}-${result.sectionSlug}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-left transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <FileText
                      size={16}
                      className="text-[var(--accent-color)]"
                    />
                    <span className="font-sans text-sm font-semibold">
                      {result.sectionNumber} {result.sectionTitle}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Kafli {result.chapterTitle}
                  </p>
                  {result.snippet && (
                    <p
                      className="text-sm text-[var(--text-secondary)]"
                      dangerouslySetInnerHTML={{
                        __html: highlightQuery(result.snippet, query),
                      }}
                    />
                  )}
                  {result.matches > 1 && (
                    <p className="mt-2 text-xs text-[var(--accent-color)]">
                      {result.matches} samsvörun
                      {result.matches !== 1 ? "ar" : ""}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
