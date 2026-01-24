# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Námsbókasafn (Textbook Library) is an interactive web-based reader for Icelandic translations of OpenStax educational textbooks. It's a SvelteKit static site with integrated study tools (flashcards with SM-2 spaced repetition, glossary, progress tracking).

## Development Commands

```bash
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # SvelteKit production build to build/
npm run preview          # Preview production build
npm run check            # SvelteKit sync + TypeScript type checking
npm run test             # Vitest unit tests
npm run test:watch       # Tests in watch mode
npm run test:e2e         # Playwright E2E tests
npm run lint             # ESLint
npm run format           # Prettier formatting
```

## Architecture

### State Management
- **Svelte stores** (`src/lib/stores/`) with localStorage persistence
- `settings.ts`: Theme, font size, sidebar state
- `reader.ts`: Reading progress, bookmarks, current location
- `flashcard.ts`: SM-2 spaced repetition, study sessions, card ratings
- `quiz.ts`: Quiz attempts and scores
- `annotation.ts`: Text highlights and notes with export capability

### Content Loading
- Static content served from `static/content/{bookSlug}/`
- Each book has: `toc.json` (table of contents), `glossary.json`, and `chapters/{chapterSlug}/{sectionSlug}.md`
- Markdown files use YAML-like frontmatter for metadata
- Custom directives: `:::practice-problem`, `:::note`, `:::warning`, `:::example`

### Routing (SvelteKit file-based)
- `/` - Book catalog (`src/routes/+page.svelte`)
- `/:bookSlug` - Book home (`src/routes/[bookSlug]/+page.svelte`)
- `/:bookSlug/kafli/:chapterSlug` - Chapter view
- `/:bookSlug/kafli/:chapterSlug/:sectionSlug` - Section reading view
- `/:bookSlug/ordabok` - Glossary
- `/:bookSlug/minniskort` - Flashcards
- `/:bookSlug/lotukerfi` - Periodic table
- `/:bookSlug/prof` - Quizzes

### Key Patterns
- Book config loaded via `+layout.ts` load function and passed to child routes
- Svelte actions for DOM manipulation (equations, practice problems, figure viewer)
- `$:` reactive declarations for derived state
- `$store` auto-subscription syntax for store values
- Math rendering: KaTeX with mhchem for chemical equations
- Path alias: `$lib/` resolves to `src/lib/`

## Language Policy

- **Icelandic**: All UI text, aria-labels, error messages shown to users
- **English**: Code, comments, variable names, technical documentation

Example:
```svelte
<!-- Load chapter content (English comment) -->
<button aria-label="Leita">Leita</button>  <!-- Icelandic UI -->
```

## Tech Stack

- SvelteKit 2, Svelte 5, TypeScript 5.7, Vite 6
- unified/remark/rehype for markdown processing
- rehype-katex for math, Svelte stores for state
- @sveltejs/adapter-static for static site generation
- @vite-pwa/sveltekit for PWA support
- Vitest + Playwright for tests

## SRS Algorithm

The flashcard system uses SM-2 spaced repetition in `src/lib/utils/srs.ts`:
- Ease factor range: 1.3-2.5
- Quality ratings: again(0), hard(2), good(4), easy(5)
- Be careful modifying this algorithm as it affects learning outcomes

## Key Actions & Components

- `src/lib/actions/equations.ts`: KaTeX equation rendering
- `src/lib/actions/practiceProblems.ts`: Interactive problem handling
- `src/lib/actions/crossReferences.ts`: Internal link handling
- `src/lib/components/MarkdownRenderer.svelte`: Main content renderer
- `src/lib/components/FlashcardStudy.svelte`: Flashcard UI with SM-2

## Deployment

Static site deployed to Linode via GitHub Actions. Output goes to `build/` directory. No backend - all state is client-side in localStorage.

## Two-Repository Workflow

This project works together with `namsbokasafn-efni` (content repository). When fixing bugs:

### Content Problems → Fix in namsbokasafn-efni
- **Prepared content**: Fix issues in `books/*/05-publication/mt-preview/`
- **Processing pipeline**: Fix the root cause in `tools/` scripts so problems don't recur
- Then sync content here using `node scripts/sync-content.js --source ../namsbokasafn-efni`

### Website/Rendering Bugs → Fix here (namsbokasafn-vefur)
- Markdown processing issues in `src/lib/utils/markdown.ts`
- Component rendering in `src/lib/components/`
- Styling in CSS files

**Important**: Avoid adding workarounds here that compensate for content problems. Fix content at the source in namsbokasafn-efni. Always verify changes render correctly in both repositories.

## Migration Note

This project was migrated from React to SvelteKit in January 2025. The original React implementation is preserved in the `archive/react-v1` branch for reference.
