import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Les tests unitaires vivent dans src/ (*.test.ts) ;
    // les specs Playwright (tests/e2e/*.spec.ts) sont exclues.
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
