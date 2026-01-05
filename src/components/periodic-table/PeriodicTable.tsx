import { useState, useCallback, useRef, useEffect } from "react";
import {
  X,
  Search,
  Atom,
  Thermometer,
  Scale,
  Zap,
  Layers,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  ELEMENTS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  getElementPhase,
  type Element,
  type ElementCategory,
} from "@/data/elements";
import { useBook } from "@/hooks/useBook";
import { Link } from "react-router-dom";

// =============================================================================
// TYPES
// =============================================================================

interface PeriodicTableProps {
  onElementSelect?: (element: Element) => void;
  highlightElements?: number[]; // Atomic numbers to highlight
  filterCategory?: ElementCategory | null;
}

interface ElementCellProps {
  element: Element;
  isHighlighted: boolean;
  isFiltered: boolean;
  isFocused: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Grid positions for standard periodic table layout (18 columns x 10 rows)
// Special handling for lanthanides (row 8) and actinides (row 9)
const ELEMENT_POSITIONS: Record<number, { row: number; col: number }> = {
  // Period 1
  1: { row: 0, col: 0 },   // H
  2: { row: 0, col: 17 },  // He
  // Period 2
  3: { row: 1, col: 0 },   // Li
  4: { row: 1, col: 1 },   // Be
  5: { row: 1, col: 12 },  // B
  6: { row: 1, col: 13 },  // C
  7: { row: 1, col: 14 },  // N
  8: { row: 1, col: 15 },  // O
  9: { row: 1, col: 16 },  // F
  10: { row: 1, col: 17 }, // Ne
  // Period 3
  11: { row: 2, col: 0 },  // Na
  12: { row: 2, col: 1 },  // Mg
  13: { row: 2, col: 12 }, // Al
  14: { row: 2, col: 13 }, // Si
  15: { row: 2, col: 14 }, // P
  16: { row: 2, col: 15 }, // S
  17: { row: 2, col: 16 }, // Cl
  18: { row: 2, col: 17 }, // Ar
  // Period 4
  19: { row: 3, col: 0 },  // K
  20: { row: 3, col: 1 },  // Ca
  21: { row: 3, col: 2 },  // Sc
  22: { row: 3, col: 3 },  // Ti
  23: { row: 3, col: 4 },  // V
  24: { row: 3, col: 5 },  // Cr
  25: { row: 3, col: 6 },  // Mn
  26: { row: 3, col: 7 },  // Fe
  27: { row: 3, col: 8 },  // Co
  28: { row: 3, col: 9 },  // Ni
  29: { row: 3, col: 10 }, // Cu
  30: { row: 3, col: 11 }, // Zn
  31: { row: 3, col: 12 }, // Ga
  32: { row: 3, col: 13 }, // Ge
  33: { row: 3, col: 14 }, // As
  34: { row: 3, col: 15 }, // Se
  35: { row: 3, col: 16 }, // Br
  36: { row: 3, col: 17 }, // Kr
  // Period 5
  37: { row: 4, col: 0 },  // Rb
  38: { row: 4, col: 1 },  // Sr
  39: { row: 4, col: 2 },  // Y
  40: { row: 4, col: 3 },  // Zr
  41: { row: 4, col: 4 },  // Nb
  42: { row: 4, col: 5 },  // Mo
  43: { row: 4, col: 6 },  // Tc
  44: { row: 4, col: 7 },  // Ru
  45: { row: 4, col: 8 },  // Rh
  46: { row: 4, col: 9 },  // Pd
  47: { row: 4, col: 10 }, // Ag
  48: { row: 4, col: 11 }, // Cd
  49: { row: 4, col: 12 }, // In
  50: { row: 4, col: 13 }, // Sn
  51: { row: 4, col: 14 }, // Sb
  52: { row: 4, col: 15 }, // Te
  53: { row: 4, col: 16 }, // I
  54: { row: 4, col: 17 }, // Xe
  // Period 6
  55: { row: 5, col: 0 },  // Cs
  56: { row: 5, col: 1 },  // Ba
  // 57-71 Lanthanides (shown in row 8)
  72: { row: 5, col: 3 },  // Hf
  73: { row: 5, col: 4 },  // Ta
  74: { row: 5, col: 5 },  // W
  75: { row: 5, col: 6 },  // Re
  76: { row: 5, col: 7 },  // Os
  77: { row: 5, col: 8 },  // Ir
  78: { row: 5, col: 9 },  // Pt
  79: { row: 5, col: 10 }, // Au
  80: { row: 5, col: 11 }, // Hg
  81: { row: 5, col: 12 }, // Tl
  82: { row: 5, col: 13 }, // Pb
  83: { row: 5, col: 14 }, // Bi
  84: { row: 5, col: 15 }, // Po
  85: { row: 5, col: 16 }, // At
  86: { row: 5, col: 17 }, // Rn
  // Period 7
  87: { row: 6, col: 0 },  // Fr
  88: { row: 6, col: 1 },  // Ra
  // 89-103 Actinides (shown in row 9)
  104: { row: 6, col: 3 },  // Rf
  105: { row: 6, col: 4 },  // Db
  106: { row: 6, col: 5 },  // Sg
  107: { row: 6, col: 6 },  // Bh
  108: { row: 6, col: 7 },  // Hs
  109: { row: 6, col: 8 },  // Mt
  110: { row: 6, col: 9 },  // Ds
  111: { row: 6, col: 10 }, // Rg
  112: { row: 6, col: 11 }, // Cn
  113: { row: 6, col: 12 }, // Nh
  114: { row: 6, col: 13 }, // Fl
  115: { row: 6, col: 14 }, // Mc
  116: { row: 6, col: 15 }, // Lv
  117: { row: 6, col: 16 }, // Ts
  118: { row: 6, col: 17 }, // Og
  // Lanthanides (row 8, with gap)
  57: { row: 8, col: 3 },  // La
  58: { row: 8, col: 4 },  // Ce
  59: { row: 8, col: 5 },  // Pr
  60: { row: 8, col: 6 },  // Nd
  61: { row: 8, col: 7 },  // Pm
  62: { row: 8, col: 8 },  // Sm
  63: { row: 8, col: 9 },  // Eu
  64: { row: 8, col: 10 }, // Gd
  65: { row: 8, col: 11 }, // Tb
  66: { row: 8, col: 12 }, // Dy
  67: { row: 8, col: 13 }, // Ho
  68: { row: 8, col: 14 }, // Er
  69: { row: 8, col: 15 }, // Tm
  70: { row: 8, col: 16 }, // Yb
  71: { row: 8, col: 17 }, // Lu
  // Actinides (row 9, with gap)
  89: { row: 9, col: 3 },  // Ac
  90: { row: 9, col: 4 },  // Th
  91: { row: 9, col: 5 },  // Pa
  92: { row: 9, col: 6 },  // U
  93: { row: 9, col: 7 },  // Np
  94: { row: 9, col: 8 },  // Pu
  95: { row: 9, col: 9 },  // Am
  96: { row: 9, col: 10 }, // Cm
  97: { row: 9, col: 11 }, // Bk
  98: { row: 9, col: 12 }, // Cf
  99: { row: 9, col: 13 }, // Es
  100: { row: 9, col: 14 }, // Fm
  101: { row: 9, col: 15 }, // Md
  102: { row: 9, col: 16 }, // No
  103: { row: 9, col: 17 }, // Lr
};

// =============================================================================
// ELEMENT CELL COMPONENT
// =============================================================================

function ElementCell({
  element,
  isHighlighted,
  isFiltered,
  isFocused,
  onClick,
  onKeyDown,
}: ElementCellProps) {
  const colors = CATEGORY_COLORS[element.category];

  return (
    <button
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-atomic-number={element.atomicNumber}
      className={`
        group relative flex h-full w-full flex-col items-center justify-center
        rounded border p-0.5 text-center transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:ring-offset-1
        ${isFiltered ? "opacity-25" : ""}
        ${isHighlighted ? "ring-2 ring-[var(--accent-color)] ring-offset-1" : ""}
        ${isFocused ? "ring-2 ring-blue-500 ring-offset-1" : ""}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
      aria-label={`${element.nameIs} (${element.symbol}), sætistala ${element.atomicNumber}`}
    >
      {/* Atomic number */}
      <span className="absolute left-0.5 top-0 text-[8px] opacity-70 sm:text-[9px]">
        {element.atomicNumber}
      </span>

      {/* Symbol */}
      <span className="text-sm font-bold leading-tight sm:text-base md:text-lg">
        {element.symbol}
      </span>

      {/* Name (hidden on small screens) */}
      <span className="hidden truncate text-[7px] leading-tight opacity-80 sm:block sm:text-[8px]">
        {element.nameIs}
      </span>

      {/* Atomic mass (hidden on small screens) */}
      <span className="hidden text-[6px] opacity-60 md:block">
        {element.atomicMass.toFixed(2)}
      </span>
    </button>
  );
}

// =============================================================================
// ELEMENT DETAIL MODAL
// =============================================================================

interface ElementModalProps {
  element: Element;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function ElementModal({
  element,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
}: ElementModalProps) {
  const { bookSlug } = useBook();
  const colors = CATEGORY_COLORS[element.category];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onNavigate("prev");
      } else if (e.key === "ArrowRight" && hasNext) {
        onNavigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate, hasPrev, hasNext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="element-modal-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--bg-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with element color */}
        <div
          className="sticky top-0 flex items-center justify-between p-4"
          style={{ backgroundColor: colors.bg, borderColor: colors.border }}
        >
          <div className="flex items-center gap-4">
            {/* Large symbol */}
            <div
              className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 bg-white/20"
              style={{ borderColor: colors.border }}
            >
              <span className="text-xs opacity-70">{element.atomicNumber}</span>
              <span className="text-3xl font-bold" style={{ color: colors.text }}>
                {element.symbol}
              </span>
              <span className="text-xs opacity-70">{element.atomicMass.toFixed(4)}</span>
            </div>

            <div>
              <h2
                id="element-modal-title"
                className="text-2xl font-bold"
                style={{ color: colors.text }}
              >
                {element.nameIs}
              </h2>
              <p className="text-sm opacity-80" style={{ color: colors.text }}>
                {element.name}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: colors.border, color: colors.text }}
              >
                {CATEGORY_LABELS[element.category]}
              </span>
            </div>
          </div>

          {/* Navigation and close */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("prev")}
              disabled={!hasPrev}
              className="rounded-full p-2 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="Fyrra frumefni"
            >
              <ChevronLeft size={20} style={{ color: colors.text }} />
            </button>
            <button
              onClick={() => onNavigate("next")}
              disabled={!hasNext}
              className="rounded-full p-2 transition-colors hover:bg-black/10 disabled:opacity-30"
              aria-label="Næsta frumefni"
            >
              <ChevronRight size={20} style={{ color: colors.text }} />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-black/10"
              aria-label="Loka"
            >
              <X size={20} style={{ color: colors.text }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          {element.description && (
            <p className="mb-6 text-[var(--text-secondary)]">{element.description}</p>
          )}

          {/* Properties grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Atomic properties */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                <Atom size={16} className="text-[var(--accent-color)]" />
                Eiginleikar
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Sætistala</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{element.atomicNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Atómmassi</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{element.atomicMass} u</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Lota</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{element.period}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Flokkur</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{element.group ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Blokk</dt>
                  <dd className="font-medium text-[var(--text-primary)]">{element.block}</dd>
                </div>
              </dl>
            </div>

            {/* Electronic properties */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                <Zap size={16} className="text-[var(--accent-color)]" />
                Rafeindir
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Rafeindaskipan</dt>
                  <dd className="font-mono text-xs text-[var(--text-primary)]">
                    {element.electronConfiguration}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Oxunartölur</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {element.oxidationStates.join(", ")}
                  </dd>
                </div>
                {element.electronegativity && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-secondary)]">Rafneikvæðni</dt>
                    <dd className="font-medium text-[var(--text-primary)]">
                      {element.electronegativity}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Physical properties */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                <Thermometer size={16} className="text-[var(--accent-color)]" />
                Eðliseiginleikar
              </h3>
              <dl className="space-y-2 text-sm">
                {element.meltingPoint && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-secondary)]">Bræðslumark</dt>
                    <dd className="font-medium text-[var(--text-primary)]">
                      {element.meltingPoint} K
                    </dd>
                  </div>
                )}
                {element.boilingPoint && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-secondary)]">Suðumark</dt>
                    <dd className="font-medium text-[var(--text-primary)]">
                      {element.boilingPoint} K
                    </dd>
                  </div>
                )}
                {element.density && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-secondary)]">Eðlismassi</dt>
                    <dd className="font-medium text-[var(--text-primary)]">
                      {element.density} g/cm³
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Classification */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--text-primary)]">
                <Layers size={16} className="text-[var(--accent-color)]" />
                Flokkun
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Tegund</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {CATEGORY_LABELS[element.category]}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--text-secondary)]">Ástand við 25°C</dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {getElementPhase(element) === "solid" && "Fast"}
                    {getElementPhase(element) === "liquid" && "Fljótandi"}
                    {getElementPhase(element) === "gas" && "Gas"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Link to glossary if applicable */}
          <div className="mt-6 flex justify-center">
            <Link
              to={`/${bookSlug}/ordabok?search=${encodeURIComponent(element.nameIs)}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              <ExternalLink size={16} />
              Leita í orðabók
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LEGEND COMPONENT
// =============================================================================

interface LegendProps {
  activeCategory: ElementCategory | null;
  onCategoryClick: (category: ElementCategory | null) => void;
}

function Legend({ activeCategory, onCategoryClick }: LegendProps) {
  const categories = Object.entries(CATEGORY_LABELS) as [ElementCategory, string][];

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        onClick={() => onCategoryClick(null)}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
          activeCategory === null
            ? "bg-[var(--accent-color)] text-white"
            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        }`}
      >
        Allt
      </button>
      {categories.map(([category, label]) => {
        const colors = CATEGORY_COLORS[category];
        return (
          <button
            key={category}
            onClick={() => onCategoryClick(category)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              activeCategory === category
                ? "ring-2 ring-[var(--accent-color)] ring-offset-1"
                : "opacity-80 hover:opacity-100"
            }`}
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              borderColor: colors.border,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PeriodicTable({
  onElementSelect,
  highlightElements = [],
  filterCategory: externalFilterCategory,
}: PeriodicTableProps) {
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [filterCategory, setFilterCategory] = useState<ElementCategory | null>(
    externalFilterCategory ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Filter elements by search and category
  const filteredElements = ELEMENTS.filter((el) => {
    const matchesSearch =
      searchQuery === "" ||
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.nameIs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.atomicNumber.toString() === searchQuery;

    return matchesSearch;
  });

  const searchMatchIds = new Set(filteredElements.map((el) => el.atomicNumber));

  // Handle element click
  const handleElementClick = useCallback(
    (element: Element) => {
      setSelectedElement(element);
      onElementSelect?.(element);
    },
    [onElementSelect]
  );

  // Handle modal navigation
  const handleNavigate = useCallback((direction: "prev" | "next") => {
    if (!selectedElement) return;

    const currentIndex = ELEMENTS.findIndex(
      (el) => el.atomicNumber === selectedElement.atomicNumber
    );
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < ELEMENTS.length) {
      setSelectedElement(ELEMENTS[newIndex]);
    }
  }, [selectedElement]);

  // Keyboard navigation within grid
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, element: Element) => {
      const pos = ELEMENT_POSITIONS[element.atomicNumber];
      if (!pos) return;

      let targetRow = pos.row;
      let targetCol = pos.col;

      switch (e.key) {
        case "ArrowUp":
          targetRow = pos.row - 1;
          break;
        case "ArrowDown":
          targetRow = pos.row + 1;
          break;
        case "ArrowLeft":
          targetCol = pos.col - 1;
          break;
        case "ArrowRight":
          targetCol = pos.col + 1;
          break;
        case "Enter":
        case " ":
          handleElementClick(element);
          return;
        default:
          return;
      }

      e.preventDefault();

      // Find element at target position
      const targetElement = ELEMENTS.find((el) => {
        const elPos = ELEMENT_POSITIONS[el.atomicNumber];
        return elPos && elPos.row === targetRow && elPos.col === targetCol;
      });

      if (targetElement) {
        setFocusedIndex(targetElement.atomicNumber);
        // Focus the element
        const button = gridRef.current?.querySelector(
          `[data-atomic-number="${targetElement.atomicNumber}"]`
        ) as HTMLButtonElement;
        button?.focus();
      }
    },
    [handleElementClick]
  );

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Leita að frumefni..."
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent-color)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] sm:w-64"
            aria-label="Leita að frumefni"
          />
        </div>

        {/* Element count */}
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-[var(--text-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {searchQuery ? `${filteredElements.length} fundust` : "118 frumefni"}
          </span>
        </div>
      </div>

      {/* Legend */}
      <Legend activeCategory={filterCategory} onCategoryClick={setFilterCategory} />

      {/* Periodic table grid */}
      <div
        ref={gridRef}
        className="overflow-x-auto"
        role="grid"
        aria-label="Lotukerfið"
      >
        <div
          className="grid min-w-[800px] gap-0.5"
          style={{
            gridTemplateColumns: "repeat(18, minmax(40px, 1fr))",
            gridTemplateRows: "repeat(10, minmax(40px, 50px))",
          }}
        >
          {ELEMENTS.map((element) => {
            const pos = ELEMENT_POSITIONS[element.atomicNumber];
            if (!pos) return null;

            const isHighlighted = highlightElements.includes(element.atomicNumber);
            const isFiltered =
              (filterCategory !== null && element.category !== filterCategory) ||
              (searchQuery !== "" && !searchMatchIds.has(element.atomicNumber));
            const isFocused = focusedIndex === element.atomicNumber;

            return (
              <div
                key={element.atomicNumber}
                style={{
                  gridRow: pos.row + 1,
                  gridColumn: pos.col + 1,
                }}
              >
                <ElementCell
                  element={element}
                  isHighlighted={isHighlighted}
                  isFiltered={isFiltered}
                  isFocused={isFocused}
                  onClick={() => handleElementClick(element)}
                  onKeyDown={(e) => handleKeyDown(e, element)}
                />
              </div>
            );
          })}

          {/* Lanthanide/Actinide labels */}
          <div
            style={{ gridRow: 6, gridColumn: 3 }}
            className="flex items-center justify-center text-[10px] text-[var(--text-secondary)]"
          >
            57-71
          </div>
          <div
            style={{ gridRow: 7, gridColumn: 3 }}
            className="flex items-center justify-center text-[10px] text-[var(--text-secondary)]"
          >
            89-103
          </div>
        </div>
      </div>

      {/* Element detail modal */}
      {selectedElement && (
        <ElementModal
          element={selectedElement}
          onClose={() => setSelectedElement(null)}
          onNavigate={handleNavigate}
          hasPrev={selectedElement.atomicNumber > 1}
          hasNext={selectedElement.atomicNumber < 118}
        />
      )}
    </div>
  );
}
