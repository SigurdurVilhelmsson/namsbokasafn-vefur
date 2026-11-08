# Changelog

All notable changes to Námsbókasafn (Textbook Library) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Reader v1.1 — draft of the v1.1.0 entry

_A draft, written in plan step S11.4 before calls 3 and 2 are applied (`docs/plans/2026-10-15-reader-v1.1-v1.2-review-plan.md`). When call 3 is ruled and its step is done (S11.5 or S11.6), S11.4 sets version 1.1.0, turns this into `## [1.1.0]` and tags it. Until then the pager is dark: a section pages only under a `?lestur=sidur` link, or once a reader who paged chose a mode in the reading view._

- **Accessibility (M1, M2):** an accessibility ratchet in CI (axe on five surfaces at two widths and both themes, the colour tokens' contrast, white on amber kept at zero). Settings closes without a jump, the closed sidebar leaves the Tab order, and the phone tabs have names. Role tokens for the amber (`--on-accent`, `--accent-strong`, `--accent-fill-hover`) and one focus ring over a solid gap, with no `outline: none` left in the text.
- **What the site says (M3):** practice review keeps the whole question and its maths. 'Hreinsa gögn' says what it clears, and the erase is real. /prof no longer claims to adapt. A privacy page (`/personuvernd`), the page-view ruling in code, and 'Tilkynna villu' from the machine-translation notice.
- **Section-end recall (M5, P0.2):** a free-recall prompt once per section, at its end (call 2), kept off rollups, introductions and the Formáli, accessible and bounded. A saved recall is read back, with 'Eyða', on a return visit. Local counters with a summary on /greining and a counts-only export.
- **Settings (M6):** the store keeps only what the reader set, with a version and a profile-age marker, and builds older or newer than it carry unknown settings through. A pre-paint script applies a stored dark theme and line width before the page draws.
- **Flashcards (M7):** the selection popup works by touch and keyboard and stays on screen; a card can be deleted. A flashcard is a 'minnisspjald'.
- **The paged reader (M8, M9, M11; dark):** hybrid viewport-aware pages (P0.4), split to the window and the font size.
  - Keys, swipes and a position label: 'Hluti N af M · Síða X af Y', counting parts only, with the footnotes named. The screen reader hears the same position and the sub-section's name.
  - Space and PageDown scroll a tall page before turning it. A worked example taller than a page breaks once, before its 'Lausn' part (D11's trial).
  - The section title stands above every page, and a turn keeps focus on the page.
  - 'Síðuskipt' / 'Samfellt skrun' in view, a radio group that keeps the reader's place. 'Ljúka kafla' ends a section, and the recall prompt takes the page's place.
  - The machine-translation notice and 'Tilkynna villu' on every page. A figure link opens the lightbox over the page. Images load a part ahead, not all at once.
  - The page controls docked in a bar. Call 1's page budget: §1.2's pages fill 68% of a 1280 × 800 window.
  - Print and find-in-page reach the whole section. The sidebar's ring follows the pages. In-content links work on a second click, a page's address names a block, and a return visit offers the page left on.
- **Settings' line height and width (S11.3)** are radio groups.
- **Predict-first flashcards (M4, P0.3)** join this entry when S4.5 merges them into `main` (January 2027).
- **Also on `main` since the June entry (S11.4 completes this list from the train PRs):** the service-worker cache and offline book download (#260); deploys that keep unchanged files' ETags (#263); the organic chemistry book retired; the erase on /greining empties the service worker's expiry records, and a failed offline page load gets the app shell (#381–#383); a failed search says so (#387, #388); the PDFs' links into the reader (#391); dark-theme figure cards that keep their size (#392); the front page credits the machine translation (#398).

### June 2026 audit remediation (PRs #108–#118, #126, #130–#131)

- **Security:** content-sync book slugs passed via `execFileSync` argv (no shell interpolation); CI no longer persists the content-repo PAT into the workspace; CSP hardened (`object-src`, `base-uri`, `frame-ancestors`, `form-action`, narrowed `img-src`); nginx `immutable` caching scoped to hashed `/_app/` bundles only
- **Fixed:** per-section lifecycle on client-side navigation (reading analytics, read detection, highlight restore, equation/lazy-image enhancement, bionic reading across sections); selection popup/glossary tooltip positioning on scrolled pages; Svelte 5 reactivity bugs (dead study-planner toggles, duplicate Ctrl+Enter flashcard saves, frozen goals/shortcuts/analytics views); glossary loading for a second book; stale analytics sessions inflating reading time (no longer persisted, 30-min cap, cross-tab safe); bionic-reading toggle-off orphaning practice-problem/answer-link listeners (in-place unwrap instead of innerHTML restore); SRS ease factor capped at the documented 2.5; restored proper Icelandic on quiz/note/annotation surfaces
- **Added:** practice-problem tracking wired into the quiz store — in-text self-assessments now feed the adaptive quiz (`/prof`), study-session phases, and per-problem mastery, with cross-book isolation; GoatCounter injected after the `load` event so analytics can never block page readiness; CI runs on `feature/**` integration branches; full audit report (`docs/code-review-2026-06.md`), roadmap, and manual QA checklist in `docs/`
- **Note:** Reader v1.1 (P0) and v1.2 (P1) features are complete on `feature/reader-v1.1` / `feature/reader-v1.2` and will get their own entries when released

### Added

- `robots.txt` and `sitemap.xml` (auto-generated from `toc.json`) for search engine crawling
- OpenGraph meta tags on landing, book home, and section pages
- Click/tap handler for glossary tooltips (mobile accessibility)
- Dark mode support for content.css (CNXML-rendered content)
- Self-hosted OpenDyslexic font files (`static/fonts/`) to avoid CSP issues
- Self-hosted Google Fonts (Bricolage Grotesque, Literata, JetBrains Mono) with woff2 + unicode-range subsetting
- Touch event support for figure viewer lightbox: pinch-to-zoom, single-finger pan, double-tap zoom
- nginx security headers example: HSTS, Permissions-Policy, tightened CSP
- `.btn-accent` utility class in app.css

### Changed

- Glossary term detection now semantic-only (`<dfn class="term">` elements); removed TreeWalker text-matching pass that caused false positives on common Icelandic words
- Flashcard study page (`minniskort`) shows all user decks dynamically instead of hardcoded sample deck
- Glossary tooltip colors use CSS custom properties instead of hardcoded hex values
- PWA manifest icons reference existing SVG files instead of missing PNG files
- Theme color aligned to `#c78c20` (gold) across manifest.json and meta tags
- GoatCounter script URL changed from protocol-relative to explicit HTTPS
- `translatedChapters` updated from 4 to 8 in book config
- Design system: migrated interactive/branding blue tokens to amber/accent CSS variables across 20+ files (buttons, links, badges, hover states, focus rings, charts, navigation, form controls)
- Google Fonts loading changed from render-blocking `<link>` to self-hosted @font-face with `font-display: swap`
- Answer link buttons and highlight animations use accent CSS variables instead of hardcoded blue hex
- Keyboard shortcuts hint in SettingsModal changed from blue to amber theme
- Chemistry book icon gradient on teacher guide uses accent color variables

### Fixed

- Glossary tooltips inaccessible on mobile (no click/tap handler)
- Sidebar progress badge and read dot invisible in dark mode
- MobileBottomNav aria-labels missing Icelandic accented characters (Próf, Orðasafn, Verkfæravalmynd)
- Content areas (exercises, tables, notes) unreadable in dark mode
- Figure viewer lightbox unusable on touch devices (no touch event handlers)
- Blue CSS variable fallbacks in feedback form, teacher guide, and PomodoroTimer now use correct amber/gold values
- Division by zero in flashcard progress bar when study queue is empty
- Equation zoom modal escape key handler leaked on backdrop/button close
- Incorrect `role="button"` on non-focusable overlay backdrops (AnnotationSidebar, Sidebar)
- Missing `aria-current="page"` on breadcrumb current item
- Flashcard progress bar missing `role="progressbar"` and ARIA value attributes
- Key terms entries missing dark mode border color in content.css
- Icelandic typos in AnnotationSidebar placeholder text (ad→að, eda→eða)
- npm vulnerabilities: Svelte XSS (<=5.53.4), SvelteKit DoS, rollup path traversal, serialize-javascript RCE

## [0.4.0] - 2025-12-31

### Added

- **PWA Offline Support**: Service worker with Workbox caching
- **Print Stylesheet**: Comprehensive `@media print` styles (~500 lines)
- **Learning Analytics**: Reading session tracking, daily/weekly stats, streak counter

### Changed

- Configured vite-plugin-pwa with NetworkFirst/CacheFirst strategies
- Added offline indicator component with useOnlineStatus hook
- Optimized equation and table rendering for print

## [0.3.0] - 2025-12-30

### Added

- **Interactive Periodic Table**: Full 118 elements with detail modals at `/lotukerfi`
- **Figure Viewer**: Zoom, pan, lightbox, and keyboard navigation
- **Cross-Reference System**: `[ref:type:id]` syntax with hover previews
- **New Directives**: `:::definition`, `:::key-concept`, `:::checkpoint`, `:::common-misconception`
- **Enhanced Frontmatter**: Reading time calculation, difficulty levels, keywords
- **Section Metadata Component**: Displays reading time and difficulty indicators

### Changed

- Extended content types with DifficultyLevel, readingTime, prerequisites

## [0.2.0] - 2025-12-29

### Added

- **Annotation System**: Text highlighting with 4 colors, notes, export to markdown
- **Text-to-Speech**: Piper TTS with 4 Icelandic voices (Steinn, Búi, Salka, Ugla)
- **Keyboard Shortcuts**: Full navigation with `?` help modal
- **Focus Mode**: Distraction-free reading with `F` key toggle
- **WCAG 2.2 Compliance**: Skip links, focus indicators, reduced motion support
- **Math Accessibility**: Click-to-copy LaTeX, zoom modal, equation numbering
- **Math-to-Speech**: LaTeX to Icelandic descriptions
- **Flashcard Integration**: Create cards from text selection, inline review
- **Enhanced Quiz System**: Hints, explanations, mastery tracking
- **Objectives Dashboard**: Self-assessment with confidence ratings at `/markmid`
- **Fuzzy Search**: Fuse.js integration with chapter filtering and search history

### Changed

- Updated accent colors for WCAG contrast compliance (4.5:1+)
- Shifted markdown heading hierarchy (h1→h2, h2→h3)

## [0.1.1] - 2025-11-30

### Changed

- **MAJOR**: Upgraded React from 18.3.1 to 19.2.0
- **MAJOR**: Upgraded Vite from 6.4.1 to 7.2.4
- **MAJOR**: Upgraded Tailwind CSS from 3.4.18 to 4.1.17
- **MAJOR**: Upgraded react-markdown from 9.1.0 to 10.1.0
- Refactored components for React 19 compatibility
- Improved TypeScript strictness (removed `any` types)

### Fixed

- React 19 setState in effects compatibility
- ESLint warnings for React hooks patterns

## [0.1.0] - 2025-11-30

### Added

- Initial release with core reader functionality
- Markdown reader with KaTeX math and mhchem chemistry support
- Light/dark theme with system preference detection
- Responsive layout for mobile and desktop
- Chapter navigation and table of contents
- Reading progress tracking with localStorage persistence
- Bookmarking system
- Full-text search with Ctrl/Cmd+K shortcut
- Glossary system with alphabetical organization
- Flashcard system with SM-2 spaced repetition
- Settings modal for font size, family, and theme
- GitHub Actions workflow for Linode deployment

### Technical Stack

- React 19, TypeScript 5.7, Vite 7
- Tailwind CSS 4 with CSS-first configuration
- Zustand for state management
- React Router 7 for navigation
- react-markdown with remark/rehype plugins
- KaTeX for math rendering
- Lucide React for icons

[Unreleased]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/releases/tag/v0.1.0
