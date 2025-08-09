import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Define the navigateTo function (will be auto-imported by Nuxt in runtime)
declare global {
  function navigateTo(path: string): Promise<void>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role?: string;
  subscription?: string;
  isAdmin?: boolean;
  exams?: string[];
  progress?: {
    totalQuestions: number;
    correctAnswers: number;
    studyStreak: number;
    level: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => user.value !== null);

  // Actions
  const clearError = () => {
    error.value = null;
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setUser = (userData: User | null) => {
    user.value = userData;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store user data
      setUser(data.user);

      // Store token in httpOnly cookie (handled by server)
      // The server should set the authentication cookie

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (code: string): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google login failed');
      }

      // Store user data
      setUser(data.user);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during Google login';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // Clear user data
      setUser(null);

      // Redirect to login page
      await navigateTo('/login');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during logout';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async (): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch('/api/auth/status');

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // User is not authenticated
        setUser(null);
      }

    } catch (err) {
      // Handle network errors or other issues
      setUser(null);
      const errorMessage = err instanceof Error ? err.message : 'Failed to check authentication status';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store user data
      setUser(data.user);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during registration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State (make writable for dev auth)
    user,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    
    // Actions
    login,
    loginWithGoogle,
    logout,
    checkAuth,
    register,
    clearError,
    setUser,
    setLoading,
    setError,
  };
});

// Types for external use
export type AuthStore = ReturnType<typeof useAuthStore>;