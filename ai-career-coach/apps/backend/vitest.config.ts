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
      exclude: [
        'src/**/*.test.ts',
        'src/test-setup.ts',
        // Entry point - not unit-testable (wires up app and starts HTTP server)
        'src/server.ts',
        // Auto-generated Swagger/OpenAPI docs - no testable business logic
        'src/config/swagger.ts',
        // Database connection setup - requires real connections, tested via integration tests
        'src/config/database.ts',
        // HTTP proxy to ML microservice - integration tested, no business logic to unit-test
        'src/services/ml.service.ts',
        // Mongoose model/schema definition - no testable logic
        'src/models/user.model.ts',
        // Multer file upload config - configuration object, not unit-testable
        'src/middlewares/upload.middleware.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 55,
        functions: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    // Allow importing .ts files with .js extension (ESM interop)
    extensions: ['.ts', '.js'],
  },
});
