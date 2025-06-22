import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['tools/**', 'theme.js', 'dist/**', 'node_modules/**'],
  },
  { 
    files: ['**/*.{js,mjs,cjs}'], 
    plugins: { js }, 
    extends: ['js/recommended'], 
    languageOptions: { globals: globals.browser }
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      'quotes': [2, 'single', { 'avoidEscape': true }]
    }
  },
]);
