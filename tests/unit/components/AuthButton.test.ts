/**
 * AuthButton Component Tests
 * Comprehensive test suite covering all authentication states and functionality
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AuthButton from '@/components/AuthButton.vue';

// Component type for better TypeScript support
type AuthButtonWrapper = VueWrapper<InstanceType<typeof AuthButton>>;

// Mock user data
const mockUser = {
  id: '123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  picture: 'https://example.com/avatar.jpg',
  verified_email: true
};

const mockUserWithoutPicture = {
  id: '456',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  verified_email: false
};

describe('AuthButton', () => {
  let wrapper: AuthButtonWrapper;

  const createWrapper = (props = {}) => {
    return mount(AuthButton, {
      props: {
        ...props
      }
    }) as AuthButtonWrapper;
  };

  beforeEach(() => {
    wrapper = createWrapper();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Rendering', () => {
    it('should render the component with correct test id', () => {
      expect(wrapper.find('[data-testid="auth-button-container"]').exists()).toBe(true);
    });

    it('should show unauthenticated state by default', () => {
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="google-icon"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="auth-authenticated"]').exists()).toBe(false);
    });

    it('should show authenticated state when user is provided', () => {
      wrapper = createWrapper({ user: mockUser });
      
      expect(wrapper.find('[data-testid="auth-authenticated"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="user-info"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="user-actions"]').exists()).toBe(true);
    });

    it('should show loading state when loading is true', () => {
      wrapper = createWrapper({ loading: true });
      
      expect(wrapper.find('[data-testid="auth-loading"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="auth-authenticated"]').exists()).toBe(false);
    });

    it('should show error state when error is provided', () => {
      wrapper = createWrapper({ error: 'Authentication failed' });
      
      expect(wrapper.find('[data-testid="auth-error"]').exists()).toBe(true);
    });
  });

  describe('Props Validation', () => {
    it('should have correct default prop values', () => {
      expect(wrapper.props('loading')).toBe(false);
      expect(wrapper.props('user')).toBe(null);
      expect(wrapper.props('error')).toBe(null);
      expect(wrapper.props('loginText')).toBe('Sign in with Google');
      expect(wrapper.props('logoutText')).toBe('Sign out');
      expect(wrapper.props('loadingText')).toBe('Authenticating...');
      expect(wrapper.props('showSecurityNote')).toBe(true);
      expect(wrapper.props('showProfileButton')).toBe(false);
      expect(wrapper.props('showSettingsButton')).toBe(false);
    });

    it('should accept custom text props', () => {
      wrapper = createWrapper({
        loginText: 'Custom Login',
        logoutText: 'Custom Logout',
        loadingText: 'Custom Loading...'
      });

      expect(wrapper.props('loginText')).toBe('Custom Login');
      expect(wrapper.props('logoutText')).toBe('Custom Logout');
      expect(wrapper.props('loadingText')).toBe('Custom Loading...');
    });

    it('should display custom text in UI', () => {
      wrapper = createWrapper({
        loginText: 'Custom Login',
        loadingText: 'Custom Loading...'
      });

      expect(wrapper.text()).toContain('Custom Login');
    });

    it('should display custom logout text when authenticated', () => {
      wrapper = createWrapper({
        user: mockUser,
        logoutText: 'Custom Logout'
      });

      expect(wrapper.find('[data-testid="logout-button"]').text()).toBe('Custom Logout');
    });
  });

  describe('Unauthenticated State', () => {
    it('should display login button with Google icon', () => {
      const loginButton = wrapper.find('[data-testid="login-button"]');
      const googleIcon = wrapper.find('[data-testid="google-icon"]');
      
      expect(loginButton.exists()).toBe(true);
      expect(googleIcon.exists()).toBe(true);
      expect(loginButton.text()).toContain('Sign in with Google');
    });

    it('should show security note by default', () => {
      const securityNote = wrapper.find('[data-testid="security-note"]');
      expect(securityNote.exists()).toBe(true);
      expect(securityNote.text()).toContain('Secure authentication powered by Google OAuth');
    });

    it('should hide security note when showSecurityNote is false', () => {
      wrapper = createWrapper({ showSecurityNote: false });
      expect(wrapper.find('[data-testid="security-note"]').exists()).toBe(false);
    });

    it('should have proper accessibility attributes on login button', () => {
      const loginButton = wrapper.find('[data-testid="login-button"]');
      expect(loginButton.attributes('aria-label')).toBe('Sign in with Google');
    });

    it('should emit login event when login button is clicked', async () => {
      const loginButton = wrapper.find('[data-testid="login-button"]');
      await loginButton.trigger('click');
      
      const loginEvents = wrapper.emitted('login');
      expect(loginEvents).toHaveLength(1);
    });

    it('should not emit login event when loading', async () => {
      wrapper = createWrapper({ loading: true });
      // In loading state, login button is not present
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(false);
    });

    it('should disable login button when loading', () => {
      wrapper = createWrapper({ loading: false });
      const loginButton = wrapper.find('[data-testid="login-button"]');
      expect(loginButton.attributes('disabled')).toBeFalsy();
    });
  });

  describe('Authenticated State', () => {
    beforeEach(() => {
      wrapper = createWrapper({ user: mockUser });
    });

    it('should display user information correctly', () => {
      const userName = wrapper.find('[data-testid="user-name"]');
      const userEmail = wrapper.find('[data-testid="user-email"]');
      const userAvatar = wrapper.find('[data-testid="user-avatar"]');
      
      expect(userName.text()).toBe(mockUser.name);
      expect(userEmail.text()).toBe(mockUser.email);
      expect(userAvatar.exists()).toBe(true);
    });

    it('should display user avatar when picture is available', () => {
      const avatarImage = wrapper.find('.avatar-image');
      expect(avatarImage.exists()).toBe(true);
      expect(avatarImage.attributes('src')).toBe(mockUser.picture);
      expect(avatarImage.attributes('alt')).toBe(`${mockUser.name} avatar`);
    });

    it('should display user initials when picture is not available', () => {
      wrapper = createWrapper({ user: mockUserWithoutPicture });
      
      const avatarPlaceholder = wrapper.find('.avatar-placeholder');
      expect(avatarPlaceholder.exists()).toBe(true);
      expect(avatarPlaceholder.text()).toBe('JS'); // Jane Smith -> JS
    });

    it('should display verification status correctly', () => {
      const verification = wrapper.find('[data-testid="user-verification"]');
      expect(verification.exists()).toBe(true);
      expect(verification.text()).toContain('Verified');
      
      const badge = verification.find('.verification-badge');
      expect(badge.classes()).toContain('verified');
    });

    it('should display unverified status for unverified users', () => {
      wrapper = createWrapper({ user: mockUserWithoutPicture });
      
      const verification = wrapper.find('[data-testid="user-verification"]');
      const badge = verification.find('.verification-badge');
      
      expect(verification.text()).toContain('Unverified');
      expect(badge.classes()).not.toContain('verified');
    });

    it('should show logout button by default', () => {
      const logoutButton = wrapper.find('[data-testid="logout-button"]');
      expect(logoutButton.exists()).toBe(true);
      expect(logoutButton.text()).toBe('Sign out');
    });

    it('should show profile button when showProfileButton is true', () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showProfileButton: true 
      });
      
      expect(wrapper.find('[data-testid="profile-button"]').exists()).toBe(true);
    });

    it('should show settings button when showSettingsButton is true', () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showSettingsButton: true 
      });
      
      expect(wrapper.find('[data-testid="settings-button"]').exists()).toBe(true);
    });

    it('should not show profile and settings buttons by default', () => {
      expect(wrapper.find('[data-testid="profile-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="settings-button"]').exists()).toBe(false);
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      wrapper = createWrapper({ loading: true });
    });

    it('should display loading spinner and text', () => {
      const loadingContainer = wrapper.find('[data-testid="auth-loading"]');
      const spinner = wrapper.find('.loading-spinner');
      const loadingText = wrapper.find('.loading-text');
      
      expect(loadingContainer.exists()).toBe(true);
      expect(spinner.exists()).toBe(true);
      expect(loadingText.text()).toBe('Authenticating...');
    });

    it('should display custom loading text', () => {
      wrapper = createWrapper({ 
        loading: true, 
        loadingText: 'Please wait...' 
      });
      
      const loadingText = wrapper.find('.loading-text');
      expect(loadingText.text()).toBe('Please wait...');
    });

    it('should not show other states when loading', () => {
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="auth-authenticated"]').exists()).toBe(false);
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      wrapper = createWrapper({ error: 'Authentication failed' });
    });

    it('should display error message', () => {
      const errorContainer = wrapper.find('[data-testid="auth-error"]');
      const errorText = wrapper.find('.error-text');
      
      expect(errorContainer.exists()).toBe(true);
      expect(errorText.text()).toBe('Authentication failed');
    });

    it('should show retry button', () => {
      const retryButton = wrapper.find('[data-testid="error-retry"]');
      expect(retryButton.exists()).toBe(true);
      expect(retryButton.text()).toBe('Dismiss');
    });

    it('should emit error-cleared event when retry button is clicked', async () => {
      const retryButton = wrapper.find('[data-testid="error-retry"]');
      await retryButton.trigger('click');
      
      const errorClearedEvents = wrapper.emitted('error-cleared');
      expect(errorClearedEvents).toHaveLength(1);
    });
  });

  describe('Event Handling', () => {
    it('should emit logout event when logout button is clicked', async () => {
      wrapper = createWrapper({ user: mockUser });
      
      const logoutButton = wrapper.find('[data-testid="logout-button"]');
      await logoutButton.trigger('click');
      
      const logoutEvents = wrapper.emitted('logout');
      expect(logoutEvents).toHaveLength(1);
    });

    it('should emit profile event when profile button is clicked', async () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showProfileButton: true 
      });
      
      const profileButton = wrapper.find('[data-testid="profile-button"]');
      await profileButton.trigger('click');
      
      const profileEvents = wrapper.emitted('profile');
      expect(profileEvents).toHaveLength(1);
    });

    it('should emit settings event when settings button is clicked', async () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showSettingsButton: true 
      });
      
      const settingsButton = wrapper.find('[data-testid="settings-button"]');
      await settingsButton.trigger('click');
      
      const settingsEvents = wrapper.emitted('settings');
      expect(settingsEvents).toHaveLength(1);
    });

    it('should not emit logout event when loading', async () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        loading: true 
      });
      
      // Should not show logout button or should disable it when loading
      const logoutButton = wrapper.find('[data-testid="logout-button"]');
      if (logoutButton.exists()) {
        expect(logoutButton.attributes('disabled')).toBeTruthy();
      }
    });
  });

  describe('Computed Properties', () => {
    it('should calculate user initials correctly', () => {
      wrapper = createWrapper({ user: mockUser });
      expect(wrapper.vm.userInitials).toBe('JD'); // John Doe -> JD
    });

    it('should handle single name for initials', () => {
      const singleNameUser = { ...mockUser, name: 'John' };
      wrapper = createWrapper({ user: singleNameUser });
      expect(wrapper.vm.userInitials).toBe('J');
    });

    it('should handle empty name for initials', () => {
      const noNameUser = { ...mockUser, name: '' };
      wrapper = createWrapper({ user: noNameUser });
      expect(wrapper.vm.userInitials).toBe('?');
    });

    it('should limit initials to two characters', () => {
      const multiNameUser = { ...mockUser, name: 'John Michael Smith Doe' };
      wrapper = createWrapper({ user: multiNameUser });
      expect(wrapper.vm.userInitials).toBe('JM'); // Only first two names
    });

    it('should correctly identify authenticated state', () => {
      expect(wrapper.vm.isAuthenticated).toBe(false);
      
      wrapper = createWrapper({ user: mockUser });
      expect(wrapper.vm.isAuthenticated).toBe(true);
    });
  });

  describe('Avatar Error Handling', () => {
    it('should fallback to initials when avatar image fails to load', async () => {
      wrapper = createWrapper({ user: mockUser });
      
      // Initially should show avatar image
      let avatarImage = wrapper.find('.avatar-image');
      expect(avatarImage.exists()).toBe(true);
      
      // Trigger image error
      await avatarImage.trigger('error');
      
      // Should now show placeholder
      const avatarPlaceholder = wrapper.find('.avatar-placeholder');
      expect(avatarPlaceholder.exists()).toBe(true);
      expect(avatarPlaceholder.text()).toBe('JD');
    });

    it('should reset avatar error when user changes', async () => {
      wrapper = createWrapper({ user: mockUser });
      
      // Trigger avatar error
      const avatarImage = wrapper.find('.avatar-image');
      await avatarImage.trigger('error');
      
      // Change user
      const newUser = { ...mockUser, id: '789', picture: 'new-avatar.jpg' };
      await wrapper.setProps({ user: newUser });
      
      // Avatar error should be reset
      const newAvatarImage = wrapper.find('.avatar-image');
      expect(newAvatarImage.exists()).toBe(true);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for login button', async () => {
      const loginButton = wrapper.find('[data-testid="login-button"]');
      
      // Test Enter key
      await loginButton.trigger('keydown.enter');
      expect(wrapper.emitted('login')).toHaveLength(1);
      
      // Test Space key
      await loginButton.trigger('keydown.space');
      expect(wrapper.emitted('login')).toHaveLength(2);
    });

    it('should support keyboard navigation for action buttons', async () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showProfileButton: true 
      });
      
      const profileButton = wrapper.find('[data-testid="profile-button"]');
      await profileButton.trigger('keydown.enter');
      
      expect(wrapper.emitted('profile')).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const loginButton = wrapper.find('[data-testid="login-button"]');
      expect(loginButton.attributes('aria-label')).toBe('Sign in with Google');
    });

    it('should have proper ARIA labels for action buttons', () => {
      wrapper = createWrapper({ 
        user: mockUser, 
        showProfileButton: true,
        showSettingsButton: true
      });
      
      const profileButton = wrapper.find('[data-testid="profile-button"]');
      const settingsButton = wrapper.find('[data-testid="settings-button"]');
      const logoutButton = wrapper.find('[data-testid="logout-button"]');
      
      expect(profileButton.attributes('aria-label')).toBe('View profile');
      expect(settingsButton.attributes('aria-label')).toBe('Open settings');
      expect(logoutButton.attributes('aria-label')).toBe('Sign out');
    });

    it('should have proper alt text for avatar image', () => {
      wrapper = createWrapper({ user: mockUser });
      
      const avatarImage = wrapper.find('.avatar-image');
      expect(avatarImage.attributes('alt')).toBe(`${mockUser.name} avatar`);
    });
  });

  describe('Component Methods', () => {
    it('should expose methods for testing', () => {
      expect(wrapper.vm.isAuthenticated).toBeDefined();
      expect(wrapper.vm.userInitials).toBeDefined();
      expect(wrapper.vm.handleLogin).toBeDefined();
      expect(wrapper.vm.handleLogout).toBeDefined();
      expect(wrapper.vm.clearError).toBeDefined();
    });

    it('should call handleLogin method when login is triggered', () => {
      const handleLoginSpy = vi.spyOn(wrapper.vm, 'handleLogin');
      wrapper.vm.handleLogin();
      expect(handleLoginSpy).toHaveBeenCalled();
    });

    it('should call clearError method when error is cleared', () => {
      wrapper = createWrapper({ error: 'Test error' });
      const clearErrorSpy = vi.spyOn(wrapper.vm, 'clearError');
      wrapper.vm.clearError();
      expect(clearErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined user gracefully', () => {
      wrapper = createWrapper({ user: undefined });
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(true);
    });

    it('should handle null user gracefully', () => {
      wrapper = createWrapper({ user: null });
      expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(true);
    });

    it('should handle user without verification status', () => {
      const userWithoutVerification = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
        // No verified_email property
      };
      
      wrapper = createWrapper({ user: userWithoutVerification });
      expect(wrapper.find('[data-testid="user-verification"]').exists()).toBe(false);
    });

    it('should handle very long user names', () => {
      const longNameUser = {
        ...mockUser,
        name: 'This Is A Very Long User Name That Should Be Handled Gracefully'
      };
      
      wrapper = createWrapper({ user: longNameUser });
      const userName = wrapper.find('[data-testid="user-name"]');
      expect(userName.exists()).toBe(true);
      expect(userName.classes()).toContain('truncate');
    });

    it('should handle very long email addresses', () => {
      const longEmailUser = {
        ...mockUser,
        email: 'this.is.a.very.long.email.address.that.should.be.handled@example-domain.com'
      };
      
      wrapper = createWrapper({ user: longEmailUser });
      const userEmail = wrapper.find('[data-testid="user-email"]');
      expect(userEmail.exists()).toBe(true);
      expect(userEmail.classes()).toContain('truncate');
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot for unauthenticated state', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for authenticated state', () => {
      wrapper = createWrapper({ user: mockUser });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for loading state', () => {
      wrapper = createWrapper({ loading: true });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for error state', () => {
      wrapper = createWrapper({ error: 'Authentication failed' });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot with all optional buttons', () => {
      wrapper = createWrapper({ 
        user: mockUser,
        showProfileButton: true,
        showSettingsButton: true
      });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for user without avatar', () => {
      wrapper = createWrapper({ user: mockUserWithoutPicture });
      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});