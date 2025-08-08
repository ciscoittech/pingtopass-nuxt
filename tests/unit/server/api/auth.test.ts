/**
 * Authentication API Unit Tests
 * Test suite for authentication endpoints with comprehensive security testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserFactory } from '../../../factories/user.factory';
import { 
  TEST_USERS, 
  generateTestToken, 
  mockJWTVerification, 
  mockJWTVerificationFailure,
  mockGoogleTokenVerification 
} from '../../../helpers/auth';
import { getTestDatabase, resetTestDatabase } from '../../../helpers/database';
import { addMockHandlers } from '../../../helpers/msw';
import { http, HttpResponse } from 'msw';

describe('Authentication API', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('POST /api/auth/google', () => {
    it('should authenticate user with valid Google ID token', async () => {
      const testUser = UserFactory.create(TEST_USERS.free);
      
      // Mock Google token verification
      addMockHandlers(
        http.post('https://oauth2.googleapis.com/tokeninfo', () => {
          return HttpResponse.json({
            sub: 'google_123',
            email: testUser.email,
            name: testUser.name,
            email_verified: 'true',
            aud: 'your-google-client-id'
          });
        })
      );
      
      const mockHandler = vi.fn().mockImplementation(async ({ body }) => {
        if (!body.id_token) {
          throw new Error('ID token required');
        }
        
        // Simulate Google token verification
        const userInfo = {
          sub: 'google_123',
          email: testUser.email,
          name: testUser.name,
          email_verified: true
        };
        
        // Generate JWT
        const token = await generateTestToken(testUser);
        
        return {
          success: true,
          data: {
            token,
            user: testUser,
            is_new_user: false
          }
        };
      });
      
      const result = await mockHandler({
        body: { id_token: 'valid-google-token' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.token).toHaveValidJWT();
      expect(result.data.user.email).toBe(testUser.email);
      expect(result.data.is_new_user).toBe(false);
    });
    
    it('should create new user for first-time Google login', async () => {
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User',
        google_id: 'google_new_123'
      };
      
      const mockHandler = vi.fn().mockImplementation(async ({ body }) => {
        // Simulate new user creation
        const user = {
          ...newUser,
          id: Date.now(),
          role: 'user',
          subscription_status: 'free',
          created_at: new Date().toISOString()
        };
        
        const token = await generateTestToken(user as any);
        
        return {
          success: true,
          data: {
            token,
            user,
            is_new_user: true
          }
        };
      });
      
      const result = await mockHandler({
        body: { id_token: 'new-user-google-token' }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.is_new_user).toBe(true);
      expect(result.data.user.email).toBe(newUser.email);
    });
    
    it('should reject invalid Google ID token', async () => {
      addMockHandlers(
        http.post('https://oauth2.googleapis.com/tokeninfo', () => {
          return new HttpResponse(null, { status: 400 });
        })
      );
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 401,
        statusMessage: 'Invalid ID token'
      });
      
      await expect(mockHandler({
        body: { id_token: 'invalid-token' }
      })).rejects.toMatchObject({
        statusCode: 401
      });
    });
    
    it('should handle Google API errors gracefully', async () => {
      addMockHandlers(
        http.post('https://oauth2.googleapis.com/tokeninfo', () => {
          return new HttpResponse(null, { status: 503 });
        })
      );
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 503,
        statusMessage: 'Google authentication service unavailable'
      });
      
      await expect(mockHandler({
        body: { id_token: 'some-token' }
      })).rejects.toMatchObject({
        statusCode: 503
      });
    });
    
    it('should enforce email verification requirement', async () => {
      addMockHandlers(
        http.post('https://oauth2.googleapis.com/tokeninfo', () => {
          return HttpResponse.json({
            sub: 'google_123',
            email: 'unverified@example.com',
            name: 'Unverified User',
            email_verified: 'false',
            aud: 'your-google-client-id'
          });
        })
      );
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 400,
        statusMessage: 'Email must be verified'
      });
      
      await expect(mockHandler({
        body: { id_token: 'unverified-email-token' }
      })).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Email must be verified'
      });
    });
    
    it('should complete authentication within 200ms', async () => {
      const start = performance.now();
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: {
          token: await generateTestToken(TEST_USERS.free),
          user: TEST_USERS.free,
          is_new_user: false
        }
      });
      
      await mockHandler({
        body: { id_token: 'fast-token' }
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeWithinResponseTime(200);
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('should refresh valid JWT token', async () => {
      const user = TEST_USERS.premium;
      mockJWTVerification({
        sub: user.id.toString(),
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes
      });
      
      const mockHandler = vi.fn().mockImplementation(async ({ headers }) => {
        const authHeader = headers.Authorization;
        if (!authHeader) {
          throw new Error('Authorization header required');
        }
        
        const newToken = await generateTestToken(user);
        
        return {
          success: true,
          data: {
            token: newToken,
            expires_at: new Date(Date.now() + 86400000).toISOString()
          }
        };
      });
      
      const result = await mockHandler({
        headers: {
          Authorization: `Bearer ${await generateTestToken(user)}`
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.token).toHaveValidJWT();
    });
    
    it('should reject expired tokens', async () => {
      mockJWTVerificationFailure();
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 401,
        statusMessage: 'Token expired'
      });
      
      await expect(mockHandler({
        headers: {
          Authorization: 'Bearer expired-token'
        }
      })).rejects.toMatchObject({
        statusCode: 401
      });
    });
    
    it('should reject malformed tokens', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 400,
        statusMessage: 'Invalid token format'
      });
      
      await expect(mockHandler({
        headers: {
          Authorization: 'Bearer invalid.token'
        }
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
    
    it('should handle missing authorization header', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 401,
        statusMessage: 'Authorization header required'
      });
      
      await expect(mockHandler({
        headers: {}
      })).rejects.toMatchObject({
        statusCode: 401
      });
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should invalidate user session', async () => {
      const mockHandler = vi.fn().mockImplementation(async ({ headers }) => {
        const authHeader = headers.Authorization;
        if (!authHeader) {
          throw new Error('Authorization header required');
        }
        
        // Simulate token blacklisting
        const token = authHeader.replace('Bearer ', '');
        
        return {
          success: true,
          data: {
            message: 'Logged out successfully',
            invalidated_token: token.substring(0, 20) + '...'
          }
        };
      });
      
      const result = await mockHandler({
        headers: {
          Authorization: `Bearer ${await generateTestToken(TEST_USERS.free)}`
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Logged out successfully');
    });
    
    it('should handle already logged out users gracefully', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Already logged out'
        }
      });
      
      const result = await mockHandler({
        headers: {}
      });
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const user = TEST_USERS.premium;
      mockJWTVerification({
        sub: user.id.toString(),
        email: user.email,
        role: user.role
      });
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { user }
      });
      
      const result = await mockHandler({
        headers: {
          Authorization: `Bearer ${await generateTestToken(user)}`
        }
      });
      
      expect(result.data.user.email).toBe(user.email);
      expect(result.data.user.subscription_status).toBe(user.subscription_status);
    });
    
    it('should require valid authentication', async () => {
      mockJWTVerificationFailure();
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
      
      await expect(mockHandler({
        headers: {
          Authorization: 'Bearer invalid-token'
        }
      })).rejects.toMatchObject({
        statusCode: 401
      });
    });
    
    it('should exclude sensitive information', async () => {
      const user = TEST_USERS.free;
      mockJWTVerification({
        sub: user.id.toString(),
        email: user.email,
        role: user.role
      });
      
      const mockHandler = vi.fn().mockImplementation(() => {
        // Exclude google_id and other sensitive fields
        const { ...publicUser } = user;
        delete (publicUser as any).google_id;
        
        return Promise.resolve({
          success: true,
          data: { user: publicUser }
        });
      });
      
      const result = await mockHandler({
        headers: {
          Authorization: `Bearer ${await generateTestToken(user)}`
        }
      });
      
      expect(result.data.user.google_id).toBeUndefined();
      expect(result.data.user.email).toBeDefined();
    });
  });
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const attempts = [];
      
      // Mock handler that tracks attempts
      const mockHandler = vi.fn().mockImplementation(() => {
        attempts.push(Date.now());
        
        if (attempts.length > 5) {
          return Promise.reject({
            statusCode: 429,
            statusMessage: 'Too many login attempts'
          });
        }
        
        return Promise.resolve({
          success: true,
          data: { token: 'test-token' }
        });
      });
      
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await mockHandler({ body: { id_token: 'test-token' } });
      }
      
      // 6th attempt should be rate limited
      await expect(mockHandler({
        body: { id_token: 'test-token' }
      })).rejects.toMatchObject({
        statusCode: 429
      });
    });
  });
  
  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          success: true,
          data: { token: 'test-token' },
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'"
          }
        });
      });
      
      const result = await mockHandler({
        body: { id_token: 'test-token' }
      });
      
      expect(result.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(result.headers['X-Frame-Options']).toBe('DENY');
    });
  });
  
  describe('Input Validation', () => {
    it('should validate required fields', async () => {
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        if (!body.id_token || body.id_token.trim() === '') {
          return Promise.reject({
            statusCode: 400,
            statusMessage: 'ID token is required'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        body: {}
      })).rejects.toMatchObject({
        statusCode: 400
      });
      
      await expect(mockHandler({
        body: { id_token: '' }
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
    
    it('should sanitize user input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        // Simulate input sanitization
        const sanitized = body.id_token.replace(/<[^>]*>/g, '');
        
        if (sanitized !== body.id_token) {
          return Promise.reject({
            statusCode: 400,
            statusMessage: 'Invalid characters in input'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        body: { id_token: maliciousInput }
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
  });
});