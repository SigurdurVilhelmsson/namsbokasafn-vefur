# Handoff: efni remediation delivery is COMPLETE — sync is the only remaining step

**From:** efni session, 2026-07-10 (late)
**To:** whoever runs the next vefur sync + deploy (lead)
**State:** efni `main` = `74cf9a9c` (content delivery at `485e266c`); vefur `main` = `3812bd6` (#187 + #188 merged). Both trees clean, all suites green (efni 2045 vitest; vefur per #188). **Everything upstream of the sync is done on both sides.**

## The one remaining step

```bash
cd ~/dev/repos/namsbokasafn-vefur
node scripts/sync-content.js --source ../namsbokasafn-efni
# then: build + deploy per the standard flow
```

The sync re-runs `generate-toc`, which sets `toc.index` / `toc.glossary` — that is what activates the gated vefur features below. No vefur code change is needed or expected.

## What this ONE sync delivers to readers

**Re-rendered content (efni `485e266c`, 76 pages — Fable RUN 4–6 remediation + Phase-1 + GI-1 + R4-3):**

- **E3 (R4-6):** biology ch03 raw-`<link>` leaks → real links (fidelity gate hard-asserted RED 5 → GREEN 0); link fixes across efnafraedi/lifraen pages.
- **E7 + R4-3:** appendix tables now labeled per-letter with per-module reset — `Tafla B1`, `C1–C5`, `D1`, `E1–E6`, `F1`, `G1…M1`; zero `Tafla appendices.N`. (E7 as merged was dead — `moduleLetters` was emptied during the appendices render pass; fixed in efni PR #260 with a new appendix-render integration gate.)
- **E5 (R5-1):** ordered sub-lists render lower/upper-alpha inline (ch04 MC options a/b/c) — pairs with vefur V4 CSS from #187.
- **E6 (R4-1):** media-list reading order (e.g. 7-3, verified pure block-move diff).
- **E8 (R4-4):** emphasis nesting/`<em class="emphasis-one">` — pairs with vefur P0-9 CSS from #187.
- **E9 (R4-5):** ch10 exercises duplicate figure now renders exactly once.
- Everything from the 2026-07-09 delivery is re-confirmed in place (appendix `document=` cross-refs → `/{book}/vidauki/{letter}`, table/entry leak fixes, zero `[[…]]` markers book-wide).

**Aggregates already committed in efni (sync picks them up):**

- `index.json`: biology (ch05, 42 entries), physics (ch04, 22 entries, intro terms resolve via GI-1), chemistry — after sync+generate-toc, **Atriðisorðaskrá appears for biology + physics** (V1 / R6-4 gating from #188).
- `glossary.json`: orverufraedi + lifraen-efnafraedi have **none by design** (0 `<glossary>` in source, D5-gated) — **Orðasafn hides gracefully** on those books (V2 / R6-6 gating from #188).
- **Svarlykill back-links** on split-slug books (physics) resolve via the V3 `{n}-exercises` fallback (R6-3, #188).

## Post-deploy spot-checks

1. Appendix pages (efnafraedi → Viðaukar): captions read `Tafla B1`-style, no `Tafla appendices.N`.
2. Biology ch03 sections: no raw `<link` text visible.
3. Chemistry 7-3: intro paragraph/media order sane; ch04 MC options lettered a/b/c.
4. Chemistry 10-exercises: the needle-floating figure appears once.
5. Sidebar: Atriðisorðaskrá present on biology + physics; Orðasafn absent on orverufraedi + lifraen (no error).
6. No literal `[[…]]` markers anywhere.

## Note-header caveat (biology, expected behavior)

Biology note headers render **English + a console warn by design** (R5-3 label VALUES are deferred to the Miðeind API — translations are never AI-generated). Do not read English note headers as a render failure; the `unmapped note type` warn is the intended fail-loud signal until Icelandic labels land in `books/liffraedi-2e/book-config.json` `noteTypeLabels`.

## References

- efni register: `docs/plans/2026-06-28-pipeline-architecture-implementation-plan.md` (R4-3-BUG row + post-merge review block)
- efni delivery script (§6 prints these steps): `scripts/rerender-remediation-delivery.sh`
- efni Phase-0 plan lead-gate checklist (all render items checked): `docs/superpowers/plans/2026-07-10-remediation-phase-0.md`
