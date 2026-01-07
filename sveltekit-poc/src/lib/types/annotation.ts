/**
 * Types for the annotation and highlighting system
 */

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface TextRange {
  startOffset: number;
  endOffset: number;
  startContainerPath: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationStats {
  total: number;
  byColor: Record<HighlightColor, number>;
  byChapter: Record<string, number>;
  withNotes: number;
}

export interface SelectionPosition {
  x: number;
  y: number;
}

export interface TextSelection {
  text: string;
  range: Range;
  position: SelectionPosition;
}

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
