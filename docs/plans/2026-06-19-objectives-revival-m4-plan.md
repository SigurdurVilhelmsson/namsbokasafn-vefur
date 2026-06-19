# Learning-Objectives Revival + M4 Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revive the inert learning-objectives feature and fix audit bug M4 (progress always 100%) by sourcing real objective totals and reframing `/markmid` around confidence calibration with a true coverage bar.

**Architecture:** efni emits a structured `objectives` array into section page-data (separate efni session — prerequisite for live data). In vefur, `process-content.js` reads it into `toc.json`; the section reader's existing checkbox UI then renders; the objectives store computes progress against the real total and gains an upsert path; `/markmid` shows a confidence-calibration headline plus a real `assessed/total` coverage bar; ReflectPhase records via the upsert. The vefur half is fully unit-testable now with fixtures/seeded data; full end-to-end verification waits on the efni change landing + sync.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest (jsdom), Node build script (`scripts/process-content.js`).

Design: `docs/plans/2026-06-19-objectives-revival-m4-design.md`.

## Global Constraints

- **Pedagogy:** track two separate constructs — _assessed_ (`isCompleted: true`) and _confidence_ (1–5). `/markmid` headline = confidence calibration; coverage bar = `assessed / real total`. A low-confidence rating must never read as "done."
- **Keep the `isCompleted` storage field** (now meaning "assessed"); do NOT rename it. UI copy/headline only.
- **Real total comes from `toc.json`** (`section.objectives` populated from page-data) — never derive the denominator from stored entries.
- **Graceful degradation:** when a section's `objectives` is empty (book not yet re-rendered by efni), no checkbox block, contributes 0 to totals, no `/0` or NaN.
- **Icelandic UI text, English code/comments.** Accent = amber `var(--accent-color)` (no hardcoded blue for interactive elements).
- **Client-side only; additive; no data migration.**
- `ProgressResult = { total: number; completed: number; percentage: number }`; `calculateProgressFromCounts(completed, total)` returns it (percentage 0 when total === 0).

---

### Task 0 (EXTERNAL — efni session, prerequisite for live data)

Not implemented in this repo. In an efni-rooted session: `tools/cnxml-render.js` emits `objectives: string[]` into each section's page-data JSON (alongside `equations`/`terms`), with a render test; re-render + sync. Tracked in efni memory. The vefur tasks below are built and unit-tested independently of this; they degrade gracefully until it lands.

---

### Task 1: process-content.js reads objectives from page-data into toc.json

**Files:**

- Modify: `scripts/process-content.js:62-69` (export `parseHtmlPageData`), `:124-131` (metadata build)
- Test: `scripts/process-content.test.js` (create)

**Interfaces:**

- Produces: `section.metadata.objectives: string[]` in `toc.json`, sourced from `pageData.objectives` (defaulting to `[]`).
- Exposes `parseHtmlPageData(content: string)` as a named export for testing.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run scripts/process-content.test.js`
      Expected: FAIL — `parseHtmlPageData` is not exported (import error / undefined).

- [ ] **Step 3: Implement** — in `scripts/process-content.js`:
  1. Add `export` to the existing function: `export function parseHtmlPageData(content) { ... }` (keep its body — regex match on `id="page-data"`, `JSON.parse(match[1])`, return null when absent).
  2. In the per-section metadata build (currently `objectives: []`), change to:

```js
section.metadata = {
  title: pageData?.title || section.title,
  section: String(pageData?.section || section.number),
  chapter: pageData?.chapter || chapter.number,
  readingTime,
  difficulty: undefined,
  objectives: pageData?.objectives || [],
};
```

3. If the file uses CommonJS `require`/`module.exports`, instead export via the existing module system (match the file's current style — it uses ESM `import`, so `export function` is correct).

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run scripts/process-content.test.js` → PASS.

- [ ] **Step 5: Guard the script still runs** — `npm run process-content` (or `node scripts/process-content.js`) completes without error; `objectives` is `[]` for current content (efni not yet emitting) — that's expected.

- [ ] **Step 6: Commit**

```bash
git add scripts/process-content.js scripts/process-content.test.js
git commit -m "feat(content): carry section learning objectives from page-data into toc.json"
```

---

### Task 2: objectives store — real-total progress + upsert rating

**Files:**

- Modify: `src/lib/stores/objectives.ts:184-203` (chapter/overall getters), add `rateObjective` near `:218`
- Test: `src/lib/stores/objectives.test.ts` (create if absent)

**Interfaces:**

- Consumes: `calculateProgressFromCounts(completed, total)`, `createObjectiveKey`, `getCurrentTimestamp` (already imported).
- Produces:
  - `getChapterObjectivesProgress(bookSlug, chapterSlug, totalObjectives: number): ProgressResult`
  - `getOverallObjectivesProgress(totalObjectives: number): ProgressResult`
  - `rateObjective(bookSlug, chapterSlug, sectionSlug, objectiveIndex, objectiveText, confidence: ConfidenceLevel): void` — upserts: creates the entry (`isCompleted: true`, `completedAt`) if missing, and always sets `confidence` + `assessedAt`.

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/lib/stores/objectives.test.ts`
      Expected: FAIL — `getOverallObjectivesProgress`/`getChapterObjectivesProgress` take no total arg (TS/assertion failures); `rateObjective` undefined.

- [ ] **Step 3: Implement** — in `src/lib/stores/objectives.ts`:

Replace the two getters:

```ts
		getChapterObjectivesProgress: (
			bookSlug: string,
			chapterSlug: string,
			totalObjectives: number
		): ProgressResult => {
			const { completedObjectives } = get({ subscribe });
			const prefix = `${bookSlug}/${chapterSlug}/`;
			const completed = Object.keys(completedObjectives).filter(
				(key) => key.startsWith(prefix) && completedObjectives[key].isCompleted
			).length;
			return calculateProgressFromCounts(completed, totalObjectives);
		},

		getOverallObjectivesProgress: (totalObjectives: number): ProgressResult => {
			const { completedObjectives } = get({ subscribe });
			const completed = Object.values(completedObjectives).filter(
				(obj) => obj.isCompleted
			).length;
			return calculateProgressFromCounts(completed, totalObjectives);
		},
```

Add `rateObjective` (after `setObjectiveConfidence`):

```ts
		rateObjective: (
			bookSlug: string,
			chapterSlug: string,
			sectionSlug: string,
			objectiveIndex: number,
			objectiveText: string,
			confidence: ConfidenceLevel
		) => {
			const key = createObjectiveKey(bookSlug, chapterSlug, sectionSlug, objectiveIndex);
			update((state) => {
				const existing = state.completedObjectives[key];
				const now = getCurrentTimestamp();
				return {
					completedObjectives: {
						...state.completedObjectives,
						[key]: {
							chapterSlug,
							sectionSlug,
							objectiveIndex,
							objectiveText,
							isCompleted: true,
							completedAt: existing?.completedAt ?? now,
							confidence,
							assessedAt: now
						}
					}
				};
			});
		},
```

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run src/lib/stores/objectives.test.ts` → PASS.

- [ ] **Step 5: Type-check** — `npm run check` → 0 errors. NOTE: the two getters have **no current callers** (grep-confirmed: `grep -rn "getChapterObjectivesProgress\|getOverallObjectivesProgress" src/ | grep -v objectives.ts` → none). Adding the `totalObjectives` param is therefore safe standalone; `/markmid` (Task 3) consumes the new pure helper in `objectivesProgress.ts` rather than these getters. The getter fix is the literal M4 correctness fix for any future caller.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/objectives.ts src/lib/stores/objectives.test.ts
git commit -m "fix(objectives): compute chapter/overall progress against the real total + add rateObjective upsert (M4)"
```

---

### Task 3: /markmid — confidence-calibration headline + real coverage bar

**Files:**

- Create: `src/lib/utils/objectivesProgress.ts` (pure helper)
- Test: `src/lib/utils/objectivesProgress.test.ts`
- Modify: `src/routes/[bookSlug]/markmid/+page.svelte`, `src/routes/[bookSlug]/markmid/+page.ts` (load total)

**Interfaces:**

- Consumes: `toc` (sections carry `objectives: string[]`), `$objectivesStore.completedObjectives`.
- Produces: `countBookObjectives(toc, bookSlug?): number` and `coverage(assessed: number, total: number): ProgressResult`.

- [ ] **Step 1: Write the failing test for the helper**

```ts
import { describe, it, expect } from "vitest";
import { countBookObjectives, coverage } from "./objectivesProgress";

describe("countBookObjectives", () => {
  it("sums objectives across all chapters/sections", () => {
    const toc = {
      chapters: [
        { sections: [{ objectives: ["a", "b"] }, { objectives: ["c"] }] },
        { sections: [{ objectives: [] }, { objectives: ["d"] }] },
      ],
    } as any;
    expect(countBookObjectives(toc)).toBe(4);
  });

  it("returns 0 for a toc whose sections have no objectives", () => {
    const toc = { chapters: [{ sections: [{ objectives: [] }, {}] }] } as any;
    expect(countBookObjectives(toc)).toBe(0);
  });
});

describe("coverage", () => {
  it("computes assessed/total with 0% guard", () => {
    expect(coverage(1, 4)).toEqual({ completed: 1, total: 4, percentage: 25 });
    expect(coverage(0, 0)).toEqual({ completed: 0, total: 0, percentage: 0 });
  });
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/lib/utils/objectivesProgress.test.ts`
      Expected: FAIL — module/exports do not exist.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/utils/objectivesProgress.ts
import type { TableOfContents } from "$lib/types/content";
import {
  calculateProgressFromCounts,
  type ProgressResult,
} from "$lib/utils/storeHelpers";

/** Total number of learning objectives across a book's sections (from toc.json). */
export function countBookObjectives(toc: TableOfContents): number {
  let n = 0;
  for (const ch of toc.chapters) {
    for (const sec of ch.sections) {
      n += sec.objectives?.length ?? 0;
    }
  }
  return n;
}

/** Coverage = assessed objectives / real total. */
export function coverage(assessed: number, total: number): ProgressResult {
  return calculateProgressFromCounts(assessed, total);
}
```

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run src/lib/utils/objectivesProgress.test.ts` → PASS.

- [ ] **Step 5: Wire into `/markmid`** — in `+page.svelte`:
  1. Import: `import { countBookObjectives, coverage } from '$lib/utils/objectivesProgress';`
  2. After `toc` is loaded, derive the real total and coverage:

```svelte
	let totalObjectives = $derived(toc ? countBookObjectives(toc) : 0);
	let coverageResult = $derived(coverage(completedCount, totalObjectives));
```

3. Replace the misleading `progressPercent` derivation (the one using `bookObjectives.length` as `total`) with `coverageResult.percentage`, and relabel the bar as coverage:

```svelte
		<!-- Coverage bar (assessed of all objectives in the book) -->
		<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
			<span>Metin markmið</span>
			<span>{coverageResult.completed}/{coverageResult.total}</span>
		</div>
		<div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
			<div class="h-full bg-green-500 rounded-full transition-all duration-300"
				style="width: {coverageResult.percentage}%"></div>
		</div>
```

4. Keep the confidence distribution + low-confidence "Þarfnast endurskoðunar" list as the headline (already present, above/around the bar). Ensure the bar block renders even when `completedCount > 0` and `totalObjectives === 0` is impossible (guarded: `coverage(…,0)` → 0%).
5. Remove the now-unused `progressPercent` `$derived` block.

- [ ] **Step 6: Type-check + full action/store suite** — `npm run check` → 0 errors; `npx vitest run` → all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/objectivesProgress.ts src/lib/utils/objectivesProgress.test.ts "src/routes/[bookSlug]/markmid/+page.svelte"
git commit -m "feat(markmid): real coverage bar against book objective total; confidence calibration headline (M4)"
```

---

### Task 4: ReflectPhase records via rateObjective (upsert)

**Files:**

- Modify: `src/lib/components/study/ReflectPhase.svelte:31-48`

**Interfaces:**

- Consumes: `objectivesStore.rateObjective` (Task 2); `WeakObjective { chapterSlug, sectionSlug, objectiveIndex, objectiveText }`.

**Testing note:** the repo has **no Svelte component-render harness** (no `@testing-library/svelte`; no existing `components/study/*.test.*`). Adding one is out of scope. This task is a one-line call swap whose behavior — the upsert (assessed + confidence) — is already unit-tested in Task 2 (`rateObjective` tests). Verification here is type-check + the Task 2 store guarantee + manual QA (Task 6, Step 2). Do NOT fabricate a component test that merely re-calls the store (it would duplicate Task 2 and not exercise the wiring).

- [ ] **Step 1: Confirm Task 2 is in** — `rateObjective` exists on the store (run `npx vitest run src/lib/stores/objectives.test.ts` → PASS, confirming the upsert contract this task depends on).

- [ ] **Step 2: Implement** — in `ReflectPhase.svelte`, change `rate()` to use the upsert and pass the objective text:

```ts
function rate(level: ConfidenceLevel) {
  if (!currentObjective) return;

  objectivesStore.rateObjective(
    bookSlug,
    currentObjective.chapterSlug,
    currentObjective.sectionSlug,
    currentObjective.objectiveIndex,
    currentObjective.objectiveText,
    level,
  );
  completedCount++;

  if (currentIndex < total - 1) {
    currentIndex++;
  } else {
    oncomplete?.(completedCount);
  }
}
```

- [ ] **Step 3: Verify** — `npm run check` → 0 errors; `npx vitest run` → all pass (no new test file; the upsert is covered by Task 2). Confirm `rate()` no longer references `setObjectiveConfidence`.

- [ ] **Step 4: Commit**

```bash
git add "src/lib/components/study/ReflectPhase.svelte"
git commit -m "feat(study): ReflectPhase records objectives via rateObjective upsert"
```

---

### Task 5: Section reader copy reframe (assessed, not mastered) — light touch

**Files:**

- Modify: `src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte:366-405` (objectives block copy)

**Interfaces:** none new. The block already renders from `data.section.objectives` (populated once Task 1 + efni land).

- [ ] **Step 1: Adjust copy** — where the block shows `{completedCount}/{data.section.objectives.length} kláruð`, change the label to neutral "assessed/marked" wording consistent with `/markmid` (e.g. `metin` / "merkt"), without changing the toggle behavior. Exact string: replace `kláruð` with `metin` in this counter only. Leave the per-objective checkbox aria-labels (`Merkja sem kláruð` / `Afmerkja sem ókláruð`) as-is unless they read as mastery; if changed, keep them parallel.

- [ ] **Step 2: Type-check** — `npm run check` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "src/routes/[bookSlug]/kafli/[chapterSlug]/[sectionSlug]/+page.svelte"
git commit -m "style(reader): reframe section objectives counter copy (assessed, not completed)"
```

---

### Task 6: Full-suite verification + manual QA note

- [ ] **Step 1:** `npx vitest run` → all pass; `npm run check` → 0 errors; `npm run lint` clean.
- [ ] **Step 2 (live, gated on efni Task 0 + sync):** with efni emitting objectives and content synced, run `npm run dev`; on a section confirm the interactive objective checkboxes render and toggle; on `/markmid` confirm the coverage bar shows a real `<100%` value (e.g. mark some, not all) and the confidence distribution/low-confidence list populate; in `/nam` ReflectPhase confirm rating records (localStorage `namsbokasafn:objectives` gains entries with `confidence`). If efni hasn't landed, confirm graceful empty state instead and note Task 0 as the blocker.
- [ ] **Step 3:** Record the QA outcome in the PR description.

---

## Coordination

- Tasks 1–5 are vefur-only and unit-testable now. Task 4 depends on Task 2 (`rateObjective`). Task 3 updates the getter call sites changed in Task 2.
- **Task 0 (efni page-data objectives) is the live-data prerequisite** — separate efni-rooted session, tracked in efni memory next to the marker work. Until it lands + syncs, the vefur feature degrades to the empty state (by design).
- Branch: `feature/objectives-revival-m4` (off `main`, independent of rec #7 PR #150).

## Risks

- If efni never emits objectives, the feature stays empty (no regression vs today — it's already inert). Graceful-degradation tests guard the `total === 0` path.
- `process-content.js` test requires exporting `parseHtmlPageData`; ensure the script's CLI behavior is unchanged (still runs under `prepare-content`).
