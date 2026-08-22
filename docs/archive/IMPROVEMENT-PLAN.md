# Repository Best Practices Audit & Improvement Plan

## Executive Summary

Comprehensive audit of namsbokasafn-vefur (SvelteKit web reader) covering CI/CD, testing, linting, security, and documentation.

**Overall Assessment:**
| Area | Score | Status |
|------|-------|--------|
| Code Quality | 7/10 | Good TypeScript, Svelte 5, but no linting |
| Testing | 8/10 | 173 tests exist, 3 failing, good coverage |
| CI/CD | 4/10 | Deploy only - no test/lint in pipeline |
| Documentation | 8/10 | Good architecture docs, guides exist |
| Security | 7/10 | 1 moderate vulnerability (lodash) |

---

## Part 1: CI/CD Improvements

### 1.1 Current State

Only `deploy.yml` exists - deploys to Linode on push to main.
**Missing:** No testing, linting, or build validation before deploy.

### 1.2 Add Test & Lint Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run check
      - run: npm test
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### 1.3 Add Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      development:
        patterns:
          - "*"
```

---

## Part 2: Linting Setup

### 2.1 Current Problem

ESLint 9 installed but no config file. Running `npm run lint` fails.

### 2.2 Create ESLint Config

```javascript
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    ignores: [
      "build/",
      ".svelte-kit/",
      "node_modules/",
      "static/content/",
      "dev-dist/",
    ],
  },
);
```

### 2.3 Install Dependencies

```bash
npm install -D eslint-plugin-svelte typescript-eslint globals
```

---

## Part 3: Git Hooks

### 3.1 Install Husky + lint-staged

```bash
npm install -D husky lint-staged
npx husky init
```

### 3.2 Configure

```json
// package.json addition
{
  "lint-staged": {
    "*.{ts,js,svelte}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

---

## Part 4: Fix Failing Tests

### 4.1 Current Failures (3 tests)

All in `src/lib/utils/markdown.test.ts` - practice problem container tests.

The test expects `practice-problem-container` class but the rendered HTML doesn't include it.

### 4.2 Investigation Needed

- Check if `markdown.ts` was recently changed (there's an unstaged change)
- Determine if test expectations are outdated or code is broken

---

## Part 5: Security

### 5.1 Fix Lodash Vulnerability

```bash
npm audit fix
```

### 5.2 Add Security Audit to CI

Include `npm audit --audit-level=high` in CI workflow.

---

## Part 6: Documentation Updates

### 6.1 Already Good

- `docs/reference/architecture.md` exists
- `docs/guides/contributing.md` exists
- `docs/guides/deployment.md` exists

### 6.2 Minor Updates Needed

- Update CLAUDE.md with new ESLint setup instructions
- Add testing guidelines section

---

## Implementation Order

### Phase 1: Linting (Priority: HIGH)

1. Create `eslint.config.js`
2. Install missing ESLint dependencies
3. Fix any linting errors
4. Update `npm run lint` to work

### Phase 2: Git Hooks (Priority: HIGH)

1. Install husky + lint-staged
2. Configure pre-commit hook
3. Test hook works

### Phase 3: CI/CD (Priority: HIGH)

1. Create `.github/workflows/ci.yml`
2. Add dependabot.yml
3. Test pipeline

### Phase 4: Fix Tests (Priority: MEDIUM)

1. Investigate failing tests
2. Fix test expectations or code
3. Ensure all 173 tests pass

### Phase 5: Security (Priority: MEDIUM)

1. Run npm audit fix
2. Verify no breaking changes

---

## Files to Create/Modify

| File                             | Action               | Priority |
| -------------------------------- | -------------------- | -------- |
| `eslint.config.js`               | Create               | HIGH     |
| `.github/workflows/ci.yml`       | Create               | HIGH     |
| `.github/dependabot.yml`         | Create               | HIGH     |
| `.husky/pre-commit`              | Create               | HIGH     |
| `package.json`                   | Modify (lint-staged) | HIGH     |
| `src/lib/utils/markdown.test.ts` | Fix tests            | MEDIUM   |
