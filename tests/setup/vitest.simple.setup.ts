/**
 * Simple Vitest Setup for Component Testing
 * Minimal setup without Nuxt dependencies
 */

import { vi } from 'vitest';

// Global test configuration
beforeAll(async () => {
  // Mock environment variables
  vi.stubEnv('NODE_ENV', 'test');
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Global teardown
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Custom matchers
expect.extend({
  toBeWithinResponseTime(received: number, expected: number) {
    const pass = received <= expected;
    return {
      pass,
      message: () => 
        pass 
          ? `Response time ${received}ms is within ${expected}ms limit`
          : `Response time ${received}ms exceeds ${expected}ms limit`
    };
  }
});

// Type extensions for custom matchers
declare global {
  namespace Vi {
    interface Assertion {
      toBeWithinResponseTime(expected: number): void;
    }
  }
}