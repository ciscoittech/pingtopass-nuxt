import { computed } from 'vue';
import { useAuthStore, type User, type LoginCredentials } from '../stores/auth';

/**
 * Auth composable that provides reactive access to authentication state and methods
 * 
 * This composable wraps the Pinia auth store and provides a convenient API
 * for components to interact with authentication functionality.
 */
export const useAuth = () => {
  const authStore = useAuthStore();

  // Reactive state from the store
  const user = computed(() => authStore.user);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.isLoading);
  const error = computed(() => authStore.error);

  // Authentication methods
  const login = async (credentials: LoginCredentials): Promise<void> => {
    return await authStore.login(credentials);
  };

  const loginWithGoogle = async (code: string): Promise<void> => {
    return await authStore.loginWithGoogle(code);
  };

  const logout = async (): Promise<void> => {
    return await authStore.logout();
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<void> => {
    return await authStore.register(userData);
  };

  const checkAuth = async (): Promise<void> => {
    return await authStore.checkAuth();
  };

  const clearError = (): void => {
    authStore.clearError();
  };

  // Helper methods
  const requireAuth = (): User => {
    if (!authStore.isAuthenticated || !authStore.user) {
      throw new Error('Authentication required');
    }
    return authStore.user;
  };

  const hasRole = (role: string): boolean => {
    if (!authStore.isAuthenticated || !authStore.user) {
      return false;
    }
    
    // Check if user has roles property and includes the requested role
    const userWithRoles = authStore.user as User & { roles?: string[] };
    return userWithRoles.roles?.includes(role) ?? false;
  };

  const hasPermission = (permission: string): boolean => {
    if (!authStore.isAuthenticated || !authStore.user) {
      return false;
    }
    
    // Check if user has permissions property and includes the requested permission
    const userWithPermissions = authStore.user as User & { permissions?: string[] };
    return userWithPermissions.permissions?.includes(permission) ?? false;
  };

  const isAdmin = computed(() => hasRole('admin'));
  const isModerator = computed(() => hasRole('moderator'));

  // Profile helpers
  const getDisplayName = computed(() => {
    if (!authStore.user) return '';
    return authStore.user.name || authStore.user.email.split('@')[0];
  });

  const getInitials = computed(() => {
    if (!authStore.user) return '';
    const name = authStore.user.name || authStore.user.email;
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  });

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Methods
    login,
    loginWithGoogle,
    logout,
    register,
    checkAuth,
    clearError,
    
    // Helpers
    requireAuth,
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    getDisplayName,
    getInitials,
  };
};

// Type export for the composable
export type AuthComposable = ReturnType<typeof useAuth>;