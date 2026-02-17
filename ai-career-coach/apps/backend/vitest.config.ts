// apps/backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Mock all external connections at startup
    setupFiles: ['./src/test-setup.ts'],
    // Timeout for async tests
    testTimeout: 15000,
    // Pool options for ESM compatibility
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-setup.ts'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    // Allow importing .ts files with .js extension (ESM interop)
    extensions: ['.ts', '.js'],
  },
});
