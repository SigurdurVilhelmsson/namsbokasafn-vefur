# Changelog

All notable changes to Námsbókasafn (Textbook Library) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `robots.txt` for search engine crawling
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
