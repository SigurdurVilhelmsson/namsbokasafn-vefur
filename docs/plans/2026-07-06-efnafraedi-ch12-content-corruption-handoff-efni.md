# Handoff → namsbokasafn-efni: efnafraedi-2e reader-visible content corruption (post-WS5)

**Date:** 2026-07-06
**From:** vefur session (QA of the WS5 Phase-3 sync)
**To:** namsbokasafn-efni (content/CNXML pipeline)
**Severity:** medium — reader-visible, but **already live** on namsbokasafn.is (not a WS5 regression)
**This is efni-side work.** No vefur code change fixes it; the vefur reader renders this HTML faithfully.

---

## TL;DR

While QA-ing the WS5 re-inject/re-render sync (efni PR #237) on the vefur side, the user
found reader-visible corruption **still present** in efnafraedi-2e chapter 12 (and ~14 other
modules). Two distinct bugs, both in the rendered HTML that efni ships in `05-publication/`:

- **Bug A — content duplication:** a numbered list (`<ol>`) is followed by a _second_,
  un-numbered copy of the same items as `<p>` paragraphs, and the equation that belongs to
  list item #1 lands in that duplicate block.
- **Bug B — example title/structure mis-map:** inside `Dæmi 12.13` the `<h4>` heading is
  wrongly the solution label `Lausn`, the real title leaked into the body as a **literal
  `<title>…</title>` tag inside a `<p>`**, and the example's data tables were emitted
  **outside** the `<aside class="example">` wrapper.

Both are the reading-order / element-placement corruption class the fidelity review (F1 /
OC-A / OC-E) targeted. WS5 did **not** fix them for these modules. WS5's _other_ wins are
real and confirmed present (see "What WS5 did fix", below) — this is a residual, not a
regression, so **it does not block the vefur deploy** (the deploy is a net improvement).

**Please diagnose from the evidence below** — do **not** take "the fidelity gate has blind
spots" as a given. We don't know whether 12-5 was inside WS5's claimed-fixed set or was a
known straggler.

---

## Proof this is efni-side and already live (not introduced by the sync)

1. **Sync is faithful.** The vefur-synced file is byte-identical to efni's source:

   ```
   diff static/content/efnafraedi-2e/chapters/12/12-5-arekstrakenningin.html \
        ../namsbokasafn-efni/books/efnafraedi-2e/05-publication/mt-preview/chapters/12/12-5-arekstrakenningin.html
   # → identical
   ```

   (12-5 exists only in `mt-preview/` — no `faithful/` overlay — so it is served straight
   from the MT baseline.)

2. **Already live.** WebFetch of the production file
   `https://namsbokasafn.is/content/efnafraedi-2e/chapters/12/12-5-arekstrakenningin.html`
   shows the same `<ol>`+duplicate-`<p>` and the same `<h4>Lausn</h4>`. So the corruption
   predates WS5; WS5 neither caused nor fixed it.

3. **WS5 _was_ applied to this module** — the WS4 label translation is present
   (`hraði` appears 724× in ch12), so the module was re-rendered; the duplication/title
   bugs simply survived that render.

---

## Bug A — list + duplicate paragraph/equation (module 12-5)

File: `books/efnafraedi-2e/05-publication/mt-preview/chapters/12/12-5-arekstrakenningin.html`

The collision-theory intro renders the three postulates **twice**:

```html
<p ...>Árekstrakenningin ... byggir á eftirfarandi fullyrðingum:</p>
<ol id="fs-idm90348816">
  <li>Hraði efnahvarfs er í réttu hlutfalli við árekstrartíðni hvarfefna:</li>
  <!-- trailing colon, equation missing -->
  <li>Hvarfefnin verða að rekast á ...</li>
  <li>Áreksturinn verður að eiga sér stað ...</li>
</ol>
<p id="fs-idm136564352">
  Hraði efnahvarfs er í réttu hlutfalli við árekstrartíðni hvarfefna:
</p>
<div id="fs-idm98497056" class="equation unnumbered">
  <span class="mathjax-display" ...></span>
</div>
<!-- the equation for item #1, orphaned here -->
<p id="fs-idm124479808">Hvarfefnin verða að rekast á ...</p>
<!-- dup of li 2 -->
<p id="fs-idm122867808">Áreksturinn verður að eiga sér stað ...</p>
<!-- dup of li 3 -->
```

Expected: a single ordered list where item #1 contains (or is immediately followed by) its
equation. The list-vs-paragraph double emission looks like the CNXML `<list>` was rendered
once as `<ol>` and once as a flattened paragraph sequence.

## Bug B — example title/solution mis-map + displaced tables (module 12-5, `Dæmi 12.13`)

```html
<aside id="fs-idm160727824" class="example" data-example-number="12.13">
  <p class="example-label">Dæmi 12.13</p>
  <h4>Lausn</h4>
  <!-- WRONG: this is the solution label, not the title -->
  <p id="fs-idp108035392">
    <title>Ákvörðun á <em>E</em><sub>a</sub></title>Breytileiki hraðafastans ...
  </p>
  <!-- the REAL title leaked as a literal <title> tag inside a <p> -->
  ...
</aside>
<table id="fs-idm125968016" class="unnumbered" data-table-number="12.31">
  ...
</table>
<!-- OUTSIDE the example -->
<table id="fs-idp10812288" class="unnumbered" data-table-number="12.32">
  ...
</table>
<!-- OUTSIDE the example -->
```

Expected (per the user, who knows the source):

- `<h4>` should be the example title **`Ákvörðun á Eₐ`** (Determination of Eₐ), not `Lausn`.
- The literal `<title>` element should never survive into rendered HTML — it should have
  become the heading.
- Table 12.31 (the given data) belongs **inside** the example, before the `Lausn` text;
  Table 12.32 belongs after the short solution text. Both are currently siblings after the
  `</aside>`.

A leaked `<title>` in body content is the crisp signature here: the renderer failed to
transform a CNXML `<title>` (of an example/section/table) and instead passed it through as
text while filling the real heading slot with the wrong label.

---

## Scope — the `<title>`-leak signature: 15 modules

Every HTML file legitimately has one `<title>` in `<head>`. A `<title>` **past the head**
(body-leaked) is the corruption signature. Run from `05-publication/mt-preview/chapters/`
(exclude editor `*.backup.*`):

```bash
for x in $(find chapters -name '*.html' ! -name '*backup*'); do
  hits=$(grep -n '<title>' "$x" | awk -F: '$1>12' | wc -l)
  [ "$hits" -gt 0 ] && echo "$hits  $x"
done
```

Result (efnafraedi-2e, 15 modules):

```
5-3-vermi.html
9-5-hreyfiorkukenningin.html
12-1-hvarfhradi-efnahvarfa.html
12-5-arekstrakenningin.html
13-2-jafnvaegisfastar.html
14-1-brnsted-lowry-syrur-og-basar.html
14-2-ph-og-poh.html
14-3-hlutfallslegur-styrkur-syra-og-basa.html
14-4-vatnsrof-salta.html
15-1-utfelling-og-upplausn.html
16-2-oreida.html
16-3-annad-og-thridja-logmal-varmafraedinnar.html
16-4-frjals-orka.html
7-6-sameindabygging-og-skautun.html
appendices/appendices-2-grundvallaratridi-i-staerdfraedi.html
```

The list-duplication (Bug A) may be a separate or overlapping signature — worth a dedicated
detector (e.g. an `<ol>`/`<li>` whose text is repeated verbatim in following `<p>` siblings).

---

## What WS5 DID fix (confirmed present in the synced content — for delta context)

These are good and should stay — do not regress them when fixing the above:

- **0** literal `[[TABLE:]]` / `[[math:N]]` / `[[i:]]` markers in any served `.html`.
- Container-table cells are Icelandic (`Hvarfefni`, not `Reactants`) book-wide; the only
  `Reactants` left is inside **figure alt-text** describing an English-labelled image
  (`12-7-hvotun.html`) — a baked image label, cosmetic, expected.
- Glossary key-terms fixed: `Avogadrosartala (N<sub>A</sub>)`, no `<sub>A</sub>vogadros`
  garbage.
- WS4 math labels translated (`hraði`, etc.).

---

## Cross-reference: the exercise↔answer bug was **vefur-side** and is fixed here

The user also reported jumbled exercise→answer links in ch12. That one is **not** efni's
fault — efni's `data-has-answer` attribute (#216) is **correct** (verified: ch12 answers run
1,3,…,33 then flip to even 34,36,…,84; the answer key contains those exact entries). The
vefur reader was ignoring the attribute and guessing by odd/even parity. Fixed vefur-side by
having `answerLinks.ts` consume `data-has-answer`. **No efni action needed** — just noting so
it isn't conflated with the content bugs above. (If anything, it validates that
`data-has-answer` is trustworthy.)

---

## Suggested next steps for efni

1. Reproduce Bug A/B in the CNXML→HTML renderer for `12-5` (and the 15-module list).
2. Root-cause the `<title>` pass-through + wrong heading label, and the `<list>` double
   emission, at the pipeline level (not per-file patches).
3. Decide whether these modules were inside WS5's claimed-fixed set; if the gate should have
   caught them, extend the fidelity gate with the body-`<title>` and list-duplication
   detectors above.
4. Re-render + re-deliver; vefur re-syncs (content-only) afterward.

Nothing here blocks the current vefur deploy of the WS5 sync — it is a net improvement over
what is live today.
