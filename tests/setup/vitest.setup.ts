/**
 * Vitest Setup File
 * Global test configuration and mocks for all unit/integration tests
 */

import { config } from 'dotenv';
import { vi } from 'vitest';
import { setupTestDatabase } from '../helpers/database';
import { setupAuthMocks } from '../helpers/auth';
import { setupAIMocks } from '../helpers/ai-mocks';
import { setupMSW } from '../helpers/msw';

// Load test environment variables
config({ path: '.env.test' });

// Global test configuration
beforeAll(async () => {
  // Setup MSW for API mocking
  setupMSW();
  
  // Setup test database
  await setupTestDatabase();
  
  // Setup authentication mocks
  setupAuthMocks();
  
  // Setup AI/LangChain mocks
  setupAIMocks();
  
  // Mock Cloudflare Workers runtime
  vi.stubGlobal('caches', {
    default: {
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
  });
  
  // Mock environment variables
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('TURSO_DATABASE_URL', ':memory:');
  vi.stubEnv('JWT_SECRET', 'test-secret');
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
  },
  
  toHaveValidJWT(received: string) {
    const parts = received.split('.');
    const pass = parts.length === 3;
    return {
      pass,
      message: () => 
        pass
          ? 'Valid JWT format'
          : `Invalid JWT format: expected 3 parts, got ${parts.length}`
    };
  }
});

// Type extensions for custom matchers
declare global {
  namespace Vi {
    interface Assertion {
      toBeWithinResponseTime(expected: number): void;
      toHaveValidJWT(): void;
    }
  }
}