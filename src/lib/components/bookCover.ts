/**
 * Decorative motifs and title sizing for procedural book covers (BookCover.svelte).
 * Motifs are LARGE decorative illustrations rendered as a low-opacity watermark —
 * a different role from the 16/20/24 UI icons in icons.ts, hence a separate registry.
 * Each motif is an IconNode: [tag, attrs] children of a viewBox="0 0 24 24" <svg>.
 */
import type { IconNode } from "./icons";

export const COVER_MOTIFS = {
  // Generic chemistry — atom
  atom: [
    ["circle", { cx: 12, cy: 12, r: 1 }],
    [
      "path",
      {
        d: "M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z",
      },
    ],
    [
      "path",
      {
        d: "M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z",
      },
    ],
  ],
  // Organic chemistry — benzene ring
  benzene: [
    ["path", { d: "M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" }],
    ["circle", { cx: 12, cy: 12, r: 5.5 }],
  ],
  // Biology — leaf
  leaf: [
    [
      "path",
      {
        d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z",
      },
    ],
    ["path", { d: "M2 21c0-3 1.85-5.36 5.08-6" }],
  ],
  // Microbiology — cell / microbe
  microbe: [
    ["circle", { cx: 12, cy: 12, r: 8 }],
    ["circle", { cx: 10, cy: 10, r: 1.6 }],
    ["circle", { cx: 14.5, cy: 13, r: 1.2 }],
    ["circle", { cx: 11, cy: 15, r: 1 }],
    ["path", { d: "M12 2v2M12 20v2M2 12h2M20 12h2" }],
  ],
  // Physics — orbit
  orbit: [
    ["circle", { cx: 12, cy: 12, r: 2 }],
    ["ellipse", { cx: 12, cy: 12, rx: 10, ry: 4.5 }],
    [
      "ellipse",
      { cx: 12, cy: 12, rx: 10, ry: 4.5, transform: "rotate(60 12 12)" },
    ],
    [
      "ellipse",
      { cx: 12, cy: 12, rx: 10, ry: 4.5, transform: "rotate(120 12 12)" },
    ],
  ],
  // Neutral fallback — closed book
  book: [
    [
      "path",
      { d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" },
    ],
  ],
} satisfies Record<string, IconNode>;

export function getCoverMotif(name: string | undefined): IconNode {
  return name && Object.prototype.hasOwnProperty.call(COVER_MOTIFS, name)
    ? COVER_MOTIFS[name as keyof typeof COVER_MOTIFS]
    : COVER_MOTIFS.book;
}

/**
 * Long Icelandic compounds (a single word > 10 chars, e.g. "Örverufræði") can't
 * wrap and crowd the cover edge; they get the smaller title step. Multi-word titles
 * wrap naturally and keep the regular size.
 */
export function coverTitleSize(title: string): "regular" | "long" {
  const longest = title.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  return longest > 10 ? "long" : "regular";
}
