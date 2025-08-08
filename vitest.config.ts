import { defineVitestConfig } from '@nuxt/test-utils/config';
import { resolve } from 'path';

export default defineVitestConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
      '#imports': resolve(__dirname, '.nuxt/imports.d.ts'),
      '#app': resolve(__dirname, '.nuxt/nuxt.d.ts')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts}',
      'tests/integration/**/*.{test,spec}.{js,ts}',
      'server/**/*.{test,spec}.{js,ts}',
      'components/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'tests/e2e/**/*',
      'node_modules/**/*',
      '.nuxt/**/*',
      '.output/**/*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '*.config.js',
        '.nuxt/',
        '.output/',
        'platform-specification/',
        'database/migrations/',
        'types/'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      },
      // Critical paths requiring 100% coverage
      watermarks: {
        statements: [85, 95],
        functions: [85, 95],
        branches: [80, 90],
        lines: [85, 95]
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    threads: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    // Performance benchmarking
    benchmark: {
      include: ['tests/performance/**/*.bench.{js,ts}'],
      exclude: ['node_modules/', '.nuxt/', '.output/']
    },
    // Type checking
    typecheck: {
      enabled: true,
      checker: 'tsc',
      include: ['**/*.{test,spec}.{ts,tsx}']
    },
    // Server tests configuration
    server: {
      deps: {
        inline: ['@nuxt/test-utils']
      }
    },
    // Multiple test environments
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true
      }
    }
  }
});