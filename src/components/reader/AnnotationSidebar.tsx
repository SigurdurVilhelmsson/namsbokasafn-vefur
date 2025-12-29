import { useState, useMemo } from "react";
import {
  X,
  Highlighter,
  MessageSquare,
  Trash2,
  Download,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useBook } from "@/hooks/useBook";
import type { Annotation, HighlightColor } from "@/types/annotation";

// =============================================================================
// TYPES
// =============================================================================

interface AnnotationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChapter?: string;
  currentSection?: string;
}

type FilterType = "all" | "current" | HighlightColor;

// =============================================================================
// CONSTANTS
// =============================================================================

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: "Gulur",
  green: "Grænn",
  blue: "Blár",
  pink: "Bleikur",
};

const COLOR_CLASSES: Record<HighlightColor, { bg: string; border: string }> = {
  yellow: { bg: "bg-yellow-100", border: "border-yellow-300" },
  green: { bg: "bg-green-100", border: "border-green-300" },
  blue: { bg: "bg-blue-100", border: "border-blue-300" },
  pink: { bg: "bg-pink-100", border: "border-pink-300" },
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function AnnotationSidebar({
  isOpen,
  onClose,
  currentChapter,
  currentSection,
}: AnnotationSidebarProps) {
  const { bookSlug } = useBook();
  const {
    getAnnotationsForBook,
    removeAnnotation,
    exportAnnotations,
    getStats,
  } = useAnnotationStore();

  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Get all annotations for this book
  const allAnnotations = useMemo(
    () => getAnnotationsForBook(bookSlug),
    [getAnnotationsForBook, bookSlug],
  );

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    let result = allAnnotations;

    if (filter === "current" && currentChapter && currentSection) {
      result = result.filter(
        (a) =>
          a.chapterSlug === currentChapter && a.sectionSlug === currentSection,
      );
    } else if (
      filter === "yellow" ||
      filter === "green" ||
      filter === "blue" ||
      filter === "pink"
    ) {
      result = result.filter((a) => a.color === filter);
    }

    // Sort by date, newest first
    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [allAnnotations, filter, currentChapter, currentSection]);

  // Stats
  const stats = useMemo(() => getStats(bookSlug), [getStats, bookSlug]);

  // Handle export
  const handleExport = () => {
    const markdown = exportAnnotations(bookSlug);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `athugasemdir-${bookSlug}-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    removeAnnotation(id);
    setConfirmDelete(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl"
      role="dialog"
      aria-label="Athugasemdir"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-4">
        <div className="flex items-center gap-2">
          <Highlighter size={20} className="text-[var(--accent-color)]" />
          <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
            Athugasemdir
          </h2>
          <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs font-medium text-[var(--accent-color)]">
            {filteredAnnotations.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
          aria-label="Loka"
        >
          <X size={20} />
        </button>
      </div>

      {/* Filter and actions bar */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-2">
        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)]"
            aria-expanded={showFilterMenu}
          >
            <Filter size={14} />
            <span>
              {filter === "all"
                ? "Allt"
                : filter === "current"
                  ? "Þessi kafli"
                  : COLOR_LABELS[filter as HighlightColor]}
            </span>
            <ChevronDown size={14} />
          </button>

          {showFilterMenu && (
            <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                onClick={() => {
                  setFilter("all");
                  setShowFilterMenu(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-primary)] ${
                  filter === "all" ? "text-[var(--accent-color)]" : ""
                }`}
              >
                Allt ({stats.total})
              </button>
              {currentChapter && currentSection && (
                <button
                  onClick={() => {
                    setFilter("current");
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-primary)] ${
                    filter === "current" ? "text-[var(--accent-color)]" : ""
                  }`}
                >
                  Þessi kafli
                </button>
              )}
              <hr className="my-1 border-[var(--border-color)]" />
              {(
                Object.entries(COLOR_LABELS) as [HighlightColor, string][]
              ).map(([color, label]) => (
                <button
                  key={color}
                  onClick={() => {
                    setFilter(color);
                    setShowFilterMenu(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-primary)] ${
                    filter === color ? "text-[var(--accent-color)]" : ""
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${COLOR_CLASSES[color].bg} ${COLOR_CLASSES[color].border} border`}
                  />
                  {label} ({stats.byColor[color]})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          disabled={stats.total === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-primary)] disabled:opacity-50"
          title="Flytja út sem Markdown"
        >
          <Download size={14} />
          <span className="hidden sm:inline">Flytja út</span>
        </button>
      </div>

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Highlighter
              size={48}
              className="mb-4 text-[var(--text-secondary)] opacity-50"
            />
            <p className="text-[var(--text-secondary)]">
              Engar athugasemdir fundust
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)] opacity-75">
              Veldu texta til að yfirstrika eða bæta við athugasemd
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                isConfirmingDelete={confirmDelete === annotation.id}
                onConfirmDelete={() => setConfirmDelete(annotation.id)}
                onCancelDelete={() => setConfirmDelete(null)}
                onDelete={() => handleDelete(annotation.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      {stats.total > 0 && (
        <div className="border-t border-[var(--border-color)] px-4 py-3">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>
              {stats.total} yfirstrikun
              {stats.total !== 1 ? "ar" : ""}
            </span>
            <span>
              {stats.withNotes} með athugasemd
              {stats.withNotes !== 1 ? "um" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ANNOTATION CARD COMPONENT
// =============================================================================

interface AnnotationCardProps {
  annotation: Annotation;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

function AnnotationCard({
  annotation,
  isConfirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: AnnotationCardProps) {
  const { bg, border } = COLOR_CLASSES[annotation.color];

  return (
    <div
      className={`rounded-lg border ${border} ${bg} p-3 transition-shadow hover:shadow-md`}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {annotation.chapterSlug} / {annotation.sectionSlug}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {new Date(annotation.createdAt).toLocaleDateString("is-IS")}
        </span>
      </div>

      {/* Selected text */}
      <p className="mb-2 text-sm italic text-[var(--text-primary)]">
        "
        {annotation.selectedText.length > 150
          ? `${annotation.selectedText.slice(0, 150)}...`
          : annotation.selectedText}
        "
      </p>

      {/* Note if present */}
      {annotation.note && (
        <div className="mb-2 flex items-start gap-2 rounded bg-white/50 p-2">
          <MessageSquare
            size={14}
            className="mt-0.5 flex-shrink-0 text-[var(--text-secondary)]"
          />
          <p className="text-sm text-[var(--text-primary)]">{annotation.note}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">Eyða?</span>
            <button
              onClick={onDelete}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >
              Já
            </button>
            <button
              onClick={onCancelDelete}
              className="rounded border border-[var(--border-color)] px-2 py-1 text-xs hover:bg-white/50"
            >
              Nei
            </button>
          </div>
        ) : (
          <button
            onClick={onConfirmDelete}
            className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/50 hover:text-red-600"
            aria-label="Eyða athugasemd"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
