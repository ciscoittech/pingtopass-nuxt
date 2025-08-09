import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../../stores/auth';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigateTo for redirects
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have initial state with user null and isAuthenticated false', () => {
      const store = useAuthStore();
      
      expect(store.user).toBe(null);
      expect(store.isAuthenticated).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
    });
  });

  describe('Authentication Actions', () => {
    it('should login with email and password successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' })
      });

      const store = useAuthStore();
      
      await store.login({ email: 'test@example.com', password: 'password' });
      
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.error).toBe(null);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      });
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid credentials' })
      });

      const store = useAuthStore();
      
      await expect(store.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
      
      expect(store.user).toBe(null);
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Invalid credentials');
    });

    it('should login with Google OAuth successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@google.com',
        name: 'Google User',
        avatar: 'https://google.com/avatar.jpg'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'google-token' })
      });

      const store = useAuthStore();
      
      await store.loginWithGoogle('google-auth-code');
      
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'google-auth-code' })
      });
    });

    it('should logout successfully', async () => {
      // Set up initial authenticated state by login first
      const store = useAuthStore();
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', avatar: null };
      
      // Mock login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' })
      });
      
      await store.login({ email: 'test@example.com', password: 'password' });
      
      // Now mock logout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await store.logout();

      expect(store.user).toBe(null);
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe(null);
      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should check authentication status', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      });

      const store = useAuthStore();
      
      await store.checkAuth();
      
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/status');
    });

    it('should handle unauthenticated status check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      const store = useAuthStore();
      
      await store.checkAuth();
      
      expect(store.user).toBe(null);
      expect(store.isAuthenticated).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should set loading state during login', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const store = useAuthStore();
      const loginPromise = store.login({ email: 'test@example.com', password: 'password' });
      
      expect(store.isLoading).toBe(true);
      
      await loginPromise.catch(() => {}); // Handle potential rejection
      
      expect(store.isLoading).toBe(false);
    });

    it('should set loading state during logout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const store = useAuthStore();
      const logoutPromise = store.logout();
      
      expect(store.isLoading).toBe(true);
      
      await logoutPromise;
      
      expect(store.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should clear error on successful operation', async () => {
      const store = useAuthStore();
      
      // First cause an error
      mockFetch.mockRejectedValueOnce(new Error('First error'));
      
      await store.login({ email: 'test@example.com', password: 'wrong' }).catch(() => {});
      expect(store.error).toBe('First error');
      
      // Then do successful operation
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', avatar: null };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: 'test-token' })
      });
      
      await store.login({ email: 'test@example.com', password: 'password' });
      
      expect(store.error).toBe(null);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const store = useAuthStore();
      
      await expect(store.login({ email: 'test@example.com', password: 'password' }))
        .rejects.toThrow('Network error');
      
      expect(store.error).toBe('Network error');
    });
  });
});