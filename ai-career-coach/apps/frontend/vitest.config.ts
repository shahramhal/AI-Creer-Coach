// apps/frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 15000,
    pool: 'forks',
    include: [
      'components/**/*.test.tsx',
      'components/**/*.test.ts',
      'services/**/*.test.ts',
      'services/**/*.test.tsx',
      'hooks/**/*.test.ts',
      'hooks/**/*.test.tsx',
      'utils/**/*.test.ts',
      'utils/**/*.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
});
