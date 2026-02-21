# Námsbókasafn (Textbook Library)

A web-based reader for Icelandic translations of [OpenStax](https://openstax.org/) educational textbooks. Students and teachers can read translated chemistry chapters, study with spaced-repetition flashcards, look up terms in an integrated glossary, and track their reading progress — all offline-capable as a PWA. The UI is in Icelandic; the codebase is in English.

## About

Iceland's small language community means that high-quality science textbooks in Icelandic are scarce and expensive. Námsbókasafn takes freely-licensed OpenStax textbooks (starting with Chemistry 2e), translates them into Icelandic, and presents them in a modern web reader with built-in study tools.

The reader is a static SvelteKit site with no backend — all user state (progress, bookmarks, flashcard history) lives in localStorage. Content is pre-rendered HTML produced by a translation pipeline in the sister repository [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni).

This is an active open educational resource (OER) project. The code is MIT-licensed and the translated content is CC BY 4.0. If you're working on similar textbook translation projects for other languages, this codebase is designed to be forked and adapted.

### Available books

| Book                         | Status    | Progress         |
| ---------------------------- | --------- | ---------------- |
| **Efnafræði** (Chemistry 2e) | Available | 4 of 21 chapters |
| **Líffræði** (Biology 2e)    | Planned   | —                |

## Demo / Live Version

**[https://namsbokasafn.is](https://namsbokasafn.is)**

## Tech Stack

- **Runtime:** Node.js 22 (see `.nvmrc`)
- **Framework:** SvelteKit 2 + Svelte 5, TypeScript 5.7
- **Build:** Vite 7, `@sveltejs/adapter-static` → outputs to `build/`
- **Styling:** Tailwind CSS 4 + PostCSS
- **Math:** KaTeX (pre-rendered in content HTML)
- **Search:** Fuse.js (client-side full-text search)
- **PWA:** `@vite-pwa/sveltekit` with Workbox (offline-first)
- **Testing:** Vitest (173+ unit tests) + Playwright (E2E)
- **CI:** GitHub Actions (lint, test, build, security audit)
- **Linting:** ESLint + Prettier + svelte-check, Husky pre-commit hooks

## Features

- **Textbook reader** — Clean reading layout for long study sessions, light/dark theme, adjustable font size
- **Flashcards (SRS)** — Spaced repetition using the SM-2 algorithm (`src/lib/utils/srs.ts`)
- **Glossary** — Per-book terminology lookup with Icelandic alphabetical sorting
- **Reading progress** — Chapter completion tracking, bookmarks
- **Search** — Full-text search across all content (Ctrl/Cmd+K)
- **Periodic table** — Interactive 118-element table with detailed info
- **Quizzes** — Chapter-based practice questions
- **Annotations** — Text highlights and notes with export
- **PWA** — Works offline after first visit, installable as an app
- **Responsive** — Designed for phones, tablets, and desktops

## Prerequisites

- [Node.js](https://nodejs.org/) 22 (use `nvm use` — `.nvmrc` is included)
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
- **Server path:** `/var/www/efnafraedi-lesari/dist`
- **Domain:** `namsbokasafn.is` (formerly `efnafraedi.app`)
- **Nginx:** `/etc/nginx/sites-available/efnafraedi.app`
- **SSL:** Let's Encrypt via certbot (auto-renewal)
- **No backend** — all state is client-side in localStorage

### Deploy

Deployment is handled by GitHub Actions CI. On push to `main`:

1. Checks out both this repo and `namsbokasafn-efni`
2. Syncs content
3. Runs lint, type-check, and unit tests
4. Builds with content validation
5. Runs Playwright E2E tests
6. Deploys static output to the server

For manual deployment:

```bash
npm run build
rsync -avz --delete build/ siggi@kvenno.app:/var/www/efnafraedi-lesari/dist/
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
2. **Educational content** (`static/content/`) — [CC BY 4.0](CONTENT-LICENSE.md)

### Content attribution

The textbook content is an Icelandic translation of open textbooks from [OpenStax](https://openstax.org/).

**Chemistry 2e** — Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson
Translated by Sigurdur E. Vilhelmsson. Licensed under CC BY 4.0.

## Status

Actively maintained. The reader is stable and in use. New chapters are added as translations are completed in the sister repo.

## Related Projects

- [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni) — Translation pipeline and editorial workflow server
- [kvenno-app](https://github.com/SigurdurVilhelmsson/kvenno-app) — Chemistry games and lab report grading platform
