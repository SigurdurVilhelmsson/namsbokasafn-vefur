import { create } from "zustand";

// =============================================================================
// TYPES
// =============================================================================

export type ReferenceType = "sec" | "eq" | "fig" | "tbl" | "def";

export interface ReferenceItem {
  type: ReferenceType;
  id: string;
  label: string; // Display label (e.g., "Jafna 1.2", "Mynd 2.1")
  title?: string; // Optional title/caption
  preview?: string; // Short preview text for hover
  chapterSlug: string;
  sectionSlug?: string;
  anchor?: string; // DOM anchor ID for scrolling
}

export interface ReferenceIndex {
  [key: string]: ReferenceItem; // key format: "type:id"
}

interface ReferenceState {
  // Index of all referenceable items
  index: ReferenceIndex;

  // Current context for numbering
  currentChapter: number;
  currentSection: number;
  equationCounter: number;
  figureCounter: number;
  tableCounter: number;
  definitionCounter: number;

  // Actions
  resetCounters: (chapterNumber: number, sectionNumber?: number) => void;
  registerReference: (item: Omit<ReferenceItem, "label">) => string;
  getReference: (type: ReferenceType, id: string) => ReferenceItem | undefined;
  getNextEquationNumber: () => string;
  getNextFigureNumber: () => string;
  getNextTableNumber: () => string;
  getNextDefinitionNumber: () => string;
  clearIndex: () => void;
  buildIndexFromContent: (
    chapterSlug: string,
    sectionSlug: string,
    content: string,
    chapterNumber: number
  ) => void;
}

// =============================================================================
// LABEL GENERATORS
// =============================================================================

const LABELS: Record<ReferenceType, string> = {
  sec: "Kafli",
  eq: "Jafna",
  fig: "Mynd",
  tbl: "Tafla",
  def: "Skilgreining",
};

function generateLabel(type: ReferenceType, number: string): string {
  return `${LABELS[type]} ${number}`;
}

// =============================================================================
// STORE
// =============================================================================

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  index: {},
  currentChapter: 1,
  currentSection: 1,
  equationCounter: 0,
  figureCounter: 0,
  tableCounter: 0,
  definitionCounter: 0,

  resetCounters: (chapterNumber: number, sectionNumber: number = 1) => {
    set({
      currentChapter: chapterNumber,
      currentSection: sectionNumber,
      equationCounter: 0,
      figureCounter: 0,
      tableCounter: 0,
      definitionCounter: 0,
    });
  },

  registerReference: (item) => {
    const state = get();
    const key = `${item.type}:${item.id}`;

    // Generate label based on type and counters
    let label: string;
    let number: string;

    switch (item.type) {
      case "eq":
        number = `${state.currentChapter}.${state.equationCounter + 1}`;
        label = generateLabel("eq", number);
        set({ equationCounter: state.equationCounter + 1 });
        break;
      case "fig":
        number = `${state.currentChapter}.${state.figureCounter + 1}`;
        label = generateLabel("fig", number);
        set({ figureCounter: state.figureCounter + 1 });
        break;
      case "tbl":
        number = `${state.currentChapter}.${state.tableCounter + 1}`;
        label = generateLabel("tbl", number);
        set({ tableCounter: state.tableCounter + 1 });
        break;
      case "def":
        number = `${state.currentChapter}.${state.definitionCounter + 1}`;
        label = generateLabel("def", number);
        set({ definitionCounter: state.definitionCounter + 1 });
        break;
      case "sec":
        label = item.title || generateLabel("sec", item.id);
        break;
      default:
        label = item.id;
    }

    const fullItem: ReferenceItem = { ...item, label };

    set((state) => ({
      index: {
        ...state.index,
        [key]: fullItem,
      },
    }));

    return label;
  },

  getReference: (type, id) => {
    const key = `${type}:${id}`;
    return get().index[key];
  },

  getNextEquationNumber: () => {
    const state = get();
    return `${state.currentChapter}.${state.equationCounter + 1}`;
  },

  getNextFigureNumber: () => {
    const state = get();
    return `${state.currentChapter}.${state.figureCounter + 1}`;
  },

  getNextTableNumber: () => {
    const state = get();
    return `${state.currentChapter}.${state.tableCounter + 1}`;
  },

  getNextDefinitionNumber: () => {
    const state = get();
    return `${state.currentChapter}.${state.definitionCounter + 1}`;
  },

  clearIndex: () => {
    set({
      index: {},
      equationCounter: 0,
      figureCounter: 0,
      tableCounter: 0,
      definitionCounter: 0,
    });
  },

  buildIndexFromContent: (chapterSlug, sectionSlug, content, chapterNumber) => {
    const state = get();

    // Reset counters for this chapter if it's a new chapter
    if (chapterNumber !== state.currentChapter) {
      get().resetCounters(chapterNumber);
    }

    // Register section
    const sectionKey = `sec:${chapterSlug}/${sectionSlug}`;
    if (!state.index[sectionKey]) {
      // Extract section title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : sectionSlug;

      get().registerReference({
        type: "sec",
        id: `${chapterSlug}/${sectionSlug}`,
        title,
        chapterSlug,
        sectionSlug,
      });
    }

    // Find and register labeled equations: $$...$$  {#eq:id}
    const equationRegex = /\$\$[\s\S]*?\$\$\s*\{#eq:([^}]+)\}/g;
    let match;
    while ((match = equationRegex.exec(content)) !== null) {
      const eqId = match[1];
      const key = `eq:${eqId}`;
      if (!state.index[key]) {
        // Extract equation preview (first 50 chars of LaTeX)
        const eqMatch = match[0].match(/\$\$([\s\S]*?)\$\$/);
        const preview = eqMatch ? eqMatch[1].slice(0, 50).trim() + "..." : undefined;

        get().registerReference({
          type: "eq",
          id: eqId,
          preview,
          chapterSlug,
          sectionSlug,
          anchor: `eq-${eqId}`,
        });
      }
    }

    // Find and register labeled figures: ![alt](src) {#fig:id}
    const figureRegex = /!\[([^\]]*)\]\([^)]+\)\s*\{#fig:([^}]+)\}/g;
    while ((match = figureRegex.exec(content)) !== null) {
      const alt = match[1];
      const figId = match[2];
      const key = `fig:${figId}`;
      if (!state.index[key]) {
        get().registerReference({
          type: "fig",
          id: figId,
          title: alt,
          preview: alt,
          chapterSlug,
          sectionSlug,
          anchor: `fig-${figId}`,
        });
      }
    }

    // Find and register labeled tables (after table, on separate line): {#tbl:id}
    const tableRegex = /\|[\s\S]*?\|\n\s*\{#tbl:([^}]+)\}/g;
    while ((match = tableRegex.exec(content)) !== null) {
      const tblId = match[1];
      const key = `tbl:${tblId}`;
      if (!state.index[key]) {
        get().registerReference({
          type: "tbl",
          id: tblId,
          chapterSlug,
          sectionSlug,
          anchor: `tbl-${tblId}`,
        });
      }
    }
  },
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse a reference string like "eq:1.1" or "sec:01-intro/1-1-section"
 */
export function parseReferenceString(refString: string): {
  type: ReferenceType;
  id: string;
} | null {
  const match = refString.match(/^(sec|eq|fig|tbl|def):(.+)$/);
  if (!match) return null;
  return {
    type: match[1] as ReferenceType,
    id: match[2],
  };
}

/**
 * Generate a URL path for a reference
 */
export function getReferenceUrl(
  bookSlug: string,
  ref: ReferenceItem
): string {
  const base = `/${bookSlug}/kafli/${ref.chapterSlug}`;

  if (ref.sectionSlug) {
    const path = `${base}/${ref.sectionSlug}`;
    return ref.anchor ? `${path}#${ref.anchor}` : path;
  }

  return base;
}
