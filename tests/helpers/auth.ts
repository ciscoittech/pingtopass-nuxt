/**
 * Authentication Test Helpers
 * JWT token generation and mock authentication utilities
 */

import jwt from '@tsndr/cloudflare-worker-jwt'

interface TestUser {
  id: number
  email: string
  name: string
  role: 'user' | 'admin' | 'moderator'
  subscription_status: 'free' | 'premium' | 'enterprise'
}

const TEST_JWT_SECRET = process.env.JWT_SECRET_TEST || `test-jwt-${Date.now()}-${Math.random().toString(36)}`

/**
 * Generate JWT token for test user
 */
export async function generateTestToken(user: Partial<TestUser> = {}): Promise<string> {
  const defaultUser: TestUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    subscription_status: 'free'
  }

  const userData = { ...defaultUser, ...user }
  const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours

  const payload = {
    sub: userData.id.toString(),
    email: userData.email,
    name: userData.name,
    role: userData.role,
    subscription: userData.subscription_status,
    iat: Math.floor(Date.now() / 1000),
    exp
  }

  return await jwt.sign(payload, TEST_JWT_SECRET)
}

/**
 * Create authorization headers for API tests
 */
export async function createAuthHeaders(user?: Partial<TestUser>): Promise<{ Authorization: string; 'Content-Type': string }> {
  const token = await generateTestToken(user)
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * Create cookie headers for browser-like tests
 */
export async function createCookieHeaders(user?: Partial<TestUser>): Promise<{ Cookie: string }> {
  const token = await generateTestToken(user)
  return {
    'Cookie': `auth-token=${token}`
  }
}

/**
 * Mock event handler with authenticated user
 */
export async function createMockAuthenticatedEvent(user?: Partial<TestUser>, body?: any, params?: any) {
  const token = await generateTestToken(user)
  
  return {
    context: {},
    node: {
      req: {
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        }
      }
    },
    body,
    params
  }
}

/**
 * Mock event handler without authentication
 */
export function createMockUnauthenticatedEvent(body?: any, params?: any) {
  return {
    context: {},
    node: {
      req: {
        headers: {
          'content-type': 'application/json'
        }
      }
    },
    body,
    params
  }
}

/**
 * Verify JWT token (for testing token generation)
 */
export async function verifyTestToken(token: string): Promise<any> {
  const isValid = await jwt.verify(token, TEST_JWT_SECRET)
  if (!isValid) {
    throw new Error('Invalid test token')
  }
  
  const decoded = jwt.decode(token)
  return decoded.payload
}

/**
 * Test users for different scenarios
 */
export const TEST_USERS = {
  ADMIN: {
    id: 1,
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin' as const,
    subscription_status: 'premium' as const
  },
  
  PREMIUM_USER: {
    id: 2,
    email: 'premium@test.com',
    name: 'Premium User',
    role: 'user' as const,
    subscription_status: 'premium' as const
  },
  
  FREE_USER: {
    id: 3,
    email: 'free@test.com',
    name: 'Free User',
    role: 'user' as const,
    subscription_status: 'free' as const
  },
  
  MODERATOR: {
    id: 4,
    email: 'moderator@test.com',
    name: 'Test Moderator',
    role: 'moderator' as const,
    subscription_status: 'premium' as const
  }
}

/**
 * Get auth headers for specific test user type
 */
export async function getTestUserHeaders(userType: keyof typeof TEST_USERS) {
  return await createAuthHeaders(TEST_USERS[userType])
}

/**
 * Mock requireAuth function for testing
 */
export async function mockRequireAuth(user?: Partial<TestUser>) {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    subscription_status: 'free',
    ...user
  }
}

/**
 * Create authentication test scenarios
 */
export const AUTH_TEST_SCENARIOS = [
  {
    name: 'Admin user',
    user: TEST_USERS.ADMIN,
    shouldHaveAccess: ['admin', 'user', 'moderator']
  },
  {
    name: 'Premium user',
    user: TEST_USERS.PREMIUM_USER,
    shouldHaveAccess: ['user', 'premium']
  },
  {
    name: 'Free user',
    user: TEST_USERS.FREE_USER,
    shouldHaveAccess: ['user']
  },
  {
    name: 'Moderator',
    user: TEST_USERS.MODERATOR,
    shouldHaveAccess: ['moderator', 'user']
  }
]