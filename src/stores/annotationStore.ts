import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId, getCurrentTimestamp } from "@/utils/storeHelpers";
import type {
  Annotation,
  HighlightColor,
  TextRange,
  AnnotationStats,
} from "@/types/annotation";

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = "efnafraedi-annotations";

// =============================================================================
// TYPES
// =============================================================================

interface AnnotationState {
  // Data
  annotations: Annotation[];

  // CRUD operations
  addAnnotation: (
    bookSlug: string,
    chapterSlug: string,
    sectionSlug: string,
    selectedText: string,
    range: TextRange,
    color: HighlightColor,
    note?: string,
  ) => string; // Returns new annotation ID

  updateAnnotation: (
    id: string,
    updates: Partial<Pick<Annotation, "color" | "note">>,
  ) => void;

  removeAnnotation: (id: string) => void;

  // Queries
  getAnnotationsForSection: (
    chapterSlug: string,
    sectionSlug: string,
  ) => Annotation[];

  getAnnotationsForChapter: (chapterSlug: string) => Annotation[];

  getAnnotationsForBook: (bookSlug: string) => Annotation[];

  getAnnotationById: (id: string) => Annotation | undefined;

  // Statistics
  getStats: (bookSlug?: string) => AnnotationStats;

  // Bulk operations
  clearAnnotationsForSection: (
    chapterSlug: string,
    sectionSlug: string,
  ) => void;

  clearAllAnnotations: () => void;

  // Export
  exportAnnotations: (bookSlug: string) => string; // Returns markdown string
}

// =============================================================================
// STORE
// =============================================================================

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set, get) => ({
      annotations: [],

      // Add a new annotation
      addAnnotation: (
        bookSlug,
        chapterSlug,
        sectionSlug,
        selectedText,
        range,
        color,
        note?,
      ) => {
        const id = generateId();
        const timestamp = getCurrentTimestamp();

        const newAnnotation: Annotation = {
          id,
          bookSlug,
          chapterSlug,
          sectionSlug,
          selectedText,
          range,
          color,
          note,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          annotations: [...state.annotations, newAnnotation],
        }));

        return id;
      },

      // Update an existing annotation
      updateAnnotation: (id, updates) => {
        set((state) => ({
          annotations: state.annotations.map((ann) =>
            ann.id === id
              ? { ...ann, ...updates, updatedAt: getCurrentTimestamp() }
              : ann,
          ),
        }));
      },

      // Remove an annotation
      removeAnnotation: (id) => {
        set((state) => ({
          annotations: state.annotations.filter((ann) => ann.id !== id),
        }));
      },

      // Get annotations for a specific section
      getAnnotationsForSection: (chapterSlug, sectionSlug) => {
        const { annotations } = get();
        return annotations.filter(
          (ann) =>
            ann.chapterSlug === chapterSlug && ann.sectionSlug === sectionSlug,
        );
      },

      // Get annotations for a specific chapter
      getAnnotationsForChapter: (chapterSlug) => {
        const { annotations } = get();
        return annotations.filter((ann) => ann.chapterSlug === chapterSlug);
      },

      // Get annotations for a specific book
      getAnnotationsForBook: (bookSlug) => {
        const { annotations } = get();
        return annotations.filter((ann) => ann.bookSlug === bookSlug);
      },

      // Get annotation by ID
      getAnnotationById: (id) => {
        const { annotations } = get();
        return annotations.find((ann) => ann.id === id);
      },

      // Get statistics
      getStats: (bookSlug?) => {
        const { annotations } = get();
        const filtered = bookSlug
          ? annotations.filter((ann) => ann.bookSlug === bookSlug)
          : annotations;

        const byColor: Record<HighlightColor, number> = {
          yellow: 0,
          green: 0,
          blue: 0,
          pink: 0,
        };

        const byChapter: Record<string, number> = {};
        let withNotes = 0;

        filtered.forEach((ann) => {
          byColor[ann.color]++;
          byChapter[ann.chapterSlug] = (byChapter[ann.chapterSlug] || 0) + 1;
          if (ann.note) withNotes++;
        });

        return {
          total: filtered.length,
          byColor,
          byChapter,
          withNotes,
        };
      },

      // Clear annotations for a section
      clearAnnotationsForSection: (chapterSlug, sectionSlug) => {
        set((state) => ({
          annotations: state.annotations.filter(
            (ann) =>
              !(
                ann.chapterSlug === chapterSlug &&
                ann.sectionSlug === sectionSlug
              ),
          ),
        }));
      },

      // Clear all annotations
      clearAllAnnotations: () => {
        set({ annotations: [] });
      },

      // Export annotations as markdown
      exportAnnotations: (bookSlug) => {
        const { annotations } = get();
        const bookAnnotations = annotations
          .filter((ann) => ann.bookSlug === bookSlug)
          .sort((a, b) => {
            // Sort by chapter, then section, then position
            if (a.chapterSlug !== b.chapterSlug) {
              return a.chapterSlug.localeCompare(b.chapterSlug);
            }
            if (a.sectionSlug !== b.sectionSlug) {
              return a.sectionSlug.localeCompare(b.sectionSlug);
            }
            return a.range.startOffset - b.range.startOffset;
          });

        if (bookAnnotations.length === 0) {
          return "# Engar athugasemdir\n\nÞú hefur ekki bætt við neinum athugasemdum ennþá.";
        }

        const lines: string[] = [
          "# Athugasemdir og yfirstrikun",
          "",
          `Útflutningsdagur: ${new Date().toLocaleDateString("is-IS")}`,
          "",
          `Fjöldi athugasemda: ${bookAnnotations.length}`,
          "",
          "---",
          "",
        ];

        // Group by chapter
        const byChapter = new Map<string, Annotation[]>();
        bookAnnotations.forEach((ann) => {
          const existing = byChapter.get(ann.chapterSlug) || [];
          existing.push(ann);
          byChapter.set(ann.chapterSlug, existing);
        });

        byChapter.forEach((chapterAnnotations, chapterSlug) => {
          lines.push(`## ${chapterSlug}`);
          lines.push("");

          chapterAnnotations.forEach((ann) => {
            const colorEmoji = {
              yellow: "🟡",
              green: "🟢",
              blue: "🔵",
              pink: "🟣",
            }[ann.color];

            lines.push(`### ${colorEmoji} ${ann.sectionSlug}`);
            lines.push("");
            lines.push(`> "${ann.selectedText}"`);
            lines.push("");

            if (ann.note) {
              lines.push(`**Athugasemd:** ${ann.note}`);
              lines.push("");
            }

            lines.push(
              `*${new Date(ann.createdAt).toLocaleDateString("is-IS")}*`,
            );
            lines.push("");
          });
        });

        return lines.join("\n");
      },
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
