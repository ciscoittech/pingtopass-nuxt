/**
 * Authentication Test Helpers
 * Utilities for testing authentication flows and JWT operations
 */

import { vi } from 'vitest';
import jwt from '@tsndr/cloudflare-worker-jwt';

export interface TestUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscription_status: 'free' | 'premium' | 'enterprise';
}

// Pre-defined test users
export const TEST_USERS = {
  free: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    subscription_status: 'free' as const
  },
  premium: {
    id: 2,
    email: 'premium@example.com',
    name: 'Premium User',
    role: 'user' as const,
    subscription_status: 'premium' as const
  },
  admin: {
    id: 3,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    subscription_status: 'premium' as const
  }
};

/**
 * Setup authentication mocks
 */
export function setupAuthMocks() {
  // Mock JWT library
  vi.mock('@tsndr/cloudflare-worker-jwt', () => ({
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn()
  }));
  
  // Mock Google Auth Library
  vi.mock('google-auth-library', () => ({
    OAuth2Client: vi.fn().mockImplementation(() => ({
      verifyIdToken: vi.fn()
    }))
  }));
}

/**
 * Generate a test JWT token
 */
export async function generateTestToken(user: TestUser): Promise<string> {
  const payload = {
    sub: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    subscription: user.subscription_status,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };
  
  // Create a fake JWT format
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'test-signature';
  
  return `${header}.${body}.${signature}`;
}

/**
 * Create authorization headers with test token
 */
export async function createAuthHeaders(user: TestUser = TEST_USERS.free): Promise<Record<string, string>> {
  const token = await generateTestToken(user);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Mock a successful JWT verification
 */
export function mockJWTVerification(payload: any) {
  vi.mocked(jwt.verify).mockResolvedValue(true);
  vi.mocked(jwt.decode).mockReturnValue({ payload });
}

/**
 * Mock a failed JWT verification
 */
export function mockJWTVerificationFailure() {
  vi.mocked(jwt.verify).mockResolvedValue(false);
}

/**
 * Mock Google OAuth token verification
 */
export function mockGoogleTokenVerification(user: TestUser) {
  return {
    verifyIdToken: vi.fn().mockResolvedValue({
      getPayload: () => ({
        sub: `google_${user.id}`,
        email: user.email,
        name: user.name,
        email_verified: true,
        picture: 'https://example.com/photo.jpg'
      })
    })
  };
}

/**
 * Create a mock authenticated event handler context
 */
export function createAuthenticatedContext(user: TestUser = TEST_USERS.free) {
  return {
    user,
    token: generateTestToken(user),
    isAuthenticated: true
  };
}

/**
 * Create mock request with authentication
 */
export async function createAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  user: TestUser = TEST_USERS.free
): Promise<Request> {
  const headers = await createAuthHeaders(user);
  
  return new Request(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
}

/**
 * Test authentication middleware behavior
 */
export function testAuthMiddleware() {
  return {
    requiresAuth: async (handler: any, user?: TestUser) => {
      if (user) {
        mockJWTVerification({
          sub: user.id.toString(),
          email: user.email,
          role: user.role
        });
      } else {
        mockJWTVerificationFailure();
      }
      
      return handler;
    },
    
    requiresRole: async (handler: any, role: 'user' | 'admin', user: TestUser) => {
      if (user.role === role || role === 'user') {
        mockJWTVerification({
          sub: user.id.toString(),
          email: user.email,
          role: user.role
        });
        return handler;
      } else {
        throw new Error('Insufficient permissions');
      }
    },
    
    requiresSubscription: async (handler: any, tier: string, user: TestUser) => {
      const tierLevels = { free: 0, premium: 1, enterprise: 2 };
      const userLevel = tierLevels[user.subscription_status as keyof typeof tierLevels];
      const requiredLevel = tierLevels[tier as keyof typeof tierLevels];
      
      if (userLevel >= requiredLevel) {
        mockJWTVerification({
          sub: user.id.toString(),
          email: user.email,
          subscription: user.subscription_status
        });
        return handler;
      } else {
        throw new Error('Subscription upgrade required');
      }
    }
  };
}

/**
 * Mock session management
 */
export class MockSessionManager {
  private sessions: Map<string, any> = new Map();
  
  create(userId: number, data: any = {}) {
    const sessionId = `session_${Date.now()}_${userId}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      createdAt: new Date(),
      ...data
    });
    return sessionId;
  }
  
  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }
  
  update(sessionId: string, data: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, { ...session, ...data });
    }
  }
  
  delete(sessionId: string) {
    return this.sessions.delete(sessionId);
  }
  
  clear() {
    this.sessions.clear();
  }
}