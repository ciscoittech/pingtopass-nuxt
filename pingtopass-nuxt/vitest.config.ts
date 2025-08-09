import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './'),
      '@': path.resolve(__dirname, './'),
      '~~': path.resolve(__dirname, './'),
      '@@': path.resolve(__dirname, './')
    }
  },
  test: {
    // Test configuration
    globals: true,
    environment: 'happy-dom',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.nuxt/',
        '.output/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        'scripts/',
        'platform-specification/',
        'docs/'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    },
    
    // Test patterns
    include: [
      'tests/unit/**/*.test.{js,ts}',
      'tests/integration/**/*.test.{js,ts}'
    ],
    
    // Setup files
    setupFiles: ['tests/setup/vitest.setup.ts'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Reporter
    reporter: process.env.CI ? 'default' : 'verbose'
  },
  
  // Vite configuration for tests
  define: {
    __TEST__: true
  }
})