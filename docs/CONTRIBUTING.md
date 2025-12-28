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

- **Node.js** 18.0 or higher
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

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint (fails on warnings) |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |

### Environment Configuration

No environment variables are required for development. The application uses static content from `/public/content/`.

---

## Project Structure

```
src/
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
├── config/              # Configuration files
│   └── books.ts         # Book registry
├── components/
│   ├── catalog/         # Landing page components
│   ├── layout/          # Page structure (Header, Sidebar)
│   ├── reader/          # Content display components
│   └── ui/              # Reusable UI components
├── hooks/               # Custom React hooks
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── styles/              # Global CSS
```

### Key Files

| File | Purpose |
|------|---------|
| `src/config/books.ts` | Book configuration registry |
| `src/App.tsx` | Route definitions |
| `src/stores/*.ts` | State management |
| `src/utils/srs.ts` | Spaced repetition algorithm |
| `src/utils/contentLoader.ts` | Content loading utilities |

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
content(efnafraedi): add chapter 3 translation
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
type Status = 'loading' | 'success' | 'error';

// Always type function parameters and returns
function calculateScore(answers: Answer[]): number {
  return answers.filter(a => a.correct).length;
}

// Use const assertions for readonly arrays
const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
```

### React Guidelines

```tsx
// Prefer function components with explicit return types
export default function MyComponent({ title }: Props): JSX.Element {
  return <div>{title}</div>;
}

// Use hooks at the top of components
function MyComponent() {
  const [state, setState] = useState(false);
  const { theme } = useSettingsStore();

  // Then effects
  useEffect(() => {
    // ...
  }, []);

  // Then handlers
  const handleClick = () => {
    setState(true);
  };

  // Then render
  return <button onClick={handleClick}>Click</button>;
}

// Memoize expensive computations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

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

# Visual test runner
npm run test:ui
```

### Writing Tests

```typescript
// src/components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });
});
```

### Test File Naming

- Unit tests: `ComponentName.test.tsx` (co-located with component)
- Integration tests: `src/test/integration/*.test.ts`
- E2E tests: `e2e/*.spec.ts` (if using Playwright)

---

## Adding New Content

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
  translator: 'Translator Name',
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
public/content/new-book/
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
    "translator": "Translator Name",
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

See [MARKDOWN-GUIDE.md](./MARKDOWN-GUIDE.md) for full formatting reference.

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
   npm run type-check
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

Your changes will be automatically deployed via GitHub Actions.

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
