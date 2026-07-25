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

## Attribution & Licensing

> **⚠️ This repository is PUBLIC (since 2026-07-25).** Assume anything committed is
> world-readable immediately. Both repos were audited and remediated before the flip
> — see efni memory `pre-publication-2026-07-25`.

**Repository licensing — three separate things, do not conflate them:**

| What                                                    | Licence                                 | Where                              |
| ------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| Application code (TS/JS/CSS/config)                     | **MIT**                                 | root `LICENSE` §1                  |
| Educational content (`static/content/`)                 | **per-book CC** — see below             | `LICENSE` §2, `CONTENT-LICENSE.md` |
| Bundled fonts (`static/fonts/`, `static/assets/fonts/`) | **third-party**: OFL-1.1 ×4 + KaTeX MIT | `static/fonts/LICENSES.md`         |

- Fonts are **not** covered by the MIT grant. OFL-1.1 requires its text travel with
  the fonts, which is why `static/fonts/OFL.txt` sits beside them and ships to
  `/fonts/OFL.txt`. **Adding a font means adding its copyright line there** plus a
  row in `LICENSES.md`. OpenDyslexic carries a Reserved Font Name — read the note in
  `OFL.txt` before re-subsetting it.
- Sister repo `namsbokasafn-efni` splits **MIT** (`tools/`, `scripts/`) from
  **AGPL-3.0** (`server/` — Ritstjóri). Respect that boundary if you work there.
- **Credit follows the METHOD, not the job title** — the machine is the translator;
  people are credited for _ritstjórn_ / _yfirlestur_. Biology alone is
  human-translated ("Þýðing", Þórhallur Halldórsson). `src/lib/data/bookCredits.ts`
  encodes this and its test asserts the credit must never read `Þýðandi: <human>`
  for MT content. Keep prose docs in step with it.

The catalogue carries **two content licences**: most titles are CC BY 4.0, but Organic Chemistry (`lifraen-efnafraedi`) and College Physics (`edlisfraedi-2e`) are **CC BY-NC-SA 4.0**. Attribution is **data-driven** and rendered on every page.

- **Source of truth for verdicts:** the provenance audit in the sister repo, `namsbokasafn-efni/docs/provenance/openstax-cnxml-licence-provenance.md`. Licence decisions derive from there — do not re-determine them here. A trimmed public-facing summary (`docs/provenance/provenance.md` in efni) is synced to `static/provenance/` (gitignored) by `sync-content.js` and linked from each colophon.
- **Per-book metadata** lives in `src/lib/types/book.ts` as `attribution: BookAttribution` (multi-source schema — see `src/lib/data/licences.ts`). `toc.json` does **not** carry attribution. Each book lists every obtained `source` (format + obtained date + licence); `derivativeLicence` is the **most-restrictive** licence across those sources (NC-SA beats BY).
- **No per-book conditionals in components.** The NC/SA notices come from the licence descriptor flags (`nonCommercial`, `shareAlike`) in `LICENCES`, not from `book.slug`. Branch on data, never on identity.
- **No commingling.** No aggregate view (landing, About, FAQ, meta tags) may make a blanket "CC BY 4.0" claim. The catalogue shows a per-book `LicenceBadge`; replace any global licence statement with per-book licences.
- **Fail loud.** Missing/inconsistent attribution fails the build via `scripts/validate-content.js` (loads `book.ts` through esbuild and runs `validateAllBookAttributions`) **and** renders a visible placeholder + `console.error` at runtime (`BookAttribution.svelte`, colophon). Never render attribution silently-empty or guess data.
- **Render sites:** `BookAttribution.svelte` (section/chapter footers + print routes — unlike the MT `PreviewBanner`, attribution is **not** hidden in print), `/[bookSlug]/leyfi` colophon (full multi-source provenance), and `LicenceBadge.svelte` (catalogue + book-home). The print full-book/chapter routes also carry the correct derivative licence.

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

### CI — read this before trusting or blaming a red check

CI was **billing-blocked 2026-07-17 → 2026-07-25** (every job died in ~3s on every
branch). It is **working again**, and `main` is fully green.

- **Duration is the diagnostic.** A billing/infra failure dies _before_ a runner is
  provisioned — no `Current runner version:` line in the log. Anything that runs for
  minutes is a real result. Check duration before diagnosing content.
- **`workflow_dispatch` is enabled** on `ci.yml` (and on all five efni gating
  workflows). Re-verify CI health from the Actions tab — never invent a commit.
- **What the jobs actually run** — verify against _this_, not a similarly-named local
  script. `lint-and-test`, `security`, `e2e`. In efni the trap is worse:
  `npm run lint` is eslint only while CI _also_ runs `npm run format:check`, and
  `npm test` is the unit suite while CI _also_ runs Playwright.
- **The `security` job is split on purpose.** Blocking = `npm audit --audit-level=high
--omit=dev` (production tree, currently **0**). Informational =
  the full tree with `continue-on-error`, because one advisory is genuinely
  _unfixable_: brace-expansion's OOM (`GHSA-mh99-v99m-4gvg`) has range `<=5.0.7`,
  which npm applies across all majors, so the 2.x copy stays flagged forever. Do not
  "fix" this by making the full-tree audit blocking again.
- **No repo secrets.** `EFNI_TOKEN` was deleted once efni went public —
  `github.token` reads a public repo fine. Keep `persist-credentials: false`; it is
  about _any_ credential, not just that PAT.

### Two dependency rules that will bite you

1. **`typescript` is pinned `~6.0.3` — tilde, not caret, and not 7.x.** TypeScript 7
   makes `npm ci` fail on a fresh clone (ERESOLVE). `@sveltejs/kit` peers
   `^5.3.3 || ^6.0.0` and `typescript-eslint` peers `>=4.8.4 <6.1.0`; the
   intersection is 6.0.x. `.github/dependabot.yml` **ignores major typescript
   bumps** — Dependabot has proposed 7.x twice (#190 merged and broke fresh clones,
   #195 closed). Lift the ignore only when _both_ peers admit 7.
2. **`package-lock.json` is in `.prettierignore`.** npm owns its formatting; prettier
   rewrites it and the next `npm install` rewrites it back, forever.

### E2E gating fixtures must be derived, never hardcoded

`e2e/helpers/content-fixtures.ts` (`bookWith` / `bookWithout`) picks fixture books
from `static/content/*/toc.json` at run time. Hardcoding "book X has no index" bakes
in a fact about efni's content that expires: `index-gating.spec.ts` pinned
`edlisfraedi-2e`, efni shipped a physics index, and both tests went red **while the
app was correct**. It passed locally and failed only in CI, because `static/content/`
is gitignored and a dev machine runs against a stale sync. Use `test.skip` when a
case has no fixture; the helper _throws_ when content is missing entirely, so a
skipped sync fails loudly instead of turning every gating test green.

### Security Headers

`nginx-config-example.conf` documents the recommended security headers:

- HSTS (`max-age=63072000; includeSubDomains; preload`)
- Permissions-Policy (camera, microphone, geolocation, payment all denied)
- CSP (`default-src 'self'`; fonts, styles, scripts all self-hosted; `frame-src` allows only PhET/YouTube for content embeds)

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

**Cross-repo CSS contract:** `static/styles/content.css` styles the pre-rendered HTML produced by namsbokasafn-efni's `cnxml-render.js`. It is loaded via `<link>` in `src/routes/+layout.svelte`. Changes to this stylesheet must be coordinated with the CNXML rendering pipeline's class names and structure. The sister repo's `tools/__tests__/css-contract.test.js` is the checker — run it from there with `VEFUR_CONTRACT=1`; when a class here gains a real rule, remove it from efni's `KNOWN_GAPS` so the contract re-arms. Its parser reads **only the last selector line before `{`**, so a class on an earlier line of a comma-separated selector is invisible to it.

**Two print surfaces — hiding something for print needs BOTH:** `static/styles/print.css` is loaded _only_ by `/print/*` (the PDF routes, `src/routes/print/+layout.svelte`). A reader pressing Ctrl+P on a normal page gets `src/app.css`'s own `@media print` block instead. A rule in one does not cover the other. Note that the app.css block blanket-hides `header, nav, aside, footer`, which silently removes all `aside.note` content and the module `<header>` — convenient, but it masks bugs and invalidates test fixtures placed there (inject fixtures inside `<main>`).

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
   it's an iterative edit→test/build loop there; or you're about to _design/architect_
   there rather than apply a known edit. Phrase it: _"This is now mostly efni work —
   consider relaunching Claude in namsbokasafn-efni for full context. Continue here, or
   relaunch?"_ Do **not** nag for a one- or two-file cross-repo touch.

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

## Current Development Status

### 2026-07-25 — repo went public; CI restored; main green

- **Repository is PUBLIC.** Pre-publication audit + remediation done in both repos.
  History was **rewritten** on 2026-07-25 (`git-filter-repo`) to strip
  `.claude/settings.local.json`, which had carried two live Cloudflare API tokens at
  `origin/main` HEAD for ~5 months. Tokens revoked. **Any clone predating
  `20e8690` must re-clone or hard-reset** — old refs are gone:
  `git fetch origin && git reset --hard origin/main && git reflog expire --expire=now --all && git gc --prune=now`.
  Residual, accepted: ~146 GitHub `refs/pull/*` refs still carry the dead tokens —
  GitHub-owned, unremovable by us, harmless post-revocation.
- **`.claude/*.local.json` is gitignored at repo level.** Claude Code writes
  credentials into permission-allowlist strings where they don't look like secrets.
  Never rely on a global `~/.config/git/ignore` — it doesn't travel with a clone.
- **CI is green on `main`** (`security`, `lint-and-test`, `e2e`) after the billing
  outage was resolved. See the CI section above for the duration-is-the-diagnostic
  rule and the audit split.
- **Licensing corrected**: `LICENSE` / `CONTENT-LICENSE.md` no longer make a blanket
  CC BY 4.0 claim (they now carry the per-book table), credits are method-based, and
  bundled fonts have their licences shipped. See Attribution & Licensing above.
- Sister-repo state: efni is public too, `main` green except **C2** — two Playwright
  specs red since 2026-07-12 (synthetic segment IDs 404'd by the SR-OOS-2 backstop).
  Tracked in efni's follow-up campaign register; no vefur action.

### Earlier (June 2026)

- **`main`**: fully remediated per the June 2026 audit (`docs/code-review-2026-06.md`) — all high-severity findings closed; practice-problem tracking wired to the quiz store; CI gates `feature/**` branches. Content-pipeline overlay work also landed on main June 15–17 (faithful-on-mt-preview overlay + MT banner, rollup gating by chapter completeness / `rollups-complete` marker, long-form section-slug routing); mechanics are documented in the Build Scripts and Routing sections above.
- **`feature/reader-v1.1`** (→ v1.1.0): reader plan P0 — narrow measure default, predict-first ratings, free-recall prompt (`recall` store, `RecallPrompt`), hybrid pagination (`utils/paginate.ts`, `PagedReaderControls`, `readingMode` setting). Gated on manual QA batches D–E (`docs/manual-qa-2026-06.md`).
- **`feature/reader-v1.2`** (→ v1.2.0, after v1.1.0): reader plan P1 — Kvörðun calibration tab (`CalibrationTab`), pre-questions (`PreQuestionPrompt`), one-tap cloze cards (`utils/cloze.ts`), Atkinson Hyperlegible + theme/typography corrections. Gated on QA batch G.
- **Planned**: reader plan P2.1–P2.3 (progress label, spaced-review surfacing, recall-review tab); P3 AI tutor deferred pending classroom feedback.
- Authoritative plan/status: `docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md` (update it when the release branches merge).

## Migration Note

Migrated from React to SvelteKit in January 2025. Original React code in `archive/react-v1` branch.
