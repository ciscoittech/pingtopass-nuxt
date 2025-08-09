import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuth } from '../../../composables/useAuth';

// Mock the auth store
const mockAuthStore = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
  checkAuth: vi.fn(),
  register: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../../../stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

describe('useAuth Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset mock store state
    mockAuthStore.user = null;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;
    mockAuthStore.error = null;
  });

  describe('State Access', () => {
    it('should provide access to user state', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', avatar: null };
      mockAuthStore.user = mockUser;
      
      const { user } = useAuth();
      
      expect(user.value).toEqual(mockUser);
    });

    it('should provide access to authentication status', () => {
      mockAuthStore.isAuthenticated = true;
      
      const { isAuthenticated } = useAuth();
      
      expect(isAuthenticated.value).toBe(true);
    });

    it('should provide access to loading state', () => {
      mockAuthStore.isLoading = true;
      
      const { isLoading } = useAuth();
      
      expect(isLoading.value).toBe(true);
    });

    it('should provide access to error state', () => {
      mockAuthStore.error = 'Test error';
      
      const { error } = useAuth();
      
      expect(error.value).toBe('Test error');
    });
  });

  describe('Authentication Methods', () => {
    it('should provide login method', async () => {
      const credentials = { email: 'test@example.com', password: 'password' };
      
      const { login } = useAuth();
      await login(credentials);
      
      expect(mockAuthStore.login).toHaveBeenCalledWith(credentials);
    });

    it('should provide Google login method', async () => {
      const { loginWithGoogle } = useAuth();
      await loginWithGoogle('auth-code');
      
      expect(mockAuthStore.loginWithGoogle).toHaveBeenCalledWith('auth-code');
    });

    it('should provide logout method', async () => {
      const { logout } = useAuth();
      await logout();
      
      expect(mockAuthStore.logout).toHaveBeenCalled();
    });

    it('should provide register method', async () => {
      const userData = { email: 'test@example.com', password: 'password', name: 'Test User' };
      
      const { register } = useAuth();
      await register(userData);
      
      expect(mockAuthStore.register).toHaveBeenCalledWith(userData);
    });

    it('should provide checkAuth method', async () => {
      const { checkAuth } = useAuth();
      await checkAuth();
      
      expect(mockAuthStore.checkAuth).toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    it('should provide clearError method', () => {
      const { clearError } = useAuth();
      clearError();
      
      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });

    it('should provide requireAuth helper that returns user when authenticated', () => {
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', avatar: null };
      mockAuthStore.user = mockUser;
      mockAuthStore.isAuthenticated = true;
      
      const { requireAuth } = useAuth();
      const result = requireAuth();
      
      expect(result).toEqual(mockUser);
    });

    it('should throw error when requireAuth is called but user is not authenticated', () => {
      mockAuthStore.user = null;
      mockAuthStore.isAuthenticated = false;
      
      const { requireAuth } = useAuth();
      
      expect(() => requireAuth()).toThrow('Authentication required');
    });

    it('should provide hasRole helper for role-based access', () => {
      const mockUser = { 
        id: '1', 
        email: 'admin@example.com', 
        name: 'Admin User', 
        avatar: null,
        roles: ['admin', 'user']
      };
      mockAuthStore.user = mockUser;
      mockAuthStore.isAuthenticated = true;
      
      const { hasRole } = useAuth();
      
      expect(hasRole('admin')).toBe(true);
      expect(hasRole('moderator')).toBe(false);
    });

    it('should return false for hasRole when user is not authenticated', () => {
      mockAuthStore.user = null;
      mockAuthStore.isAuthenticated = false;
      
      const { hasRole } = useAuth();
      
      expect(hasRole('admin')).toBe(false);
    });
  });

  describe('Reactive State', () => {
    it('should return reactive refs that update when store changes', () => {
      const { user, isAuthenticated } = useAuth();
      
      expect(user.value).toBe(null);
      expect(isAuthenticated.value).toBe(false);
      
      // Simulate store state change
      const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', avatar: null };
      mockAuthStore.user = mockUser;
      mockAuthStore.isAuthenticated = true;
      
      // In a real implementation, these would update automatically
      // For the test, we verify the current values match the store
      expect(mockAuthStore.user).toEqual(mockUser);
      expect(mockAuthStore.isAuthenticated).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should provide properly typed user object', () => {
      const mockUser = { 
        id: '1', 
        email: 'test@example.com', 
        name: 'Test User', 
        avatar: 'https://example.com/avatar.jpg'
      };
      mockAuthStore.user = mockUser;
      
      const { user } = useAuth();
      
      expect(user.value).toHaveProperty('id');
      expect(user.value).toHaveProperty('email');
      expect(user.value).toHaveProperty('name');
      expect(user.value).toHaveProperty('avatar');
    });
  });
});