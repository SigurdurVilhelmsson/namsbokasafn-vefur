# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Námsbókasafn (Textbook Library) is an interactive web-based reader for Icelandic translations of OpenStax educational textbooks. It's a SvelteKit static site with integrated study tools (flashcards with SM-2 spaced repetition, glossary, progress tracking).

**Design principle:** optimize for _expository_ reading (studying textbooks), not narrative reading. Features that interrupt flow — pre-questions, recall prompts, predict-first ratings, pagination — are deliberate learning interventions backed by the testing-effect literature (see `docs/plans/2026-04-22-screen-vs-paper-reader-plan.md`); don't "streamline" them away as friction.

## Notes for Code Reviewers

- Migrated from React to SvelteKit January 2025 — some patterns may be carry-overs
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
- `settings.ts`: Theme, typography (font family/size, line height/width), reading mode, keyboard shortcuts, sidebar state
- `reader.ts`: Reading progress, bookmarks, current location
- `flashcard.ts`: SM-2 spaced repetition, study sessions, card ratings
- `quiz.ts`: Quiz attempts and scores
- `annotation.ts`: Text highlights and notes with export capability
- `analytics.ts`: Study analytics and reading patterns
- `glossary.ts`: Glossary state and term lookup
- `objectives.ts`: Learning objectives tracking
- `offline.ts`: PWA offline state
- `reference.ts`: Reference/citation management
- `recall.ts`: Free-recall entries written after completing a section (reader v1.1 branch)

### Content Loading

- Static content served from `static/content/{bookSlug}/` (gitignored — synced from namsbokasafn-efni, not tracked here)
- Each book has: `toc.json` (table of contents), `glossary.json`, and `chapters/{chapterNum}/{sectionFile}`
- **All content is pre-rendered HTML** from the CNXML pipeline in namsbokasafn-efni. Metadata is embedded in `<script id="page-data">` JSON blocks.
- Chapter directories use zero-padded numbers (v2 format): `01/`, `02/`, etc. Legacy v1 slug format (`01-grunnhugmyndir`) still supported via `getChapterFolder()`

### Routing (SvelteKit file-based)

- `/` - Book catalog (`src/routes/+page.svelte`)
- `/feedback` - User feedback form
- `/for-teachers` - Teacher resources
- `/:bookSlug` - Book home (`src/routes/[bookSlug]/+page.svelte`)
- `/:bookSlug/kafli/:chapterSlug` - Chapter view
- `/:bookSlug/kafli/:chapterSlug/:sectionSlug` - Section reading view
- `/:bookSlug/ordabok` - Glossary
- `/:bookSlug/atridiordasskra` - Subject index
- `/:bookSlug/minniskort` - Flashcards
- `/:bookSlug/lotukerfi` - Periodic table
- `/:bookSlug/prof` - Quizzes
- `/:bookSlug/nam` - Guided study sessions
- `/:bookSlug/greining` - Study analytics
- `/:bookSlug/bokamerki` - Bookmarks
- `/:bookSlug/markmid` - Learning objectives
- `/:bookSlug/svarlykill` - Answer key
- `/:bookSlug/vidauki` - Appendix
- `/:bookSlug/yfirlit` - Overview/dashboard

### Key Patterns

- Book config defined in `src/lib/types/book.ts`; loaded via `+layout.ts` and passed to child routes
- Landing page (`+page.ts`) dynamically reads `toc.json` to derive chapter counts — no hardcoded stats
- Svelte actions for DOM manipulation (equations, practice problems, figure viewer)
- **Svelte 5 with runes** — uses `$state`, `$derived`, `$effect`, `$props()` for reactivity. Callback props (e.g., `onClose`, `oncomplete`) instead of `createEventDispatcher`. `{@render children()}` instead of `<slot />`.
- `$store` auto-subscription syntax for store values
- **Reactivity pitfalls** (each caused real bugs, fixed June 2026):
  - Never wrap a store method that reads via `get({ subscribe })` in `$derived` — it registers no dependencies and computes exactly once. Read the store (`$storeName`) inside the derived so it recomputes.
  - Never mutate a property on a `$derived` object — reassign the whole object (writable derived).
  - Per-section page logic must not live in `onMount`: SvelteKit reuses the page component when only params change. Use `afterNavigate` with a key guard and/or `{#key}`.
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

- SvelteKit 2, Svelte 5, TypeScript 6, Vite 8, Tailwind CSS 4
- MathJax for math rendering (pre-rendered SVG in HTML content)
- Svelte stores for state, @sveltejs/adapter-static for static site generation
- @vite-pwa/sveltekit for PWA support
- date-fns (date formatting), fuse.js (fuzzy search)
- Husky + lint-staged pre-commit hooks (ESLint + Prettier)
- Vitest + Playwright for tests
- Node >= 20.19.0 required

## SRS Algorithm

The flashcard system uses SM-2 spaced repetition in `src/lib/utils/srs.ts`:

- Ease factor range: 1.3-2.5
- Quality ratings: again(0), hard(2), good(4), easy(5)
- Be careful modifying this algorithm as it affects learning outcomes

## Design System

### Accent Color Convention

The site uses CSS custom properties for theming. The accent color is **amber/gold** (`#c78c20` light, `#e8a838` dark), NOT blue.

- **Accent (amber/gold)**: Interactive elements — buttons, links, hover states, focus rings, active tabs, badges, navigation, form controls
- **Blue (semantic only)**: Info/note content blocks, data visualization (heatmaps, chart legends, rating scales), study phase indicators, periodic table element categories

When adding new interactive UI, use `var(--accent-color)`, `var(--accent-hover)`, `var(--accent-light)`, `var(--accent-subtle)` — never hardcoded blue hex for branding elements. Tailwind arbitrary values work: `bg-[var(--accent-color)]`.

### Fonts

All fonts are **self-hosted** in `static/fonts/` — no external CDN dependencies:

- Bricolage Grotesque (headings), Literata (body), JetBrains Mono (code) — woff2 with unicode-range subsetting
- OpenDyslexic (accessibility option) — woff

### Glossary System

`src/lib/actions/glossaryTerms.ts` uses **semantic-only** term detection — it only processes `<dfn class="term">` elements from the CNXML pipeline. A previous text-matching pass was removed to avoid false positives on common Icelandic words like "efni".

## Key Actions & Components

- `src/lib/actions/equations.ts`: Equation rendering
- `src/lib/actions/practiceProblems.ts`: Interactive problem handling
- `src/lib/actions/crossReferences.ts`: Internal link handling
- `src/lib/actions/figureViewer.ts`: Image lightbox with zoom, pan, keyboard nav, and touch gestures (pinch-to-zoom, double-tap)
- `src/lib/actions/glossaryTerms.ts`: Semantic glossary term tooltips (dfn elements only)
- `src/lib/actions/answerLinks.ts`: Bidirectional exercise↔answer key navigation
- `src/lib/actions/keyboardShortcuts.ts`: Global keyboard shortcut handling
- `src/lib/actions/bionicReading.ts`: Bionic reading text transformation
- `src/lib/actions/lazyImages.ts`: Lazy loading for content images
- `src/lib/actions/readDetection.ts`: Tracks which sections the user has read
- `src/lib/components/ContentRenderer.svelte`: Main content renderer for pre-rendered HTML
- `src/lib/components/layout/`: Header, Sidebar, MobileBottomNav, FocusModeNav
- `src/lib/components/study/`: Guided study session phases (reading, practice, review, reflect)
- `src/lib/components/analytics/`: Study analytics tabs and visualizations
- `src/lib/workers/search.worker.ts`: Web worker for full-text search indexing

## Deployment

Static site on a Linode server (nginx). Output goes to the `build/` directory. No backend — all state is client-side in localStorage.

**CI does not deploy.** GitHub Actions (`ci.yml`) runs lint/type-check/tests/build/E2E on pushes and PRs for `main` and the `feature/**` integration branches. Deployment is the separate `deploy.yml` workflow — manual trigger or release tag (`v*.*.*`), rsync over a directory-restricted SSH key (setup in `docs/guides/deployment.md`) — with manual rsync as fallback. nginx changes must be applied on the server to match `nginx-config-example.conf`; the workflow never touches nginx.

### Security Headers

`nginx-config-example.conf` documents the recommended security headers:

- HSTS (`max-age=63072000; includeSubDomains; preload`)
- Permissions-Policy (camera, microphone, geolocation, payment all denied)
- CSP (`default-src 'self'`; fonts, styles, scripts all self-hosted)

## Two-Repository Workflow

This project works together with `namsbokasafn-efni` (content repository). When fixing bugs:

### Content Problems → Fix in namsbokasafn-efni

- **Prepared content**: Fix issues in `books/*/05-publication/mt-preview/`
- **Processing pipeline**: Fix the root cause in `tools/` scripts so problems don't recur
- Then sync content here using `node scripts/sync-content.js --source ../namsbokasafn-efni`

### Website/Rendering Bugs → Fix here (namsbokasafn-vefur)

- Component rendering in `src/lib/components/`
- Styling in CSS files

### After syncing new content

Run `node scripts/generate-toc.js` to regenerate `toc.json` from the chapter directories on disk. The landing page reads chapter counts from `toc.json` dynamically.

**Cross-repo CSS contract:** `static/styles/content.css` styles the pre-rendered HTML produced by namsbokasafn-efni's `cnxml-render.js`. It is loaded via `<link>` in `src/routes/+layout.svelte`. Changes to this stylesheet must be coordinated with the CNXML rendering pipeline's class names and structure.

**Important**: Avoid adding workarounds here that compensate for content problems. Fix content at the source in namsbokasafn-efni. Always verify changes render correctly in both repositories.

### Cross-repo sessions (sister repo: ../namsbokasafn-efni)

A single fix often spans both repos (routing/slug/deploy here + content/render there).
The harness only auto-loads **this** repo's CLAUDE.md, memory, skills, and permissions —
never the sister's. So when work crosses over:

1. **Before editing any file under `../namsbokasafn-efni/`**, first read its `CLAUDE.md`
   and its memory index
   (`~/.claude/projects/-home-siggi-dev-repos-namsbokasafn-efni/memory/MEMORY.md`).
2. **Record learnings in the repo they belong to.** A fact about the content/translation
   pipeline, `cnxml-render`, or rendered HTML goes in efni's memory and, if it's a
   durable rule, efni's CLAUDE.md — not here. Update both only when the fact is
   genuinely cross-repo.
3. **Recommend relaunching in the sister repo** (then pause for the user's choice) when
   the work's center of gravity is there — ANY of: more than ~2 files to change in the
   sister repo; the task needs the sister's skills/permissions/auto-recalled memory;
   it's an iterative edit→test/build loop there; or you're about to *design/architect*
   there rather than apply a known edit. Phrase it: *"This is now mostly efni work —
   consider relaunching Claude in namsbokasafn-efni for full context. Continue here, or
   relaunch?"* Do **not** nag for a one- or two-file cross-repo touch.

These are heuristics you apply with judgment, not hard gates.

## Build Scripts

- `scripts/generate-toc.js`: Scans chapter directories and generates `toc.json` from `.html` files. Run after syncing new content. Marks each section `reviewed: true` when a human-reviewed `faithful` version of that file exists in the efni repo; absence means a machine-translated preview (drives the MT banner in the reader).
- `scripts/process-content.js`: Enriches `toc.json` with metadata (reading time). Runs automatically before `dev` and `build` via `prepare-content`.
- `scripts/generate-sitemap.js`: Generates `sitemap.xml` from `toc.json`. Runs automatically as part of `prepare-content`.
- `scripts/validate-content.js`: Validates TOC structure and glossary consistency. HTML content is validated upstream in the CNXML pipeline. Runs before production builds.
- `scripts/sync-content.js`: Syncs content from namsbokasafn-efni repo. **Overlay model:** `mt-preview` is the complete baseline (mirrored with `--delete`); `faithful` is copied on top **without** `--delete`, so reviewed modules replace their machine-translated counterparts one at a time and a partial `faithful` can never wipe baseline chapters. Editor artifacts (`*.backup.*`, `*.pre-fix-*`, `*.orig`, `*.bak`, `*~`) are excluded. **Aggregation pages** (chapter rollups — summary/key-terms/exercises/answer-key — and book glossary/index) are chapter/book-scoped, not per-module: a faithful rollup is only served when the whole chapter/book is faithful, **or** when efni drops a `rollups-complete` marker in `05-publication/faithful/` signalling its rollups are built complete (faithful + MT fallback). The MT banner is independent — a rollup stays unreviewed until every module in its chapter is faithful. Shared overlay rules live in `scripts/lib/overlay.js`.
- `scripts/generate-pdfs.js`: Renders per-chapter and full-book PDFs from the `/print/*` routes (Playwright Chromium + pdf-lib): continuous page numbering, running headers, TOC with page numbers, PDF outline, appendices. Run after `sync-content`, before `build` (`npm run pdfs`). Set `PDF_CHROMIUM_PATH` to use a system Chromium instead of the Playwright-managed download.
- `scripts/generate-component-inventory.js`: Generates component documentation (`npm run docs:generate`).

**Pre-commit hooks:** Husky runs lint-staged on commit, which auto-fixes ESLint and Prettier issues on staged files. If a commit is blocked, check the lint-staged output for the specific error.

## Current Development Status (June 2026)

- **`main`**: fully remediated per the June 2026 audit (`docs/code-review-2026-06.md`) — all high-severity findings closed; practice-problem tracking wired to the quiz store; CI gates `feature/**` branches.
- **`feature/reader-v1.1`** (→ v1.1.0): reader plan P0 — narrow measure default, predict-first ratings, free-recall prompt (`recall` store, `RecallPrompt`), hybrid pagination (`utils/paginate.ts`, `PagedReaderControls`, `readingMode` setting). Gated on manual QA batches D–E (`docs/manual-qa-2026-06.md`).
- **`feature/reader-v1.2`** (→ v1.2.0, after v1.1.0): reader plan P1 — Kvörðun calibration tab (`CalibrationTab`), pre-questions (`PreQuestionPrompt`), one-tap cloze cards (`utils/cloze.ts`), Atkinson Hyperlegible + theme/typography corrections. Gated on QA batch G.
- **Planned**: reader plan P2.1–P2.3 (progress label, spaced-review surfacing, recall-review tab); P3 AI tutor deferred pending classroom feedback.
- Authoritative plan/status: `docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md` (update it when the release branches merge).

## Migration Note

Migrated from React to SvelteKit in January 2025. Original React code in `archive/react-v1` branch.
