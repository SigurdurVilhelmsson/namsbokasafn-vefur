# Overlay by module identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `mt-preview` → `faithful` content overlay identify a section by its CNXML module id instead of its filename, so a review that corrects a section title stops publishing that section twice and stops silently freezing its chapter's review state.

**Architecture:** All identity logic lands in `scripts/lib/overlay.js`, the shared library whose stated purpose is that `sync-content.js` and `generate-toc.js` "can never disagree". One planner, `resolveChapterDuplicates`, is consumed by both: `sync-content.js` deletes what the faithful overlay authorises it to delete, and `generate-toc.js` applies the same verdict as a backstop for standalone runs. Where the overlay supplies no authority, both warn loudly and keep every file — vefur has no content-derived basis to choose between two competing translations.

**Tech Stack:** Node ES modules, Vitest (config already globs `scripts/**/*.{test,spec}.{js,ts}`), tab indentation, single quotes — match the surrounding scripts.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-26-overlay-module-identity-design.md`. Read it before starting.
- **Comments and code in English; any user-facing string in Icelandic.** These are build scripts — their console output goes to the developer/lead, so English is correct here.
- **`overlay.js` never mutates the filesystem.** It reads and decides. Deletion lives in `sync-content.js`.
- **Fixtures are synthetic `mkdtempSync` trees. Never derive a test fixture from `static/content/`** — that directory is gitignored, is stale on any given dev machine, and baking a fact about efni's content into a test is exactly the failure documented in `CLAUDE.md` under "E2E gating fixtures must be derived, never hardcoded".
- **Never silently choose between two baseline files.** A duplicate with no faithful authority is warned about and kept. Both files are different human-visible translations of one module; picking one would ship an arbitrary choice and hide efni's render-prune bug.
- **Out of scope, do not build:** slug redirects, any baseline-vs-baseline tiebreak, failing the build on a conflict, changes to `audit-content.js`, and any repair of `efnafraedi-2e` chapter 10.
- Verification gates for the whole branch: `npm test`, `npm run check`, `npm run lint`.

---

## File Structure

| File                                    | Responsibility                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/lib/overlay.js` (modify)       | All overlay decisions. Gains module identity, an identity-based `chapterFullyFaithful`, and the `resolveChapterDuplicates` planner. Read-only.       |
| `scripts/lib/overlay.test.js` (create)  | Unit tests for every decision in `overlay.js`. It has none today.                                                                                    |
| `scripts/sync-content.js` (modify)      | Executes the plan: deletes superseded pages after the overlay, reports conflicts. Gains a `main()` guard so the sweep is importable.                 |
| `scripts/sync-content.test.js` (create) | Unit tests for the deletion sweep.                                                                                                                   |
| `scripts/generate-toc.js` (modify)      | Applies the same plan as a backstop at its three enumeration sites, plus an end-of-run conflict summary. Gains a `main()` guard so it is importable. |
| `scripts/generate-toc.test.js` (create) | Unit tests for the backstop helper.                                                                                                                  |

---

### Task 1: Module identity in `overlay.js`

**Files:**

- Modify: `scripts/lib/overlay.js` (import line 21; append after line 118)
- Test: `scripts/lib/overlay.test.js` (create)

**Interfaces:**

- Consumes: `isAggregationFile(filename)` — already exported from `overlay.js`.
- Produces:
  - `moduleIdOf(filePath): string | null`
  - `fileIdentity(dir, filename): string` — returns `agg:<filename>` / `module:<id>` / `file:<filename>`
  - `chapterIdentityIndex(dir): Map<string, string>` — filename → identity, memoized by resolved path
  - `resetIdentityCache(): void`

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/overlay.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import {
  moduleIdOf,
  fileIdentity,
  chapterIdentityIndex,
  resetIdentityCache,
} from "./overlay.js";

let root;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "overlay-"));
  resetIdentityCache();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  resetIdentityCache();
});

/** A rendered reading module, as the CNXML pipeline emits it. */
function writeModule(dir, filename, moduleId) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, filename),
    `<article class="cnx-module" data-module-id="${moduleId}"><h1 id="title">T</h1></article>`,
  );
}

/** A chapter rollup — summary/exercises/answer-key carry no module id. */
function writeRollup(dir, filename) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, filename),
    '<section class="chapter-summary"></section>',
  );
}

/** A page the pipeline emitted without a module id — the identity fallback. */
function writeIdlessPage(dir, filename) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, filename),
    '<article class="cnx-module"><h1 id="title">T</h1></article>',
  );
}

describe("moduleIdOf", () => {
  it("returns the module id of a rendered module", () => {
    writeModule(root, "3-3-lipid.html", "m66441");
    expect(moduleIdOf(resolve(root, "3-3-lipid.html"))).toBe("m66441");
  });

  it("returns null for a rollup that carries no module id", () => {
    writeRollup(root, "3-summary.html");
    expect(moduleIdOf(resolve(root, "3-summary.html"))).toBeNull();
  });

  it("returns null for a file that does not exist", () => {
    expect(moduleIdOf(resolve(root, "absent.html"))).toBeNull();
  });
});

describe("fileIdentity", () => {
  it("keys a reading module on its module id", () => {
    writeModule(root, "3-3-lipid.html", "m66441");
    expect(fileIdentity(root, "3-3-lipid.html")).toBe("module:m66441");
  });

  it("keys a rollup on its filename in the aggregation namespace", () => {
    writeRollup(root, "3-summary.html");
    expect(fileIdentity(root, "3-summary.html")).toBe("agg:3-summary.html");
  });

  it("keys a page with no module id on its filename", () => {
    writeIdlessPage(root, "3-6-no-module-id.html");
    expect(fileIdentity(root, "3-6-no-module-id.html")).toBe(
      "file:3-6-no-module-id.html",
    );
  });

  it("keys key-terms on its filename despite its synthetic module id", () => {
    writeModule(root, "3-key-terms.html", "03-key-terms");
    expect(fileIdentity(root, "3-key-terms.html")).toBe("agg:3-key-terms.html");
  });

  it("gives the same module the same identity under two filenames", () => {
    writeModule(root, "3-3-fitusyrur.html", "m66441");
    writeModule(root, "3-3-lipid.html", "m66441");
    expect(fileIdentity(root, "3-3-fitusyrur.html")).toBe(
      fileIdentity(root, "3-3-lipid.html"),
    );
  });
});

describe("chapterIdentityIndex", () => {
  it("maps every html file in the directory to its identity", () => {
    writeModule(root, "3-1-kolvetni.html", "m66440");
    writeRollup(root, "3-summary.html");
    expect(chapterIdentityIndex(root)).toEqual(
      new Map([
        ["3-1-kolvetni.html", "module:m66440"],
        ["3-summary.html", "agg:3-summary.html"],
      ]),
    );
  });

  it("ignores non-html files", () => {
    writeModule(root, "3-1-kolvetni.html", "m66440");
    writeFileSync(resolve(root, "notes.txt"), "x");
    expect([...chapterIdentityIndex(root).keys()]).toEqual([
      "3-1-kolvetni.html",
    ]);
  });

  it("returns an empty index for a directory that does not exist", () => {
    expect(chapterIdentityIndex(resolve(root, "absent")).size).toBe(0);
  });

  it("serves a memoized index until the cache is reset", () => {
    writeModule(root, "3-1-kolvetni.html", "m66440");
    chapterIdentityIndex(root);
    writeModule(root, "3-2-lipid.html", "m66441");
    expect(chapterIdentityIndex(root).size).toBe(1);
    resetIdentityCache();
    expect(chapterIdentityIndex(root).size).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/lib/overlay.test.js`
Expected: FAIL — `moduleIdOf is not a function` (the exports do not exist yet).

- [ ] **Step 3: Implement module identity**

In `scripts/lib/overlay.js`, extend the `fs` import on line 21 to include `readFileSync`:

```js
import { existsSync, readdirSync, readFileSync } from "fs";
```

Append after the `faithfulRollupsComplete` function (currently ends line 118):

```js
/**
 * The CNXML module id of a rendered page, or null when it carries none.
 *
 * The pipeline emits at most one `<article class="cnx-module" data-module-id>`
 * per file. Chapter rollups (summary/exercises/answer-key) carry none.
 */
export function moduleIdOf(filePath) {
  if (!existsSync(filePath)) return null;
  const match = readFileSync(filePath, "utf-8").match(
    /data-module-id="([^"]+)"/,
  );
  return match ? match[1] : null;
}

/**
 * Stable identity of a page within its directory — what "the same section"
 * means when the filename is not stable.
 *
 * A section's filename is derived from its title, so correcting a title in
 * review RENAMES the file. Identity must therefore key on the module id, which
 * survives the rename. Aggregation rollups key on filename instead: they carry
 * no module id (key-terms carries a SYNTHETIC chapter-scoped one, which must
 * never be treated as a module), and their filenames are chapter-derived, so
 * they never rename.
 *
 * The three prefixes keep the namespaces from ever colliding.
 */
export function fileIdentity(dir, filename) {
  if (isAggregationFile(filename)) return `agg:${filename}`;
  const moduleId = moduleIdOf(resolve(dir, filename));
  return moduleId ? `module:${moduleId}` : `file:${filename}`;
}

// Memoized filename -> identity, keyed on resolved directory path.
// isReviewedModule runs once per file and calls chapterFullyFaithful, which
// reads two directories; unmemoized that is O(n^2) file reads on a 252-file
// book. Only sync's own prune sweep mutates a directory in-process, and it
// calls resetIdentityCache() afterwards.
const identityCache = new Map();

/** Map of filename -> identity for every .html page in a directory. */
export function chapterIdentityIndex(dir) {
  const key = resolve(dir);
  const cached = identityCache.get(key);
  if (cached) return cached;

  const index = new Map();
  if (existsSync(key)) {
    for (const filename of readdirSync(key)) {
      if (filename.endsWith(".html")) {
        index.set(filename, fileIdentity(key, filename));
      }
    }
  }

  identityCache.set(key, index);
  return index;
}

/** Drop the memo — for tests, and after a directory is mutated in-process. */
export function resetIdentityCache() {
  identityCache.clear();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/lib/overlay.test.js`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/overlay.js scripts/lib/overlay.test.js
git commit -m "feat(overlay): identify a page by module id, not filename"
```

---

### Task 2: `chapterFullyFaithful` compares identities

Fixes the silent bug: one renamed title currently makes a fully-reviewed chapter read as incomplete, so its rollups never switch to faithful and the machine-translation banner never clears.

**Files:**

- Modify: `scripts/lib/overlay.js:77-89`
- Test: `scripts/lib/overlay.test.js`

**Interfaces:**

- Consumes: `chapterIdentityIndex(dir)`, `resetIdentityCache()` from Task 1.
- Produces: `chapterFullyFaithful(faithfulChaptersDir, mtChaptersDir, chapterDir): boolean` — signature unchanged, semantics now identity-based.

- [ ] **Step 1: Write the failing tests**

Add to `scripts/lib/overlay.test.js` — extend the import list at the top with `chapterFullyFaithful`, then append:

```js
describe("chapterFullyFaithful", () => {
  /** Build faithful/ and mt-preview/ chapter dirs, return their chapters/ roots. */
  function tracks() {
    return {
      faithful: resolve(root, "faithful", "chapters"),
      mt: resolve(root, "mt-preview", "chapters"),
    };
  }

  it("is true when a reviewed module was renamed but every module is covered", () => {
    const { faithful, mt } = tracks();
    writeModule(resolve(mt, "03"), "3-3-fitusyrur.html", "m66441");
    writeRollup(resolve(mt, "03"), "3-summary.html");
    writeModule(resolve(faithful, "03"), "3-3-lipid.html", "m66441");
    expect(chapterFullyFaithful(faithful, mt, "03")).toBe(true);
  });

  it("is false when a module has no reviewed version at all", () => {
    const { faithful, mt } = tracks();
    writeModule(resolve(mt, "03"), "3-3-lipid.html", "m66441");
    writeModule(resolve(mt, "03"), "3-4-protin.html", "m66442");
    writeModule(resolve(faithful, "03"), "3-3-lipid.html", "m66441");
    expect(chapterFullyFaithful(faithful, mt, "03")).toBe(false);
  });

  it("is true when the chapter exists only in faithful", () => {
    const { faithful, mt } = tracks();
    mkdirSync(mt, { recursive: true });
    writeModule(resolve(faithful, "03"), "3-3-lipid.html", "m66441");
    expect(chapterFullyFaithful(faithful, mt, "03")).toBe(true);
  });

  it("ignores rollups when judging coverage", () => {
    const { faithful, mt } = tracks();
    writeModule(resolve(mt, "03"), "3-3-lipid.html", "m66441");
    writeRollup(resolve(mt, "03"), "3-exercises.html");
    writeModule(resolve(faithful, "03"), "3-3-lipid.html", "m66441");
    expect(chapterFullyFaithful(faithful, mt, "03")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify the first one fails**

Run: `npx vitest run scripts/lib/overlay.test.js -t 'renamed but every module is covered'`
Expected: FAIL — received `false`, expected `true`. The other three already pass; that is the point, they are the regression guard for behaviour that must not change.

- [ ] **Step 3: Rewrite `chapterFullyFaithful`**

Replace the body of `chapterFullyFaithful` in `scripts/lib/overlay.js` (currently lines 77-89) with:

```js
export function chapterFullyFaithful(
  faithfulChaptersDir,
  mtChaptersDir,
  chapterDir,
) {
  const mtDir = resolve(mtChaptersDir, chapterDir);
  // Chapter exists only in faithful (no mt baseline to be incomplete against).
  if (!existsSync(mtDir)) return true;

  // Compare by module IDENTITY, not filename: a reviewed title correction
  // renames the file, and a filename comparison would read a fully reviewed
  // chapter as incomplete — freezing its rollups on mt-preview and leaving the
  // machine-translation banner up forever.
  const faithfulIdentities = new Set(
    chapterIdentityIndex(resolve(faithfulChaptersDir, chapterDir)).values(),
  );
  const mtIdentities = chapterIdentityIndex(mtDir);

  return readingModuleFiles(mtDir).every((f) =>
    faithfulIdentities.has(mtIdentities.get(f)),
  );
}
```

Also update the doc comment directly above it — replace the line

```
 * version of every reading module that `mt-preview` has for this chapter?
```

with

```
 * version of every reading module that `mt-preview` has for this chapter?
 * Matched by module identity, so a reviewed title correction (which renames the
 * file) still counts as coverage.
```

`chapterIdentityIndex` is defined lower in the file than `chapterFullyFaithful`; that is fine, function declarations hoist.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/lib/overlay.test.js`
Expected: PASS — 16 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/overlay.js scripts/lib/overlay.test.js
git commit -m "fix(overlay): judge chapter coverage by module identity

A reviewed title correction renames the rendered file, so the filename
comparison read a fully reviewed chapter as incomplete: its rollups never
switched to faithful and the machine-translation banner never cleared."
```

---

### Task 3: The `resolveChapterDuplicates` planner

**Files:**

- Modify: `scripts/lib/overlay.js` (append after `chapterIdentityIndex`/`resetIdentityCache`)
- Test: `scripts/lib/overlay.test.js`

**Interfaces:**

- Consumes: `chapterIdentityIndex(dir)` from Task 1.
- Produces: `resolveChapterDuplicates(dir, faithfulDir): { superseded: string[], conflicts: Array<{ identity: string, files: string[] }> }`. Both arrays are sorted; `faithfulDir` may be `null` or a path that does not exist.

- [ ] **Step 1: Write the failing tests**

Add `resolveChapterDuplicates` to the import list in `scripts/lib/overlay.test.js`, then append:

```js
describe("resolveChapterDuplicates", () => {
  it("supersedes the baseline page a reviewed rename replaced", () => {
    const dest = resolve(root, "dest", "03");
    const faithful = resolve(root, "faithful", "chapters", "03");
    writeModule(dest, "3-3-fitusyrur.html", "m66441");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeModule(faithful, "3-3-lipid.html", "m66441");

    expect(resolveChapterDuplicates(dest, faithful)).toEqual({
      superseded: ["3-3-fitusyrur.html"],
      conflicts: [],
    });
  });

  it("reports a conflict and deletes nothing when no reviewed version exists", () => {
    const dest = resolve(root, "dest", "10");
    const faithful = resolve(root, "faithful", "chapters", "10");
    mkdirSync(faithful, { recursive: true });
    writeModule(dest, "10-5-fast-astand-efnis.html", "m68770");
    writeModule(dest, "10-5-fastur-efnishamur.html", "m68770");

    expect(resolveChapterDuplicates(dest, faithful)).toEqual({
      superseded: [],
      conflicts: [
        {
          identity: "module:m68770",
          files: ["10-5-fast-astand-efnis.html", "10-5-fastur-efnishamur.html"],
        },
      ],
    });
  });

  it("reports a conflict when the book has no faithful overlay at all", () => {
    const dest = resolve(root, "dest", "10");
    writeModule(dest, "10-5-fast-astand-efnis.html", "m68770");
    writeModule(dest, "10-5-fastur-efnishamur.html", "m68770");

    const result = resolveChapterDuplicates(dest, null);
    expect(result.superseded).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
  });

  it("reports a conflict when both duplicates exist in faithful", () => {
    const dest = resolve(root, "dest", "03");
    const faithful = resolve(root, "faithful", "chapters", "03");
    writeModule(dest, "3-3-a.html", "m66441");
    writeModule(dest, "3-3-b.html", "m66441");
    writeModule(faithful, "3-3-a.html", "m66441");
    writeModule(faithful, "3-3-b.html", "m66441");

    const result = resolveChapterDuplicates(dest, faithful);
    expect(result.superseded).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
  });

  it("finds nothing in a chapter without duplicates", () => {
    const dest = resolve(root, "dest", "03");
    const faithful = resolve(root, "faithful", "chapters", "03");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeModule(dest, "3-4-protin.html", "m66442");
    writeRollup(dest, "3-summary.html");
    writeModule(faithful, "3-3-lipid.html", "m66441");

    expect(resolveChapterDuplicates(dest, faithful)).toEqual({
      superseded: [],
      conflicts: [],
    });
  });

  it("never groups rollups together, so a baseline rollup is never superseded", () => {
    const dest = resolve(root, "dest", "03");
    const faithful = resolve(root, "faithful", "chapters", "03");
    writeRollup(dest, "3-summary.html");
    writeRollup(dest, "3-exercises.html");
    writeRollup(faithful, "3-summary.html");

    expect(resolveChapterDuplicates(dest, faithful)).toEqual({
      superseded: [],
      conflicts: [],
    });
  });

  it("returns empty lists for a directory that does not exist", () => {
    expect(resolveChapterDuplicates(resolve(root, "absent"), null)).toEqual({
      superseded: [],
      conflicts: [],
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/lib/overlay.test.js -t resolveChapterDuplicates`
Expected: FAIL — `resolveChapterDuplicates is not a function`.

- [ ] **Step 3: Implement the planner**

Append to `scripts/lib/overlay.js`:

```js
/**
 * Group a synced directory's pages by module identity and decide which
 * duplicates the faithful overlay authorises us to drop.
 *
 * `superseded` — baseline pages that the overlay republished under a new
 * filename. Safe to remove: faithful carries the same module under the winning
 * name, so nothing is lost.
 *
 * `conflicts` — two or more pages for one module with no reviewed version to
 * choose between them (e.g. a stale render left behind in mt-preview after a
 * title correction). Vefur has NO content-derived basis to pick a winner: the
 * competing files are different human-visible translations, and even the
 * chapter-outline nav can point at the stale slug. The caller warns and keeps
 * both; the repair belongs at the source, in namsbokasafn-efni.
 *
 * @param dir          a synced chapter / front-matter / appendix directory
 * @param faithfulDir  the matching faithful source directory, or null when the
 *                     book has no overlay
 */
export function resolveChapterDuplicates(dir, faithfulDir) {
  const superseded = [];
  const conflicts = [];

  if (!existsSync(dir)) return { superseded, conflicts };

  const groups = new Map();
  for (const [filename, identity] of chapterIdentityIndex(dir)) {
    if (!groups.has(identity)) groups.set(identity, []);
    groups.get(identity).push(filename);
  }

  const hasFaithful = Boolean(faithfulDir) && existsSync(faithfulDir);

  for (const [identity, files] of groups) {
    if (files.length < 2) continue;

    const sorted = [...files].sort();
    const reviewed = hasFaithful
      ? sorted.filter((f) => existsSync(resolve(faithfulDir, f)))
      : [];

    if (reviewed.length === 1) {
      superseded.push(...sorted.filter((f) => f !== reviewed[0]));
    } else {
      conflicts.push({ identity, files: sorted });
    }
  }

  superseded.sort();
  conflicts.sort((a, b) => a.identity.localeCompare(b.identity));

  return { superseded, conflicts };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/lib/overlay.test.js`
Expected: PASS — 23 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/overlay.js scripts/lib/overlay.test.js
git commit -m "feat(overlay): plan duplicate resolution by module identity"
```

---

### Task 4: The prune sweep in `sync-content.js`

**Files:**

- Modify: `scripts/sync-content.js` (imports at lines 33-37; new function after `overlayFaithful` which ends line 325; call sites in `syncBook` after line 230 and in `syncBookFallback` after line 372; `main()` guard at line 575)
- Test: `scripts/sync-content.test.js` (create)

**Interfaces:**

- Consumes: `resolveChapterDuplicates(dir, faithfulDir)` and `resetIdentityCache()` from Tasks 1 and 3.
- Produces: `pruneSupersededFiles(bookDest, faithfulPath, bookSlug): number` — returns the number of unresolved conflicts reported. `faithfulPath` is the faithful **publication** directory (the one holding `chapters/`), or `null`.

- [ ] **Step 1: Write the failing test**

Create `scripts/sync-content.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { pruneSupersededFiles } from "./sync-content.js";
import { resetIdentityCache } from "./lib/overlay.js";

let root;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "sync-content-"));
  resetIdentityCache();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  resetIdentityCache();
  vi.restoreAllMocks();
});

function writeModule(dir, filename, moduleId) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, filename),
    `<article class="cnx-module" data-module-id="${moduleId}"><h1 id="title">T</h1></article>`,
  );
}

describe("pruneSupersededFiles", () => {
  it("deletes the baseline page a reviewed rename replaced", () => {
    const dest = resolve(root, "dest");
    const faithful = resolve(root, "faithful");
    writeModule(
      resolve(dest, "chapters", "03"),
      "3-3-fitusyrur.html",
      "m66441",
    );
    writeModule(resolve(dest, "chapters", "03"), "3-3-lipid.html", "m66441");
    writeModule(
      resolve(faithful, "chapters", "03"),
      "3-3-lipid.html",
      "m66441",
    );

    expect(pruneSupersededFiles(dest, faithful, "liffraedi-2e")).toBe(0);
    expect(
      existsSync(resolve(dest, "chapters", "03", "3-3-fitusyrur.html")),
    ).toBe(false);
    expect(existsSync(resolve(dest, "chapters", "03", "3-3-lipid.html"))).toBe(
      true,
    );
  });

  it("prunes front matter and appendix directories too", () => {
    const dest = resolve(root, "dest");
    const faithful = resolve(root, "faithful");
    writeModule(resolve(dest, "chapters", "00"), "0-1-formali.html", "m68662");
    writeModule(
      resolve(dest, "chapters", "00"),
      "0-1-inngangsordi.html",
      "m68662",
    );
    writeModule(
      resolve(faithful, "chapters", "00"),
      "0-1-formali.html",
      "m68662",
    );
    writeModule(
      resolve(dest, "chapters", "appendices"),
      "appendices-1-lotukerf.html",
      "m68859",
    );
    writeModule(
      resolve(dest, "chapters", "appendices"),
      "appendices-1-lotukerfid.html",
      "m68859",
    );
    writeModule(
      resolve(faithful, "chapters", "appendices"),
      "appendices-1-lotukerfid.html",
      "m68859",
    );

    expect(pruneSupersededFiles(dest, faithful, "efnafraedi-2e")).toBe(0);
    expect(
      existsSync(resolve(dest, "chapters", "00", "0-1-inngangsordi.html")),
    ).toBe(false);
    expect(
      existsSync(
        resolve(dest, "chapters", "appendices", "appendices-1-lotukerf.html"),
      ),
    ).toBe(false);
  });

  it("keeps both files and reports a conflict when no reviewed version exists", () => {
    const dest = resolve(root, "dest");
    writeModule(
      resolve(dest, "chapters", "10"),
      "10-5-fast-astand-efnis.html",
      "m68770",
    );
    writeModule(
      resolve(dest, "chapters", "10"),
      "10-5-fastur-efnishamur.html",
      "m68770",
    );

    expect(pruneSupersededFiles(dest, null, "efnafraedi-2e")).toBe(1);
    expect(
      existsSync(
        resolve(dest, "chapters", "10", "10-5-fast-astand-efnis.html"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(dest, "chapters", "10", "10-5-fastur-efnishamur.html"),
      ),
    ).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("m68770"),
    );
  });

  it("returns 0 for a book with no chapters directory", () => {
    expect(pruneSupersededFiles(resolve(root, "empty"), null, "x")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run scripts/sync-content.test.js`
Expected: FAIL — the import of `pruneSupersededFiles` does not resolve. It may also hang or exit; that is expected because `main()` still runs on import. Both are fixed in the next step.

- [ ] **Step 3: Implement the sweep and guard `main()`**

In `scripts/sync-content.js`:

Extend the `url` import on line 36:

```js
import { fileURLToPath, pathToFileURL } from "url";
```

Extend the `overlay.js` import on line 37:

```js
import {
  chapterFullyFaithful,
  faithfulFileWins,
  faithfulRollupsComplete,
  resolveChapterDuplicates,
  resetIdentityCache,
  ROLLUPS_COMPLETE_MARKER,
} from "./lib/overlay.js";
```

Add after `overlayFaithful` (which ends at line 325):

```js
/**
 * Remove baseline pages that the faithful overlay republished under a new
 * filename, and report duplicates the overlay cannot adjudicate.
 *
 * A section's filename is derived from its title, so a review that corrects a
 * title renames the rendered file. The overlay is copied WITHOUT --delete (so a
 * partial review can never wipe baseline chapters), which means a rename ADDS
 * the new name instead of replacing the old one — and the module gets published
 * twice, once under the corrected title and once under the stale one.
 *
 * Runs whether or not the book has an overlay: a stale render left behind in
 * mt-preview produces the same duplicate with no faithful file in sight. That
 * case is a CONTENT defect, not a vefur one — vefur has no basis to choose
 * between two translations, so it warns and keeps both.
 *
 * @param bookDest      static/content/<book>
 * @param faithfulPath  the faithful publication dir (holding chapters/), or null
 * @param bookSlug      for the warning message
 * @returns {number}    unresolved conflicts reported
 */
export function pruneSupersededFiles(bookDest, faithfulPath, bookSlug) {
  const chaptersDest = resolve(bookDest, "chapters");
  if (!existsSync(chaptersDest)) return 0;

  let conflictCount = 0;
  let removed = 0;

  // Every direct subdirectory holds pages: numbered chapters, front matter
  // (00) and the appendix dir (appendices/appendix/99). Images live one level
  // deeper, inside a chapter dir.
  for (const dirName of readdirSync(chaptersDest).sort()) {
    const dir = resolve(chaptersDest, dirName);
    if (!statSync(dir).isDirectory()) continue;

    const faithfulDir = faithfulPath
      ? resolve(faithfulPath, "chapters", dirName)
      : null;
    const { superseded, conflicts } = resolveChapterDuplicates(
      dir,
      faithfulDir,
    );

    for (const file of superseded) {
      rmSync(resolve(dir, file));
      removed++;
      console.log(
        `    Removed superseded page (reviewed rename): chapters/${dirName}/${file}`,
      );
    }

    for (const { identity, files } of conflicts) {
      conflictCount++;
      console.warn(
        `\n  ⚠️  DUPLICATE MODULE — ${bookSlug} chapters/${dirName} (${identity})\n` +
          files.map((f) => `        ${f}`).join("\n") +
          `\n      One module, two published pages, and no reviewed version to choose between them.` +
          `\n      Both were kept. Fix at the source in namsbokasafn-efni: prune the stale render.\n`,
      );
    }
  }

  // The index memo predates these deletions.
  if (removed > 0) resetIdentityCache();

  return conflictCount;
}
```

In `syncBook`, insert between the overlay block (ends line 230) and the `// Regenerate toc.json` block:

```js
// 3. Drop baseline pages the overlay republished under a new filename, and
// report duplicates it cannot adjudicate. Runs before toc regeneration so
// the TOC is always generated from a pruned destination.
if (!dryRun) {
  pruneSupersededFiles(bookDest, layers.overlay?.path ?? null, bookSlug);
}
```

In `syncBookFallback`, insert the same call after the overlay block (ends line 372) and before `// Regenerate toc.json`. `syncBookFallback` returns early on `dryRun`, so no guard is needed there:

```js
// Drop baseline pages the overlay republished under a new filename.
pruneSupersededFiles(bookDest, layers.overlay?.path ?? null, bookSlug);
```

Finally, replace the bare `main();` on line 575 with:

```js
// Only run as a CLI — importing this module (tests) must not start a sync.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/sync-content.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Verify the CLI still runs**

Run: `node scripts/sync-content.js --help`
Expected: the usage text prints. If it prints nothing, the `main()` guard is wrong.

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-content.js scripts/sync-content.test.js
git commit -m "fix(sync): drop baseline pages a reviewed rename replaced

Warns and keeps both when two pages share a module id and no reviewed
version can choose between them — that is a content defect to fix in
namsbokasafn-efni, and vefur has no basis to pick a translation."
```

---

### Task 5: The `generate-toc.js` backstop

`generate-toc.js` runs standalone and against destinations synced by older versions of the script, so it cannot assume the sweep ran.

**Files:**

- Modify: `scripts/generate-toc.js` (import line 23; new helper before `scanFrontMatter` at line 300; call sites at lines 306, 369, 499; `scanAppendices` signature line 349 and its call site line 616; summary in `main()`; `main()` guard at the tail)
- Test: `scripts/generate-toc.test.js` (create)

**Interfaces:**

- Consumes: `resolveChapterDuplicates(dir, faithfulDir)` from Task 3.
- Produces:
  - `usablePages(dir, bookSlug, dirName, options): string[]` — exported for tests. `options` needs only `{ efniPath }`.
  - `unresolvedDuplicates: Array<{ bookSlug, dirName, identity, files }>` — exported module-level accumulator, drained by the end-of-run summary.
  - `scanAppendices` changes signature from `(bookPath)` to `(bookPath, bookSlug, options)`.

- [ ] **Step 1: Extend the overlay import**

In `scripts/generate-toc.js`, replace line 23:

```js
import {
  isAggregationFile,
  chapterFullyFaithful,
  resolveChapterDuplicates,
} from "./lib/overlay.js";
```

- [ ] **Step 2: Add the shared helper**

Insert immediately before `scanFrontMatter` (line 300):

```js
// Duplicates no reviewed version can adjudicate, collected across the whole run
// so they get a summary at the end instead of scrolling past.
export const unresolvedDuplicates = [];

// The HTML pages in a directory that should become TOC entries.
//
// A reviewed title correction renames the rendered file, so the overlay can
// leave both the old and the new name on disk — the same module published
// twice. sync-content.js prunes those, but this script also runs standalone and
// against destinations synced by older versions, so it applies the same verdict
// itself. Where no reviewed version can choose a winner, both are kept and
// reported: that is a content defect to fix in namsbokasafn-efni.
export function usablePages(dir, bookSlug, dirName, options) {
  const faithfulDir = resolve(
    options.efniPath,
    "books",
    bookSlug,
    "05-publication",
    "faithful",
    "chapters",
    dirName,
  );
  const { superseded, conflicts } = resolveChapterDuplicates(dir, faithfulDir);

  for (const file of superseded) {
    console.log(
      `    Skipping superseded page (reviewed rename): chapters/${dirName}/${file}`,
    );
  }
  for (const { identity, files } of conflicts) {
    unresolvedDuplicates.push({ bookSlug, dirName, identity, files });
    console.warn(
      `    ⚠️  Duplicate module in chapters/${dirName} (${identity}): ${files.join(", ")} — kept both.`,
    );
  }

  const dropped = new Set(superseded);
  return readdirSync(dir).filter((f) => f.endsWith(".html") && !dropped.has(f));
}
```

- [ ] **Step 3: Apply it at the three enumeration sites**

In `scanFrontMatter`, replace lines 306-308:

```js
const files = usablePages(dir, bookSlug, "00", options).sort();
```

In `generateToc`, replace line 499:

```js
// Find all HTML content files in chapter
const contentFiles = usablePages(chapterPath, bookSlug, chapterDir, options);
```

In `scanAppendices`, change the signature on line 349 to:

```js
function scanAppendices(bookPath, bookSlug, options) {
```

and replace lines 369-371:

```js
const appendixFiles = usablePages(
  appendixDir,
  bookSlug,
  basename(appendixDir),
  options,
).sort();
```

and update its call site on line 616:

```js
const appendices = scanAppendices(bookPath, bookSlug, options);
```

- [ ] **Step 4: Add the end-of-run summary**

In `main()`, insert immediately before the final `console.log(`\nComplete: ...`)` line:

```js
if (unresolvedDuplicates.length > 0) {
  console.warn(
    `\n⚠️  ${unresolvedDuplicates.length} unresolved duplicate module(s) — one module, two published pages:`,
  );
  for (const d of unresolvedDuplicates) {
    console.warn(
      `   ${d.bookSlug} chapters/${d.dirName} (${d.identity}): ${d.files.join(", ")}`,
    );
  }
  console.warn(
    "   Vefur cannot choose between them. Fix at the source in namsbokasafn-efni: prune the stale render.",
  );
}
```

- [ ] **Step 5: Guard `main()` so the module is importable**

`generate-toc.js` currently calls `main()` unconditionally at its tail, so importing it
would start a TOC generation run. Replace the bare `main();` on the last line with the same
guard `sync-content.js` gets in Task 4:

```js
// Only run as a CLI — importing this module (tests) must not start a run.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
```

and extend the `url` import on line 22 to provide `pathToFileURL`:

```js
import { fileURLToPath, pathToFileURL } from "url";
```

- [ ] **Step 6: Write the failing tests**

Create `scripts/generate-toc.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { usablePages, unresolvedDuplicates } from "./generate-toc.js";
import { resetIdentityCache } from "./lib/overlay.js";

let root;

beforeEach(() => {
  root = mkdtempSync(resolve(tmpdir(), "generate-toc-"));
  unresolvedDuplicates.length = 0;
  resetIdentityCache();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  unresolvedDuplicates.length = 0;
  resetIdentityCache();
  vi.restoreAllMocks();
});

function writeModule(dir, filename, moduleId) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, filename),
    `<article class="cnx-module" data-module-id="${moduleId}"><h1 id="title">T</h1></article>`,
  );
}

/** A synced destination dir plus the matching faithful source dir. */
function tracks(dirName) {
  const dest = resolve(root, "dest", "chapters", dirName);
  const efniPath = resolve(root, "efni");
  const faithful = resolve(
    efniPath,
    "books",
    "liffraedi-2e",
    "05-publication",
    "faithful",
    "chapters",
    dirName,
  );
  return { dest, faithful, options: { efniPath } };
}

describe("usablePages", () => {
  it("drops the baseline page a reviewed rename superseded", () => {
    const { dest, faithful, options } = tracks("03");
    writeModule(dest, "3-3-fitusyrur.html", "m66441");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeModule(faithful, "3-3-lipid.html", "m66441");

    expect(usablePages(dest, "liffraedi-2e", "03", options)).toEqual([
      "3-3-lipid.html",
    ]);
  });

  it("records no unresolved duplicate when the rename is resolved", () => {
    const { dest, faithful, options } = tracks("03");
    writeModule(dest, "3-3-fitusyrur.html", "m66441");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeModule(faithful, "3-3-lipid.html", "m66441");

    usablePages(dest, "liffraedi-2e", "03", options);
    expect(unresolvedDuplicates).toEqual([]);
  });

  it("keeps both pages when no reviewed version can choose", () => {
    const { dest, options } = tracks("10");
    writeModule(dest, "10-5-fast-astand-efnis.html", "m68770");
    writeModule(dest, "10-5-fastur-efnishamur.html", "m68770");

    expect(usablePages(dest, "liffraedi-2e", "10", options).sort()).toEqual([
      "10-5-fast-astand-efnis.html",
      "10-5-fastur-efnishamur.html",
    ]);
  });

  it("records the unresolved duplicate for the end-of-run summary", () => {
    const { dest, options } = tracks("10");
    writeModule(dest, "10-5-fast-astand-efnis.html", "m68770");
    writeModule(dest, "10-5-fastur-efnishamur.html", "m68770");

    usablePages(dest, "liffraedi-2e", "10", options);
    expect(unresolvedDuplicates).toEqual([
      {
        bookSlug: "liffraedi-2e",
        dirName: "10",
        identity: "module:m68770",
        files: ["10-5-fast-astand-efnis.html", "10-5-fastur-efnishamur.html"],
      },
    ]);
  });

  it("returns every page in a directory without duplicates", () => {
    const { dest, options } = tracks("03");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeModule(dest, "3-4-protin.html", "m66442");

    expect(usablePages(dest, "liffraedi-2e", "03", options).sort()).toEqual([
      "3-3-lipid.html",
      "3-4-protin.html",
    ]);
  });

  it("ignores non-html files", () => {
    const { dest, options } = tracks("03");
    writeModule(dest, "3-3-lipid.html", "m66441");
    writeFileSync(resolve(dest, "toc.json"), "{}");

    expect(usablePages(dest, "liffraedi-2e", "03", options)).toEqual([
      "3-3-lipid.html",
    ]);
  });
});
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run scripts/generate-toc.test.js`
Expected: PASS — 6 tests. If the run hangs or prints TOC output, the `main()` guard in Step 5
is wrong.

- [ ] **Step 8: Verify against the real content tree**

Run: `node scripts/generate-toc.js --dry-run efnafraedi-2e`

Expected: the run completes, and the summary reports exactly one unresolved duplicate —
`efnafraedi-2e chapters/10 (module:m68770): 10-5-fast-astand-efnis.html, 10-5-fastur-efnishamur.html`.
`--dry-run` writes nothing, so `toc.json` is untouched.

If `static/content/` is empty on this machine the script reports no books; that is not a failure of this task, but the check has not then been performed — say so rather than claiming it passed.

- [ ] **Step 9: Commit**

```bash
git add scripts/generate-toc.js scripts/generate-toc.test.js
git commit -m "fix(toc): skip pages a reviewed rename superseded, report the rest"
```

---

### Task 6: End-to-end proof against a synthetic source tree

Proves the two branches through the real `sync-content.js`, including rsync, without touching real content.

**Files:**

- Create: throwaway fixture under the scratchpad; no repository files change.

**Interfaces:**

- Consumes: the finished `scripts/sync-content.js` CLI.
- Produces: nothing. This is a verification task.

- [ ] **Step 1: Build a synthetic efni source tree**

> **⚠️ Read this before running anything.** `sync-content.js`'s end-of-run cleanup removes
> every directory in `static/content/` that is not a book **in the source tree** — and it
> does that regardless of which books you asked it to sync. A source holding only the
> fixture therefore makes all five real books "stale" and **deletes them**. They are
> gitignored and re-syncable from efni, but that is a long detour for no reason.
>
> The fix is in this step: the temp source **symlinks every real efni book** alongside the
> fixture, so `availableBooks` covers them all and nothing is stale. `getSourceBooks` uses
> `statSync`, which follows symlinks, so the real books resolve normally. Combined with
> naming the fixture explicitly on the command line, only the fixture is actually synced.

```bash
SRC=$(mktemp -d)
mkdir -p "$SRC/books"

# Symlink the real books in so the stale-cleanup sees them as still present.
for b in /home/siggi/dev/repos/namsbokasafn-efni/books/*/; do
  ln -s "${b%/}" "$SRC/books/$(basename "${b%/}")"
done

BOOK="$SRC/books/__c9-fixture__/05-publication"
mkdir -p "$BOOK/mt-preview/chapters/03" "$BOOK/faithful/chapters/03" "$BOOK/mt-preview/chapters/10"

mod() { printf '<article class="cnx-module" data-module-id="%s"><h1 id="title">%s</h1></article>' "$2" "$3" > "$1"; }

# A reviewed title correction: same module, two filenames across the tracks.
mod "$BOOK/mt-preview/chapters/03/3-3-fitusyrur.html" m66441 "Fitusýrur"
mod "$BOOK/faithful/chapters/03/3-3-lipid.html"       m66441 "Lípíð"
# A stale render left in the baseline: same module, two filenames, no overlay.
mod "$BOOK/mt-preview/chapters/10/10-5-a.html" m68770 "Fast ástand efnis"
mod "$BOOK/mt-preview/chapters/10/10-5-b.html" m68770 "Fastur efnishamur"
echo "SRC=$SRC"
```

Before going on, confirm the guard worked:

```bash
ls "$SRC/books"   # expect the five real book slugs PLUS __c9-fixture__
ls static/content # expect the five real books, still present
```

- [ ] **Step 2: Sync the fixture book**

Run: `node scripts/sync-content.js --source "$SRC" __c9-fixture__`

Naming the fixture explicitly matters — without it, every symlinked real book is synced too.

Expected in the output:

- `Removed superseded page (reviewed rename): chapters/03/3-3-fitusyrur.html`
- a `⚠️  DUPLICATE MODULE — __c9-fixture__ chapters/10 (module:m68770)` block naming both files
- the end-of-run unresolved-conflict summary reporting 1
- no `Removing stale content:` lines at all. If you see one naming a real book, **stop
  immediately** and report it — the symlink guard failed.
- a warning that the provenance summary was not found. That is expected: the temp source has
  no `docs/provenance/`, and it is non-fatal.

- [ ] **Step 3: Assert the destination and the generated TOC**

```bash
ls static/content/__c9-fixture__/chapters/03   # expect only 3-3-lipid.html
ls static/content/__c9-fixture__/chapters/10   # expect BOTH 10-5-a.html and 10-5-b.html
node -e "const t=require('./static/content/__c9-fixture__/toc.json');
for (const c of t.chapters) console.log(c.number, c.sections.map(s=>s.file+(s.reviewed?' [reviewed]':'')).join(' '))"
```

Expected: chapter 3 has one section, `3-3-lipid.html`, marked reviewed. Chapter 10 has two — the conflict was reported, not resolved.

- [ ] **Step 4: Clean up**

```bash
rm -rf static/content/__c9-fixture__ "$SRC"
ls static/content   # expect exactly the five real books, no fixture
```

`static/content/` is gitignored, so nothing was staged. Removing `$SRC` deletes only the
symlinks and the fixture — never the real efni books they point at, since `rm -rf` on a
symlink removes the link, not the target.

- [ ] **Step 5: Run the full gates**

```bash
npm test && npm run check && npm run lint
```

Expected: all green. Record the actual test count rather than asserting success from memory.

- [ ] **Step 6: Commit any formatting the gates fixed**

```bash
git add -A scripts
git commit -m "chore: formatting from lint gates" || echo "nothing to commit"
```

---

### Task 7: Record the findings

The chapter 10 defect is efni's to repair; vefur's contribution is the detection built above plus an accurate durable record.

**Files:**

- Modify: `.claude/projects/-home-siggi-dev-repos-namsbokasafn-vefur/memory/faithful-overlay-title-rename-duplicates.md` (under `~/`) and its `MEMORY.md` pointer
- No repository files change.

- [ ] **Step 1: Comment on vefur issue #197**

Post what shipped (identity-based overlay, prune sweep, TOC backstop, warn-and-keep), and add the chapter 10 finding as a **distinct** item: `efnafraedi-2e` ch10 publishes `m68770` twice, live on namsbokasafn.is, both files in efni's `mt-preview`, so no vefur change can resolve it. Name the repair: prune-on-rename in the render pipeline, delete the stale file, re-render the ch10 intro whose `chapter-outline` nav still links the dead slug.

```bash
gh issue comment 197 --body-file <path to a written-out comment>
```

- [ ] **Step 2: Update the memory note**

Rewrite `faithful-overlay-title-rename-duplicates.md`: the vefur half is fixed; the "has never fired" claim is **wrong** and must be corrected — it has fired, through the baseline-vs-baseline path, and is live in production. Keep the efni handoff and the redirect follow-up. Update the `MEMORY.md` one-liner to match.

- [ ] **Step 3: Hand the pipeline gap to efni**

The prune-on-rename gap belongs in efni's campaign register next to C9. Per `CLAUDE.md`'s cross-repo rule, recommend relaunching in `namsbokasafn-efni` for that work rather than editing the register from here — it is efni tools work with its own memory and gates.

---

## Self-Review

**Spec coverage.** Every spec deliverable maps to a task: identity helpers → Task 1; identity-based `chapterFullyFaithful` → Task 2; `resolveChapterDuplicates` → Task 3; the sync sweep with the `main()` guard → Task 4; the three generate-toc sites plus the summary → Task 5; the synthetic end-to-end run → Task 6; the write-ups → Task 7. All 14 rows of the spec's test table appear in Tasks 1-4. The spec's "a baseline rollup can never be deleted" claim is pinned by the `never groups rollups together` test in Task 3.

**Placeholders.** None — every code step carries the code, every verification step carries the command and the expected output.

**Type consistency.** `resolveChapterDuplicates` returns `{ superseded, conflicts }` in Task 3 and is destructured under exactly those names in Tasks 4 and 5. `conflicts` entries are `{ identity, files }` at every use site. `pruneSupersededFiles(bookDest, faithfulPath, bookSlug)` is defined and called with that argument order in both sync paths and in its test. `resetIdentityCache` is imported in Task 4 from `./lib/overlay.js`, where Task 1 exports it.

**One deliberate asymmetry:** the sync sweep takes `faithfulPath` (the publication directory) and appends `chapters/<dir>` itself, while `generate-toc`'s helper builds the full faithful chapter path before calling. Both end up passing a chapter-level directory to `resolveChapterDuplicates`, which is what it expects.
