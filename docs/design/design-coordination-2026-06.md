# Design coordination — Claude Code ↔ Claude Design

**Date:** 2026-06-15
**Repo state:** `main` plus in-flight reader branches `feature/reader-v1.1` (→ v1.1.0) and `feature/reader-v1.2` (→ v1.2.0)
**Companion:** Claude Design's conformance audit (15 Jun 2026, scored **92/100**) — findings F1–F6, triaged below.

This document is the bridge between two parallel design tracks. Upload it to Claude
Design as the shared reference. It defines **who owns what**, captures the **current
design state**, lists the **upcoming changes** Design needs to plan around, and
describes **how the two tracks stay in sync**.

---

## 1. Division of labor

The product's primary mission is a **research-backed, high-quality study and learning
environment**. Ownership follows that mission: anything with evidence-based learning
impact is led by Claude Code; everything else (visual unification, iconography,
aesthetic polish) is led by Claude Design, bounded by the rule that it must not
degrade the learning experience.

| Domain                                                                                        | Lead                | Notes                                                                                                                       |
| --------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Reading measure / column width** (`--line-width-*`)                                         | **Claude Code**     | Tied to the 50–75 char legibility band (Bringhurst / NN-G); v1.1 narrows the default. Off-limits to aesthetic-only changes. |
| **Body & reading-canvas typography** (Literata, line-height, size scale)                      | **Claude Code**     | Reading fonts and their metrics are a learning variable.                                                                    |
| **Accessibility fonts** (OpenDyslexic, Atkinson Hyperlegible)                                 | **Claude Code**     | Chosen for legibility research; Design binds them into the system but doesn't swap them.                                    |
| **Reading-surface contrast & text color**                                                     | **Claude Code**     | Warm-navy text on paper neutral; contrast ratios are a legibility decision.                                                 |
| **Reading modes** (paged vs. scrolled), pagination chrome                                     | **Claude Code**     | Implements the screen-vs-paper research; Design styles within the behavior.                                                 |
| **Learning-intervention UI** (recall prompt, pre-question, predict-first rating, calibration) | **Claude Code**     | These interrupt flow _on purpose_; don't "streamline" them. Design unifies their look.                                      |
| **Iconography** (set, weight, sizing)                                                         | **Claude Design**   | Currently ad-hoc; prime candidate for unification.                                                                          |
| **UI-chrome typeface** (modal titles, labels, filters)                                        | **Claude Design**   | Must resolve to a _system_ family (see F1).                                                                                 |
| **Status chips / badges** styling                                                             | **Claude Design**   | Tokenize against the bound system (F3).                                                                                     |
| **Settings controls** (toggles, hint cards) appearance                                        | **Claude Design**   | Bring onto brand tokens (F4).                                                                                               |
| **Subject color palette** consistency                                                         | **Claude Design**   | Decorative; collapse duplicates (F5).                                                                                       |
| **Container / page-chrome width** (`.container`)                                              | **Claude Design**   | Distinct from reading measure (F6).                                                                                         |
| **Color tokens, spacing, radii, shadows, focus ring**                                         | **Shared contract** | Single source of truth is `src/app.css`; changes coordinated both ways.                                                     |

**The one hard guardrail for Design:** changes to reading measure, reading-canvas
typography/contrast, or the timing/placement of learning interventions go _through_
Claude Code, because each has a research basis. Everything else is Design's call.

---

## 2. Current design state (snapshot)

Authoritative source of truth: **`src/app.css`** (`:root` and `.dark` blocks). The
audit confirms the codebase is a near-1:1 mirror of the bound system. Key values:

### Color (light → dark)

| Token              | Light                  | Dark      |
| ------------------ | ---------------------- | --------- |
| `--bg-primary`     | `#f7f4ef`              | `#16161c` |
| `--bg-secondary`   | `#ffffff`              | `#1e1e26` |
| `--bg-tertiary`    | `#efeae0`              | `#26262f` |
| `--text-primary`   | `#1b2838` (warm navy)  | `#e8e4de` |
| `--text-secondary` | `#5a6474`              | `#9a9590` |
| `--text-tertiary`  | `#8a919c`              | `#6a6560` |
| `--border-color`   | `#ddd6c9`              | `#2e2e38` |
| `--accent-color`   | `#c78c20` (amber/gold) | `#e8a838` |
| `--accent-hover`   | `#a87518`              | `#f0bc5a` |
| `--accent-light`   | `#fdf6e8`              | `#2a2418` |
| `--accent-subtle`  | `#f0e4c8`              | `#332c1e` |

**Brand rule (verified intact):** amber/gold is the only brand/interactive color;
**blue is semantic-only** (notes, preview chips, PWA banner). Subject palette is
decorative (per-discipline stripes).

### Spacing, radii, shadows

- Spacing scale (4px base): `--space-1`…`--space-24` (`0.25rem`→`6rem`).
- Radii: `--radius-sm` `0.375rem`, `-md` `0.5rem`, `-lg` `0.75rem`, `-xl` `1rem`, `-full` `9999px`.
- Shadows: `--shadow-sm`…`-xl`, warm-tinted in light (`rgba(27,40,56,…)`), neutral in dark.
- Focus ring: 2px accent outline, 3px offset, 4px 20%-accent halo, with full `prefers-reduced-motion` reset.

### Typography

| Family                  | Role                   | Format                                        |
| ----------------------- | ---------------------- | --------------------------------------------- |
| **Literata**            | Body / reading content | woff2 variable, subsetted (latin + latin-ext) |
| **Bricolage Grotesque** | Headings & UI          | woff2 variable                                |
| **JetBrains Mono**      | Code                   | woff2                                         |
| **OpenDyslexic**        | Accessibility option   | woff                                          |

All self-hosted in `static/fonts/` — no CDN. **Atkinson Hyperlegible is being added in
v1.2** (see §3).

User-adjustable type (defaults in `src/lib/stores/settings.ts`):

- Font family: `serif` (default) · `sans` · `opendyslexic`
- Font size: `small` 14px · `medium` 16px (default) · `large` 18px · `xlarge` 20px
- Line height: `normal` 1.7 (default) · `relaxed` 1.8 · `loose` 2.0
- **Line width / measure:** `narrow` 38rem · `medium` 52rem · `wide` 62rem — **default changes to `narrow` in v1.1** (see §3)

### Components (structural map — `src/lib/components/`)

- `layout/` — Header, Sidebar, MobileBottomNav, FocusModeNav
- `study/` — SessionPlanner/Runner + phase screens (Reading, Practice, Review, Reflect), SessionComplete, PhaseProgress
- `analytics/` — AnalyticsTabs + Reading-patterns / Flashcard-stats / Goals tabs
- Reader core — ContentRenderer, TextHighlighter, SelectionPopup, GlossaryTooltip, AnnotationSidebar
- Modals — Settings, Search, KeyboardShortcuts, Note, Flashcard
- Feature — AdaptiveQuiz, PeriodicTable, PomodoroTimer, PWAUpdater, OfflineIndicator, PreviewBanner (per-section MT notice), etc.

---

## 3. Upcoming design-affecting changes (v1.1 / v1.2)

Design should plan its unification work around these — they add new surfaces and
shift one default. All are driven by `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md`.

### v1.1.0 (`feature/reader-v1.1`, P0)

1. **Default measure narrows to 38rem (~71 chars).** The most visible change. Reading
   columns get tighter by default. _Claude Code owns this number_ — it sits in the
   research legibility band.
2. **Hybrid pagination** — a new reading mode (`paged`, default) with new chrome:
   Prev/Next controls (`Fyrri`/`Næsta`), a position label **"Hluti N af M · Síða X af Y"**,
   keyboard/swipe nav. New component `PagedReaderControls`. A `scrolled` mode remains.
   _Lots of new surface for Design to style — within the paging behavior._
3. **Free-recall prompt** replaces the section-completion celebration. New component
   `RecallPrompt` (a retrieval-practice intervention — keep it, don't trim it).
4. **Predict-first flashcard rating** — a new pre-answer "Man það / Man það ekki" step
   before the four-point rating. New intermediate UI state on the study cards.

### v1.2.0 (`feature/reader-v1.2`, P1)

5. **Atkinson Hyperlegible added** as a font option ("Hannað fyrir hámarks læsileika");
   OpenDyslexic relabelled to "Sumir lesendur kjósa þetta letur". **The font roster
   grows from four to five families** — Design's type spec needs to bind Atkinson.
6. **`prefers-color-scheme` honored on first visit only** — a fresh profile follows the
   OS light/dark setting; a saved theme still wins. Theme-default behavior change.
7. **Kvörðun (calibration) tab** on `/greining` — a new 2×2 prediction-vs-performance
   matrix and per-section Ofmat/Vanmat list. New data-viz surface (`CalibrationTab`).
8. **Forspurning (pre-question) card** shown on unread sections (`PreQuestionPrompt`).
9. **Eyðukort (cloze) cards** — highlight→cloze in one tap; new "Eyðukort" deck in `/minniskort`.

> Note for Design's type spec: the audit's "exactly four families" statement is true on
> `main` but becomes **five** once v1.2 ships. Atkinson is a _learning_ font (Claude
> Code's pick); please bind it rather than substitute it.

---

## 4. Audit findings (F1–F6) triaged into the ownership model

Claude Design's audit is accurate and welcome. Mapping each finding to a lead:

| #      | Finding                                                                                      | Lead                                       | Disposition                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F2** | Reading canvas uses cool slate (`#111827` / `#374151`) instead of warm navy `--text-primary` | **Claude Code**                            | **Accept & implement.** It's the reading surface (learning domain) and the change _aligns_ the token _and_ slightly increases contrast — no tradeoff. Highest priority, as Design notes. |
| **F1** | `.font-sans` → "Neue Helvetica W01" (a 5th, unlicensed face) on modal chrome                 | **Claude Code signs off; Design executes** | Touches fonts (Code's domain) but it's UI chrome, not the reading canvas. Agreed fix: point chrome at the heading family (Bricolage). See token note below.                              |
| **F3** | Status chips hard-code green/blue/MT-amber instead of tokens                                 | **Claude Design**                          | Accept. Tokenize. **But the referenced `--status-*` tokens don't exist in the code yet** (see §5) — Design must add them to `app.css` as part of this, or Code mirrors them.             |
| **F4** | Settings toggles/hints use Tailwind `gray-*` / `amber-500` instead of brand                  | **Claude Design**                          | Accept. `--border-color` for tracks, `--accent-*` for the hint card.                                                                                                                     |
| **F5** | Two "math" colors (`--subject-math` plum vs `--subject-mathematics` indigo)                  | **Claude Design**                          | Accept. Collapse to the system plum; alias `mathematics → math`.                                                                                                                         |
| **F6** | `.container` is 80rem but the guide says 72rem                                               | **Claude Design**                          | Accept — doc reconciliation. This is **page chrome, not reading measure**; the reading measure (`--line-width-*`) is unaffected and stays with Code.                                     |

**No conflicts.** F2 and F1 are the only findings that brush the learning domain, and
both align with the mission. The rest are pure aesthetic/maintainability wins for Design.

---

## 5. Token-namespace reconciliation (an actual gap found)

While triaging, Code found that several tokens the audit assumes exist are **only in the
bound Claude Design system, not in `src/app.css`**:

- `--font-display` (F1's suggested target) — **not in code**; headings use Bricolage via `.font-serif`/direct family.
- `--status-available-*`, `--status-preview-*` (F3) — **not in code**; chip colors are inline literals. No token for the machine-translation amber pair at all.

This is the clearest example of why the two tracks need a shared contract: Design is
reasoning against a token set the code hasn't mirrored yet. **First reconciliation task:**
agree the canonical names and add them to `app.css` so both sides reference the same
identifiers. Until then, treat `app.css` as ground truth for what _actually_ ships.

---

## 6. How to interconnect the two tracks

There's no live API between Claude Design and the repo, so the connection is a
**version-controlled contract plus a round-trip review rhythm**:

1. **Single source of truth = `src/app.css`** (`:root` / `.dark`). Every shipped token
   lives here. Claude Design's exported token set is reconciled _against_ this file, not
   the other way around.
2. **This document lives in the repo** (`docs/design/`) and is re-uploaded to Claude
   Design whenever it changes — it's the human-readable contract (ownership + roadmap).
3. **Design hands specs back as files in `docs/design/`** (token diffs, icon specs,
   component mockups). Claude Code implements them in `app.css`/components, respecting
   the §1 guardrails.
4. **Token diff on each round-trip:** before Design's changes land, diff the proposed
   token names/values against `app.css`. Catches drift like §5 early.
5. **Learning-guardrail check:** any Design proposal touching measure, reading-canvas
   type/contrast, or intervention timing is flagged to Claude Code for sign-off before
   merge. Everything else Design merges freely.
6. **Roadmap awareness:** Design plans unification around §3 so new surfaces
   (pagination chrome, calibration viz, recall/pre-question cards, the Atkinson option)
   are styled once, consistently, rather than retrofitted.

A lightweight cadence: Code keeps `app.css` and this doc current; Design works in its
own space and drops specs into `docs/design/`; each side reviews the other's
boundary-crossing changes. The repo is the meeting point.
