// Flat ESLint config (ESLint 9+). Keep it light: this is a zero-runtime-dependency
// project, so the lint surface is small and opinionated rather than exhaustive.
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // Node-side code (server, CLI, scripts, tests, root config) runs in Node.
    files: ['bin/**', 'src/**', 'scripts/**', 'test/**', '*.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    // Browser-side code (the overlay) runs in the page.
    files: ['assets/overlay/**'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        customElements: 'readonly',
        CSSStyleSheet: 'readonly',
        structuredClone: 'readonly',
        matchMedia: 'readonly',
        requestAnimationFrame: 'readonly',
        getComputedStyle: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/', 'dist/', 'build/', 'test-results/', 'playwright-report/'],
  },
];
