import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
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
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      // Disable typescript-eslint rules that don't work well with Svelte
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // $state() assignments inside $effect() look like dead stores to ESLint
      'no-useless-assignment': 'off',
      // Svelte-specific rules
      'svelte/no-at-html-tags': 'error',
      'svelte/require-each-key': 'error', // enforced — all loops keyed
      // Off: all warnings are template-literal hrefs to stable routes; resolveRoute() adds complexity for zero benefit
      'svelte/no-navigation-without-resolve': 'off',
      'svelte/no-immutable-reactive-statements': 'error', // No violations after runes migration
      'svelte/infinite-reactive-loop': 'error', // No violations after runes migration
      'svelte/no-unused-svelte-ignore': 'error',
      // Off: all warnings are false positives — Maps/Sets/Dates used as fresh local accumulators, not reactive state
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    // Allow {@html} in content renderer, search, and review (trusted content, XSS-safe highlighting)
    files: [
      'src/lib/components/ContentRenderer.svelte',
      'src/lib/components/SearchModal.svelte',
      'src/routes/\\[bookSlug\\]/yfirlit/+page.svelte',
    ],
    rules: {
      'svelte/no-at-html-tags': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // Allow unused vars starting with underscore (33 violations — fix incrementally)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // No explicit any — fixed violations, now enforced
      '@typescript-eslint/no-explicit-any': 'error',
      // Case declarations without blocks (9 violations — fix incrementally)
      'no-case-declarations': 'warn',
      // Unnecessary escapes — 0 violations, now enforced
      'no-useless-escape': 'error',
      // Off: stable routes, resolveRoute() adds complexity for zero benefit
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'scripts/**/*.mjs'],
    rules: {
      // Be lenient with scripts
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'node_modules/',
      'static/content/',
      'namsbokasafn-efni/',
      'dev-dist/',
      'logs/',
      'playwright-report/',
      '*.config.js',
      '*.config.ts',
    ],
  }
);
