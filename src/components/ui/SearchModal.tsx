import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  FileText,
  Filter,
  X,
  Sparkles,
  History,
  Trash2,
} from "lucide-react";
import Modal from "./Modal";
import {
  searchContent,
  highlightQuery,
  getSearchChapters,
  buildSearchIndex,
  getSearchHistory,
  addToSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  type SearchResult,
  type SearchFilters,
  type SearchHistoryItem,
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
  const [indexing, setIndexing] = useState(false);
  const [toc, setToc] = useState<TableOfContents | null>(null);
  const [chapters, setChapters] = useState<{ slug: string; title: string }[]>(
    [],
  );
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => getSearchHistory(),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bookSlug } = useBook();

  // Refresh search history when modal opens
  const refreshHistory = () => {
    setSearchHistory(getSearchHistory());
  };

  // Load TOC and build search index on mount
  useEffect(() => {
    if (!bookSlug) return;

    const initSearch = async () => {
      setIndexing(true);
      try {
        const loadedToc = await loadTableOfContents(bookSlug);
        setToc(loadedToc);

        // Build search index in background
        await buildSearchIndex(loadedToc, bookSlug);
        setChapters(getSearchChapters());
      } catch (error) {
        console.error("Villa við að byggja leitarvísitölu:", error);
      }
      setIndexing(false);
    };

    initSearch();
  }, [bookSlug]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isOpen) {
          setQuery("");
          setResults([]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!toc || query.length < 2 || !bookSlug) {
        setResults([]);
        return;
      }

      setLoading(true);

      const filters: SearchFilters = {};
      if (selectedChapter) {
        filters.chapterSlug = selectedChapter;
      }

      const searchResults = await searchContent(query, toc, bookSlug, filters);
      setResults(searchResults);
      setLoading(false);

      // Add to search history after successful search
      if (searchResults.length > 0) {
        addToSearchHistory(query, searchResults.length);
        refreshHistory();
      }
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 200); // Debounce (faster now with indexed search)

    return () => clearTimeout(timeoutId);
  }, [query, toc, bookSlug, selectedChapter]);

  const handleResultClick = (result: SearchResult) => {
    navigate(`/${bookSlug}/kafli/${result.chapterSlug}/${result.sectionSlug}`);
    onClose();
    setQuery("");
    setResults([]);
  };

  const clearFilters = () => {
    setSelectedChapter("");
  };

  const hasActiveFilters = selectedChapter !== "";

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const handleRemoveHistoryItem = (historyQuery: string) => {
    removeFromSearchHistory(historyQuery);
    refreshHistory();
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leita í bókinni">
      <div className="space-y-4">
        {/* Search input */}
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
            placeholder="Leitaðu að efni... (styður óbeint samsvörun)"
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-10 pr-20 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {loading && (
              <Loader2
                className="animate-spin text-[var(--accent-color)]"
                size={18}
              />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded p-1 transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-[var(--accent-color)]/10 text-[var(--accent-color)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              aria-label="Síur"
              title="Síur"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-medium text-[var(--text-secondary)]">
                Síur
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded px-2 py-1 font-sans text-xs text-[var(--accent-color)] hover:bg-[var(--accent-color)]/10"
                >
                  <X size={12} />
                  Hreinsa
                </button>
              )}
            </div>
            <div className="mt-2">
              <label
                htmlFor="chapter-filter"
                className="mb-1 block font-sans text-xs text-[var(--text-secondary)]"
              >
                Kafli
              </label>
              <select
                id="chapter-filter"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1.5 font-sans text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:outline-none"
              >
                <option value="">Allir kaflar</option>
                {chapters.map((chapter) => (
                  <option key={chapter.slug} value={chapter.slug}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Indexing indicator */}
        {indexing && (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="animate-spin" size={16} />
            Byggir leitarvísitölu...
          </div>
        )}

        {/* Hints and History */}
        {!indexing && query.length === 0 && (
          <div className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Sláðu inn að minnsta kosti 2 stafi til að leita
              </p>
              <p className="flex items-center justify-center gap-1 text-xs text-[var(--text-secondary)]">
                <Sparkles size={12} className="text-[var(--accent-color)]" />
                Styður óbeina leit (fuzzy search)
              </p>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                    <History size={14} />
                    Nýlegar leitir
                  </div>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 rounded px-2 py-1 font-sans text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                    title="Hreinsa sögu"
                  >
                    <Trash2 size={12} />
                    Hreinsa
                  </button>
                </div>
                <div className="space-y-1">
                  {searchHistory.slice(0, 5).map((item) => (
                    <div
                      key={item.timestamp}
                      className="group flex items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--bg-secondary)]"
                    >
                      <button
                        onClick={() => handleHistoryClick(item.query)}
                        className="flex-1 text-left font-sans text-sm text-[var(--text-primary)]"
                      >
                        {item.query}
                        <span className="ml-2 text-xs text-[var(--text-secondary)]">
                          ({item.resultCount} niðurstöður)
                        </span>
                      </button>
                      <button
                        onClick={() => handleRemoveHistoryItem(item.query)}
                        className="rounded p-1 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover:opacity-100"
                        title="Fjarlægja"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Sláðu inn fleiri stafi...
          </p>
        )}

        {/* Results */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Engar niðurstöður fundust fyrir &quot;{query}&quot;
            {selectedChapter && " í völdum kafla"}
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-secondary)]">
              {results.length}{" "}
              {results.length === 1 ? "niðurstaða" : "niðurstöður"} fundust
              {selectedChapter && " í völdum kafla"}
            </p>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.chapterSlug}-${result.sectionSlug}-${index}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-left transition-all hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText
                        size={16}
                        className="text-[var(--accent-color)]"
                      />
                      <span className="font-sans text-sm font-semibold">
                        {result.sectionNumber} {result.sectionTitle}
                      </span>
                    </div>
                    {/* Relevance indicator */}
                    {result.score < 0.3 && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-sans text-xs text-green-600 dark:text-green-400">
                        Nákvæm
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">
                    Kafli {result.chapterTitle}
                  </p>
                  {result.snippet && (
                    <p
                      className="line-clamp-2 text-sm text-[var(--text-secondary)]"
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
