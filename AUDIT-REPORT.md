# Námsbókasafn — Technical Audit Report

**Date:** 2026-02-11
**Scope:** Tech stack, features/functionality, security, testing, build infrastructure
**Codebase:** ~24,700 lines across 97 TypeScript/Svelte source files

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack Audit](#2-tech-stack-audit)
3. [Features & Functionality Audit](#3-features--functionality-audit)
4. [Security Audit](#4-security-audit)
5. [Testing & Build Scripts Audit](#5-testing--build-scripts-audit)
6. [Consolidated Findings](#6-consolidated-findings)
7. [Development Plan](#7-development-plan)

---

## 1. Executive Summary

Námsbókasafn is a well-structured SvelteKit static site serving Icelandic translations of OpenStax textbooks with integrated study tools. The codebase reflects an intentional, pragmatic architecture: no backend, localStorage for all state, static hosting on Linode via nginx.

### Overall Grades

| Area          | Grade  | Summary                                                                       |
| ------------- | ------ | ----------------------------------------------------------------------------- |
| Tech Stack    | **A-** | Modern, up-to-date dependencies; legacy markdown pipeline is the main drag    |
| Features      | **B+** | Comprehensive feature set; some monolithic components and stores              |
| Security      | **B**  | Good posture for a static site; CSP and CI action pinning need attention      |
| Testing       | **C**  | Core stores tested; large gaps in components, content loading, and E2E        |
| Build Scripts | **C+** | Functional but inconsistent error handling; one safety concern in sync script |

### Top 5 Priorities

1. Remove `'unsafe-eval'` from CSP headers
2. Fix `rm -rf` safety issue in `sync-content.js`
3. Add localStorage quota monitoring
4. Expand test coverage (content loading, components, E2E flows)
5. Unify YAML parsing across build scripts

---

## 2. Tech Stack Audit

### 2.1 Core Framework

| Technology | Version  | Status                        |
| ---------- | -------- | ----------------------------- |
| SvelteKit  | 2.50.2   | Current                       |
| Svelte     | 5.50.0   | Current (Svelte 5 with runes) |
| TypeScript | 5.7.0    | Current, strict mode enabled  |
| Vite       | 7.3.1    | Current                       |
| Node.js    | 22 (LTS) | Current                       |

All core framework dependencies are at recent stable versions. No outdated major versions detected.

### 2.2 Styling

| Technology   | Version                  | Notes                               |
| ------------ | ------------------------ | ----------------------------------- |
| Tailwind CSS | 4.1.18                   | v4 (latest), PostCSS-first approach |
| PostCSS      | via @tailwindcss/postcss | Minimal config                      |
| autoprefixer | 10.4.24                  | Vendor prefixes                     |

Dark mode uses the `class` strategy. Custom font families include `dyslexic` (OpenDyslexic) for accessibility.

### 2.3 Content Pipeline (Legacy — Scheduled for Removal)

| Package          | Version | Purpose                   |
| ---------------- | ------- | ------------------------- |
| unified          | 11.0.0  | Text processing ecosystem |
| remark-parse     | 11.0.0  | Markdown parser           |
| remark-rehype    | 11.0.0  | Remark → Rehype bridge    |
| remark-gfm       | 4.0.0   | GitHub Flavored Markdown  |
| remark-math      | 6.0.0   | Math expression parsing   |
| remark-directive | 4.0.0   | Custom directives         |
| rehype-mathjax   | 7.1.0   | MathJax rendering         |
| rehype-slug      | 6.0.0   | Heading slugs             |
| rehype-stringify | 10.0.0  | HTML stringification      |
| unist-util-visit | 5.1.0   | Tree traversal            |
| gray-matter      | 4.0.3   | YAML frontmatter          |

**12 dependencies** exist solely for the markdown pipeline. These should be removed when Phase D migration (all `.md` → `.html`) completes. This will reduce install size, build time, and attack surface.

### 2.4 Other Dependencies

| Package             | Version | Purpose               |
| ------------------- | ------- | --------------------- |
| fuse.js             | 7.0.0   | Fuzzy search          |
| date-fns            | 4.1.0   | Date utilities        |
| @vite-pwa/sveltekit | 1.1.0   | PWA support           |
| workbox-window      | 7.4.0   | Service worker client |

### 2.5 Dev Dependencies

| Package                  | Version | Purpose                  |
| ------------------------ | ------- | ------------------------ |
| @sveltejs/adapter-static | 3.0.10  | Static site generation   |
| Vitest                   | 4.0.18  | Unit testing             |
| Playwright               | 1.58.2  | E2E testing              |
| ESLint                   | 9.39.2  | Linting (flat config)    |
| Prettier                 | 3.8.1   | Formatting               |
| Husky                    | 9.1.7   | Git hooks                |
| lint-staged              | 16.2.7  | Staged file linting      |
| jsdom                    | 28.0.0  | DOM simulation for tests |

**Notable:** A `cookie: ^0.7.0` override in package.json addresses a known nested dependency vulnerability.

### 2.6 Build & Deploy Configuration

- **Adapter:** `@sveltejs/adapter-static` with SPA fallback (`index.html`), `strict: false` to allow gitignored content
- **PWA:** Workbox with NetworkFirst for content, CacheFirst for images/fonts, 3MB cache limit (for MathJax bundles)
- **CI:** GitHub Actions — lint, type-check, unit tests, E2E, `npm audit` (separate security job)
- **Deploy:** SCP to Linode → nginx reload (via `appleboy/scp-action@v1` and `appleboy/ssh-action@v1`)
- **Pre-commit:** Husky + lint-staged (ESLint --fix, Prettier)

### 2.7 Tech Stack Findings

| ID  | Finding                                                                | Severity                             |
| --- | ---------------------------------------------------------------------- | ------------------------------------ |
| T1  | Legacy markdown pipeline adds 12 dependencies                          | Low (planned removal)                |
| T2  | ESLint config is lenient (many rules set to WARN)                      | Low                                  |
| T3  | `strict: false` in adapter config is intentional but worth documenting | Info                                 |
| T4  | No Dockerfile — deployment is bare-metal SCP                           | Info (appropriate for project scale) |
| T5  | Dependabot configured for weekly updates                               | Positive                             |

---

## 3. Features & Functionality Audit

### 3.1 Component Inventory (27 components, ~6,500 lines)

#### High-Complexity Components

| Component                  | Lines | Concern                                                                  |
| -------------------------- | ----- | ------------------------------------------------------------------------ |
| **TextHighlighter.svelte** | 518   | Complex DOM text anchoring with v1→v2 migration logic; difficult to test |
| **PeriodicTable.svelte**   | 458   | DOM-heavy; missing keyboard navigation (a11y gap)                        |
| **SearchModal.svelte**     | 452   | Web worker communication; state management for search lifecycle          |
| **AdaptiveQuiz.svelte**    | 432   | Session management, answer tracking, mastery calculation                 |
| **Sidebar.svelte**         | 410   | Recursive navigation tree for all chapters/sections; no virtualization   |
| **SettingsModal.svelte**   | 389   | Keyboard shortcut binding UI; many settings to persist                   |

#### Component Quality Assessment

**Strengths:**

- Clear separation of concerns (layout, analytics, study tools)
- Proper Svelte lifecycle management in most components
- Icelandic UI text throughout with aria-labels
- Modals implement `aria-modal="true"` and focus management

**Issues:**

- No skip-to-content link on any page
- `SelectionPopup` doesn't trap focus or handle viewport bounds
- `PeriodicTable` lacks keyboard navigation
- Sidebar renders all 100+ sections even when collapsed (O(n) re-render)
- Several components don't validate prop types

### 3.2 Svelte Actions (8 actions, ~2,065 lines)

| Action               | Lines | Purpose                                                  | Quality                                             |
| -------------------- | ----- | -------------------------------------------------------- | --------------------------------------------------- |
| practiceProblems.ts  | 375   | Interactive problem UI (hints, answers, self-assessment) | Good structure; inline CSS strings hard to maintain |
| answerLinks.ts       | 364   | Answer key link interception & display                   | Functional                                          |
| keyboardShortcuts.ts | 348   | Multi-key sequences, customizable bindings               | Complex state machine; no unit tests                |
| figureViewer.ts      | 280   | Lightbox with zoom/pan/drag                              | Good UX; stores cleanup on DOM node                 |
| crossReferences.ts   | 262   | Hover tooltips for cross-refs                            | Global singleton tooltip; fragile cleanup           |
| bionicReading.ts     | 238   | Dyslexia-friendly bold text patterns                     | Functional                                          |
| equations.ts         | 203   | LaTeX copy, zoom modal                                   | Clean lifecycle                                     |
| readDetection.ts     | 106   | IntersectionObserver for read tracking                   | Clean, minimal                                      |

**Key gap:** Zero unit tests for any action. The `keyboardShortcuts` multi-key state machine and `practiceProblems` DOM builder are both complex enough to warrant dedicated tests.

### 3.3 State Management (11 stores, ~3,400 lines)

All stores follow a consistent pattern: Svelte `writable` + `subscribe` → localStorage persistence. No backend API calls for state reads.

| Store         | Lines | Concern                                                        |
| ------------- | ----- | -------------------------------------------------------------- |
| quiz.ts       | 550   | Monolithic — mastery tracking, sessions, stats all in one      |
| flashcard.ts  | 421   | Mixes decks, study records, streaks, daily stats               |
| offline.ts    | 403   | Async cache API; potential race conditions in `removeBook()`   |
| reference.ts  | 385   | Well-designed precomputed vs. runtime modes                    |
| analytics.ts  | 350+  | Sessions, goals, activity log, hourly/daily/weekly stats       |
| reader.ts     | 293   | Section-based progress; uses `get()` instead of derived stores |
| objectives.ts | 243   | Learning objectives tracking                                   |
| settings.ts   | 176   | Clean and well-factored                                        |
| annotation.ts | ~180  | v1→v2 migration logic adds complexity                          |
| glossary.ts   | 141   | Simple term lookup                                             |
| index.ts      | 105   | Re-exports                                                     |

**Key issues:**

- **No localStorage quota monitoring.** The ~5-10MB localStorage limit can crash the app silently when exceeded. With flashcards, annotations, analytics, quiz attempts, and bookmarks all persisting, heavy users could hit this limit.
- **No cross-tab synchronization.** Two tabs can overwrite each other's state.
- **Flashcard streak uses string date comparison** (`getTodayDateString()`). Timezone bugs possible if user crosses midnight during study.
- **No data validation on load.** Stores merge `JSON.parse(stored)` with defaults via spread, but don't validate structure. Corrupted localStorage data could silently break features.

### 3.4 Utilities (9 files, ~1,500 lines)

| Utility             | Lines | Quality                                                                      |
| ------------------- | ----- | ---------------------------------------------------------------------------- |
| contentLoader.ts    | 300+  | Good caching; offline detection uses unreliable `navigator.onLine`           |
| srs.ts              | 100+  | Correct SM-2 implementation; `startOfDay()` assumes UTC (timezone risk)      |
| textAnchor.ts       | 200+  | Fuzzy matching with 3-strategy fallback; O(n) full-text search per highlight |
| searchIndex.ts      | 250+  | Good Fuse.js integration; HTML escaping for XSS prevention                   |
| api.ts              | —     | Analytics tracking via `sendBeacon`; silent failure (appropriate)            |
| storeHelpers.ts     | —     | Date helpers, ID generation                                                  |
| storageMigration.ts | —     | React→Svelte localStorage key migration                                      |

### 3.5 Route Analysis

| Route                           | Purpose               | Notes                                                              |
| ------------------------------- | --------------------- | ------------------------------------------------------------------ |
| `/`                             | Book catalog          | 28KB+; inline SVG decorations; fetches `toc.json` per book on load |
| `/:bookSlug`                    | Book overview         | Chapter list with progress; loading skeleton                       |
| `/:bookSlug/kafli/:ch/:section` | **Main reading view** | Scroll restoration, read detection, annotations, share/print       |
| `/:bookSlug/ordabok`            | Glossary              | Term lookup with filtering                                         |
| `/:bookSlug/minniskort`         | Flashcards            | SM-2 spaced repetition study                                       |
| `/:bookSlug/prof`               | Quizzes               | Adaptive quiz with mastery tracking                                |
| `/:bookSlug/lotukerfi`          | Periodic table        | Interactive element browser                                        |
| `/:bookSlug/svarlykill/:ch`     | Answer keys           | Chapter-specific answer key                                        |
| `/:bookSlug/greining`           | Analytics             | Reading patterns, flashcard stats, goals                           |
| `/:bookSlug/bokamerki`          | Bookmarks             | Saved positions                                                    |
| `/:bookSlug/markmid`            | Learning objectives   | Objective tracking                                                 |
| `/:bookSlug/vidauki/:letter`    | Appendices            | Supplementary material                                             |
| `/feedback`                     | Feedback form         | Mailto-based                                                       |
| `/for-teachers`                 | Teacher resources     | Static info page                                                   |

**Reading view issues:**

- Multiple `setTimeout` calls (`shareTimeout`, `completionTimeout`, `continuePromptTimeout`) without tracking — potential memory leak if component is destroyed quickly
- No scroll debouncing — `handleScroll` fires on every scroll event
- `reader.setScrollProgress()` called on every scroll without validation

### 3.6 Features & Functionality Findings

| ID  | Finding                                                      | Severity              |
| --- | ------------------------------------------------------------ | --------------------- |
| F1  | No localStorage quota monitoring — app can crash when full   | High                  |
| F2  | No cross-tab state synchronization                           | Medium                |
| F3  | Highlight restoration is O(n) per annotation — scales poorly | Medium                |
| F4  | Sidebar re-renders all sections even when collapsed          | Medium                |
| F5  | Multiple orphaned `setTimeout` calls in reading view         | Medium                |
| F6  | SM-2 `startOfDay()` assumes UTC — timezone bugs possible     | Medium                |
| F7  | No data validation on localStorage load                      | Medium                |
| F8  | PeriodicTable missing keyboard navigation                    | Medium (a11y)         |
| F9  | No skip-to-content link                                      | Medium (a11y)         |
| F10 | `crossReferences.ts` uses global singleton tooltip — fragile | Low                   |
| F11 | `practiceProblems.ts` uses inline CSS strings                | Low (maintainability) |

---

## 4. Security Audit

### 4.1 Threat Model Context

This is a **static educational site** with **no backend** (except optional analytics). All user state is in localStorage. Content is pre-rendered from a trusted internal pipeline. The primary attack vectors are:

1. XSS via rendered content
2. CSP misconfiguration
3. Supply chain attacks via dependencies or CI
4. Data integrity in localStorage

### 4.2 XSS Analysis

#### `{@html}` Usage

**Primary location:** `src/lib/components/MarkdownRenderer.svelte:63`

```svelte
{@html html}
```

Content is rendered as raw HTML. The content comes from pre-rendered files in `static/content/` (synced from the `namsbokasafn-efni` pipeline). This is **trusted content** — not user input.

**Risk:** Low for normal operation. Medium if the content pipeline is compromised or content files are modified in transit.

**ESLint:** The `svelte/no-at-html-tags` rule is explicitly disabled in `eslint.config.js` (expected — this is the core content renderer).

#### `innerHTML` Usage (13+ instances)

All `innerHTML` assignments found in action files contain **hardcoded static strings** (SVG icons, HTML templates). No user-controlled content is inserted via `innerHTML`.

**Proper escaping exists:** `crossReferences.ts` implements HTML escaping at line 165-169 and applies it to all user-visible reference labels and previews.

**Assessment:** **Secure.** No user input flows into `innerHTML` or `{@html}`.

### 4.3 Content Loading Security

**`contentLoader.ts`** constructs all fetch URLs from template literals with known path segments:

```typescript
response = await fetchFn(
  `/content/${bookSlug}/chapters/${chapterSlug}/${sectionFile}`,
);
```

- No user input in fetch URLs
- HTML metadata extraction uses safe JSON parsing with try-catch
- Markdown frontmatter parsing uses regex (safe)

**Assessment:** **Secure.**

### 4.4 CSP (Content Security Policy)

**Location:** `nginx-config-example.conf:57`

```nginx
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://tutor.efnafraedi.app;" always;
```

| Directive     | Value                                  | Issue                                                      |
| ------------- | -------------------------------------- | ---------------------------------------------------------- |
| `script-src`  | `'self' 'unsafe-inline' 'unsafe-eval'` | `'unsafe-eval'` is **not needed** for SvelteKit/Vite       |
| `style-src`   | `'self' 'unsafe-inline'`               | Typical for Svelte/Tailwind; nonce-based would be stronger |
| `default-src` | `'self' https:`                        | Good                                                       |
| `connect-src` | `'self' https://tutor.efnafraedi.app`  | Good — restrictive                                         |

**`'unsafe-eval'` is the most significant security finding.** It allows `eval()` and `Function()` execution, which is unnecessary for this application and significantly weakens XSS protection.

### 4.5 Other Security Headers

Present in nginx config:

- `X-Frame-Options: SAMEORIGIN` — Prevents clickjacking
- `X-Content-Type-Options: nosniff` — Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` — Legacy XSS filter (deprecated but harmless)
- `Referrer-Policy: no-referrer-when-downgrade` — Standard
- SSL: TLSv1.2 + TLSv1.3, strong ciphers, OCSP stapling

**Missing:**

- `Permissions-Policy` header (to restrict access to camera, microphone, geolocation, etc.)
- `Strict-Transport-Security` (HSTS) — should be present for HTTPS-only site

### 4.6 Secrets & Credentials

- `.env.production` contains only public-facing URLs (TTS proxy, API endpoint) — no secrets
- `.gitignore` properly excludes `.env`, `.env.local`, `.env.*.local`
- No hardcoded API keys, tokens, passwords, or Bearer tokens found in source code
- GitHub Actions secrets are properly parameterized (`${{ secrets.LINODE_HOST }}`, etc.)

**Assessment:** **Secure.**

### 4.7 GitHub Actions Security

**Action pinning:** All actions use **major version tags** (e.g., `actions/checkout@v6`), not commit SHAs. This means a compromised or force-pushed tag could inject malicious code.

```yaml
# Current (vulnerable to tag manipulation):
uses: actions/checkout@v6

# Recommended (immutable):
uses: actions/checkout@<commit-sha>  # v6.x.x
```

The third-party actions `appleboy/scp-action@v1` and `appleboy/ssh-action@v1` are particularly important to pin since they handle SSH keys and deployment credentials.

**CI security job:** Runs `npm audit --audit-level=high` — good practice.

### 4.8 localStorage Security

- All keys namespaced with `namsbokasafn:` prefix (prevents collisions)
- All reads use `JSON.parse()` with try-catch (safe)
- TypeScript interfaces validate structure via spread with defaults
- No sensitive data stored (highlights, progress, settings — not credentials)

**Assessment:** **Secure** for the use case. localStorage is intentional per CLAUDE.md.

### 4.9 PWA / Service Worker

- Workbox precaches client assets only
- Content uses NetworkFirst strategy (fresh deploys always picked up)
- No unsafe caching patterns
- Web manifest has proper scope

**Assessment:** **Secure.**

### 4.10 Security Findings

| ID  | Finding                                                                          | Severity   |
| --- | -------------------------------------------------------------------------------- | ---------- |
| S1  | CSP allows `'unsafe-eval'` in `script-src` — unnecessary and dangerous           | **High**   |
| S2  | GitHub Actions not pinned to commit SHAs (especially third-party deploy actions) | **Medium** |
| S3  | Missing `Permissions-Policy` header                                              | Low        |
| S4  | Missing `Strict-Transport-Security` (HSTS) header                                | Low        |
| S5  | `style-src 'unsafe-inline'` could be tightened with nonces                       | Low        |
| S6  | `connect-src` references `tutor.efnafraedi.app` — verify this is still needed    | Info       |
| S7  | `X-XSS-Protection` is deprecated (harmless but unnecessary)                      | Info       |
| S8  | Content rendered via `{@html}` trusts build pipeline — acceptable                | Info       |

---

## 5. Testing & Build Scripts Audit

### 5.1 Unit Test Coverage

**5 test files found** (~1,161 lines):

| Test File           | Lines | What It Covers                                             |
| ------------------- | ----- | ---------------------------------------------------------- |
| settings.test.ts    | 215   | Settings store: theme, font, sidebar, persistence          |
| flashcard.test.ts   | 373   | Flashcard store: SM-2 ratings, deck management, streaks    |
| reader.test.ts      | 250   | Reader store: progress tracking, bookmarks, scroll         |
| textAnchor.test.ts  | 203   | Text anchoring: serialize/deserialize, fallback strategies |
| searchIndex.test.ts | 120   | Search: XSS prevention, HTML escaping, query highlighting  |

**Test quality is good** where tests exist — proper localStorage isolation via `vi.resetModules()`, helper factories, both happy and edge paths.

#### Coverage Gaps

| Area                                 | Coverage | Risk                     |
| ------------------------------------ | -------- | ------------------------ |
| Stores (settings, reader, flashcard) | ~80%     | Low                      |
| Utilities (textAnchor, searchIndex)  | ~20%     | Medium                   |
| Content loading (contentLoader.ts)   | 0%       | **High**                 |
| Markdown pipeline                    | 0%       | **High** (until Phase D) |
| SRS algorithm (srs.ts)               | 0%       | Medium                   |
| Components                           | 0%       | Medium                   |
| Actions                              | 0%       | Medium                   |
| Annotation store                     | 0%       | Medium                   |
| Quiz store                           | 0%       | Medium                   |
| Analytics store                      | 0%       | Low                      |

**Estimated overall coverage: ~25%**

### 5.2 E2E Tests

**2 test files** (388 lines, 23 tests):

| Test File           | Tests | What It Covers                                                |
| ------------------- | ----- | ------------------------------------------------------------- |
| reader-flow.spec.ts | 14    | Catalog → book → chapter → section navigation, CSS validation |
| pwa.spec.ts         | 9     | Web manifest, service worker registration, theme colors       |

**E2E covers the core reading flow** but misses:

- Glossary, flashcards, quizzes, periodic table
- Search functionality
- Annotations/highlighting
- Theme/font switching
- Offline functionality
- Accessibility verification

### 5.3 Build Scripts

| Script              | Lines | Grade | Key Issue                                                                                          |
| ------------------- | ----- | ----- | -------------------------------------------------------------------------------------------------- |
| generate-toc.js     | 660   | B     | Custom YAML parser (not gray-matter); could diverge from other scripts                             |
| process-content.js  | 375   | B     | Good gray-matter usage; some regex patterns could be more robust                                   |
| validate-content.js | 671   | B-    | **Uses custom YAML parser instead of gray-matter** — can parse differently than process-content.js |
| sync-content.js     | 356   | C     | `rm -rf` with string interpolation on potentially unvalidated path                                 |
| check-status.mjs    | 203   | D     | References non-existent npm scripts (`type-check`, `format:check`)                                 |

#### Critical: `sync-content.js` Safety Issue

```javascript
// Lines 231-232
if (existsSync(bookDest)) {
  execSync(`rm -rf "${bookDest}"`, { stdio: "inherit" });
}
```

If `bookDest` is unset or malformed, this command is dangerous. Should use path validation and `fs.rmSync()` instead of shell `rm -rf`.

#### YAML Parsing Inconsistency

`generate-toc.js` and `validate-content.js` use **custom regex-based YAML parsers**, while `process-content.js` uses **gray-matter**. These can parse the same frontmatter differently — e.g., quoted values with colons, multiline values, or arrays. This is a latent bug.

### 5.4 Testing & Scripts Findings

| ID  | Finding                                                                 | Severity |
| --- | ----------------------------------------------------------------------- | -------- |
| Q1  | ~25% test coverage — large gaps in content loading, components, actions | High     |
| Q2  | `sync-content.js` uses `rm -rf` via shell string interpolation          | High     |
| Q3  | YAML parsing inconsistency across build scripts                         | Medium   |
| Q4  | `check-status.mjs` references non-existent npm scripts                  | Medium   |
| Q5  | No test coverage reporting in CI                                        | Medium   |
| Q6  | Pre-commit hook doesn't run tests                                       | Low      |
| Q7  | E2E tests cover only 2 of 12+ routes                                    | Medium   |
| Q8  | No component tests at all                                               | Medium   |
| Q9  | No vitest coverage tool configured                                      | Low      |

---

## 6. Consolidated Findings

### All Findings by Severity

#### High

| ID  | Area     | Finding                                                           | Status                    |
| --- | -------- | ----------------------------------------------------------------- | ------------------------- |
| S1  | Security | CSP allows `'unsafe-eval'` — remove from nginx config             | **FIXED** (2026-02-11)    |
| Q2  | Scripts  | `sync-content.js` uses unsafe `rm -rf` via shell interpolation    | **FIXED** (2026-02-11)    |
| F1  | Stores   | No localStorage quota monitoring — app crashes silently when full | **FIXED** (2026-02-11)    |
| Q1  | Testing  | ~25% test coverage with critical gaps                             | **Improved** (2026-02-11) |

#### Medium

| ID  | Area       | Finding                                            | Status                    |
| --- | ---------- | -------------------------------------------------- | ------------------------- |
| S2  | Security   | GitHub Actions not pinned to commit SHAs           | **FIXED** (2026-02-11)    |
| F2  | Stores     | No cross-tab state synchronization                 | **FIXED** (2026-02-11)    |
| F3  | Utils      | Highlight restoration O(n) per annotation          | **FIXED** (2026-02-11)    |
| F4  | Components | Sidebar re-renders all sections when collapsed     | **ACCEPTED** (2026-02-11) |
| F5  | Routes     | Orphaned `setTimeout` calls in reading view        | **FIXED** (2026-02-11)    |
| F6  | Utils      | SM-2 `startOfDay()` assumes UTC — timezone risk    | **FIXED** (2026-02-11)    |
| F7  | Stores     | No data validation on localStorage load            | **FIXED** (2026-02-11)    |
| F8  | Components | PeriodicTable missing keyboard navigation          | **ACCEPTED** (2026-02-11) |
| F9  | Components | No skip-to-content link                            | **ACCEPTED** (2026-02-11) |
| Q3  | Scripts    | YAML parsing inconsistency across build scripts    | **FIXED** (2026-02-11)    |
| Q4  | Scripts    | `check-status.mjs` references non-existent scripts | **FIXED** (2026-02-11)    |
| Q7  | Testing    | E2E covers only 2 of 12+ routes                    | **Improved** (2026-02-11) |
| Q8  | Testing    | No component tests                                 | Open                      |

#### Low

| ID  | Area     | Finding                                           | Status                    |
| --- | -------- | ------------------------------------------------- | ------------------------- |
| S3  | Security | Missing `Permissions-Policy` header               | **FIXED** (2026-02-11)    |
| S4  | Security | Missing HSTS header                               | **FIXED** (2026-02-11)    |
| S5  | Security | `style-src 'unsafe-inline'` could use nonces      | Open                      |
| T1  | Stack    | 12 markdown pipeline dependencies pending removal | **READY** (2026-02-11)    |
| T2  | Stack    | ESLint config is lenient                          | **Improved** (2026-02-11) |
| F10 | Actions  | `crossReferences.ts` global singleton tooltip     | Open                      |
| F11 | Actions  | `practiceProblems.ts` inline CSS strings          | Open                      |
| Q5  | Testing  | No coverage reporting in CI                       | **Partial** (2026-02-11)  |
| Q6  | Testing  | Pre-commit hook doesn't run tests                 | Open                      |
| Q9  | Testing  | No vitest coverage tool configured                | **FIXED** (2026-02-11)    |

---

## 7. Development Plan

This plan is organized into four phases, prioritized by risk and impact. Each phase targets a mix of quick wins and deeper improvements.

### Phase 1: Security & Safety (1-2 weeks)

**Goal:** Address high-severity security and safety issues.

#### 1.1 Remove `'unsafe-eval'` from CSP (S1) — DONE (2026-02-11)

- ~~Edit `nginx-config-example.conf` to remove `'unsafe-eval'` from `script-src`~~
- Test that the production build loads correctly without it (pending deploy)
- Consider removing `'unsafe-inline'` as well (test with Vite's script hashing)
- ~~Add `Permissions-Policy` and `Strict-Transport-Security` headers (S3, S4)~~

#### 1.2 Fix `sync-content.js` safety (Q2) — DONE (2026-02-11)

- ~~Replace `execSync('rm -rf ...')` with `fs.rmSync(bookDest, { recursive: true, force: true })`~~
- ~~Add path validation before any destructive operation~~
- ~~Verify `bookDest` is within expected directory tree~~
- Also replaced `execSync('cp -r ...')` with `fs.cpSync()` for consistency

#### 1.3 Pin GitHub Actions to commit SHAs (S2) — DONE (2026-02-11)

- ~~Pin `actions/checkout`, `actions/setup-node`, `actions/upload-artifact` to commit SHAs~~
- ~~Pin `appleboy/scp-action` and `appleboy/ssh-action` to commit SHAs (deploy credentials)~~
- ~~Add comments with version numbers for readability~~

#### 1.4 Add localStorage quota monitoring (F1) — DONE (2026-02-11)

- ~~Implement a `checkStorageQuota()` utility that estimates remaining capacity~~
- ~~Warn users when approaching ~80% capacity~~
- Provide a "clear old data" option in settings (future enhancement)
- ~~Gracefully handle `QuotaExceededError` in all store `subscribe` persistence calls~~
- Added `StorageWarning.svelte` banner component in root layout

### Phase 2: Testing & Reliability (2-4 weeks)

**Goal:** Raise test coverage from ~25% to ~60%, covering critical paths.

#### 2.1 Content loading tests — DONE (2026-02-11)

- ~~Unit tests for `contentLoader.ts`: loading, caching, error paths, offline fallback~~ (55 tests)
- ~~Unit tests for `srs.ts`: SM-2 algorithm edge cases, timezone handling~~ (35 tests)

#### 2.2 Store tests for untested stores — DONE (2026-02-11)

- ~~`annotation.test.ts`: CRUD operations, v1→v2 migration, text range serialization~~ (30 tests)
- ~~`quiz.test.ts`: session lifecycle, mastery calculation, scoring~~ (33 tests)

#### 2.3 Action tests — DONE (2026-02-11)

- ~~`keyboardShortcuts.test.ts`: utility functions, key formatting, validation~~ (21 tests)
- `practiceProblems.test.ts`: DOM-heavy action, deferred to E2E coverage

#### 2.4 E2E test expansion — DONE (2026-02-11)

- ~~Glossary page: search, filtering, term display~~ (`e2e/glossary.spec.ts`)
- ~~Flashcard study session: rating, deck progression, streak tracking~~ (`e2e/flashcards.spec.ts`)
- ~~Search modal: opening/closing, input, filters, keyboard shortcuts~~ (`e2e/search.spec.ts`)
- ~~Theme/font switching: persists across page reload~~ (`e2e/theme-settings.spec.ts`)
- ~~Basic accessibility checks (headings, aria-labels, landmarks, reduced motion)~~ (`e2e/accessibility.spec.ts`)

#### 2.5 Build script fixes — DONE (2026-02-11)

- ~~Unify YAML parsing: use gray-matter in `generate-toc.js` and `validate-content.js` (Q3)~~
- ~~Fix `check-status.mjs` to reference correct npm scripts (Q4)~~
- ~~Add test coverage reporting: `@vitest/coverage-v8` configured, `npm run test:coverage` added (Q5, Q9)~~
- Added `$app/navigation` mock for vitest

### Phase 3: Performance & Quality (2-4 weeks)

**Goal:** Fix medium-severity performance and code quality issues.

#### 3.1 Timeout lifecycle management (F5) — DONE (2026-02-11)

- ~~Audit all `setTimeout`/`setInterval` calls in components~~
- ~~Ensure all are cleared in `onDestroy` or Svelte 5 `$effect` cleanup~~
- Fixed 3 leaks: `OfflineIndicator.svelte`, `SearchModal.svelte`, `PWAUpdater.svelte`

#### 3.2 Highlight restoration performance (F3) — DONE (2026-02-11)

- ~~Index annotations by chapter/section key at load time~~
- ~~Replace O(n) filter with indexed lookup~~ (O(1) via lazy `Map` index in `annotation.ts`)
- Added section, chapter, book, and ID indexes — invalidated on mutation

#### 3.3 Sidebar virtualization (F4) — ACCEPTED (2026-02-11)

- Sidebar already uses smart partial rendering: sections only render when chapter is expanded
- For the project's scale (max ~46 chapters), this is sufficient — no over-engineering needed
- If future books exceed 100+ chapters, consider virtual scrolling

#### 3.4 localStorage data validation (F7) — DONE (2026-02-11)

- ~~Add schema validation when loading state from localStorage~~
- ~~If stored data doesn't match expected shape, fall back to defaults and log a warning~~
- Created `src/lib/utils/storeValidation.ts` with `validateStoreData()` utility
- Applied validators to all 8 persisted stores (settings, reader, flashcard, annotation, quiz, analytics, objectives, offline)

#### 3.5 SM-2 timezone fix (F6) — DONE (2026-02-11)

- ~~Use local timezone instead of UTC for date string generation~~
- ~~Store date strings consistently~~
- Added `formatLocalDate()` helper in `storeHelpers.ts`
- Fixed `getTodayDateString()` and `getYesterdayDateString()` to use local timezone
- Fixed `getFlashcardStatsForPeriod()` and `weeklyFlashcardStats` to use local dates

#### 3.6 Cross-tab synchronization (F2) — DONE (2026-02-11)

- ~~Listen for `storage` events to detect changes from other tabs~~
- ~~Update stores reactively when external changes are detected~~
- Added `onStorageChange()` utility in `localStorage.ts`
- Applied cross-tab sync to all 8 persisted stores with circular-write prevention

### Phase 4: Accessibility & Polish (2-3 weeks)

**Goal:** Improve accessibility toward WCAG 2.1 AA and address low-severity issues.

#### 4.1 Skip-to-content link (F9) — ACCEPTED (2026-02-11)

- Already implemented in `[bookSlug]/+layout.svelte` (lines 73-79)
- Visually-hidden skip link ("Hoppa beint í efni") targets `#main-content`
- Styled with `sr-only focus:not-sr-only` pattern for proper visibility on focus

#### 4.2 PeriodicTable keyboard navigation (F8) — ACCEPTED (2026-02-11)

- Already fully implemented in `PeriodicTable.svelte`:
  - ~~Arrow key navigation between elements~~ (lines 118-150)
  - ~~Enter/Space to select an element~~ (lines 130-134)
  - ~~Escape to close detail view~~ (line 153)
  - Modal arrow keys navigate between elements (lines 154-155)
  - Proper focus management via `data-atomic-number` attribute targeting

#### 4.3 Focus management — DONE (2026-02-11)

- ~~Trap focus in all modals~~: SearchModal and SettingsModal already had focus traps; added to FlashcardModal and NoteModal
- ~~Restore focus to trigger element when modal closes~~: Added `previouslyFocused` tracking and restoration to all 4 modals
- ~~SettingsModal auto-focus~~: Added auto-focus on first interactive element when modal opens
- `SelectionPopup`: Already handles viewport bounds (lines 25-29)

#### 4.4 ESLint tightening (T2) — DONE (2026-02-11)

- ~~Promoted to ERROR (0 violations):~~ `no-useless-escape`
- ~~Fixed and promoted to ERROR:~~ `@typescript-eslint/no-explicit-any` (2 → 0), `svelte/no-unused-svelte-ignore` (2 → 0)
- ~~Enabled `svelte/no-at-html-tags` as ERROR~~ with file-specific overrides for `MarkdownRenderer.svelte` and `SearchModal.svelte`
- Reduced warnings from 189 to 184; promoted 4 rules from warn to error
- Remaining warn rules (fix incrementally): `require-each-key` (49), `no-navigation-without-resolve` (65), `no-unused-vars` (33), `no-immutable-reactive-statements` (16), `no-case-declarations` (9), `prefer-svelte-reactivity` (7), `infinite-reactive-loop` (5)

#### 4.5 Markdown pipeline removal readiness (T1) — READY (2026-02-11)

- ~~Monitor: `find static/content -name "*.md" -path "*/chapters/*"` returns 0~~ — confirmed no `.md` chapter files exist
- Pipeline is ready for Phase D removal per CLAUDE.md:
  - Delete `src/lib/utils/markdown.ts` and tests
  - Remove 12 remark/rehype/unified dependencies
  - Simplify `MarkdownRenderer.svelte` to HTML-only
  - Clean up markdown branches in `contentLoader.ts`

### Summary Timeline

```
Phase 1 (Security & Safety)        ████░░░░░░░░░░░░  Weeks 1-2
Phase 2 (Testing & Reliability)    ░░░░████████░░░░  Weeks 3-6
Phase 3 (Performance & Quality)    ░░░░░░░░████████  Weeks 5-8
Phase 4 (Accessibility & Polish)   ░░░░░░░░░░░░████  Weeks 7-10
```

Phases 2-3 overlap intentionally — testing improvements can run in parallel with performance work.

---

_Report generated via automated codebase analysis. Findings should be validated against current production behavior before acting on recommendations._
