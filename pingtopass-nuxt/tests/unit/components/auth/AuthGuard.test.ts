import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AuthGuard from '../../../../components/auth/AuthGuard.vue';

// Mock the auth composable
const mockUseAuth = {
  isAuthenticated: { value: false },
  isLoading: { value: false },
  checkAuth: vi.fn(),
};

vi.mock('../../../../composables/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock navigateTo
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

describe('AuthGuard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset mock auth state
    mockUseAuth.isAuthenticated.value = false;
    mockUseAuth.isLoading.value = false;
  });

  describe('Authentication Check', () => {
    it('should render content when user is authenticated', () => {
      mockUseAuth.isAuthenticated.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="auth-loading"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="auth-error"]').exists()).toBe(false);
    });

    it('should not render content when user is not authenticated', () => {
      mockUseAuth.isAuthenticated.value = false;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
    });

    it('should show loading state during authentication check', () => {
      mockUseAuth.isLoading.value = true;
      mockUseAuth.isAuthenticated.value = false;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="auth-loading"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
    });
  });

  describe('Redirection', () => {
    it('should redirect to login when not authenticated', async () => {
      mockUseAuth.isAuthenticated.value = false;
      mockUseAuth.isLoading.value = false;
      
      mount(AuthGuard, {
        props: {
          redirectTo: '/login'
        },
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should redirect to default login route when no redirectTo prop', async () => {
      mockUseAuth.isAuthenticated.value = false;
      mockUseAuth.isLoading.value = false;
      
      mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('/login');
    });

    it('should not redirect when user is authenticated', async () => {
      mockUseAuth.isAuthenticated.value = true;
      
      mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });

    it('should not redirect during loading', async () => {
      mockUseAuth.isLoading.value = true;
      mockUseAuth.isAuthenticated.value = false;
      
      mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNavigateTo).not.toHaveBeenCalled();
    });
  });

  describe('Auth Status Check', () => {
    it('should call checkAuth on mount', () => {
      mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      expect(mockUseAuth.checkAuth).toHaveBeenCalled();
    });

    it('should only call checkAuth once per mount', () => {
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      // Trigger re-render
      wrapper.vm.$forceUpdate();
      
      expect(mockUseAuth.checkAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Content', () => {
    it('should render fallback slot when not authenticated', () => {
      mockUseAuth.isAuthenticated.value = false;
      mockUseAuth.isLoading.value = false;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>',
          fallback: '<div data-test="fallback-content">Please log in</div>'
        }
      });
      
      expect(wrapper.find('[data-test="fallback-content"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
    });

    it('should not render fallback slot when authenticated', () => {
      mockUseAuth.isAuthenticated.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>',
          fallback: '<div data-test="fallback-content">Please log in</div>'
        }
      });
      
      expect(wrapper.find('[data-test="fallback-content"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(true);
    });
  });

  describe('Loading Indicator', () => {
    it('should render loading indicator during auth check', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      const loadingIndicator = wrapper.find('[data-test="auth-loading"]');
      expect(loadingIndicator.exists()).toBe(true);
      expect(loadingIndicator.text()).toContain('Loading');
    });

    it('should render custom loading slot when provided', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>',
          loading: '<div data-test="custom-loading">Custom Loading...</div>'
        }
      });
      
      expect(wrapper.find('[data-test="custom-loading"]').exists()).toBe(true);
    });

    it('should not render loading when not loading', () => {
      mockUseAuth.isLoading.value = false;
      mockUseAuth.isAuthenticated.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="auth-loading"]').exists()).toBe(false);
    });
  });

  describe('Props', () => {
    it('should accept redirectTo prop', () => {
      const wrapper = mount(AuthGuard, {
        props: {
          redirectTo: '/custom-login'
        },
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      expect(wrapper.props('redirectTo')).toBe('/custom-login');
    });

    it('should accept requireRoles prop', () => {
      const wrapper = mount(AuthGuard, {
        props: {
          requireRoles: ['admin', 'moderator']
        },
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      expect(wrapper.props('requireRoles')).toEqual(['admin', 'moderator']);
    });
  });

  describe('Role-based Access', () => {
    it('should check roles when requireRoles prop is provided', () => {
      // Mock hasRole method in useAuth
      const mockHasRole = vi.fn().mockReturnValue(true);
      mockUseAuth.hasRole = mockHasRole;
      mockUseAuth.isAuthenticated.value = true;
      
      mount(AuthGuard, {
        props: {
          requireRoles: ['admin']
        },
        slots: {
          default: '<div data-test="protected-content">Admin Content</div>'
        }
      });
      
      expect(mockHasRole).toHaveBeenCalledWith('admin');
    });

    it('should deny access when user lacks required roles', () => {
      const mockHasRole = vi.fn().mockReturnValue(false);
      mockUseAuth.hasRole = mockHasRole;
      mockUseAuth.isAuthenticated.value = true;
      
      const wrapper = mount(AuthGuard, {
        props: {
          requireRoles: ['admin']
        },
        slots: {
          default: '<div data-test="protected-content">Admin Content</div>',
          unauthorized: '<div data-test="unauthorized">Access Denied</div>'
        }
      });
      
      expect(wrapper.find('[data-test="protected-content"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="unauthorized"]').exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle auth check errors gracefully', () => {
      mockUseAuth.checkAuth.mockRejectedValueOnce(new Error('Auth check failed'));
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      expect(wrapper.exists()).toBe(true);
      // Should not crash the component
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes during loading', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div>Protected Content</div>'
        }
      });
      
      const loadingElement = wrapper.find('[data-test="auth-loading"]');
      expect(loadingElement.attributes('role')).toBe('status');
      expect(loadingElement.attributes('aria-live')).toBe('polite');
    });

    it('should announce content changes for screen readers', () => {
      mockUseAuth.isAuthenticated.value = true;
      
      const wrapper = mount(AuthGuard, {
        slots: {
          default: '<div data-test="protected-content">Protected Content</div>'
        }
      });
      
      const content = wrapper.find('[data-test="protected-content"]');
      expect(content.exists()).toBe(true);
    });
  });
});