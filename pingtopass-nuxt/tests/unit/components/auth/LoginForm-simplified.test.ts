import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import LoginForm from '../../../../components/auth/LoginForm.vue';

// Mock the auth composable
const mockUseAuth = {
  login: vi.fn(),
  loginWithGoogle: vi.fn(),
  isLoading: { value: false },
  error: { value: null },
  clearError: vi.fn(),
};

vi.mock('../../../../composables/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock navigateTo
const mockNavigateTo = vi.fn();
vi.stubGlobal('navigateTo', mockNavigateTo);

// Mock useRuntimeConfig
const mockUseRuntimeConfig = vi.fn(() => ({
  public: {
    googleClientId: '839223616841-852etbibqav0js5hh2gm5bh45785j2e9.apps.googleusercontent.com'
  }
}));
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig);

describe('LoginForm Component - Core Functionality', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset mock auth state
    mockUseAuth.isLoading.value = false;
    mockUseAuth.error.value = null;
  });

  describe('Basic Structure', () => {
    it('should render the login form', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('form').exists()).toBe(true);
      expect(wrapper.find('[data-test="login-form"]').exists()).toBe(true);
    });

    it('should render email and password inputs', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('[data-test="email-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="password-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="submit-button"]').exists()).toBe(true);
    });
  });

  describe('Form Submission', () => {
    it('should call login with valid data', async () => {
      mockUseAuth.login.mockResolvedValueOnce(undefined);
      
      const wrapper = mount(LoginForm);
      
      // Fill form with valid data
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      
      // Wait for validation to complete
      await wrapper.vm.$nextTick();
      
      // Submit form
      await wrapper.find('form').trigger('submit.prevent');
      
      // Wait for async operations
      await wrapper.vm.$nextTick();
      
      expect(mockUseAuth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      });
    });

    it('should redirect after successful login', async () => {
      mockUseAuth.login.mockResolvedValueOnce(undefined);
      
      const wrapper = mount(LoginForm, {
        props: {
          redirectTo: '/dashboard'
        }
      });
      
      // Fill and submit form
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      await wrapper.vm.$nextTick();
      
      await wrapper.find('form').trigger('submit.prevent');
      await wrapper.vm.$nextTick();
      
      // Wait a bit more for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Loading States', () => {
    it('should disable inputs during loading', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('[data-test="email-input"]').attributes('disabled')).toBeDefined();
      expect(wrapper.find('[data-test="password-input"]').attributes('disabled')).toBeDefined();
      expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined();
    });

    it('should show loading text on submit button', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(LoginForm);
      
      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.text()).toContain('Signing In');
    });
  });

  describe('Error Display', () => {
    it('should display auth errors', () => {
      mockUseAuth.error.value = 'Invalid credentials';
      
      const wrapper = mount(LoginForm);
      
      const errorMessage = wrapper.find('[data-test="error-message"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toContain('Invalid credentials');
    });

    it('should clear error when user types', async () => {
      mockUseAuth.error.value = 'Invalid credentials';
      
      const wrapper = mount(LoginForm);
      
      // User types in email field
      await wrapper.find('[data-test="email-input"]').trigger('input');
      
      expect(mockUseAuth.clearError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('label[for="email"]').exists()).toBe(true);
      expect(wrapper.find('label[for="password"]').exists()).toBe(true);
    });

    it('should have proper form structure', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('form').attributes('role')).toBe('form');
      expect(wrapper.find('h1, h2').exists()).toBe(true);
    });
  });
});