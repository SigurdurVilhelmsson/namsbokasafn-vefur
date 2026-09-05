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

---

# Addendum, later on 2026-09-05 — the ask: please re-render organic ch03

**vefur `main` is now `da06b2b`** (the note above was written at `12d8389`).
**Measured against efni `origin/main` `16616d04`.**

## A1. vefur's half is now complete, not just the matcher

[#227](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/pull/227) landed after the note
above was written. `data-en` is now not only _read_ by the three consumers of §3 — it is also
_displayed_: a `.term-en` span renders ` (e. …)` from the attribute, behind a reader setting
(**Enskt heiti hugtaka**, default on). So when efni stops emitting the inline gloss, the English
does not disappear from the page; the source of the visible text just moves from the content to
the attribute.

Nothing further is needed from vefur for the `<dfn>` half of the contract. `<dt data-en>` remains
open (see _Not covered here_, above) and is unaffected by this ask.

## A2. The ask

```bash
node tools/cnxml-render.js --book lifraen-efnafraedi --chapter 3
```

⚠️ **`--book` is parsed but is missing from `--help`.** `BOOK_OPTION` is in `parseCliArgs` and
`BOOK_SLUG = args.book` at `tools/cnxml-render.js:3461`, but neither the header block (`:14-23`)
nor the printed usage (`:579-599`) mentions it, and the default is `efnafraedi-2e`. Omitting it
renders the wrong book silently. Worth adding to the usage text while you are in there.

## A3. Why this chapter, and why it is unblocked _now_

Organic ch03 has a **complete** `termEnglish` map that has never reached a render. Counting unit =
keys in `termEnglish` per manifest, from `02-structure/ch03/*-manifest.json` at `origin/main`:

| module    | `termEnglish` keys | published file                       | `<dfn class="term">` |
| --------- | ------------------ | ------------------------------------ | -------------------- |
| m00031    | 0                  | `3-0-introduction.html`              | 0                    |
| m00032    | 16                 | `3-1-virknihopar.html`               | 16                   |
| m00033    | 8                  | `3-2-alkanar-og-alkanhverfur.html`   | 8                    |
| m00034    | 2                  | `3-3-alkilhopar.html`                | 2                    |
| m00035    | 1                  | `3-4-nafngiftir-alkana.html`         | 1                    |
| m00036    | 0                  | `3-5-eiginleikar-alkana.html`        | 0                    |
| m00037    | 9                  | `3-6-afbrigdi-etans.html`            | 9                    |
| m00038    | 3                  | `3-7-stellingar-annarra-alkana.html` | 3                    |
| **total** | **39**             | —                                    | **39**               |

The map matches the published `<dfn>` count **per module**, not just in aggregate — so the join is
expected to reach 39/39 with no shortfall to explain. Today the published tree carries
**`data-en` = 0**.

**The reason is ordering, not a defect.** The chapter was published at `02b407cf`
(2026-09-02 19:25Z); every piece of the `data-en` machinery landed the following day —
manifests `92f1ab81` (16:25Z), the `<dfn>` emitter `59ccff17` (17:25Z), the key-terms `<dt>`
emitter `013956da` (17:48Z), the coverage report `a4f2464d` (17:52Z). The chapter simply predates
its own attributes.

Its **translated CNXML has not moved since 2026-09-02** (`6826adef`), which is what makes this a
cheap pilot rather than an undelivered re-translation — the distinction §5 draws against
chemistry ch03.

## A4. The post-render check is already built in

Do not grep for it. `cnxml-render.js:3798-3804` prints, per module:

```
terms: <N>/<M> <dfn id> carry data-en
```

Expect `16/16`, `8/8`, `2/2`, `1/1`, `9/9`, `3/3` — **39/39 for the chapter**. Anything less, and
the line names the remedy itself (a stale manifest tells you to re-run `cnxml-extract.js`).

`59ccff17`'s own message already claims "39/39" for this chapter, so the emitter has been measured
against it; what has not happened is the result being **published**.

## A5. What this pilot proves — and what it deliberately does not

Being precise, because the pilot is narrower than "end-to-end":

**It proves:** the attribute is emitted correctly on real content, at full coverage, keyed on the
id the render exposes; and that vefur's three consumers ingest a real `data-en` corpus without
double-rendering.

**It does not exercise:**

- **Tooltips.** `lifraen-efnafraedi` ships **no `glossary.json`**, so the matcher's `data-en` tier
  has nothing to match against here. Expected, and a property of the book (§5 already flags it).
- **The key-terms `<dt>` half.** Organic ch03's `3-key-terms.html` yields **0** `<dt>`
  (control: chemistry ch03's yields **20**).
- 🔑 **The visible `.term-en` span — and this one is the counter-intuitive part.** With
  `annotateInlineTerms` still on (as the gate requires), the render emits the inline gloss _and_
  the attribute. vefur dedupes on the **marker**, so all 38 glossed `<dfn>` are skipped; the 39th
  is `<dfn>R</dfn>`, whose `termEnglish` value is the string `"R"`, which the `EN === IS` guard
  skips. **Net new spans on organic ch03: zero.** That is correct behaviour, not a null result —
  it is the no-double-render property being demonstrated on real content. The span only becomes
  visible when the gloss goes, which is exactly the flip the gate is holding.

## A6. Correction to §5 above: "removes no glosses" needs one word of care

§5 says organic ch03 "removes no glosses". That is true of the **re-render** — no existing gloss is
removed by adding the attribute. But the counts are not equal and a reader could be misled:
**39 `<dfn>`, 38 inline glosses.** The odd one out is `<dfn id="term-00002" class="term">R</dfn>` in
`3-3-alkilhopar.html`, which never carried a gloss because efni's own annotator skips `EN === IS`.
Its manifest entry is `"term-00002": "R"`, so after the re-render it **will** carry
`data-en="R"` — attribute present, gloss absent, and vefur suppresses the span. All three sides
agree; only the two counts differ.

## A7. Two caveats on the re-render itself

- **It is not attribute-only at the tool level.** Nineteen commits touched `tools/cnxml-render.js`
  or `tools/lib/` between the 2026-09-02 publish and `16616d04`. Most are figure-review work that
  cannot fire here — the only `figure-text` sidecars in the whole tree are three under
  `__e2e-fixture__`, and organic ch03 has none, so no `data-figure-review` is expected — but
  `94ad869e` (math labels) and `700b1800` (order-independent `<term>` id) do change render output
  in general. Diff the output, don't assume it is a one-attribute delta.
- **The render prunes superseded pages and writes `slug-map.<track>.json`.** The 2026-09-02 publish
  message records "3 slugs pruned". If this run renames anything, **tell vefur**: a rename retires
  a reader URL, and the redirect must be added to `src/lib/data/sectionRedirects.ts` — which is a
  checked-in constant here, not a reader of your slug map. No rename is expected (the CNXML is
  unchanged and none of the seven section titles contains math), but "expected" is not "checked".

## A8. 🔴 Unchanged: do not flip `annotateEn`

This ask does **not** move the gate of §2. `tools/generate-glossary.js` and
`tools/generate-index.js` still scrape the marker and still know nothing of `termEnglish`
(0 hits each; control: 9 in `cnxml-render.js`). A flip today still empties 853/867 glossary
`english` values and 813/827 index `termEn` values, silently.

Re-rendering organic ch03 with the gloss **still emitted** is safe precisely because it changes
none of that. Keep `annotateInlineTerms` on.
