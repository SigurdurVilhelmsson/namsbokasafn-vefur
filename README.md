# Námsbókasafn (Textbook Library)

A web-based reader for Icelandic translations of [OpenStax](https://openstax.org/) educational textbooks. Students and teachers can read translated chemistry chapters, study with spaced-repetition flashcards, look up terms in an integrated glossary, and track their reading progress — all offline-capable as a PWA. The UI is in Icelandic; the codebase is in English.

## About

Iceland's small language community means that high-quality science textbooks in Icelandic are scarce and expensive. Námsbókasafn takes freely-licensed OpenStax textbooks (starting with Chemistry 2e), translates them into Icelandic, and presents them in a modern web reader with built-in study tools.

The reader is a static SvelteKit site with no backend — all user state (progress, bookmarks, flashcard history) lives in localStorage. Content is pre-rendered HTML produced by a translation pipeline in the sister repository [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni).

This is an active open educational resource (OER) project. The code is MIT-licensed and the translated content is CC BY 4.0. If you're working on similar textbook translation projects for other languages, this codebase is designed to be forked and adapted.

### Available books

| Book                                     | Status      | Progress          |
| ---------------------------------------- | ----------- | ----------------- |
| **Efnafræði** (Chemistry 2e)             | Available   | 21 of 21 chapters |
| **Líffræði** (Biology 2e)                | In progress | 2 chapters        |
| **Lífræn efnafræði** (Organic Chemistry) | Preview     | 1 chapter         |
| **Örverufræði** (Microbiology)           | Preview     | 1 chapter         |
| **Eðlisfræði** (Physics)                 | Preview     | 1 chapter         |

## Demo / Live Version

**[https://namsbokasafn.is](https://namsbokasafn.is)**

## Tech Stack

- **Runtime:** Node.js >= 20 (see `.nvmrc`)
- **Framework:** SvelteKit 2 + Svelte 5, TypeScript 6
- **Build:** Vite 8, `@sveltejs/adapter-static` → outputs to `build/`
- **Styling:** Tailwind CSS 4 + PostCSS
- **Math:** MathJax (pre-rendered SVG in content HTML)
- **Search:** Fuse.js (client-side full-text search)
- **PWA:** `@vite-pwa/sveltekit` with Workbox (offline-first)
- **Testing:** Vitest (370+ unit tests) + Playwright (E2E)
- **CI:** GitHub Actions (lint, test, build, security audit)
- **Linting:** ESLint + Prettier + svelte-check, Husky pre-commit hooks

## Features

- **Textbook reader** — Clean reading layout for long study sessions, light/dark theme, adjustable font size
- **Flashcards (SRS)** — Spaced repetition using the SM-2 algorithm (`src/lib/utils/srs.ts`)
- **Glossary** — Per-book terminology lookup with Icelandic alphabetical sorting
- **Reading progress** — Per-section read detection, completion tracking, bookmarks, continue-where-you-left-off
- **Guided study sessions** — Planner with review/reading/practice/reflect phases (`/nam`), study analytics (`/greining`), learning objectives with confidence ratings
- **Search** — Full-text search across all content (Ctrl/Cmd+K)
- **Periodic table** — Interactive 118-element table with detailed info
- **Adaptive practice** — In-text practice problems with self-assessment feed an adaptive quiz (`/prof`) and spaced review, with per-problem mastery tracking
- **Annotations** — Text highlights and notes with export
- **PWA** — Works offline after first visit, installable as an app
- **Responsive** — Designed for phones, tablets, and desktops

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20 (use `nvm use` — `.nvmrc` is included)
- npm

## Setup

### 1. Clone and install

```bash
git clone https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur.git
cd namsbokasafn-vefur
npm install
```

### 2. Sync content from sister repo

The textbook content lives in the [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni) repo and is gitignored here. To populate `static/content/`:

```bash
git clone https://github.com/SigurdurVilhelmsson/namsbokasafn-efni.git ../namsbokasafn-efni
node scripts/sync-content.js --source ../namsbokasafn-efni
node scripts/generate-toc.js
```

The CI pipeline does this automatically on every build.

### 3. Run (development)

```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Build

```bash
npm run build       # Production build to build/
npm run preview     # Preview the build locally at http://localhost:4173
```

### 5. Environment variables (optional)

The app works fully without environment variables for local development. In production, `.env.production` contains:

| Variable             | Purpose                                                              |
| -------------------- | -------------------------------------------------------------------- |
| `VITE_TTS_PROXY_URL` | Text-to-speech proxy endpoint (Cloudflare Worker)                    |
| `VITE_API_URL`       | Backend API URL for editorial features (`ritstjorn.namsbokasafn.is`) |

These are public URLs, not secrets.

## Server Deployment

The production site is a static build served by nginx on a Linode Ubuntu server.

- **Build output:** `build/` (SvelteKit static adapter with SPA fallback)
- **Server path:** `/var/www/namsbokasafn-vefur/build`
- **Domain:** `namsbokasafn.is`
- **Nginx:** `/etc/nginx/sites-available/namsbokasafn.is`
- **SSL:** Let's Encrypt via certbot (auto-renewal)
- **No backend** — all state is client-side in localStorage

### Deploy

CI (GitHub Actions) gates every push and PR — on `main` and the
`feature/**` integration branches it checks out both repos, syncs content,
and runs lint, type-check, unit tests, the production build, and Playwright
E2E. **CI does not deploy.**

Deployment runs via the separate **Deploy workflow** (`deploy.yml`):
triggered manually from the Actions tab or by pushing a release tag
(`v*.*.*`), it re-verifies the commit and rsyncs the build to the server
over a directory-restricted SSH key. One-time setup and the security model
are documented in [docs/guides/deployment.md](docs/guides/deployment.md).
Manual fallback from a machine with server access:

```bash
npm run build
rsync -avz --delete --exclude=downloads/ build/ siggi@kvenno.app:/var/www/namsbokasafn-vefur/build/
```

See [docs/guides/deployment.md](docs/guides/deployment.md) for the full deployment guide including nginx configuration, SSL setup, and maintenance procedures.

## Project Structure

```
namsbokasafn-vefur/
├── src/
│   ├── routes/                 # SvelteKit file-based routing
│   │   ├── +page.svelte        # Book catalog (landing page)
│   │   └── [bookSlug]/         # Dynamic book routes
│   │       ├── kafli/          # Chapter reading view
│   │       ├── ordabok/        # Glossary
│   │       ├── minniskort/     # Flashcards
│   │       ├── lotukerfi/      # Periodic table
│   │       └── prof/           # Quizzes
│   └── lib/
│       ├── components/         # Svelte components
│       ├── stores/             # State management (localStorage-backed)
│       ├── actions/            # Svelte DOM actions
│       ├── types/              # TypeScript interfaces
│       └── utils/              # Utilities (SRS algorithm, content loading)
├── static/content/             # Book data (gitignored — synced from sister repo)
├── scripts/                    # Content sync, TOC generation, validation
├── e2e/                        # Playwright E2E tests
├── docs/                       # Guides, architecture, reference
└── nginx-config-example.conf   # Production nginx config
```

### Routes

| Path                                 | Page                 |
| ------------------------------------ | -------------------- |
| `/`                                  | Book catalog         |
| `/:bookSlug`                         | Book home page       |
| `/:bookSlug/kafli/:chapter`          | Chapter overview     |
| `/:bookSlug/kafli/:chapter/:section` | Section reading view |
| `/:bookSlug/ordabok`                 | Glossary             |
| `/:bookSlug/minniskort`              | Flashcards           |
| `/:bookSlug/lotukerfi`               | Periodic table       |
| `/:bookSlug/prof`                    | Quizzes              |

## Two-Repository Workflow

This project works together with [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni) (the content/translation pipeline):

- **Content bugs** (wrong translations, formatting issues) → fix in namsbokasafn-efni, then re-sync
- **Reader bugs** (rendering, UI, components) → fix here
- After syncing new content, regenerate the table of contents: `node scripts/generate-toc.js`

## Common Tasks

### Run tests

```bash
npm run test              # Vitest unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:e2e          # Playwright E2E tests
npm run test:e2e:ui       # E2E with interactive UI
```

### Code quality

```bash
npm run check             # SvelteKit sync + TypeScript check
npm run lint              # ESLint
npm run format            # Prettier
```

### Content management

```bash
node scripts/sync-content.js --source ../namsbokasafn-efni   # Sync content
node scripts/generate-toc.js                                  # Regenerate TOC
npm run validate-content                                      # Validate structure
```

### Add a new book

See [docs/guides/adding-books.md](docs/guides/adding-books.md) for detailed instructions.

## Contributing

Contributions are welcome — whether you're fixing a bug, improving the reader, or adapting this for another language.

- **Bug reports and ideas:** [Open an issue](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/issues)
- **Development guide:** [docs/guides/contributing.md](docs/guides/contributing.md)
- **UI language:** Icelandic. Code and comments are in English.

## License

### Dual license

1. **Application code** — [MIT License](LICENSE)
2. **Educational content** (`static/content/`) — a **per-book** Creative Commons licence, not one blanket licence: Efnafræði, Líffræði and Örverufræði are CC BY 4.0, while **Lífræn efnafræði and Eðlisfræði are CC BY-NC-SA 4.0** (no commercial use, ShareAlike required). The authoritative per-book values live in the sister repo, `namsbokasafn-efni/books/<slug>/book-config.json`; content is synced in at build time and is not tracked here.
3. **Bundled fonts** (`static/fonts/`, `static/assets/fonts/`) — third-party, not the MIT grant above: Bricolage Grotesque, Literata, JetBrains Mono and OpenDyslexic under [SIL OFL-1.1](static/fonts/OFL.txt), KaTeX under [MIT](static/assets/fonts/LICENSE-KaTeX.txt). Details: [static/fonts/LICENSES.md](static/fonts/LICENSES.md).

### Content attribution

The textbook content is an Icelandic translation of open textbooks from [OpenStax](https://openstax.org/).

**Credit follows the method, not the job title** — the same rule the reader
already enforces in code (`src/lib/data/bookCredits.ts`). For most books the
first draft is machine translation (Erlendur, Miðeind) which people then edit,
so the machine is credited as the translator and the people are credited for
**ritstjórn** and **yfirlestur**. Chapters marked _forskoðun_ are raw machine
translation with no reviewer claim. Biology is the exception — it is
human-translated.

| Hlutverk                         |                                           |
| -------------------------------- | ----------------------------------------- |
| Verkefnastjóri og ritstjórn      | Sigurður Einar Vilhelmsson                |
| Yfirlestur og málfar í efnafræði | Guðrún Ingibjörg Stefánsdóttir            |
| Þýðing og yfirlestur í líffræði  | Þórhallur Halldórsson                     |
| Vélþýðing                        | Erlendur ([Miðeind](https://mideind.is/)) |

**Chemistry 2e** — Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson.
Icelandic edition: machine translation with human editorial review. CC BY 4.0.

## Status

Actively maintained. The reader is stable and in use. New chapters are added as translations are completed in the sister repo.

### Current development (June 2026)

A full codebase audit and remediation landed on `main` in June 2026 — see
[`docs/code-review-2026-06.md`](docs/code-review-2026-06.md) for the findings
and [`docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md`](docs/plans/2026-06-10-audit-remediation-and-reader-v1.1-roadmap.md)
for the roadmap and what shipped.

Two release branches implement the research-driven reader plan
([`docs/plans/2026-04-22-screen-vs-paper-reader-plan.md`](docs/plans/2026-04-22-screen-vs-paper-reader-plan.md)),
each gated on the manual QA in [`docs/manual-qa-2026-06.md`](docs/manual-qa-2026-06.md):

- **`feature/reader-v1.1`** (→ v1.1.0): narrow default measure,
  predict-first flashcard ratings, free-recall prompts on section
  completion, and hybrid viewport-aware pagination with a
  continuous-scroll fallback.
- **`feature/reader-v1.2`** (→ v1.2.0, after v1.1.0): confidence-calibration
  analytics tab, pre-questions on section load, one-tap cloze cards from
  highlights, and typography corrections (Atkinson Hyperlegible, OS
  color-scheme default).

Planned next: spaced-review surfacing in the study planner, a recall-review
tab, and a bounded progress label (reader plan P2); a Socratic AI tutor is
deferred pending classroom feedback (P3).

## Related Projects

- [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni) — Translation pipeline and editorial workflow server
- [kvenno-app](https://github.com/SigurdurVilhelmsson/kvenno-app) — Chemistry games and lab report grading platform
