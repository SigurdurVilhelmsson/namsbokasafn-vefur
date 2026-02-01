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
      // Svelte-specific rules - be lenient for existing codebase
      'svelte/no-at-html-tags': 'off', // Expected in markdown renderer
      'svelte/require-each-key': 'warn', // Good practice but don't block
      'svelte/no-navigation-without-resolve': 'warn', // May not apply to all use cases
      'svelte/no-immutable-reactive-statements': 'warn',
      'svelte/infinite-reactive-loop': 'warn',
      'svelte/no-unused-svelte-ignore': 'warn',
      'svelte/prefer-svelte-reactivity': 'warn',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // Allow unused vars starting with underscore (warn for now, fix later)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow any for now (can be stricter later)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow case declarations without blocks (warn for now)
      'no-case-declarations': 'warn',
      // Unnecessary escapes
      'no-useless-escape': 'warn',
      // Navigation rules for actions (warn - these are intentional patterns)
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
