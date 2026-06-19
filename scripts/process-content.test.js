// scripts/process-content.test.js
import { describe, it, expect } from "vitest";
import { parseHtmlPageData } from "./process-content.js";

describe("parseHtmlPageData objectives", () => {
  it("extracts the objectives array from page-data", () => {
    const html =
      '<script id="page-data">' +
      JSON.stringify({
        title: "T",
        section: "1.4",
        chapter: 1,
        objectives: ["A", "B"],
      }) +
      "</script>";
    expect(parseHtmlPageData(html).objectives).toEqual(["A", "B"]);
  });

  it("returns no objectives field when page-data omits it", () => {
    const html =
      '<script id="page-data">' + JSON.stringify({ title: "T" }) + "</script>";
    expect(parseHtmlPageData(html).objectives).toBeUndefined();
  });
});
