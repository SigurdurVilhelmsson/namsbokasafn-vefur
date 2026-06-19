import { describe, it, expect, beforeEach, vi } from "vitest";
import { get } from "svelte/store";

let store: typeof import("./objectives").objectivesStore;
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  store = (await import("./objectives")).objectivesStore;
});

describe("objectives progress uses the real total (M4)", () => {
  it("overall progress is not 100% when fewer assessed than total", () => {
    store.markObjectiveComplete("b", "01", "1-1", 0, "A"); // 1 assessed
    const p = store.getOverallObjectivesProgress(4); // of 4 real objectives
    expect(p.total).toBe(4);
    expect(p.completed).toBe(1);
    expect(p.percentage).toBe(25);
  });

  it("chapter progress counts assessed against the passed total", () => {
    store.markObjectiveComplete("b", "01", "1-1", 0, "A");
    store.markObjectiveComplete("b", "01", "1-2", 0, "B");
    const p = store.getChapterObjectivesProgress("b", "01", 5);
    expect(p.completed).toBe(2);
    expect(p.total).toBe(5);
    expect(p.percentage).toBe(40);
  });

  it("guards total === 0 (no objectives yet) with 0%, no NaN", () => {
    const p = store.getOverallObjectivesProgress(0);
    expect(p.percentage).toBe(0);
    expect(p.total).toBe(0);
  });
});

describe("rateObjective upserts (assessed + confidence)", () => {
  it("creates the entry and records confidence when none existed", () => {
    store.rateObjective("b", "01", "1-1", 0, "Objective text", 2);
    expect(store.isObjectiveCompleted("b", "01", "1-1", 0)).toBe(true);
    expect(store.getObjectiveConfidence("b", "01", "1-1", 0)).toBe(2);
  });

  it("updates confidence on an existing entry without dropping completion", () => {
    store.markObjectiveComplete("b", "01", "1-1", 0, "Objective text");
    store.rateObjective("b", "01", "1-1", 0, "Objective text", 5);
    expect(store.isObjectiveCompleted("b", "01", "1-1", 0)).toBe(true);
    expect(store.getObjectiveConfidence("b", "01", "1-1", 0)).toBe(5);
  });
});
