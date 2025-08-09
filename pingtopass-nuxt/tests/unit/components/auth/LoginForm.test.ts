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

// Mock Google OAuth
const mockGoogleAuth = {
  load: vi.fn(),
  accounts: {
    id: {
      initialize: vi.fn(),
      prompt: vi.fn(),
      renderButton: vi.fn(),
    }
  }
};
vi.stubGlobal('google', mockGoogleAuth);

describe('LoginForm Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    
    // Reset mock auth state
    mockUseAuth.isLoading.value = false;
    mockUseAuth.error.value = null;
  });

  describe('Component Structure', () => {
    it('should render the login form', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('form').exists()).toBe(true);
      expect(wrapper.find('[data-test="login-form"]').exists()).toBe(true);
    });

    it('should have form title', () => {
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('h1, h2').text()).toContain('Sign In');
    });

    it('should render email input field', () => {
      const wrapper = mount(LoginForm);
      
      const emailInput = wrapper.find('[data-test="email-input"]');
      expect(emailInput.exists()).toBe(true);
      expect(emailInput.attributes('type')).toBe('email');
      expect(emailInput.attributes('required')).toBeDefined();
    });

    it('should render password input field', () => {
      const wrapper = mount(LoginForm);
      
      const passwordInput = wrapper.find('[data-test="password-input"]');
      expect(passwordInput.exists()).toBe(true);
      expect(passwordInput.attributes('type')).toBe('password');
      expect(passwordInput.attributes('required')).toBeDefined();
    });

    it('should render remember me checkbox', () => {
      const wrapper = mount(LoginForm);
      
      const rememberCheckbox = wrapper.find('[data-test="remember-me"]');
      expect(rememberCheckbox.exists()).toBe(true);
      expect(rememberCheckbox.attributes('type')).toBe('checkbox');
    });

    it('should render submit button', () => {
      const wrapper = mount(LoginForm);
      
      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.exists()).toBe(true);
      expect(submitButton.attributes('type')).toBe('submit');
    });

    it('should render Google OAuth button', () => {
      const wrapper = mount(LoginForm);
      
      const googleButton = wrapper.find('[data-test="google-oauth-button"]');
      expect(googleButton.exists()).toBe(true);
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const wrapper = mount(LoginForm);
      
      // Try to submit empty form
      await wrapper.find('form').trigger('submit.prevent');
      
      // Check for validation errors
      expect(wrapper.find('[data-test="email-error"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="password-error"]').exists()).toBe(true);
    });

    it('should validate email format', async () => {
      const wrapper = mount(LoginForm);
      
      // Enter invalid email
      const emailInput = wrapper.find('[data-test="email-input"]');
      await emailInput.setValue('invalid-email');
      await emailInput.trigger('blur');
      
      expect(wrapper.find('[data-test="email-error"]').text()).toContain('valid email');
    });

    it('should validate password minimum length', async () => {
      const wrapper = mount(LoginForm);
      
      // Enter short password
      const passwordInput = wrapper.find('[data-test="password-input"]');
      await passwordInput.setValue('123');
      await passwordInput.trigger('blur');
      
      expect(wrapper.find('[data-test="password-error"]').text()).toContain('at least 6 characters');
    });

    it('should not show errors for valid inputs', async () => {
      const wrapper = mount(LoginForm);
      
      // Enter valid data
      const emailInput = wrapper.find('[data-test="email-input"]');
      const passwordInput = wrapper.find('[data-test="password-input"]');
      
      await emailInput.setValue('test@example.com');
      await passwordInput.setValue('validpassword');
      
      await emailInput.trigger('blur');
      await passwordInput.trigger('blur');
      
      expect(wrapper.find('[data-test="email-error"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="password-error"]').exists()).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should call login function with correct credentials', async () => {
      const wrapper = mount(LoginForm);
      
      // Fill form
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      await wrapper.find('[data-test="remember-me"]').setChecked(true);
      
      // Submit form
      await wrapper.find('form').trigger('submit.prevent');
      
      expect(mockUseAuth.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      });
    });

    it('should not submit form with invalid data', async () => {
      const wrapper = mount(LoginForm);
      
      // Try to submit with invalid email
      await wrapper.find('[data-test="email-input"]').setValue('invalid-email');
      await wrapper.find('[data-test="password-input"]').setValue('123');
      
      await wrapper.find('form').trigger('submit.prevent');
      
      expect(mockUseAuth.login).not.toHaveBeenCalled();
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
      await wrapper.find('form').trigger('submit.prevent');
      
      await wrapper.vm.$nextTick();
      
      expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to default route when no redirectTo prop', async () => {
      mockUseAuth.login.mockResolvedValueOnce(undefined);
      
      const wrapper = mount(LoginForm);
      
      // Fill and submit form
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      await wrapper.find('form').trigger('submit.prevent');
      
      await wrapper.vm.$nextTick();
      
      expect(mockNavigateTo).toHaveBeenCalledWith('/');
    });
  });

  describe('Loading States', () => {
    it('should disable form during loading', async () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('[data-test="email-input"]').attributes('disabled')).toBeDefined();
      expect(wrapper.find('[data-test="password-input"]').attributes('disabled')).toBeDefined();
      expect(wrapper.find('[data-test="submit-button"]').attributes('disabled')).toBeDefined();
    });

    it('should show loading indicator on submit button', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(LoginForm);
      
      const submitButton = wrapper.find('[data-test="submit-button"]');
      expect(submitButton.text()).toContain('Signing In');
      expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true);
    });

    it('should disable Google OAuth button during loading', () => {
      mockUseAuth.isLoading.value = true;
      
      const wrapper = mount(LoginForm);
      
      expect(wrapper.find('[data-test="google-oauth-button"]').attributes('disabled')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when login fails', () => {
      mockUseAuth.error.value = 'Invalid credentials';
      
      const wrapper = mount(LoginForm);
      
      const errorMessage = wrapper.find('[data-test="error-message"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toBe('Invalid credentials');
    });

    it('should clear error when user starts typing', async () => {
      mockUseAuth.error.value = 'Invalid credentials';
      
      const wrapper = mount(LoginForm);
      
      // User starts typing in email field
      await wrapper.find('[data-test="email-input"]').setValue('new@email.com');
      
      expect(mockUseAuth.clearError).toHaveBeenCalled();
    });

    it('should clear error when form is submitted', async () => {
      const wrapper = mount(LoginForm);
      
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      await wrapper.find('form').trigger('submit.prevent');
      
      expect(mockUseAuth.clearError).toHaveBeenCalled();
    });
  });

  describe('Google OAuth Integration', () => {
    it('should handle Google OAuth button click', async () => {
      const wrapper = mount(LoginForm);
      
      await wrapper.find('[data-test="google-oauth-button"]').trigger('click');
      
      // Should trigger Google OAuth flow
      expect(mockGoogleAuth.accounts.id.prompt).toHaveBeenCalled();
    });

    it('should call loginWithGoogle on successful OAuth', async () => {
      mockUseAuth.loginWithGoogle.mockResolvedValueOnce(undefined);
      
      const wrapper = mount(LoginForm);
      
      // Simulate Google OAuth success
      const mockCredential = 'mock-google-credential';
      await wrapper.vm.handleGoogleSuccess({ credential: mockCredential });
      
      expect(mockUseAuth.loginWithGoogle).toHaveBeenCalledWith(mockCredential);
    });

    it('should handle Google OAuth error', async () => {
      const wrapper = mount(LoginForm);
      
      // Simulate Google OAuth error
      await wrapper.vm.handleGoogleError();
      
      // Should display error message
      expect(wrapper.find('[data-test="error-message"]').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      const wrapper = mount(LoginForm);
      
      // Check email input label
      const emailLabel = wrapper.find('label[for="email"]');
      expect(emailLabel.exists()).toBe(true);
      expect(emailLabel.text()).toContain('Email');
      
      // Check password input label
      const passwordLabel = wrapper.find('label[for="password"]');
      expect(passwordLabel.exists()).toBe(true);
      expect(passwordLabel.text()).toContain('Password');
    });

    it('should have proper ARIA attributes for error states', async () => {
      const wrapper = mount(LoginForm);
      
      // Trigger validation error
      await wrapper.find('form').trigger('submit.prevent');
      
      const emailInput = wrapper.find('[data-test="email-input"]');
      expect(emailInput.attributes('aria-invalid')).toBe('true');
      expect(emailInput.attributes('aria-describedby')).toContain('email-error');
    });

    it('should have proper form structure for screen readers', () => {
      const wrapper = mount(LoginForm);
      
      // Check form has proper role and labels
      expect(wrapper.find('form').attributes('role')).toBe('form');
      expect(wrapper.find('h1, h2').exists()).toBe(true);
    });

    it('should be keyboard navigable', async () => {
      const wrapper = mount(LoginForm);
      
      // Tab through form elements
      const emailInput = wrapper.find('[data-test="email-input"]');
      const passwordInput = wrapper.find('[data-test="password-input"]');
      const rememberCheckbox = wrapper.find('[data-test="remember-me"]');
      const submitButton = wrapper.find('[data-test="submit-button"]');
      
      expect(emailInput.attributes('tabindex')).not.toBe('-1');
      expect(passwordInput.attributes('tabindex')).not.toBe('-1');
      expect(rememberCheckbox.attributes('tabindex')).not.toBe('-1');
      expect(submitButton.attributes('tabindex')).not.toBe('-1');
    });
  });

  describe('Props and Events', () => {
    it('should accept redirectTo prop', () => {
      const wrapper = mount(LoginForm, {
        props: {
          redirectTo: '/custom-route'
        }
      });
      
      expect(wrapper.props('redirectTo')).toBe('/custom-route');
    });

    it('should emit success event after login', async () => {
      mockUseAuth.login.mockResolvedValueOnce(undefined);
      
      const wrapper = mount(LoginForm);
      
      await wrapper.find('[data-test="email-input"]').setValue('test@example.com');
      await wrapper.find('[data-test="password-input"]').setValue('password123');
      await wrapper.find('form').trigger('submit.prevent');
      
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('success')).toBeTruthy();
    });
  });
});