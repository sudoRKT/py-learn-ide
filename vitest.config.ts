import { defineConfig } from 'vitest/config';
import { aliases } from './vite.renderer.config';

// Unit tests sit beside the code (src/**/*.test.ts). tests/ holds cross-cutting tests.
// tests/ui is Playwright's and is run with `npm run test:ui`.
export default defineConfig({
  resolve: { alias: aliases },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    exclude: ['tests/ui/**', 'node_modules/**', 'out/**', 'dist/**', 'release/**', '.devdata/**'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
