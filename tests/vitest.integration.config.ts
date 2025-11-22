import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.test.js'],
    setupFiles: ['./tests/vitest.setup.ts', './tests/setup.ts'],
    globals: true,
    env: {
      SKIP_TEST_SERVER: '1'
    }
  }
});
