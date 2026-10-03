import { describe, it, expect } from "vitest";
import { COVER_MOTIFS, getCoverMotif, coverTitleSize } from "./bookCover";

describe("getCoverMotif", () => {
  it("returns the named motif", () => {
    expect(getCoverMotif("atom")).toBe(COVER_MOTIFS.atom);
  });
  it("falls back to book for an unknown name", () => {
    expect(getCoverMotif("definitely-not-a-motif")).toBe(COVER_MOTIFS.book);
  });
  it("falls back to book for undefined", () => {
    expect(getCoverMotif(undefined)).toBe(COVER_MOTIFS.book);
  });
});

describe("COVER_MOTIFS", () => {
  it("every motif has at least one svg child node", () => {
    for (const node of Object.values(COVER_MOTIFS)) {
      expect(node.length).toBeGreaterThan(0);
    }
  });
});

describe("coverTitleSize", () => {
  it("regular for a short single word", () => {
    expect(coverTitleSize("Efnafræði")).toBe("regular"); // 9 chars
  });
  it("long when a single word exceeds 10 chars", () => {
    expect(coverTitleSize("Örverufræði")).toBe("long"); // 11 chars
  });
  it("regular for a multi-word title whose words are each short", () => {
    expect(coverTitleSize("Lífræn efnafræði")).toBe("regular"); // longest word = 9
  });
});
