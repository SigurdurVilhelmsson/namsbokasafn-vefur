import { useState, useCallback, useEffect, useRef } from "react";
import { useAnnotationStore } from "@/stores/annotationStore";
import { useBook } from "@/hooks/useBook";
import SelectionPopup from "./SelectionPopup";
import NoteModal from "./NoteModal";
import type {
  HighlightColor,
  TextSelection,
  TextRange,
} from "@/types/annotation";

// =============================================================================
// TYPES
// =============================================================================

interface TextHighlighterProps {
  chapterSlug: string;
  sectionSlug: string;
  children: React.ReactNode;
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get a CSS selector path to a DOM node for serialization
 */
function getNodePath(node: Node): string {
  const parts: string[] = [];
  let current: Node | null = node;

  while (current && current !== document.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as Element;
      let selector = element.tagName.toLowerCase();

      if (element.id) {
        selector += `#${element.id}`;
        parts.unshift(selector);
        break; // ID is unique, stop here
      }

      // Add class names
      if (element.className && typeof element.className === "string") {
        const classes = element.className
          .split(" ")
          .filter((c) => c && !c.startsWith("highlight-"))
          .slice(0, 2)
          .join(".");
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // Add position among siblings
      const siblings = element.parentElement?.children;
      if (siblings && siblings.length > 1) {
        const index = Array.from(siblings).indexOf(element);
        selector += `:nth-child(${index + 1})`;
      }

      parts.unshift(selector);
    }
    current = current.parentNode;
  }

  return parts.join(" > ");
}

/**
 * Create a text range object from a DOM Range
 */
function createTextRange(range: Range): TextRange {
  return {
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    startContainerPath: getNodePath(range.startContainer),
    endContainerPath: getNodePath(range.endContainer),
  };
}

/**
 * Get highlight color class
 */
function getHighlightClass(color: HighlightColor): string {
  const classes: Record<HighlightColor, string> = {
    yellow: "highlight-yellow",
    green: "highlight-green",
    blue: "highlight-blue",
    pink: "highlight-pink",
  };
  return classes[color];
}

/**
 * Apply visual highlight to a range
 */
function applyHighlight(range: Range, color: HighlightColor): void {
  try {
    const mark = document.createElement("mark");
    mark.className = `${getHighlightClass(color)} cursor-pointer`;
    range.surroundContents(mark);
  } catch {
    // If surroundContents fails (crosses element boundaries),
    // we can't apply the visual highlight, but the annotation is still saved
    console.warn("Could not apply visual highlight across element boundaries");
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TextHighlighter({
  chapterSlug,
  sectionSlug,
  children,
}: TextHighlighterProps) {
  const { bookSlug } = useBook();
  const { addAnnotation } = useAnnotationStore();

  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<{
    text: string;
    range: TextRange;
    color: HighlightColor;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      setSelection(null);
      return;
    }

    // Check if selection is within our container
    const range = windowSelection.getRangeAt(0);
    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }

    // Get position for popup
    const rect = range.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY,
    };

    setSelection({
      text: selectedText,
      range,
      position,
    });
  }, []);

  // Handle highlight action
  const handleHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selection) return;

      const textRange = createTextRange(selection.range);

      // Add annotation to store
      addAnnotation(
        bookSlug,
        chapterSlug,
        sectionSlug,
        selection.text,
        textRange,
        color,
      );

      // Apply visual highlight
      applyHighlight(selection.range, color);

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, bookSlug, chapterSlug, sectionSlug, addAnnotation],
  );

  // Handle add note action
  const handleAddNote = useCallback(() => {
    if (!selection) return;

    setPendingHighlight({
      text: selection.text,
      range: createTextRange(selection.range),
      color: "yellow", // Default color for notes
    });

    // Keep the range for highlighting after note is saved
    setShowNoteModal(true);
  }, [selection]);

  // Handle note save
  const handleSaveNote = useCallback(
    (note: string, color: HighlightColor) => {
      if (!pendingHighlight) return;

      // Add annotation with note
      addAnnotation(
        bookSlug,
        chapterSlug,
        sectionSlug,
        pendingHighlight.text,
        pendingHighlight.range,
        color,
        note,
      );

      // Clear state
      setPendingHighlight(null);
      setShowNoteModal(false);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [pendingHighlight, bookSlug, chapterSlug, sectionSlug, addAnnotation],
  );

  // Close popup
  const handleClosePopup = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Close note modal
  const handleCloseNoteModal = useCallback(() => {
    setShowNoteModal(false);
    setPendingHighlight(null);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Restore highlights from saved annotations on mount
  useEffect(() => {
    // TODO: Implement highlight restoration from saved annotations
    // This is complex because we need to find the exact text positions
    // For now, annotations are persisted but visual highlights aren't restored
  }, [chapterSlug, sectionSlug]);

  return (
    <>
      <div ref={containerRef} onMouseUp={handleMouseUp}>
        {children}
      </div>

      {/* Selection popup */}
      {selection && (
        <SelectionPopup
          position={selection.position}
          onHighlight={handleHighlight}
          onAddNote={handleAddNote}
          onClose={handleClosePopup}
        />
      )}

      {/* Note modal */}
      {showNoteModal && pendingHighlight && (
        <NoteModal
          selectedText={pendingHighlight.text}
          onSave={handleSaveNote}
          onClose={handleCloseNoteModal}
        />
      )}
    </>
  );
}
