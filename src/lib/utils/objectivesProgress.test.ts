import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Section, TableOfContents } from "$lib/types/content";
import { countBookObjectives, coverage, currentObjectives } from "./objectivesProgress";
import { getChapterPath, getSectionPath } from "./contentLoader";
import { createObjectiveKey } from "./storeHelpers";

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

// A chapter as efni's H2 leaves it: the introduction keeps its page but lists no objectives.
const TOC = {
  chapters: [
    {
      number: 1,
      title: "Efnafræði",
      sections: [
        { number: "", title: "Inngangur", file: "1-0-introduction.html", type: "introduction", metadata: { objectives: [] } },
        { number: "1.1", title: "Efnafræði í samhengi", file: "1-1-efnafraedi.html", metadata: { objectives: ["a", "b"] } },
      ],
    },
  ],
} as unknown as TableOfContents;

const tick = { isCompleted: true };

describe("currentObjectives", () => {
  it("keeps a tick whose section still lists an objective at its index", () => {
    const stored = { "chem/01/1-1-efnafraedi/1": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual(stored);
  });

  it("drops a tick on a section that no longer lists objectives", () => {
    const stored = { "chem/01/1-0-introduction/0": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual({});
  });

  it("drops a tick whose index is past the end of its section's list", () => {
    const stored = { "chem/01/1-1-efnafraedi/2": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual({});
  });

  it("drops a tick whose section is gone from the table of contents", () => {
    const stored = { "chem/01/1-9-horfinn/0": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual({});
  });

  it("drops a key whose last part is not an objective index", () => {
    const stored = { "chem/01/1-1-efnafraedi/-1": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual({});
  });

  it("resolves a section the way the section route does, short legacy slug included", () => {
    const stored = { "chem/1/1-1/0": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual(stored);
  });

  it("leaves another book's ticks alone", () => {
    const stored = { "phys/01/1-0-introduction/0": tick };
    expect(currentObjectives(stored, TOC, "chem")).toEqual(stored);
  });

  it("keeps every tick when there is no table of contents to judge by", () => {
    const stored = { "chem/01/1-0-introduction/0": tick };
    expect(currentObjectives(stored, null, "chem")).toEqual(stored);
  });
});

/** Every objective a toc lists, keyed as the section page keys a tick (chapter 00 is the front matter). */
function everyObjectiveKey(toc: TableOfContents, book: string): string[] {
  const keyed = (chapterSlug: string, sections: Section[]) =>
    sections.flatMap((section) =>
      (section.metadata?.objectives ?? []).map((_, i) => createObjectiveKey(book, chapterSlug, getSectionPath(section), i))
    );
  return [
    ...keyed("00", toc.frontMatter ?? []),
    ...toc.chapters.flatMap((chapter) => keyed(getChapterPath(chapter), chapter.sections)),
  ];
}

describe("currentObjectives keeps every objective the section pages show", () => {
  it("in a synthetic toc", () => {
    const keys = everyObjectiveKey(TOC, "chem");
    const stored = Object.fromEntries(keys.map((k) => [k, tick]));
    expect(keys).toHaveLength(2);
    expect(Object.keys(currentObjectives(stored, TOC, "chem"))).toEqual(keys);
  });

  // The synced books that list objectives (gitignored). A resolver stricter than the section route
  // would hide ticks the reader can see, which is worse than counting an orphan. toc.json carries
  // objectives only once process-content.js has run (npm run dev or build): a bare sync's has none,
  // so in CI's unit job, which runs before the build, this skips rather than passing on nothing.
  const contentDir = join(process.cwd(), "static", "content");
  const readToc = (book: string) =>
    JSON.parse(readFileSync(join(contentDir, book, "toc.json"), "utf-8")) as TableOfContents;
  const books = existsSync(contentDir)
    ? readdirSync(contentDir)
        .filter((book) => existsSync(join(contentDir, book, "toc.json")))
        .filter((book) => everyObjectiveKey(readToc(book), book).length > 0)
    : [];

  it.skipIf(books.length === 0).each(books)("in the synced %s", (book) => {
    const toc = readToc(book);
    const keys = everyObjectiveKey(toc, book);
    const stored = Object.fromEntries(keys.map((k) => [k, tick]));
    expect(Object.keys(currentObjectives(stored, toc, book))).toHaveLength(keys.length);
  });
});
