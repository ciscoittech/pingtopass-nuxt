import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '.nuxt/',
        '.output/',
        'database/migrations/',
        'wrangler.toml',
        'eslint.config.js'
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85
      }
    },
    
    // Separate test suites
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // Test environment variables
    env: {
      NODE_ENV: 'test',
      TEST_VERBOSE: 'false',
      TURSO_DATABASE_URL: ':memory:',
      TURSO_AUTH_TOKEN: '',
      JWT_SECRET: process.env.JWT_SECRET_TEST || `test-jwt-${Date.now()}-${Math.random().toString(36)}`
    }
  },
  
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '~/': resolve(__dirname, './'),
      '@': resolve(__dirname, '.'),
      '@/': resolve(__dirname, './')
    }
  },
  
  // Add Node.js built-ins for edge runtime compatibility
  define: {
    global: 'globalThis'
  }
})