# Brief — Task 3a: strip assistive MathML from the search index (GATES the efni content sync)

> **✅ SHIPPED 2026-06-30 — vefur PR #176 MERGED to `main` (`0c219e1`).** Implemented per this brief, with two deltas the brief invited: (1) `htmlToPlainText` extracted into `$lib/utils/html.ts` (not a new `htmlToPlainText.ts` and not `searchIndex.ts` — the latter is browser-coupled), and (2) regex hardened to `\bassistive-mathml\b` after grepping the real efni `05-publication` (~5,496 hits, no namespace prefix, class is first attr). Leak confirmed inline-only. Tests in `src/lib/utils/html.test.ts`. **Phase 3 sync+deploy is lead-side on the deploy server.**

**Repo:** namsbokasafn-vefur. **Date:** 2026-06-30. **Size:** S (one real fix + one test, possibly a tiny extract-for-test refactor). **Type:** bug fix, TDD.
**Parent handoff:** `docs/plans/2026-06-30-cross-book-css-and-embed-handoff.md` § Task 3 (this is the execution-ready version of 3a).

## Why this is now urgent (the gate)

efni shipped **a11y-2** (assistive MathML, PR #203) and **re-rendered efnafraedi-2e** (PR #205, merged) — so **every equation in efni's `05-publication` now carries a visually-hidden sibling**:

```html
<mjx-container … aria-hidden="true"><svg…></svg></mjx-container
><math class="assistive-mathml" xmlns="…" display="block"
  style="position:absolute;width:1px;height:1px;…clip:rect(0,0,0,0);…">…source MathML…</math>
```

That content has **not been synced here yet, deliberately.** Per efni's delivery runbook
(`namsbokasafn-efni docs/plans/2026-06-30-efnafraedi-rerender-sync-runbook.md`, Phase 2), **this task must merge before `scripts/sync-content.js` runs** — otherwise the full-text search index ingests MathML tokens (variable letters, digits, operators) from ~5,500 equations.

## The bug (precise)

`src/lib/workers/search.worker.ts` → `htmlToPlainText()` (lines ~36–42) strips math before indexing:

- `:39` removes `<mjx-container>…</mjx-container>` (the visual SVG) ✓
- `:40` removes block math wrappers `<span class="mathjax…">…</span>` ✓ — this _happens_ to also remove the assistive `<math>` for **block** equations (the sibling sits inside the `.mathjax-display` span).
- **GAP:** **inline** math is wrapped in `<span class="math-inline">` (not `class="mathjax…"`), so `:40` does NOT match it. `:39` removes the inline `<mjx-container>`, but the inline assistive `<math>` sibling survives to `:42` (`/<[^>]*>/g`), which strips only the _tags_ and leaves the MathML's **text** (e.g. `x`, `2`, `=`) in the index.

Net: after the #205 sync, inline-equation MathML text pollutes search. Fix = strip the assistive `<math>` element wholesale, regardless of wrapper, before the generic tag-strip.

## The fix

In `htmlToPlainText`, add one `.replace(...)` **before** the generic tag-strip at `:42`:

```js
// Remove assistive MathML siblings (a11y-2): visually-hidden <math> next to each
// mjx-container. Wholesale-remove so its tokens never enter the index; the generic
// tag-strip below would otherwise leave the MathML text. Lazy — MathML can't nest <math>.
.replace(/<math\b[^>]*class="assistive-mathml"[\s\S]*?<\/math>/gi, '')
```

Place it right after the existing `:40` mathjax-span strip. Do NOT touch `:39`/`:40` (they still correctly handle the visible SVG / block wrapper).

## Testability — make `htmlToPlainText` unit-testable first

`htmlToPlainText` is currently **not exported**, and the file is a Web Worker (`.worker.ts`) whose module scope registers `self.onmessage` — importing it directly in a Vitest test is unsafe (side effects). Resolve this the clean way:

1. **Check `src/lib/utils/searchIndex.ts` first** — it already has `searchIndex.test.ts` and is imported by the search path. If an equivalent HTML→text helper already lives there (or should), **move `htmlToPlainText` into `searchIndex.ts`, export it, and have the worker import it.** That removes the duplication risk and gives a tested home.
2. If extraction is out of proportion, **minimally `export function htmlToPlainText`** from a small new pure module (e.g. `src/lib/utils/htmlToPlainText.ts`) and import it into the worker. Avoid exporting from the `.worker.ts` itself (worker side-effects on import).

Pick the option that fits the existing structure; prefer (1) if `searchIndex.ts` is the natural home.

## TDD steps

1. **RED** — add `htmlToPlainText.test.ts` (next to wherever the function lands):

   ```ts
   import { describe, it, expect } from "vitest";
   import { htmlToPlainText } from "..."; // the testable module

   const INLINE =
     '<span class="math-inline" data-latex="x=2">' +
     '<mjx-container jax="SVG"><svg></svg></mjx-container>' +
     '<math class="assistive-mathml" xmlns="http://www.w3.org/1998/Math/MathML">' +
     "<mi>x</mi><mo>=</mo><mn>2</mn></math></span>";

   it("does not leak inline assistive-MathML tokens into indexable text", () => {
     const text = htmlToPlainText(`<p>Vatn ${INLINE} er efni.</p>`);
     expect(text).toContain("Vatn");
     expect(text).toContain("efni");
     expect(text).not.toMatch(/\bx\b/); // MathML variable must not appear
     expect(text).not.toContain("2"); // MathML number must not appear
   });

   it("still strips the block mathjax-display wrapper (no regression)", () => {
     const BLOCK =
       '<span class="mathjax-display" data-latex="E=mc^2">' +
       "<mjx-container><svg></svg></mjx-container>" +
       '<math class="assistive-mathml"><mi>E</mi></math></span>';
     expect(htmlToPlainText(`<p>Orka ${BLOCK} formúla.</p>`)).not.toContain(
       "E",
     );
   });

   it("keeps ordinary prose intact", () => {
     expect(htmlToPlainText("<p>Bara <em>texti</em> hér.</p>")).toBe(
       "Bara texti hér.",
     );
   });
   ```

   Run: `npx vitest run <path>/htmlToPlainText.test.ts` → the first test FAILS (inline `x`/`2` leak).

2. **GREEN** — apply the extract (if chosen) + the `.replace(...)`. Re-run → all pass.
3. Run the full suite: `npm run test` (and `npm run check` for types). Green.

## Acceptance

- Inline + block assistive-MathML tokens are absent from `htmlToPlainText` output; ordinary prose unchanged.
- Full vefur unit suite + typecheck green.
- (Post-sync sanity, Phase 3) after content is synced: a search for a real prose word in a math-heavy section still returns the section; searching a stray equation letter does not surface every equation.

## Then unblock the sync (Phase 3 — separate, lead)

Once this merges: `node scripts/sync-content.js --source ../namsbokasafn-efni` → build → deploy. The #205 re-rendered content (a11y-2 + A3) then reaches namsbokasafn.is. Post-deploy: screen-reader announces an equation (reader-plan § P2.5); search still works.

## Out of scope

- 3b verify items (print/PDF stays hidden; bionic skip-list) and 3c (no `content.css` math rule) — see the parent handoff; not part of this gate.
- The D4 embed CSS + 14 cross-book CSS gaps (Tasks 1–2 of the parent handoff) — independent.
