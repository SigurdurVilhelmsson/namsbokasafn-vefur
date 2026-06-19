# Rec #7 — Practice self-assessment (re-source from the reveal) — Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement task-by-task. Steps use `- [ ]` checkboxes.

**Goal:** Give the inert practice-tracking → adaptive pipeline a real data source by adding
a lightweight, optional self-assessment to the path-(a) Example reveal that writes mastery
to the quiz store, feeding the `/nam` spaced practice/review phases.

**Architecture:** Extend the existing `practiceReveal` action (which already finds the
"Kannaðu þekkingu þína" answer note via `.check-knowledge-answer` + `.note-default`/"Svar:"
fallback). On reveal, register the problem with `quizStore`; show two non-blocking buttons
("Rétt hjá mér" / "Þarf að æfa meira") that record attempts. Tag records `source: 'inline'`
so a future EOC/AI quiz bank (Phase 2) shares the same store. Remove the dead
`.practice-problem-container` writer.

**Tech stack:** Svelte 5 action, `$lib/stores/quiz` (`quizStore`), Vitest (jsdom).

## Global Constraints

- **Minimum interruption for live students:** the self-assessment is **optional and
  non-blocking** — revealing then ignoring the buttons must behave exactly as today. No
  forced predict-first gate, no new setting.
- **`main` only:** no dependency on `feature/reader-v1.1` / `-v1.2`. Predict-first
  calibration is layered on later when those merge (see Coordination).
- **Icelandic UI, English code/comments.** Accent = amber `var(--accent-color)`.
- **One self-assessment per answer note** (not per (a)/(b) part).
- **Client-side only; additive.** No `practiceProblemProgress` records exist yet, so no
  data migration.

## Decisions (rec #7 open questions, resolved)

1. **Build on `main`, lightweight optional post-reveal rating** (not predict-first). Defer
   predict-first/calibration unification to the v1.1/v1.2 merge.
2. **`/prof` AdaptiveQuiz: leave untouched** as Phase-2 scaffolding (don't feed inline,
   don't hide) — pending a cheap check that it isn't a student-facing dead-end (Task E).
3. **One self-assessment per answer note.**

## File structure

- `src/lib/stores/quiz.ts` — add `source` to `PracticeProblem` + `markPracticeProblemViewed`.
- `src/lib/actions/practiceReveal.ts` — accept book/chapter/section opts; register on
  reveal; render + wire self-assessment buttons; inject their styles.
- `src/lib/components/ContentRenderer.svelte` — pass opts to `use:practiceReveal`.
- Removed: `src/lib/actions/practiceProblems.ts` (+ its hookup, fixture, answerLinks branch).
- Tests: `src/lib/stores/quiz.test.ts`, `src/lib/actions/practiceReveal.test.ts`.

---

### Task A: Cross-source `source` field on practice records

**Files:**

- Modify: `src/lib/stores/quiz.ts:29-40` (interface), `:324-355` (`markPracticeProblemViewed`)
- Test: `src/lib/stores/quiz.test.ts` (create if absent)

**Interfaces:**

- Produces: `PracticeProblem.source: 'inline' | 'bank'`;
  `markPracticeProblemViewed(id, bookSlug, chapterSlug, sectionSlug, content, answer, source?='inline')`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { get } from "svelte/store";
import { quizStore } from "./quiz";

describe("practice problem source", () => {
  beforeEach(() => {
    localStorage.clear();
    quizStore.clearAllData?.();
  });

  it('defaults a viewed problem to source "inline"', () => {
    quizStore.markPracticeProblemViewed(
      "b/01/1-1#a1",
      "b",
      "01",
      "1-1",
      "Q?",
      "A.",
    );
    expect(get(quizStore).practiceProblemProgress["b/01/1-1#a1"].source).toBe(
      "inline",
    );
  });

  it("records an explicit source", () => {
    quizStore.markPracticeProblemViewed(
      "b/01/1-1#a2",
      "b",
      "01",
      "1-1",
      "Q?",
      "A.",
      "bank",
    );
    expect(get(quizStore).practiceProblemProgress["b/01/1-1#a2"].source).toBe(
      "bank",
    );
  });
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run src/lib/stores/quiz.test.ts`
      Expected: FAIL (`source` is `undefined`).

- [ ] **Step 3: Implement** — in `quiz.ts` add to the interface and the writer:

```ts
// interface PracticeProblem  (after sessionSlug)
source: "inline" | "bank";
```

```ts
// markPracticeProblemViewed signature: add a 7th param
		markPracticeProblemViewed: (
			id: string, bookSlug: string, chapterSlug: string, sectionSlug: string,
			content: string, answer: string, source: 'inline' | 'bank' = 'inline'
		) => {
			update((state) => {
				if (state.practiceProblemProgress[id]) return state;
				return {
					...state,
					practiceProblemProgress: {
						...state.practiceProblemProgress,
						[id]: { id, content, answer, bookSlug, chapterSlug, sectionSlug,
							source, isCompleted: false, attempts: 0, successfulAttempts: 0 }
					}
				};
			});
		},
```

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run src/lib/stores/quiz.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(quiz): tag practice problems with source (inline|bank)"`

---

### Task B: Register the problem with the store on reveal

**Files:**

- Modify: `src/lib/actions/practiceReveal.ts`, `src/lib/components/ContentRenderer.svelte:48-58`
- Test: `src/lib/actions/practiceReveal.test.ts`

**Interfaces:**

- Consumes: `quizStore.markPracticeProblemViewed` (Task A).
- Produces: `practiceReveal(node, opts?: { bookSlug?; chapterSlug?; sectionSlug?; content?: string })`.
  Tracking id = `` `${bookSlug}/${chapterSlug}/${sectionSlug}#${answerNote.id}` ``.

- [ ] **Step 1: Write the failing test** (append to `practiceReveal.test.ts`)

```ts
import { get } from "svelte/store";
import { quizStore } from "$lib/stores/quiz";

it("registers the answer with the quiz store on first reveal", () => {
  localStorage.clear();
  quizStore.clearAllData?.();
  const el = makeContainer(); // answer note has id "fs-a1"
  el.querySelector("aside.note-default")!.id = "fs-a1";
  practiceReveal(el, {
    bookSlug: "efnafraedi-2e",
    chapterSlug: "01",
    sectionSlug: "1-4",
  });
  el.querySelector<HTMLButtonElement>(
    "button.practice-answer-toggle",
  )!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const id = "efnafraedi-2e/01/1-4#fs-a1";
  expect(get(quizStore).practiceProblemProgress[id]).toBeTruthy();
  el.remove();
});
```

- [ ] **Step 2: Run it, verify it fails** — Expected: FAIL (no store entry; action ignores opts).

- [ ] **Step 3: Implement** — give `practiceReveal` opts, a question-text helper, and a
      registration on reveal:

```ts
import { quizStore } from '$lib/stores/quiz';

interface PracticeRevealOptions { bookSlug?: string; chapterSlug?: string; sectionSlug?: string; content?: string; }

// Walk back over the question paragraphs preceding the answer note.
function questionText(answer: HTMLElement): string {
  const parts: string[] = [];
  let el = answer.previousElementSibling;
  while (el && el.tagName === 'P' && !el.classList.contains('para-title')) {
    parts.unshift((el.textContent || '').trim());
    el = el.previousElementSibling;
  }
  return parts.join(' ');
}

// signature
export function practiceReveal(node: HTMLElement, opts: PracticeRevealOptions = {}) {
  // ...injectStyles(); const state = ...
```

In `processAnswer`, after the toggle is built, compute the tracking id and register on the
first reveal (inside the existing `onClick`, when transitioning to revealed):

```ts
const { bookSlug, chapterSlug, sectionSlug } = opts;
const trackingId =
  bookSlug && chapterSlug && sectionSlug
    ? `${bookSlug}/${chapterSlug}/${sectionSlug}#${answer.id}`
    : null;
let registered = false;
const onClick = () => {
  const nowHidden = answer.classList.toggle("practice-answer--hidden");
  setToggleLabel(button, !nowHidden);
  if (!nowHidden && trackingId && !registered) {
    registered = true;
    quizStore.markPracticeProblemViewed(
      trackingId,
      bookSlug!,
      chapterSlug!,
      sectionSlug!,
      questionText(answer),
      (answer.textContent || "").trim().slice(0, 2000),
      "inline",
    );
  }
};
```

And `update(newOpts)` re-assigns `opts` then `scan()`. In `ContentRenderer.svelte`:

```svelte
	use:practiceReveal={{ bookSlug, chapterSlug, sectionSlug, content }}
```

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run src/lib/actions/practiceReveal.test.ts` → PASS.
- [ ] **Step 5: Run the full action suite** — `npx vitest run src/lib/actions/` → all PASS (existing reveal tests unaffected; opts optional).
- [ ] **Step 6: Commit** — `git commit -am "feat(reader): register Check Your Learning answers with the quiz store on reveal"`

---

### Task C: Self-assessment buttons → record attempts

**Files:** Modify `src/lib/actions/practiceReveal.ts`; Test `src/lib/actions/practiceReveal.test.ts`

**Interfaces:** Consumes `quizStore.markPracticeProblemAttempt(id, success)`.

- [ ] **Step 1: Write the failing test**

```ts
it('records a successful attempt when "Rétt hjá mér" is clicked', () => {
  localStorage.clear();
  quizStore.clearAllData?.();
  const el = makeContainer();
  el.querySelector("aside.note-default")!.id = "fs-a1";
  practiceReveal(el, { bookSlug: "b", chapterSlug: "01", sectionSlug: "1-4" });
  el.querySelector<HTMLButtonElement>("button.practice-answer-toggle")!.click(); // reveal
  el.querySelector<HTMLButtonElement>(
    'button.practice-assess-btn[data-success="true"]',
  )!.click();
  const p = get(quizStore).practiceProblemProgress["b/01/1-4#fs-a1"];
  expect(p.attempts).toBe(1);
  expect(p.successfulAttempts).toBe(1);
  el.remove();
});
```

- [ ] **Step 2: Run it, verify it fails** — Expected: FAIL (no assess buttons).

- [ ] **Step 3: Implement** — in `processAnswer`, build a hidden assess row, reveal it with
      the answer, and wire the two buttons:

```ts
const assess = document.createElement("div");
assess.className = "practice-self-assess";
assess.hidden = true;
const mk = (label: string, success: boolean) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "practice-assess-btn";
  b.dataset.success = String(success);
  b.textContent = label;
  b.addEventListener("click", () => {
    if (trackingId) quizStore.markPracticeProblemAttempt(trackingId, success);
    assess.dataset.answered = success ? "right" : "more";
  });
  return b;
};
assess.append(mk("Rétt hjá mér", true), mk("Þarf að æfa meira", false));
answer.after(assess);
```

In `onClick`, toggle `assess.hidden` with the answer (show when revealed, hide when
collapsed). Extend `injectStyles()` with `.practice-self-assess { display:flex; gap:.5rem;
margin:.25rem 0 .75rem 30px; }` and `.practice-assess-btn` (small amber outline, mirroring
`.practice-answer-toggle`; `[data-answered]` dims the unchosen one).

- [ ] **Step 4: Run it, verify it passes** — `npx vitest run src/lib/actions/practiceReveal.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(reader): self-assessment buttons on the practice reveal feed mastery tracking"`

---

### Task D: Remove the dead `.practice-problem-container` writer

**Files:**

- Delete: `src/lib/actions/practiceProblems.ts`
- Modify: `src/lib/components/ContentRenderer.svelte` (drop import + `use:practiceProblems`),
  `src/lib/actions/answerLinks.ts:237,271-289` (drop `.practice-problem-container`; keep
  `.eoc-exercise`), `src/lib/actions/bionicReading.test.ts:26` (drop the
  `.practice-problem-container` fixture line; keep the surrounding test meaningful)

- [ ] **Step 1: Confirm no remaining references** — `grep -rn "practiceProblems\|practice-problem-container" src/` shows only the lines above.
- [ ] **Step 2: Remove** the file, the ContentRenderer import + `use:practiceProblems` line, the answerLinks selector portion + its footer-button branch, and the bionic fixture line.
- [ ] **Step 3: Run the full suite** — `npx vitest run` → all PASS; `npm run check` → 0 errors.
- [ ] **Step 4: Commit** — `git commit -m "refactor(reader): remove dead .practice-problem-container writer (superseded by the Example reveal)"`

---

### Task E: Verify `/nam` surfaces inline problems; check `/prof`

- [ ] **Step 1:** `npm run dev`; on `/efnafraedi-2e/kafli/01/1-4-maelingar/` reveal a couple of
      answers and click "Þarf að æfa meira". Confirm `localStorage` `namsbokasafn:quiz` →
      `practiceProblemProgress` has `source:"inline"` entries.
- [ ] **Step 2:** Open `/efnafraedi-2e/nam`, start a session including the review/practice
      phase; confirm the rated problems appear.
- [ ] **Step 3 (decision check):** Open `/efnafraedi-2e/prof`. If it shows students an empty
      dead-end, note it and open a follow-up to hide AdaptiveQuiz until Phase 2; otherwise leave
      untouched.
- [ ] **Step 4:** Manual QA note + commit any `/prof` hide if needed.

---

## Coordination with reader v1.1 / v1.2 (required)

The June-10 roadmap marked "wire up the practice pipeline" complete, but it **assumed
`.practice-problem-container` content would supply the data** — the CNXML decision removed
that source, leaving the pipeline empty. **This plan re-establishes the source** (inline
self-assessment). Downstream reader work must integrate with it rather than duplicate it:

- **P0.3 — predict-first flashcard rating (`feature/reader-v1.1`):** when v1.1 merges,
  upgrade this inline rating from "optional post-reveal" to the _same_ predict-first pattern
  (predict before reveal → self-grade). Do **not** build a separate inline calibration —
  reuse P0.3's mechanism; the data already lands in `practiceProblemProgress` (`source:'inline'`).
- **P1.1 — Kvörðun / CalibrationTab (`feature/reader-v1.2`):** its prediction-vs-outcome
  matrix must include `source:'inline'` practice attempts, not just flashcards — this is the
  practice-pipeline data P1.1 was always meant to consume (now actually populated).
- **P2.2 — spaced-review surfacing:** draws on the same inline data; no extra source needed.

These notes are mirrored in `docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md`.

## Deferred / out of scope

- **Phase 2 — EOC/AI quiz bank → `/prof`** (`source:'bank'`, shares this store). Separate plan.
- **M4 — objectives progress always 100%** (`objectives.ts`). DEFERRED (decision 2026-06-19);
  tracked in memory `m4-objectives-progress-deferred`; **reminder owed to the developer.**
  (Roadmap already cross-refs this to P1.1.)
- **M2 — quiz answer dedupe:** revisit with Phase 2 (manual quiz flow).

## Risks

- Removing `practiceProblems.ts` (Task D) is safe only because no content uses it — Step 1
  grep gate enforces that.
- `srs.ts` is learning-affecting (CLAUDE.md); Phase 1 only _feeds_ the store, never alters SRS.
- Self-assessment is calibration-limited — acceptable as a soft signal; P1.1 + Phase 2 add
  calibration and an objective signal.
