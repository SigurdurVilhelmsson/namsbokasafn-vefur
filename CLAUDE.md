# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Námsbókasafn (Textbook Library) is an interactive web-based reader for Icelandic translations of OpenStax educational textbooks. It's a SvelteKit static site with integrated study tools (flashcards with SM-2 spaced repetition, glossary, progress tracking).

## Notes for Code Reviewers

- Migrated from React to SvelteKit January 2025 — some patterns may be carry-overs
- Markdown pipeline is legacy, scheduled for removal (Phase D documented below)
- No backend — all user state in localStorage (intentional, not an oversight)
- Content directory is gitignored and synced from sister repo
- Built iteratively with AI assistance; patterns may be inconsistent across files

## Project Context

- **Developer profile:** Chemistry teacher with basic Linux skills, built with Claude Code
- **Scale:** Small educational project — 1-2 developers, ~5 editors
- **Server:** Linode Ubuntu, nginx serving static build output
- **Domain:** namsbokasafn.is
- **Sister repo:** namsbokasafn-efni (content/translation pipeline)

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

- Static content served from `static/content/{bookSlug}/` (gitignored — synced from namsbokasafn-efni, not tracked here)
- Each book has: `toc.json` (table of contents), `glossary.json`, and `chapters/{chapterNum}/{sectionFile}`
- **Two content formats coexist** (migration in progress):
  - **HTML** (`.html`): Pre-rendered from CNXML pipeline in namsbokasafn-efni. Metadata in `<script id="page-data">` JSON. Used by efnafraedi (Chemistry).
  - **Markdown** (`.md`): Legacy format with YAML frontmatter. Custom directives: `:::practice-problem`, `:::note`, `:::warning`, `:::example`. Used by liffraedi (Biology).
- Chapter directories use zero-padded numbers (v2 format): `01/`, `02/`, etc. Legacy v1 slug format (`01-grunnhugmyndir`) still supported via `getChapterFolder()`

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

- Book config defined in `src/lib/types/book.ts`; loaded via `+layout.ts` and passed to child routes
- Landing page (`+page.ts`) dynamically reads `toc.json` to derive chapter counts — no hardcoded stats
- Books with `status: 'coming-soon'` are hidden from the landing page (currently: liffraedi)
- Svelte actions for DOM manipulation (equations, practice problems, figure viewer)
- `$:` reactive declarations for derived state
- `$store` auto-subscription syntax for store values
- Math rendering: MathJax (pre-rendered SVG in HTML content)
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
- unified/remark/rehype for markdown processing (legacy — will be removed when all content migrated to HTML)
- MathJax for math rendering (pre-rendered SVG in HTML content)
- Svelte stores for state, @sveltejs/adapter-static for static site generation
- @vite-pwa/sveltekit for PWA support
- Vitest + Playwright for tests

## SRS Algorithm

The flashcard system uses SM-2 spaced repetition in `src/lib/utils/srs.ts`:

- Ease factor range: 1.3-2.5
- Quality ratings: again(0), hard(2), good(4), easy(5)
- Be careful modifying this algorithm as it affects learning outcomes

## Key Actions & Components

- `src/lib/actions/equations.ts`: Equation rendering
- `src/lib/actions/practiceProblems.ts`: Interactive problem handling
- `src/lib/actions/crossReferences.ts`: Internal link handling
- `src/lib/components/MarkdownRenderer.svelte`: Main content renderer (handles both HTML and markdown via `isHtml` prop)

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

### After syncing new content

Run `node scripts/generate-toc.js` to regenerate `toc.json` from the chapter directories on disk. The landing page reads chapter counts from `toc.json` dynamically.

**Important**: Avoid adding workarounds here that compensate for content problems. Fix content at the source in namsbokasafn-efni. Always verify changes render correctly in both repositories.

## Build Scripts

- `scripts/generate-toc.js`: Scans chapter directories and generates `toc.json`. Handles both `.md` and `.html` files, preferring `.html` when both exist. Run after syncing new content.
- `scripts/process-content.js`: Enriches `toc.json` with metadata (reading time, cross-references). Runs automatically before `dev` and `build` via `prepare-content`. Handles both `.md` and `.html` files.
- `scripts/validate-content.js`: Validates markdown content (frontmatter, directives, links, images). Skips `.html` files (validated upstream in CNXML pipeline). Runs before production builds.
- `scripts/sync-content.js`: Syncs content from namsbokasafn-efni repo.

## Pending: Markdown Pipeline Removal (Phase D)

When all `.md` content is migrated to HTML (`find static/content -name "*.md" -path "*/chapters/*"` returns 0), the markdown pipeline can be removed:

- Delete `src/lib/utils/markdown.ts` and its tests
- Remove unified/remark/rehype npm dependencies
- Simplify `MarkdownRenderer.svelte` to HTML-only (rename to `ContentRenderer.svelte`)
- Clean up markdown branches in `contentLoader.ts` and search worker

## Migration Note

This project was migrated from React to SvelteKit in January 2025. The original React implementation is preserved in the `archive/react-v1` branch for reference.
