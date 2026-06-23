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
