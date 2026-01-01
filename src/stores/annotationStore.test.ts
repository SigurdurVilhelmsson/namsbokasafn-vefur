import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { useAnnotationStore } from "./annotationStore";
import type { TextRange, HighlightColor } from "@/types/annotation";

// =============================================================================
// TEST DATA
// =============================================================================

function createTestRange(start: number, end: number): TextRange {
  return {
    startContainer: "p",
    startOffset: start,
    endContainer: "p",
    endOffset: end,
  };
}

// =============================================================================
// SETUP
// =============================================================================

describe("annotationStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));

    // Reset store to default state
    act(() => {
      useAnnotationStore.setState({
        annotations: [],
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // ADD ANNOTATION TESTS
  // ===========================================================================

  describe("addAnnotation", () => {
    it("should have no annotations by default", () => {
      const state = useAnnotationStore.getState();
      expect(state.annotations).toHaveLength(0);
    });

    it("should add an annotation", () => {
      let annotationId: string;

      act(() => {
        annotationId = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "selected text",
          createTestRange(0, 13),
          "yellow",
        );
      });

      const state = useAnnotationStore.getState();
      expect(state.annotations).toHaveLength(1);
      expect(state.annotations[0].id).toBe(annotationId!);
      expect(state.annotations[0].selectedText).toBe("selected text");
      expect(state.annotations[0].color).toBe("yellow");
    });

    it("should add annotation with note", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "important concept",
          createTestRange(0, 17),
          "green",
          "This is important!",
        );
      });

      const state = useAnnotationStore.getState();
      expect(state.annotations[0].note).toBe("This is important!");
    });

    it("should set timestamps correctly", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "blue",
        );
      });

      const annotation = useAnnotationStore.getState().annotations[0];
      expect(annotation.createdAt).toContain("2024-01-15");
      expect(annotation.updatedAt).toContain("2024-01-15");
    });

    it("should add multiple annotations", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });

      expect(useAnnotationStore.getState().annotations).toHaveLength(2);
    });

    it("should support all highlight colors", () => {
      const colors: HighlightColor[] = ["yellow", "green", "blue", "pink"];

      colors.forEach((color, index) => {
        act(() => {
          useAnnotationStore.getState().addAnnotation(
            "efnafraedi",
            "01-grunnhugmyndir",
            `section-${index}`,
            `text ${index}`,
            createTestRange(0, 6),
            color,
          );
        });
      });

      const state = useAnnotationStore.getState();
      expect(state.annotations).toHaveLength(4);
      expect(state.annotations.map((a) => a.color)).toEqual(colors);
    });
  });

  // ===========================================================================
  // UPDATE ANNOTATION TESTS
  // ===========================================================================

  describe("updateAnnotation", () => {
    let annotationId: string;

    beforeEach(() => {
      act(() => {
        annotationId = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "original text",
          createTestRange(0, 13),
          "yellow",
        );
      });
    });

    it("should update annotation color", () => {
      act(() => {
        useAnnotationStore.getState().updateAnnotation(annotationId, {
          color: "green",
        });
      });

      const annotation = useAnnotationStore.getState().getAnnotationById(annotationId);
      expect(annotation?.color).toBe("green");
    });

    it("should update annotation note", () => {
      act(() => {
        useAnnotationStore.getState().updateAnnotation(annotationId, {
          note: "New note",
        });
      });

      const annotation = useAnnotationStore.getState().getAnnotationById(annotationId);
      expect(annotation?.note).toBe("New note");
    });

    it("should update both color and note", () => {
      act(() => {
        useAnnotationStore.getState().updateAnnotation(annotationId, {
          color: "pink",
          note: "Updated note",
        });
      });

      const annotation = useAnnotationStore.getState().getAnnotationById(annotationId);
      expect(annotation?.color).toBe("pink");
      expect(annotation?.note).toBe("Updated note");
    });

    it("should update updatedAt timestamp", () => {
      // Advance time
      vi.advanceTimersByTime(3600000); // 1 hour

      act(() => {
        useAnnotationStore.getState().updateAnnotation(annotationId, {
          color: "blue",
        });
      });

      const annotation = useAnnotationStore.getState().getAnnotationById(annotationId);
      expect(annotation?.updatedAt).toContain("13:00:00"); // 12:00 + 1 hour
    });

    it("should not affect other annotations", () => {
      let secondId: string;

      act(() => {
        secondId = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "second text",
          createTestRange(0, 11),
          "green",
        );
      });

      act(() => {
        useAnnotationStore.getState().updateAnnotation(annotationId, {
          color: "pink",
        });
      });

      const secondAnnotation = useAnnotationStore.getState().getAnnotationById(secondId!);
      expect(secondAnnotation?.color).toBe("green");
    });
  });

  // ===========================================================================
  // REMOVE ANNOTATION TESTS
  // ===========================================================================

  describe("removeAnnotation", () => {
    it("should remove an annotation", () => {
      let annotationId: string;

      act(() => {
        annotationId = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "yellow",
        );
      });

      expect(useAnnotationStore.getState().annotations).toHaveLength(1);

      act(() => {
        useAnnotationStore.getState().removeAnnotation(annotationId!);
      });

      expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    });

    it("should only remove specified annotation", () => {
      let id1: string;
      let id2: string;

      act(() => {
        id1 = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        id2 = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });

      act(() => {
        useAnnotationStore.getState().removeAnnotation(id1!);
      });

      const annotations = useAnnotationStore.getState().annotations;
      expect(annotations).toHaveLength(1);
      expect(annotations[0].id).toBe(id2!);
    });

    it("should handle removing non-existent annotation", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "yellow",
        );
      });

      act(() => {
        useAnnotationStore.getState().removeAnnotation("non-existent-id");
      });

      // Should not crash and should keep existing annotation
      expect(useAnnotationStore.getState().annotations).toHaveLength(1);
    });
  });

  // ===========================================================================
  // QUERY TESTS
  // ===========================================================================

  describe("getAnnotationsForSection", () => {
    beforeEach(() => {
      act(() => {
        // Add annotations in different sections
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 2",
          createTestRange(10, 16),
          "green",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 3",
          createTestRange(0, 6),
          "blue",
        );
      });
    });

    it("should return annotations for specific section", () => {
      const annotations = useAnnotationStore
        .getState()
        .getAnnotationsForSection("01-grunnhugmyndir", "1-1-section");

      expect(annotations).toHaveLength(2);
    });

    it("should return empty array for section with no annotations", () => {
      const annotations = useAnnotationStore
        .getState()
        .getAnnotationsForSection("01-grunnhugmyndir", "1-3-section");

      expect(annotations).toHaveLength(0);
    });
  });

  describe("getAnnotationsForChapter", () => {
    beforeEach(() => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "02-atom",
          "2-1-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });
    });

    it("should return annotations for specific chapter", () => {
      const annotations = useAnnotationStore
        .getState()
        .getAnnotationsForChapter("01-grunnhugmyndir");

      expect(annotations).toHaveLength(1);
    });
  });

  describe("getAnnotationsForBook", () => {
    beforeEach(() => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "liffraedi",
          "01-biology",
          "1-1-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });
    });

    it("should return annotations for specific book", () => {
      const annotations = useAnnotationStore
        .getState()
        .getAnnotationsForBook("efnafraedi");

      expect(annotations).toHaveLength(1);
      expect(annotations[0].bookSlug).toBe("efnafraedi");
    });
  });

  describe("getAnnotationById", () => {
    it("should return annotation by id", () => {
      let annotationId: string;

      act(() => {
        annotationId = useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "yellow",
        );
      });

      const annotation = useAnnotationStore.getState().getAnnotationById(annotationId!);
      expect(annotation).toBeDefined();
      expect(annotation?.selectedText).toBe("text");
    });

    it("should return undefined for non-existent id", () => {
      const annotation = useAnnotationStore.getState().getAnnotationById("non-existent");
      expect(annotation).toBeUndefined();
    });
  });

  // ===========================================================================
  // STATISTICS TESTS
  // ===========================================================================

  describe("getStats", () => {
    beforeEach(() => {
      act(() => {
        // Add annotations with different colors and chapters
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
          "note 1",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 2",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "02-atom",
          "2-1-section",
          "text 3",
          createTestRange(0, 6),
          "green",
          "note 2",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "02-atom",
          "2-1-section",
          "text 4",
          createTestRange(10, 16),
          "blue",
        );
      });
    });

    it("should count total annotations", () => {
      const stats = useAnnotationStore.getState().getStats("efnafraedi");
      expect(stats.total).toBe(4);
    });

    it("should count annotations by color", () => {
      const stats = useAnnotationStore.getState().getStats("efnafraedi");
      expect(stats.byColor.yellow).toBe(2);
      expect(stats.byColor.green).toBe(1);
      expect(stats.byColor.blue).toBe(1);
      expect(stats.byColor.pink).toBe(0);
    });

    it("should count annotations by chapter", () => {
      const stats = useAnnotationStore.getState().getStats("efnafraedi");
      expect(stats.byChapter["01-grunnhugmyndir"]).toBe(2);
      expect(stats.byChapter["02-atom"]).toBe(2);
    });

    it("should count annotations with notes", () => {
      const stats = useAnnotationStore.getState().getStats("efnafraedi");
      expect(stats.withNotes).toBe(2);
    });

    it("should filter by book when provided", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "liffraedi",
          "01-biology",
          "1-1-section",
          "bio text",
          createTestRange(0, 8),
          "pink",
        );
      });

      const efnaStats = useAnnotationStore.getState().getStats("efnafraedi");
      const liffStats = useAnnotationStore.getState().getStats("liffraedi");

      expect(efnaStats.total).toBe(4);
      expect(liffStats.total).toBe(1);
    });

    it("should return all stats when no book specified", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "liffraedi",
          "01-biology",
          "1-1-section",
          "bio text",
          createTestRange(0, 8),
          "pink",
        );
      });

      const stats = useAnnotationStore.getState().getStats();
      expect(stats.total).toBe(5);
    });
  });

  // ===========================================================================
  // BULK OPERATIONS TESTS
  // ===========================================================================

  describe("clearAnnotationsForSection", () => {
    beforeEach(() => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 2",
          createTestRange(10, 16),
          "green",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 3",
          createTestRange(0, 6),
          "blue",
        );
      });
    });

    it("should clear annotations for specific section", () => {
      act(() => {
        useAnnotationStore
          .getState()
          .clearAnnotationsForSection("01-grunnhugmyndir", "1-1-section");
      });

      const annotations = useAnnotationStore.getState().annotations;
      expect(annotations).toHaveLength(1);
      expect(annotations[0].sectionSlug).toBe("1-2-section");
    });

    it("should not affect other sections", () => {
      act(() => {
        useAnnotationStore
          .getState()
          .clearAnnotationsForSection("01-grunnhugmyndir", "1-1-section");
      });

      const remaining = useAnnotationStore
        .getState()
        .getAnnotationsForSection("01-grunnhugmyndir", "1-2-section");
      expect(remaining).toHaveLength(1);
    });
  });

  describe("clearAllAnnotations", () => {
    it("should clear all annotations", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "liffraedi",
          "01-biology",
          "1-1-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });

      expect(useAnnotationStore.getState().annotations).toHaveLength(2);

      act(() => {
        useAnnotationStore.getState().clearAllAnnotations();
      });

      expect(useAnnotationStore.getState().annotations).toHaveLength(0);
    });
  });

  // ===========================================================================
  // EXPORT TESTS
  // ===========================================================================

  describe("exportAnnotations", () => {
    it("should return message when no annotations", () => {
      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain("Engar athugasemdir");
    });

    it("should include header with annotation count", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });

      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain("Fjöldi athugasemda: 2");
    });

    it("should include selected text in quotes", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "important text here",
          createTestRange(0, 19),
          "yellow",
        );
      });

      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain('> "important text here"');
    });

    it("should include notes when present", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "yellow",
          "My important note",
        );
      });

      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain("**Athugasemd:** My important note");
    });

    it("should use color emojis", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text 1",
          createTestRange(0, 6),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-2-section",
          "text 2",
          createTestRange(0, 6),
          "green",
        );
      });

      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain("🟡");
      expect(markdown).toContain("🟢");
    });

    it("should only export annotations for specified book", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "chemistry text",
          createTestRange(0, 14),
          "yellow",
        );
        useAnnotationStore.getState().addAnnotation(
          "liffraedi",
          "01-biology",
          "1-1-section",
          "biology text",
          createTestRange(0, 12),
          "green",
        );
      });

      const markdown = useAnnotationStore.getState().exportAnnotations("efnafraedi");
      expect(markdown).toContain("chemistry text");
      expect(markdown).not.toContain("biology text");
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe("edge cases", () => {
    it("should handle empty selected text", () => {
      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "",
          createTestRange(0, 0),
          "yellow",
        );
      });

      const annotations = useAnnotationStore.getState().annotations;
      expect(annotations).toHaveLength(1);
      expect(annotations[0].selectedText).toBe("");
    });

    it("should handle special characters in text", () => {
      const specialText = "H₂O + CO₂ → H₂CO₃";

      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          specialText,
          createTestRange(0, specialText.length),
          "yellow",
        );
      });

      const annotation = useAnnotationStore.getState().annotations[0];
      expect(annotation.selectedText).toBe(specialText);
    });

    it("should handle Unicode in notes", () => {
      const unicodeNote = "Þetta er íslensk athugasemd með sértáknum: æ, ð, þ";

      act(() => {
        useAnnotationStore.getState().addAnnotation(
          "efnafraedi",
          "01-grunnhugmyndir",
          "1-1-section",
          "text",
          createTestRange(0, 4),
          "yellow",
          unicodeNote,
        );
      });

      const annotation = useAnnotationStore.getState().annotations[0];
      expect(annotation.note).toBe(unicodeNote);
    });
  });
});
