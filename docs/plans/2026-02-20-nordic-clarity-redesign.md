# Nordic Clarity — Full Site Redesign

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Full site redesign — landing page, design system, navigation, reading view, study tools

## Overview

Redesign Námsbókasafn with a "Nordic Clarity" aesthetic: Scandinavian editorial design meets modern educational platform. The primary goal is that students land on the page and feel "finally, something clear." Warm amber/gold accent on paper-white backgrounds, deep ink navy text, with abstract science-inspired visuals that work across all subjects.

Key principles:

- **Clarity over cleverness** — information hierarchy is immediately obvious
- **Subject-neutral with science flair** — abstract knowledge-graph motif, subject colors per book
- **Mobile-first** — secondary school students primarily use phones
- **Dark mode as first-class** — students study at night
- **Respectful OpenStax attribution** — clear credit, not emulation

---

## 1. Design System — Color Palette

### Light Mode

| Token              | Value     | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| `--bg-primary`     | `#f7f4ef` | Page background (warm paper)            |
| `--bg-secondary`   | `#ffffff` | Cards, elevated surfaces                |
| `--bg-tertiary`    | `#efeae0` | Subtle backgrounds, code blocks         |
| `--text-primary`   | `#1b2838` | Headings, body text (deep ink navy)     |
| `--text-secondary` | `#5a6474` | Captions, metadata, muted text          |
| `--text-tertiary`  | `#8a919c` | Placeholders, disabled text             |
| `--border-color`   | `#ddd6c9` | Card borders, dividers (warm gray)      |
| `--accent-color`   | `#c78c20` | Primary accent — warm amber/gold        |
| `--accent-hover`   | `#a87518` | Accent hover/active state               |
| `--accent-light`   | `#fdf6e8` | Accent backgrounds (badges, highlights) |
| `--accent-subtle`  | `#f0e4c8` | Soft accent fills                       |

### Dark Mode

| Token              | Value     | Usage                           |
| ------------------ | --------- | ------------------------------- |
| `--bg-primary`     | `#16161c` | Page background (warm charcoal) |
| `--bg-secondary`   | `#1e1e26` | Cards, elevated surfaces        |
| `--bg-tertiary`    | `#26262f` | Subtle backgrounds              |
| `--text-primary`   | `#e8e4de` | Body text (warm off-white)      |
| `--text-secondary` | `#9a9590` | Muted text                      |
| `--text-tertiary`  | `#6a6560` | Disabled/placeholder            |
| `--border-color`   | `#2e2e38` | Borders, dividers               |
| `--accent-color`   | `#e8a838` | Amber brightened for dark bg    |
| `--accent-hover`   | `#f0bc5a` | Lighter on hover                |
| `--accent-light`   | `#2a2418` | Dark accent background          |
| `--accent-subtle`  | `#332c1e` | Soft dark accent fill           |

### Subject Colors

| Subject         | Primary                  | Light bg  | Dark bg   |
| --------------- | ------------------------ | --------- | --------- |
| Chemistry       | `#2e7d9c` (steel blue)   | `#e8f4f8` | `#1a2d38` |
| Biology         | `#4a8c5c` (forest green) | `#e8f4ec` | `#1a2d1e` |
| Math            | `#7c5cad` (muted violet) | `#f0e8f8` | `#241a38` |
| Social Sciences | `#b07040` (warm terra)   | `#f8f0e8` | `#2d1e1a` |

### Semantic Colors

Standard: errors red, warnings amber, success green, info blue. Unchanged.

---

## 2. Design System — Typography

### Font Stack

| Role          | Font                | Weights          | Source                                    |
| ------------- | ------------------- | ---------------- | ----------------------------------------- |
| Display       | Bricolage Grotesque | 400–800          | Google Fonts (variable, optical sizing)   |
| Body          | Literata            | 400–700 + italic | Google Fonts (variable, screen-optimized) |
| Mono          | JetBrains Mono      | 400              | Google Fonts                              |
| Accessibility | OpenDyslexic        | 400              | CDN (existing)                            |

### Type Scale

| Token         | Size            | Line Height | Usage                       |
| ------------- | --------------- | ----------- | --------------------------- |
| `--text-xs`   | 0.75rem (12px)  | 1.4         | Badges, fine print          |
| `--text-sm`   | 0.875rem (14px) | 1.5         | Captions, metadata          |
| `--text-base` | 1rem (16px)     | 1.7         | Body text, UI               |
| `--text-lg`   | 1.125rem (18px) | 1.6         | Lead paragraphs             |
| `--text-xl`   | 1.25rem (20px)  | 1.5         | Section headings (h3)       |
| `--text-2xl`  | 1.5rem (24px)   | 1.4         | Page headings (h2)          |
| `--text-3xl`  | 2rem (32px)     | 1.3         | Hero subheading             |
| `--text-4xl`  | 2.75rem (44px)  | 1.15        | Hero heading                |
| `--text-5xl`  | 3.5rem (56px)   | 1.1         | Landing hero (desktop only) |

Font loading: `font-display: swap`, variable font files (one per family).

---

## 3. Design System — Spacing, Borders & Components

### Spacing (4px base grid)

| Token        | Value          |
| ------------ | -------------- |
| `--space-1`  | 0.25rem (4px)  |
| `--space-2`  | 0.5rem (8px)   |
| `--space-3`  | 0.75rem (12px) |
| `--space-4`  | 1rem (16px)    |
| `--space-6`  | 1.5rem (24px)  |
| `--space-8`  | 2rem (32px)    |
| `--space-12` | 3rem (48px)    |
| `--space-16` | 4rem (64px)    |
| `--space-24` | 6rem (96px)    |

### Border Radius

| Token           | Value    | Usage                  |
| --------------- | -------- | ---------------------- |
| `--radius-sm`   | 0.375rem | Badges, small buttons  |
| `--radius-md`   | 0.5rem   | Inputs, tags           |
| `--radius-lg`   | 0.75rem  | Cards, panels          |
| `--radius-xl`   | 1rem     | Modals, large surfaces |
| `--radius-full` | 9999px   | Pills, avatars         |

### Shadows (warm-tinted)

| Token         | Light Mode                       | Dark Mode                    |
| ------------- | -------------------------------- | ---------------------------- |
| `--shadow-sm` | `0 1px 2px rgba(27,40,56,0.06)`  | `0 1px 2px rgba(0,0,0,0.2)`  |
| `--shadow-md` | `0 2px 8px rgba(27,40,56,0.08)`  | `0 2px 8px rgba(0,0,0,0.3)`  |
| `--shadow-lg` | `0 4px 16px rgba(27,40,56,0.10)` | `0 4px 16px rgba(0,0,0,0.4)` |
| `--shadow-xl` | `0 8px 32px rgba(27,40,56,0.12)` | `0 8px 32px rgba(0,0,0,0.5)` |

### Component Patterns

**Cards:** `--bg-secondary`, `--radius-lg`, `--shadow-sm` (hover: `--shadow-md`), 1px `--border-color` border. Book cards get 3px subject-colored left border.

**Buttons:**

- Primary: `--accent-color` bg, `--bg-primary` text, `--radius-md`, hover lift (translateY -1px)
- Secondary: transparent, `--border-color` border, `--text-primary` text
- Ghost: no border, `--text-secondary`, bg appears on hover

**Badges:** `--radius-full` pill, `--text-xs`, semantic/subject color bg.

**Inputs:** `--bg-secondary` bg, 1px `--border-color`, `--radius-md`. Focus: `--accent-color` border + `--accent-light` glow.

**Transitions:** 150ms ease for colors, 200ms ease for transforms. All respect `prefers-reduced-motion`.

---

## 4. Landing Page

### 4.1 Header (Global)

**Mobile (56px):** Left: hamburger. Center: "Námsbókasafn" (Bricolage Grotesque 700, text-only brand). Right: theme toggle.

**Desktop (56px):** Left: brand text (home link). Right: nav links ("Kennslubækur", "Verkfæri", "Um verkefnið") + theme toggle.

Styling: `--bg-primary` at 90% opacity, `backdrop-filter: blur(12px)`, bottom border on scroll.

### 4.2 Hero Section

- **Eyebrow:** "Opin námsgögn á íslensku" — uppercase, tracked, `--text-secondary`
- **Heading:** "Námsbækur þýddar og gefnar öllum" — `--text-5xl` desktop, `--text-4xl` mobile, Bricolage Grotesque 700
- **Subheading:** One sentence about translated OpenStax textbooks with study tools — Literata, `--text-lg`, `--text-secondary`
- **CTA:** "Skoða bækur" primary button (scrolls to catalog) + "Læra meira um verkefnið" secondary link
- **Background:** CSS-only animated knowledge graph (interconnected dots/lines). Very low opacity (0.08–0.12), right-half desktop, behind text on mobile. Nodes drift gently, connections pulse.
- **Layout:** Left-aligned text (60% width) desktop, centered full-width mobile
- **Padding:** `--space-24` top, `--space-16` bottom
- **Mount animation:** Stagger in: eyebrow → heading (100ms) → sub (200ms) → CTA (300ms). Slide up 16px + fade, 300ms each.

### 4.3 Book Catalog

**Section header:** "Kennslubækur" + "Veldu bók til að byrja að læra"

**Book cards:**

- 3px subject-colored left border
- Status badge (pill, top-right)
- Title (Bricolage Grotesque 600, `--text-xl`)
- Source: "Byggt á [OpenStax title]" with external link icon
- Progress bar (translated/total chapters)
- Study tool icon row with tooltips
- "Opna bók →" link

**Layout:** Full-width stacked mobile, 2-column desktop (3-col if 3+ books).

**Hover (desktop):** Border shifts to subject color, shadow → `--shadow-lg`, arrow slides right 4px.

### 4.4 Study Tools Section

**Section header:** "Verkfæri til náms" + "Innbyggð verkfæri sem hjálpa þér að læra betur"

**4 tool cards** (2x2 mobile, 4-col desktop):

1. **Minniskort** — layered cards icon, "Endurtekningarkerfi sem aðlagar sig að þér", `--accent-color`
2. **Orðasafn** — book+bookmark icon, "Smelltu á hugtök til að sjá skilgreiningar", subject blue
3. **Próf** — checkmark icon, "Aðlöguð próf til að prófa þekkingu", subject violet
4. **Framvinda** — bar chart icon, "Fylgstu með hvar þú ert stödd/staðinn", subject green

Card style: `--bg-secondary`, `--radius-lg`, 40px icon in colored circle, hover scales icon 1.1x.

### 4.5 About / Attribution

Two cards (stacked mobile, side-by-side desktop):

1. **Um Námsbókasafn:** Project mission, volunteer translation, free and open.
2. **OpenStax og Rice University:** Attribution, CC BY 4.0 license link, "Við erum ekki tengd OpenStax" disclaimer.

Style: `--bg-tertiary` bg, no border, generous padding. Subdued.

### 4.6 Footer

One line: "© 2025 Námsbókasafn · Efni byggt á OpenStax · CC BY 4.0" — centered, `--text-tertiary`, linked where appropriate.

---

## 5. Navigation (Book Context)

### 5.1 Header in Book Context

**Mobile:** Back arrow (left) + book title center (tap for quick-nav) + search + theme toggle (right).

**Desktop:** Brand link + breadcrumb (Book > Chapter) left, search (Ctrl+K hint) + shortcuts (?) + theme toggle right.

Background transitions from transparent to opaque on scroll.

### 5.2 Sidebar

**Desktop (1024px+):** 280px fixed left panel. Book title + subject badge, chapter accordions (number in subject-color circle + title + progress ring), section list (filled/empty dots), current section highlighted (`--accent-light` bg + `--accent-color` left border). Study tool links at bottom.

**Mobile:** Slide-out overlay from left. Swipe-right to open, swipe-left or close button to dismiss. Backdrop blur overlay.

### 5.3 FAB (Replaces Mobile Bottom Nav)

48px circle, bottom-right, 16px inset, `--accent-color` bg. Tap expands vertical stack of 4 study tool icons (40px each). Auto-collapses after 5s or on scroll. Semi-transparent backdrop when expanded.

### 5.4 Focus Mode

Toggle with `f`. Hides header, sidebar, FAB. Minimal floating bar at bottom-center: prev/next arrows + exit button.

---

## 6. Reading View

### 6.1 Layout

Content right of sidebar (desktop), max-width from line-width tokens, centered. Full-width + 16px padding on mobile. Consistent `--space-6` vertical rhythm, `--space-8` top margin on headings.

### 6.2 Content Blocks

**New style:** 3px colored left border on `--bg-secondary` background. Block type label + icon inline at top in semantic color. No colored background fills (exception: warnings keep subtle tinted bg).

### 6.3 Figures

Thin `--border-color` border, `--radius-lg`. Caption: `--text-sm`, Literata italic, `--text-secondary`. Figure number in `--accent-color`. Click for lightbox with pan/zoom.

### 6.4 Equations

MathJax SVG preserved. More vertical padding (`--space-4`). Copy/zoom as ghost buttons: hover-visible desktop, always-visible mobile.

### 6.5 Section Navigation

**Desktop:** Full-width bar, prev left-aligned, next right-aligned, section titles + arrows, hover lift.

**Mobile:** Stacked — next on top (primary, `--accent-color` bg), prev below (secondary). Full-width, 56px height.

### 6.6 Scroll Progress Bar

2px bar fixed at viewport top (above header). `--accent-color`. Shows scroll progress through current section. Visual-only — no logic changes.

---

## 7. Study Tools

### 7.1 Flashcards

Centered card (max 480px), `--bg-secondary`, `--radius-xl`, `--shadow-lg`. 3D flip animation. Rating buttons below: Again/Hard/Good/Easy. Mobile: 2x2 grid. Phase stepper at top (4 dots + line).

### 7.2 Glossary

Sticky alphabetical letter bar (full Icelandic alphabet). Term list: Bricolage Grotesque 600 terms, Literata definitions, dividers between. Search input at top. Inline tooltips: `--bg-secondary`, `--shadow-md`, `--radius-md`.

### 7.3 Quizzes

One question at a time (max 600px). Answer options as selectable cards (tap to select, `--accent-color` left border). Correct/wrong states with color + icon. Progress bar at top.

### 7.4 Periodic Table

Existing structure preserved. Updated cell colors (Chemistry subject palette). Selected element: `--accent-color` ring. Detail card: `--bg-secondary`, `--radius-lg`.

### 7.5 Annotations

Highlight colors: soft yellow (`#f5e6b8`), amber (`#f0d0a0`), rose (`#f0c8c8`), blue (`#c8daf0`). Sidebar slides from right (320px desktop, full-width mobile). Highlights grouped by section.

---

## 8. Mobile & Responsive

### Breakpoints

| Breakpoint | Width      | Key changes                                 |
| ---------- | ---------- | ------------------------------------------- |
| Base       | < 640px    | Single column, FAB, stacked nav             |
| Tablet     | 640–1023px | 2-col grids, sidebar still overlay          |
| Desktop    | 1024px+    | Sidebar visible, hover states, full layouts |

### Touch

- 44px minimum tap targets (WCAG)
- Swipe right from left edge: open sidebar
- Swipe left on sidebar: close
- No other custom gestures

### Mobile Adjustments

- Hero: centered text, `--text-4xl`, full-width CTA, knowledge graph at 0.05 opacity
- Book cards: full-width stacked, whole card tappable
- Study tools: 2x2 grid, icon + title only (descriptions hidden)
- Reading: full-width, stacked section nav, 12px content block padding
- FAB: 48px, bottom-right, expands vertically, auto-collapses

### Performance

- Knowledge graph: 12 nodes mobile (24 desktop), `will-change: transform`, paused off-screen via IntersectionObserver
- `prefers-reduced-motion` disables all animations
- Variable fonts: one file per family
- Existing lazy loading preserved

### Print

Existing print stylesheet updated with new colors/fonts. Header, sidebar, FAB, progress bar hidden.
