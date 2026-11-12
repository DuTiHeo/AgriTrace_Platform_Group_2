const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh').default;
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  {
    ignores: ['**/node_modules/**', 'dist/**', '.expo/**', 'android/**', 'ios/**', 'skills/**', 'skill2/**'],
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/(website)/**', 'src/**/*_wb.{ts,tsx}'],
    extends: [expoConfig],
  },
  {
    files: ['src/**/*_wb.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['vite.config.mts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
