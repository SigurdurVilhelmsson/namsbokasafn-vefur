/**
 * Types for the annotation and highlighting system
 *
 * TextRange v2 uses text-based anchoring for stable highlight restoration.
 * v1 ranges (DOM-based) are auto-migrated on first restoration attempt.
 */

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

/**
 * Text-based anchor for stable highlight positioning.
 *
 * Strategy: Store the text itself + surrounding context for fuzzy matching.
 * This survives DOM restructuring and minor content edits.
 */
export interface TextRange {
  // Version for migration detection (v2 = text-based)
  version?: 2;

  // Primary: the exact highlighted text
  exact: string;

  // Context for disambiguation when exact text appears multiple times
  prefix: string;  // ~30 chars before the highlight
  suffix: string;  // ~30 chars after the highlight

  // Stable anchor: nearest heading with an ID
  anchorId: string | null;        // e.g., "efnafraedi-i-samhengi"
  offsetFromAnchor: number;       // character offset from anchor element start

  // === Legacy v1 fields (for migration, optional) ===
  startOffset?: number;
  endOffset?: number;
  startContainerPath?: string;
  endContainerPath?: string;
}

/**
 * Legacy v1 TextRange format (DOM-based, fragile)
 * Used only for migration detection
 */
export interface LegacyTextRange {
  startOffset: number;
  endOffset: number;
  startContainerPath: string;
  endContainerPath: string;
}

/**
 * Type guard to check if a TextRange is v1 (legacy) format
 */
export function isLegacyTextRange(range: TextRange): boolean {
  return range.version !== 2 && !('exact' in range && range.exact);
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
