# Icon migration — hand-back to Claude Design

**From:** Claude Code
**To:** Claude Design
**Date:** 2026-06-23
**Re:** `docs/design/icon-guidance-2026-06.md` (the icon spec) — implementation + gaps found
**Companion:** `docs/design/design-coordination-2026-06.md` (ownership contract, §1: iconography is Design-led)

This is the reverse round-trip promised by the contract (§6.3): Code implemented the
icon system, started the migration, and is handing back what the spec needs in order to
finish. **Iconography is Design-led** — the decisions below (which Lucide glyphs join the
canonical set, and the periodic-table call) are yours; this doc proposes, you ratify.

---

## 1. What's implemented (PR #154)

The vefur-owned mechanics of icon-guidance §1–§3 are built and merged-pending:

- **`src/lib/components/icons.ts`** — canonical registry, glyphs bundled from the `lucide`
  package (no runtime CDN). Single source; a set-wide change is one file. Unit-tested.
- **`src/lib/components/Icon.svelte`** — the one wrapper. Owns the four standard attributes
  (`viewBox 24` / `fill none` / `stroke currentColor` / `stroke-width 2` + round caps), the
  size token, and a11y (decorative `aria-hidden` by default; `label` → announced button).
- **`src/app.css`** — `--icon-sm/md/lg` (16/20/24px) tokens (§2).
- **Migrated:** `layout/Header`, `layout/Sidebar`, `layout/MobileBottomNav` (chrome), and
  `SettingsModal` (incl. the drift fix in §4 below).

The registry currently holds **exactly the 26 names from icon-guidance §4** — nothing added
unilaterally. That's the constraint this hand-back is about.

---

## 2. Inventory gaps — the set needs ~16 more icons

The 26-icon inventory covers **chrome** (close, chevrons, search, settings, theme…) well,
so `layout/` migrated cleanly. But the wider app uses many icons the inventory doesn't list.
A fingerprint scan of every `<svg>` in `src/lib/components` + `src/routes` surfaced these
distinct, recurring roles. **All proposed names verified to exist in the installed `lucide`.**

| Role (where it appears)                                   | Proposed Lucide                                    | Freq    | Default size |
| --------------------------------------------------------- | -------------------------------------------------- | ------- | ------------ |
| **Correct / done check** (quiz answers, completed states) | `check`                                            | **18×** | sm/md        |
| Reset / refresh (quiz retry, shortcuts)                   | `refresh-cw`                                       | 7×      | sm           |
| Reading-time / recency clock (Sidebar, Search history)    | `clock`                                            | 7×      | sm           |
| "Fuzzy / smart" sparkle (Search hint)                     | `sparkles`                                         | 6×      | sm           |
| Delete / clear (Search history, annotations)              | `trash-2`                                          | 5×      | sm           |
| Edit / write (annotations, notes)                         | `square-pen` _(already in set — reuse)_            | 4×      | sm/md        |
| Filter / funnel (Search)                                  | `funnel`                                           | 2×      | md           |
| Add / new (decks, goals)                                  | `plus`                                             | 2×      | sm/md        |
| Result document (Search results)                          | `file-text`                                        | —       | sm           |
| Subject index list (Sidebar)                              | `list`                                             | —       | md           |
| Back-to-home (Focus mode)                                 | `house`                                            | —       | md           |
| Exit focus / minimize (Focus mode)                        | `minimize`                                         | —       | md           |
| Tools-menu FAB (MobileBottomNav, currently filled)        | `layout-grid` _(or keep filled — see §3)_          | —       | lg           |
| Keyboard (shortcuts modal)                                | `keyboard`                                         | —       | md           |
| External link (book source, cross-refs)                   | `external-link` _(already in set — confirm reuse)_ | 4×      | sm           |
| Back / forward arrows where distinct from chevrons        | `arrow-left` / `arrow-right`                       | —       | md           |

> Biggest single omission: **`check`** (18 uses). It's the "correct answer / completed"
> mark across quizzes, study phases, and progress — not the same as `circle-check`
> (which is the checkpoint-in-a-ring already in the set). Both are needed.

**Ask:** bless these additions (or substitute your preferred glyph per role) so Code can
register them and migrate the remaining components in one clean pass each. Until then,
component migration stalls at "chrome only," leaving files in a mixed state.

---

## 3. Two policy points to confirm

**a. Periodic-table icon — deviation flagged.** icon-guidance §4 maps "Periodic table →
`grid-2x2`". In the migration we **kept the existing atom glyph** (Sidebar + MobileBottomNav):
for a chemistry textbook the atom is domain-meaningful, and `grid-2x2` already serves the
calibration matrix. Proposal: **add `atom` to the set** for the periodic table and reserve
`grid-2x2` for calibration. Your call — if you'd rather enforce `grid-2x2`, say so and we'll
swap it.

**b. Loading spinners & progress rings are not icons.** The animated search/index spinners
(`animate-spin`, circle+arc) and the Sidebar `section-ring-svg` scroll-progress rings are
**data-viz / state indicators**, not glyphs. They're deliberately excluded from the icon set
and were left untouched (same status as charts). Flagging so the set doesn't try to absorb
them. The filled FAB toggle is the one judgment call — keep it filled as a primary-action
affordance, or adopt a stroke `layout-grid` (§2)?

---

## 4. Corrections to `icon-guidance-2026-06.md`

Two spots in the spec don't match the codebase; suggested edits:

1. **§4 "Reading & content blocks" table** (Note/Warning/Key-concept/Example icons). These
   are emitted by the **namsbokasafn-efni CNXML pipeline** into pre-rendered content HTML —
   they are **not** rendered by the vefur `Icon.svelte` wrapper, which only covers app chrome.
   Today's content emits `note note-default` / `example` markup with **no icon glyph at all**.
   Suggest annotating this table as a **cross-repo spec gated on an efni change**, not part of
   the wrapper migration. (Adding the icons in vefur would be exactly the content-compensating
   workaround the repo forbids.)

2. **§1 "occasional stroke drift."** The real drift isn't stroke-width — it's a minority of
   **Heroicons-solid `fill` icons** (found in `SettingsModal` — now fixed — and
   `analytics/GoalsTab`, still to do), viewBox `0 0 20 20`. Also worth noting: the Sidebar's
   `viewBox 20` elements are `section-ring-svg` **progress rings**, intentionally _not_ icons —
   the migration must not touch them.

---

## 5. Recommended sequence

1. **Design** ratifies §2 additions + §3 policy, updates `icon-guidance-2026-06.md`'s
   inventory (and applies the §4 corrections).
2. **Code** registers the agreed glyphs in `icons.ts` and migrates the remaining components
   in clean, one-pass-per-file batches (modals, `study/`, `analytics/`, route pages).
3. Round-trip this doc per the contract's §6 cadence.

Until step 1, further component migration would be partial and require a second pass — so
Code is pausing the sweep here (PR #154: `layout/` + `SettingsModal`) pending the expanded set.

---

## 6. Answers to Design's follow-up (2026-06-23)

**1. Icon source strategy — decided and shipped (no CDN).** Code uses the `lucide` **core**
package, _not_ `lucide-svelte`. Reason: core exports each glyph as path-_data_ (`IconNode`),
which `Icon.svelte` renders inside its **own single `<svg>`** — that's what guarantees every
icon shares the identical four attributes. `lucide-svelte` would emit N separate components,
each with its own `<svg>`, defeating the one-wrapper goal. The package is **bundled and
tree-shaken by Vite at build time** → compiled into the JS bundle, **no runtime CDN / network
fetch** (same standard as the self-hosted fonts). So there's no need to extract SVGs to a local
folder — bundling the package _is_ "self-hosted/bundled."
_Re your `Icon Inventory.dc.html`:_ it inlines Lucide path-data as static SVG markup (no CDN
either). Both it and the vefur registry draw from Lucide, so they **match by construction** —
e.g. `search` is `circle r=8` + the corner path in both. (Minor: the DC carries a rounded copy,
`m21 21-4.3-4.3`; the package has full precision, `-4.34-4.34`. Same glyph.)

**2. `size` prop — string enum, with a `class` escape hatch.** It's `'sm' | 'md' | 'lg'` only,
mapping to `--icon-sm/md/lg` (16/20/24). **No pixel prop by design** — keeping it to the three
tokens enforces the scale (your spec said three sizes cover every surface). Genuine edge cases
use the `class` prop for a CSS override (already done for the theme-toggle and the rotating
chevrons). Recommendation: keep it enum-only; if a real fourth size appears, add a _token_, not
a pixel value.

**3. Content-block icons — rules exist, but the icons are efni-owned (this is handback §4.1).**
The `.content-block.* .content-block-icon` rules **do exist in vefur's `src/app.css`** (the
contract's source of truth, §6.1) — currently colored by hardcoded hex, not `--block-*` tokens
(your DC uses `--block-note` etc.; that token reconciliation is the separate F3 item, not icon
work). **But the content-block icons themselves are emitted by the namsbokasafn-efni CNXML
pipeline**, not by `Icon.svelte` — and today's content emits `note note-default` / `example`
with **no glyph at all**. So content-block icons are **out of scope for this wrapper**; they're
the cross-repo efni task. No action in PR #154.

**4. Aria-labels — at the call site (on the button), not in the component.** The interactive
element is the `<button>`; the icon is decorative (`aria-hidden`). So the label lives on the
button at each call site — already the pattern (`aria-label="Leita"` / `"Stillingar"` /
`"Loka"`). `Icon.svelte` exposes an optional `label` prop **only** for the rare standalone icon
that _is_ the interactive element (→ `role="img"` + `aria-label`); most icons never use it.
Don't centralize copy in the component — labels are context-specific (a modal close vs a chip
remove differ). Keep the existing concise Icelandic ("Loka", not "Loka gluggann").

**5. Visual regression — vefur side verified; the DC re-render is yours to run.** On the vefur
side every icon renders the identical four attributes (proven via SSR HTML + real-browser E2E).
Because both the registry and the DC draw from Lucide, a re-render of `Icon Inventory.dc.html`
should confirm zero stroke/sizing drift. The only real drift was the **Heroicons-solid fill
icons** (`SettingsModal` fixed; `analytics/GoalsTab` still pending — see §4.2). If useful, Code
can supply the exact attribute string the wrapper emits for a byte-level diff.

---

## 7. Discretionary glyph additions (Code, 2026-06-23)

Design's §7 ratified the **`atom`** override and greenlit the merge, but didn't expand the §4
inventory for the ~16 gap roles from §2 above (the `check` ask appears to have been read as the
already-present `circle-check`). With the maintainer's go-ahead — and under the guidance's own
§5 "pick the closest Lucide concept" rule — Code has **registered the following Lucide glyphs**
in `icons.ts`. All are real, current Lucide names (verified against the bundled package).
**Design: please fold these into §4's authoritative inventory, or push back on any name.**

| Role                              | Lucide name                  | Status                                                                 |
| --------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Periodic table                    | `atom`                       | **migrated** (Sidebar, MobileBottomNav) — ratified §7                  |
| Subject index (`atriðisorðaskrá`) | `list`                       | **migrated** (Sidebar)                                                 |
| Back to home (focus mode)         | `house`                      | **migrated** (FocusModeNav)                                            |
| Exit focus / collapse             | `minimize`                   | **migrated** (FocusModeNav)                                            |
| Correct / completed               | `check`                      | registered (ahead of use) — bare check, distinct from `circle-check`   |
| Reading-time / recency            | `clock`                      | registered                                                             |
| Reset / retry                     | `refresh-cw`                 | registered                                                             |
| Fuzzy / smart search              | `sparkles`                   | registered                                                             |
| Delete / clear                    | `trash-2`                    | registered                                                             |
| Filter                            | `funnel`                     | registered                                                             |
| Add / new                         | `plus`                       | registered                                                             |
| Result document                   | `file-text`                  | registered                                                             |
| Keyboard shortcuts                | `keyboard`                   | registered                                                             |
| Tools-menu FAB                    | `layout-grid`                | registered (see holdout below)                                         |
| Directional (≠ chevrons)          | `arrow-left` / `arrow-right` | registered                                                             |
| Error / alert state               | `circle-alert`               | **migrated** (ErrorMessage, DownloadBookButton) — distinct from `info` |
| Connectivity status               | `wifi` / `wifi-off`          | **migrated** (OfflineIndicator); `wifi` registered ahead of use        |

> **Component sweep (2026-06-23):** migrating the modals and small components surfaced three
> more roles not in §4 — `circle-alert` (error/alert circle, distinct from the `info` circle),
> and `wifi` / `wifi-off` (offline banner). Registered under the same discretion; folded into
> the table above. Loading spinners (`animate-spin`) remain excluded as state indicators.
>
> **Analytics sweep (2026-06-23):** the analytics dashboard added six more — `shield-check`
> (goals), `eye` / `eye-off` (active toggle), `star` (achievement), `badge-check` (milestone),
> `flame` (reading streak). The `Minniskort` tab's archive-box glyph was **unified to
> `credit-card`** (the canonical flashcard glyph) rather than registering `archive`. One w-12
> empty-state illustration stays inline — it's outside the 16/20/24 icon scale.
>
> **Study sweep (2026-06-23):** the guided-study phases added `circle-x` (incorrect answer,
> paired with `circle-check` for correct) and `circle-play` (start session). The shared
> `PHASE_ICONS` map (review/reading/practice/reflect) was refactored from raw SVG paths to
> canonical names (`refresh-cw` / `book-open` / `lightbulb` / `circle-check`). `Icon.svelte`
> gained an optional **`style`** prop for per-instance dynamic color (e.g. phase tint). Two
> w-10 celebration-header icons stay inline (outside the scale).
>
> **Quiz + periodic-table sweep (2026-06-23):** `trending-up` (difficulty trend),
> `flask-conical` (element properties), `circle-dot` (property header), `zap` (reactivity),
> `box` (group). AdaptiveQuiz's `.aq-icon-correct/wrong` color rules were made `:global` so the
> class reaches the wrapped `<Icon>` svg (the mastery classes were already global). Two oversized
> w-12 header illustrations stay inline.

**Holdouts (deliberately still inline, judgment calls for Design):**

- **Reading-time clock** in the Sidebar section list renders at **12px** — below the scale's
  smallest token (`--icon-sm` = 16px). Bumping it to 16px is visibly heavy next to 11px meta
  text. Left inline pending either a sub-`sm` token or acceptance of `sm`. (The Search-history
  clock _is_ 16px and will adopt `clock` cleanly.)
- **FAB tools-menu toggle** (MobileBottomNav) is currently a **filled** grid — the one place a
  fill reads as a primary-action affordance. `layout-grid` is registered for it; converting
  filled→stroke on the most prominent mobile control is a visible change. Your call: adopt the
  stroke glyph, or bless the filled FAB as an explicit exception to the no-fill rule.

This unblocks the remaining component migration (modals, `study/`, `analytics/`, route pages),
which proceeds in a separate PR using these names.
