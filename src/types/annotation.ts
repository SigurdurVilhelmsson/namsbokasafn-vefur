/**
 * Types for the annotation and highlighting system
 */

// =============================================================================
// ANNOTATION TYPES
// =============================================================================

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export interface TextRange {
  startOffset: number;
  endOffset: number;
  startContainerPath: string; // CSS selector path to find the container
  endContainerPath: string;
}

export interface Annotation {
  id: string;
  bookSlug: string;
  chapterSlug: string;
  sectionSlug: string;
  selectedText: string;
  range: TextRange;
  color: HighlightColor;
  note?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface AnnotationStats {
  total: number;
  byColor: Record<HighlightColor, number>;
  byChapter: Record<string, number>;
  withNotes: number;
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface SelectionPosition {
  x: number;
  y: number;
}

export interface TextSelection {
  text: string;
  range: Range;
  position: SelectionPosition;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export interface ExportedAnnotation {
  section: string;
  chapter: string;
  text: string;
  note?: string;
  color: HighlightColor;
  date: string;
}

export interface AnnotationExport {
  bookTitle: string;
  exportDate: string;
  annotations: ExportedAnnotation[];
}
