# Contributing Guide

Thank you for your interest in contributing to Námsbókasafn! This guide will help you get set up and understand our development workflow.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Code Style](#code-style)
6. [Testing](#testing)
7. [Adding New Content](#adding-new-content)
8. [Submitting Changes](#submitting-changes)

---

## Getting Started

### Prerequisites

- **Node.js** 22.22.2 or higher (`.nvmrc` pins 22, so `nvm use` picks it up)
- **npm** 9.0 or higher
- **Git**
- A code editor (VS Code recommended)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur.git
cd namsbokasafn-vefur

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## Development Environment

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### Available Scripts

| Script                  | Description                       |
| ----------------------- | --------------------------------- |
| `npm run dev`           | Start development server with HMR |
| `npm run build`         | Build production bundle           |
| `npm run preview`       | Preview production build locally  |
| `npm run lint`          | Run ESLint (fails on warnings)    |
| `npm run format`        | Format code with Prettier         |
| `npm run check`         | SvelteKit sync + TypeScript check |
| `npm run test`          | Run unit tests                    |
| `npm run test:watch`    | Run tests in watch mode           |
| `npm run test:coverage` | Generate coverage report          |

### Environment Configuration

No environment variables are required for development. The application uses static content from `/static/content/`.

---

## Project Structure

```
src/
├── routes/              # SvelteKit file-based routing
│   ├── +page.svelte     # Book catalog (landing page)
│   └── [bookSlug]/      # Per-book routes (kafli/, ordabok/, minniskort/, prof/, …)
├── lib/
│   ├── components/      # Svelte components (layout/, study/, analytics/, …)
│   ├── stores/          # Svelte stores with localStorage persistence
│   ├── actions/         # Svelte actions (DOM work on rendered content)
│   ├── data/            # Static data (licences, credits, section redirects, …)
│   ├── types/           # TypeScript types, incl. the book registry (book.ts)
│   ├── utils/           # Utilities (SRS algorithm, content loading, …)
│   └── workers/         # Web worker for the search index
├── app.css              # Global styles and theme tokens
└── app.html             # HTML shell
```

### Key Files

| File                             | Purpose                        |
| -------------------------------- | ------------------------------ |
| `src/lib/types/book.ts`          | Book configuration registry    |
| `src/routes/`                    | Route definitions (file-based) |
| `src/lib/stores/*.ts`            | State management               |
| `src/lib/utils/srs.ts`           | Spaced repetition algorithm    |
| `src/lib/utils/contentLoader.ts` | Content loading utilities      |

---

## Development Workflow

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
docs/description       # Documentation changes
refactor/description   # Code refactoring
content/description    # Content updates
```

### Commit Messages

Follow conventional commits:

```
type(scope): description

feat(flashcards): add deck statistics display
fix(sidebar): correct chapter collapse behavior
docs(readme): update installation instructions
style(header): adjust spacing on mobile
refactor(srs): extract interval calculation
content(efnafraedi-2e): add chapter 3 translation
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `content`

---

## Code Style

### TypeScript Guidelines

```typescript
// Use interfaces for objects
interface ComponentProps {
  title: string;
  onClick: () => void;
}

// Use type for unions/intersections
type Status = "loading" | "success" | "error";

// Always type function parameters and returns
function calculateScore(answers: Answer[]): number {
  return answers.filter((a) => a.correct).length;
}

// Use const assertions for readonly arrays
const RATINGS = ["again", "hard", "good", "easy"] as const;
```

### Svelte Guidelines

The app is Svelte 5 with runes; there are no `.tsx`/`.jsx` files in `src/`.

- Reactivity: `$state`, `$derived` and `$effect`; component inputs via `$props()`.
- Events: callback props such as `onClose`, not `createEventDispatcher`.
- Children: `{@render children()}`, not `<slot />`.
- Store values: `$store` auto-subscription.

The root `CLAUDE.md` (Key Patterns) lists the reactivity pitfalls that have caused real bugs here.

### Tailwind CSS Guidelines

```tsx
// Order classes logically: layout → spacing → sizing → colors → effects
<div className="flex items-center gap-4 p-4 w-full bg-white rounded-lg shadow-md">

// Use CSS variables for theme colors
<div className="bg-[var(--bg-primary)] text-[var(--text-primary)]">

// Use responsive prefixes consistently: sm → md → lg → xl
<div className="px-4 md:px-6 lg:px-8">

// Extract repeated patterns to components, not @apply
// Good:
function Card({ children }) {
  return <div className="p-4 bg-white rounded-lg shadow">{children}</div>;
}

// Avoid:
// @apply p-4 bg-white rounded-lg shadow;
```

---

## Testing

### Running Tests

```bash
# Run all tests once
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e
```

### Writing Tests

Unit tests are co-located `*.test.ts` files (`*.test.js` under `scripts/`), run by
Vitest in a `jsdom` environment (`vitest.config.ts`). No component-rendering library
such as `@testing-library/*` is installed, so model new tests on existing ones — for
example `src/lib/utils/srs.test.ts` (pure logic) or
`src/lib/actions/glossaryTerms.test.ts` (a Svelte action run against DOM fixtures).

### Test File Naming

- Unit tests: `name.test.ts` (`name.test.js` under `scripts/`), co-located with the module they test
- E2E tests: `e2e/*.spec.ts` (Playwright)

---

## Adding New Content

> ⚠️ **Out of date (status 2026-10-01).** This section describes the earlier Markdown workflow (`src/config/books.ts`, `.md` sections with frontmatter). Today a book is registered in `src/lib/types/book.ts`, and its chapters are pre-rendered HTML produced by [namsbokasafn-efni](https://github.com/SigurdurVilhelmsson/namsbokasafn-efni) and copied into `static/content/` by `scripts/sync-content.js`, which also regenerates `toc.json`. Which books may be synced is set by the allowlist in `scripts/lib/published-books.js`.

### Adding a New Book

1. **Create book configuration** in `src/config/books.ts`:

```typescript
{
  id: 'new-book',
  slug: 'new-book',
  title: 'New Book Title',
  subtitle: 'Based on OpenStax...',
  description: 'Description...',
  subject: 'raunvisindi',
  coverImage: '/covers/new-book.svg',
  translator: 'Erlendur (Miðeind)',
  status: 'available',
  source: {
    title: 'Original Title',
    publisher: 'OpenStax',
    url: 'https://openstax.org/...',
    authors: ['Author 1', 'Author 2'],
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'
  },
  stats: {
    totalChapters: 10,
    translatedChapters: 0
  },
  features: {
    glossary: true,
    flashcards: true,
    exercises: true
  }
}
```

2. **Create content directory**:

```
static/content/new-book/
├── toc.json           # Table of contents
├── glossary.json      # Glossary terms
└── chapters/
    └── 01-chapter-slug/
        ├── 1-1-section.md
        ├── 1-2-section.md
        └── images/
            └── figure-1.png
```

3. **Create `toc.json`**:

```json
{
  "title": "New Book Title",
  "attribution": {
    "original": "Original Title",
    "authors": "Author 1, Author 2",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "originalUrl": "https://openstax.org/...",
    "translator": "Erlendur (Miðeind)",
    "translationYear": 2024,
    "modifications": "Translated to Icelandic with adaptations."
  },
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "slug": "01-chapter-slug",
      "sections": [
        {
          "number": "1.1",
          "title": "Section Title",
          "slug": "1-1-section",
          "file": "1-1-section.md"
        }
      ]
    }
  ]
}
```

4. **Add cover image** to `public/covers/new-book.svg`

### Adding Content Sections

Create markdown files with frontmatter:

```markdown
---
title: "Section Title"
section: "1.1"
chapter: 1
objectives:
  - Learning objective 1
  - Learning objective 2
---

# Section Heading

Content here...

## Subheading

More content...

::: note
This is a highlighted note.
:::

Math equation: $E = mc^2$

![Image caption](images/figure-1.png)
```

The Markdown format above is archived in [content-format-legacy.md](../archive/content-format-legacy.md); see the note at the top of this section for how content arrives today.

---

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** and commit:

   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Run quality checks**:

   ```bash
   npm run lint
   npm run check
   npm run test
   npm run build
   ```

4. **Push and create PR**:

   ```bash
   git push -u origin feature/my-feature
   ```

5. **Fill out PR template** with:
   - Summary of changes
   - Screenshots (if UI changes)
   - Testing instructions
   - Related issues

### PR Review Checklist

- [ ] Code follows style guidelines
- [ ] TypeScript types are complete
- [ ] Tests pass and coverage is maintained
- [ ] No lint warnings
- [ ] Build succeeds
- [ ] Functionality works as expected
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Responsive design works on mobile

### After Merge

Merging does not deploy: CI (GitHub Actions) only runs checks. Deployment is a separate step taken by the maintainer — see [Deployment](deployment.md).

---

## Getting Help

- **Documentation**: Check the `/docs` folder
- **Issues**: Browse or create [GitHub Issues](https://github.com/SigurdurVilhelmsson/namsbokasafn-vefur/issues)
- **Discussions**: Use GitHub Discussions for questions

---

## Recognition

Contributors are recognized in:

- Git history
- Release notes (for significant contributions)
- README acknowledgments (for major features)

Thank you for contributing to Icelandic educational resources!
