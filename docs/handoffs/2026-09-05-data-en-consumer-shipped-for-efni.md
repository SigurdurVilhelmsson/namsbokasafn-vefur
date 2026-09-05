# vefur reads `data-en` — and the gate is still shut (vefur → efni)

**Written:** 2026-09-05 · **Answers:** [`docs/handoff/2026-09-02-vefur-term-english-contract.md`](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni/blob/main/docs/handoff/2026-09-02-vefur-term-english-contract.md) in efni
**vefur `main`:** `12d8389` · **measured against efni `main` `0b409783`**

> Every number here was measured on 2026-09-05 against the trees as they then stood, with the
> command shown. **Re-derive before relying on one**, and note the counting unit — it is stated
> every time, because the contract this replies to shipped a bug from transposing two of them.

## 1. vefur's half of the contract is live

Two PRs merged:

- **[#224](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/pull/224)** — `data-en` is read by
  **all three** vefur consumers of the inline gloss (see §3 for why it is three, not one).
- **[#223](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/pull/223)** — unrelated to this
  contract, but it discharges something efni has been waiting on: see §6.

The reader's matcher now has four tiers — `data-term`, Icelandic exact, **`data-en`**, then the
inline `(e. …)` gloss. `data-en` sits _after_ the Icelandic tier deliberately: vefur's `englishMap`
is not a clean key space, so an earlier position could override a match that is correct today.
There it can only add matches.

**This is a no-op on today's corpus and we know it.** Counting unit = published files containing
the string `data-en=`:

```
grep -rl 'data-en=' books/*/05-publication/ | wc -l   →  0
# control, same paths:
grep -rlo '<dfn[^>]*class="term"' books/*/05-publication/ | wc -l   →  1345 dfn across the corpus
```

Nothing has been re-rendered since #434 merged, so vefur's new code is armed and unexercised
against real content. That is expected, not a complaint.

## 2. 🔴 DO NOT flip `annotateEn` yet — two efni-side generators still scrape the marker

The contract's gate says: _"efni keeps emitting the inline `(e. …)` gloss until vefur ships. **Tell
efni when this is live**; only then does efni flip `annotateEn` to default off."_

**vefur is live. The gate is still shut**, because the contract names only the render path. Two
rollup generators derive their English by scraping the same marker, and **neither knows
`termEnglish` exists**. Counting unit = grep hits in the file, measured against `origin/main`
(`0b409783`):

| file                              | `termEnglish` | derives English by                                  | feeds                                      |
| --------------------------------- | ------------- | --------------------------------------------------- | ------------------------------------------ |
| `tools/generate-glossary.js`      | **0**         | `splitTerm()` at :110, assigned :279                | `glossary.json.english`                    |
| `tools/generate-index.js`         | **0**         | `splitTerm()` at :127-134, assigned :462 / :483-484 | `index.json.termEn`, `index.json.termFull` |
| _control_ `tools/cnxml-render.js` | **9**         | —                                                   | —                                          |

```bash
git show origin/main:tools/generate-glossary.js | grep -c termEnglish   # 0
git show origin/main:tools/generate-index.js    | grep -c termEnglish   # 0
git show origin/main:tools/cnxml-render.js      | grep -c termEnglish   # 9   ← control
```

Seven files under `tools/` do reference `termEnglish`. These two are not among them.

**Neither the spec, the plan, nor the contract mentions either file** — `generate-index.js` and
`index.json` appear 0 times in all three (control: `data-en` appears 8 / 80 / 15 times in the same
files).

### What breaks, and how quietly

Both failures are silent: no error, no failing test, exit 0. Counting unit = entries in the
**served** JSON (`05-publication/mt-preview/`, which is what `sync-content.js` mirrors):

| book             | `glossary.json` terms with `english` | `index.json` entries with `termEn` |
| ---------------- | ------------------------------------ | ---------------------------------- |
| `efnafraedi-2e`  | 739 / 753                            | 749 / 763                          |
| `liffraedi-2e`   | 92 / 92                              | 42 / 42                            |
| `edlisfraedi-2e` | 22 / 22                              | 22 / 22                            |
| **total**        | **853 / 867**                        | **813 / 827**                      |

After a flip, a regeneration empties both columns.

- `glossary.json.english` gone → the tooltip's English line, the Orðasafn English column, the PDF
  `byEnglish` join and the glossary search filter all lose their English.
- `index.json.termEn` gone → **vefur's subject index has a user-facing English/Icelandic toggle**
  (`src/routes/[bookSlug]/atridiordasskra/+page.svelte`: state at `:37`, toggle buttons at `:226`
  and `:233`, English search at `:90`). Its fallback is `entry.termEn || entry.termIs` at `:82`, so
  **English mode silently degrades into a duplicate Icelandic list**. efni cannot see this — the
  toggle lives in vefur.

**The live proof is already in efni's tree.** `m68700` is held at `--no-annotate-en` and its
committed CNXML carries **0** glosses while siblings `m68702/03/04` carry 4, 18 and 10 — yet all
four of `m68700`'s headwords sit in the shipped `glossary.json` **with** `english`. A regeneration
today drops those 4; a global flip drops them everywhere.

⚠️ **Measure that with `grep -o … | wc -l`, not `grep -c`** — `grep -c` counts _lines_ and returns
13 for `m68703`, which reads as a failed control.

## 3. The gloss was load-bearing for MATCHING, not just display — and had three consumers

The contract treats the gloss as a presentation detail. Replaying vefur's own matcher over efni's
published corpus says otherwise. Counting unit = rendered `<dfn class="term">`:

| book             | dfn | tier 1 `data-term` | Icelandic | **inline gloss only** | unmatched |
| ---------------- | --- | ------------------ | --------- | --------------------- | --------- |
| `efnafraedi-2e`  | 854 | 0                  | 329       | **410**               | 115       |
| `liffraedi-2e`   | 92  | 0                  | 28        | **59**                | 5         |
| `edlisfraedi-2e` | 29  | 0                  | 15        | **13**                | 1         |

**482 of 975 published `<dfn>` resolve only through the gloss** — they lose their _tooltip_ at the
flip, not merely their gloss text. Two incidental findings:

- **Tier 1 (`data-term`) resolves 0 across the whole corpus.** It is dead code in production, so
  `data-en` fills an inert tier rather than competing with a live one.
- The third vefur consumer is the **full-text search index**, and no DOM change can reach it:
  `search.worker.ts` builds it from _raw published HTML_ via `htmlToPlainText`, whose tag-strip
  discards every attribute. #224 hoists `data-en` into the text before that strip. **3,074 `(e. …)`
  occurrences across 169 of 334 published `.html` files** are exposed to the flip.

## 4. What efni needs to do before flipping

1. Rewire **both** generators to read `termEnglish` from the manifest, with the marker scrape as a
   fallback while the corpus is mixed.
2. Then flip `annotateEn` and retire `annotateInlineTerms` (the cause of ⑰).

vefur will not need another change for either.

## 5. Suggested pilot: organic ch03, not chemistry ch03

Both halves of `data-en` are unexercised against real content. The cheapest way to prove the
contract end-to-end:

- **`lifraen-efnafraedi` ch03** — 39 `<dfn>`, all id-bearing, **removes no glosses**, already
  re-rendered 2026-09-02, and it is one of the two books §C109 keeps. Its key-terms page yields 0
  `<dt>`, so it exercises the `<dfn>` half only.
  ⚠️ It ships **no `glossary.json`**, so tooltips will not light up there — that is expected and is
  a property of the book, not a failure of the attribute.
- **`efnafraedi-2e` ch03 is not a mechanical attribute addition.** Its published HTML is dated
  2026-07-09/14 while its CNXML was rewritten 2026-09-01 by a paid MT run. Re-rendering it also
  delivers an undelivered re-translation, so it needs editorial re-review rather than a spot-check.

## 6. Two side notes efni asked about, or is affected by

- **The publication allowlist exists now.** `scripts/lib/published-books.js` in vefur is read by
  `sync-content.js`, with its own test; a bare run syncs only `efnafraedi-2e` and
  `lifraen-efnafraedi` and names what it skipped. efni's CLAUDE.md bullet carrying the list has an
  explicit self-destruct for this day — _"THIS LIST LIVES HERE ONLY UNTIL VEFUR'S SYNC READS A
  PUBLISHED-BOOKS ALLOWLIST"_ — so that bullet can now be replaced with a pointer.
  ⚠️ It governs **sync**, not what is already deployed; retiring live pages is still open on the
  vefur side.
- **A stray empty glossary.** `books/efnafraedi-2e/05-publication/glossary.json` has `terms: []`,
  one level above the served `mt-preview/glossary.json` (739/753). Not served, so harmless — but it
  is a trap for anyone measuring coverage with a bare `find`, and it cost one wrong reading while
  this note was being written.

## Not covered here

The **`<dt data-en>` half of the contract.** vefur has not widened any walker to `dt[data-en]`, and
the (i)-vs-(ii) choice is still open. Our reading favours **(i)** — a replay of vefur's matcher over
the served chemistry key-terms pages (21 files) resolves **757 of 763** `<dt>`, so option (ii) (wrapping the
`<dt>`'s term in `<dfn class="term">`) would attach `role="button"`, an amber dotted underline and a
hover tooltip to nearly every key-terms entry, where ~90% of those tooltips would repeat the `<dd>`
printed directly beneath. Making (ii) safe requires _adding_ an exclusion to vefur's existing walker
— the same permanent second selector (i) is charged with. That decision has not been taken; nothing
in this note depends on it.
