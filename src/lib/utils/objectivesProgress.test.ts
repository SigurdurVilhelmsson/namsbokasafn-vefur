import { describe, it, expect } from "vitest";
import type { TableOfContents } from "$lib/types/content";
import { countBookObjectives, coverage } from "./objectivesProgress";

describe("countBookObjectives", () => {
  it("sums objectives across all chapters/sections", () => {
    const toc = {
      chapters: [
        {
          sections: [
            { metadata: { objectives: ["a", "b"] } },
            { metadata: { objectives: ["c"] } },
          ],
        },
        {
          sections: [
            { metadata: { objectives: [] } },
            { metadata: { objectives: ["d"] } },
          ],
        },
      ],
    } as unknown as TableOfContents;
    expect(countBookObjectives(toc)).toBe(4);
  });

  it("returns 0 for a toc whose sections have no objectives", () => {
    const toc = {
      chapters: [{ sections: [{ metadata: { objectives: [] } }, {}] }],
    } as unknown as TableOfContents;
    expect(countBookObjectives(toc)).toBe(0);
  });
});

describe("coverage", () => {
  it("computes assessed/total with 0% guard", () => {
    expect(coverage(1, 4)).toEqual({ completed: 1, total: 4, percentage: 25 });
    expect(coverage(0, 0)).toEqual({ completed: 0, total: 0, percentage: 0 });
  });
});
