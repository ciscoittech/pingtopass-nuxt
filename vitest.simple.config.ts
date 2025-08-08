import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup/vitest.simple.setup.ts'],
    include: [
      'tests/unit/components/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'tests/e2e/**/*',
      'node_modules/**/*'
    ]
  }
});