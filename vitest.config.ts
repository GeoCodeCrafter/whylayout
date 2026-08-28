import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/**/types.ts',
        // Needs a real layout engine or a real browser. jsdom would only prove
        // that the mocks were called, so these are covered by the demo fixtures
        // and the e2e suite instead - see PLAN.md v0.2.
        'src/measure/dom.ts',
        'src/ui/**',
        'src/entries/**',
      ],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
});
