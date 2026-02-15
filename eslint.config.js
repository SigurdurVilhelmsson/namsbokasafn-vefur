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
      // Svelte-specific rules
      'svelte/no-at-html-tags': 'error',
      'svelte/require-each-key': 'warn', // 49 violations — fix incrementally
      'svelte/no-navigation-without-resolve': 'warn', // 65 violations — intentional patterns in actions
      'svelte/no-immutable-reactive-statements': 'warn', // 16 violations — fix incrementally
      'svelte/infinite-reactive-loop': 'warn', // 5 violations — review individually
      'svelte/no-unused-svelte-ignore': 'error',
      'svelte/prefer-svelte-reactivity': 'warn', // 7 violations — fix incrementally
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
      // Navigation rules for actions (warn - intentional patterns)
      'svelte/no-navigation-without-resolve': 'warn',
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
      'dev-dist/',
      'logs/',
      '*.config.js',
      '*.config.ts',
    ],
  }
);
