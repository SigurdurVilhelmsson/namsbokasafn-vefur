# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Námsbókasafn (Textbook Library) is an interactive web-based reader for Icelandic translations of OpenStax educational textbooks. It's a React 19 + TypeScript static SPA with integrated study tools (flashcards with SM-2 spaced repetition, glossary, progress tracking).

## Development Commands

```bash
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # TypeScript compilation + Vite production build
npm run type-check       # TypeScript type checking only
npm run lint             # ESLint (fails on any warnings)
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier formatting
npm run test             # Vitest unit tests
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Coverage report
npm run check:all        # Security + quality + dependency checks
```

## Architecture

### State Management
- **Zustand stores** (`src/stores/`) with localStorage persistence
- `settingsStore`: Theme, font size, sidebar state
- `readerStore`: Reading progress, bookmarks, current location
- `flashcardStore`: SM-2 spaced repetition, study sessions, card ratings
- `quizStore`: Quiz attempts and scores
- `annotationStore`: Text highlights and notes with export capability

### Content Loading
- Static content served from `public/content/{bookSlug}/`
- Each book has: `toc.json` (table of contents), `glossary.json`, and `chapters/{chapterSlug}/{sectionSlug}.md`
- Markdown files use YAML-like frontmatter for metadata
- Custom directives: `:::practice-problem`, `:::note`, `:::warning`, `:::example`

### Routing
- `/` - Book catalog (LandingPage)
- `/:bookSlug` - Book home
- `/:bookSlug/kafli/:chapterSlug` - Chapter view
- `/:bookSlug/kafli/:chapterSlug/:sectionSlug` - Section reading view
- `/:bookSlug/ordabok` - Glossary
- `/:bookSlug/minniskort` - Flashcards

### Key Patterns
- `useBook()` hook provides book config via React Context (used inside BookLayout children)
- Route components are lazy-loaded with React.lazy()
- Math rendering: KaTeX with mhchem for chemical equations
- Path alias: `@/` resolves to `src/`

## Language Policy

- **Icelandic**: All UI text, aria-labels, error messages shown to users
- **English**: Code, comments, variable names, technical documentation

Example:
```tsx
// Load chapter content (English comment)
<button aria-label="Leita">Leita</button>  {/* Icelandic UI */}
```

## Tech Stack

- React 19, TypeScript, Vite 7, Tailwind CSS 4
- react-markdown with remark-gfm, remark-math, remark-directive
- rehype-katex for math, Zustand for state, React Router 7
- Vitest + Testing Library for tests

## SRS Algorithm

The flashcard system uses SM-2 spaced repetition in `src/utils/srs.ts`:
- Ease factor range: 1.3-2.5
- Quality ratings: again(0), hard(2), good(4), easy(5)
- Be careful modifying this algorithm as it affects learning outcomes

## Key Hooks

- `useKeyboardShortcuts`: Multi-key shortcut handling (←/→ navigation, g+h home, etc.)
- `useTextToSpeech`: Web Speech API wrapper for read-aloud feature
- `useBook`: Book context provider for current book configuration

## Development Planning

The project follows a 4-phase improvement plan documented in:
- `RECOMMENDATIONS.md`: Detailed improvement roadmap with 77 tasks
- `IMPLEMENTATION_PROGRESS.md`: Progress tracking matrix

**Current Phase**: Phase 1 (Core Experience) - 69% complete

## Deployment

Static SPA deployed to Linode via GitHub Actions. No backend - all state is client-side in localStorage.
