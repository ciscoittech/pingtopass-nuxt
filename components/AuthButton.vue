<template>
  <div class="auth-button-container" data-testid="auth-button-container">
    <!-- Loading State -->
    <div v-if="loading" class="auth-loading" data-testid="auth-loading">
      <div class="loading-spinner" />
      <span class="loading-text">{{ loadingText }}</span>
    </div>

    <!-- Unauthenticated State -->
    <div v-else-if="!user" class="auth-unauthenticated">
      <button
        class="auth-button login-button"
        @click="handleLogin"
        :disabled="loading"
        data-testid="login-button"
        aria-label="Sign in with Google"
      >
        <div class="button-content">
          <div class="google-icon" data-testid="google-icon">
            <svg class="icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          <span class="button-text">{{ loginText }}</span>
        </div>
      </button>
      
      <p v-if="showSecurityNote" class="security-note" data-testid="security-note">
        Secure authentication powered by Google OAuth
      </p>
    </div>

    <!-- Authenticated State -->
    <div v-else class="auth-authenticated" data-testid="auth-authenticated">
      <!-- User Info -->
      <div class="user-info" data-testid="user-info">
        <div class="user-avatar" data-testid="user-avatar">
          <img 
            v-if="user.picture" 
            :src="user.picture" 
            :alt="`${user.name} avatar`"
            class="avatar-image"
            @error="handleAvatarError"
          />
          <div v-else class="avatar-placeholder">
            {{ userInitials }}
          </div>
        </div>
        
        <div class="user-details">
          <div class="user-name" data-testid="user-name">{{ user.name }}</div>
          <div class="user-email" data-testid="user-email">{{ user.email }}</div>
          <div v-if="user.verified_email !== undefined" class="user-verification" data-testid="user-verification">
            <span class="verification-badge" :class="{ 'verified': user.verified_email }">
              <span class="verification-icon">
                {{ user.verified_email ? '✓' : '⚠' }}
              </span>
              {{ user.verified_email ? 'Verified' : 'Unverified' }}
            </span>
          </div>
        </div>
      </div>

      <!-- User Actions -->
      <div class="user-actions" data-testid="user-actions">
        <button 
          v-if="showProfileButton"
          class="action-button secondary"
          @click="$emit('profile')"
          data-testid="profile-button"
          aria-label="View profile"
        >
          Profile
        </button>
        
        <button 
          v-if="showSettingsButton"
          class="action-button secondary"
          @click="$emit('settings')"
          data-testid="settings-button"
          aria-label="Open settings"
        >
          Settings
        </button>
        
        <button
          class="action-button logout"
          @click="handleLogout"
          :disabled="loading"
          data-testid="logout-button"
          aria-label="Sign out"
        >
          {{ logoutText }}
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="auth-error" data-testid="auth-error">
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ error }}</span>
      </div>
      <button 
        class="error-retry"
        @click="clearError"
        data-testid="error-retry"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  verified_email?: boolean;
}

interface Props {
  loading?: boolean;
  user?: User | null;
  error?: string | null;
  loginText?: string;
  logoutText?: string;
  loadingText?: string;
  showSecurityNote?: boolean;
  showProfileButton?: boolean;
  showSettingsButton?: boolean;
}

interface Emits {
  (e: 'login'): void;
  (e: 'logout'): void;
  (e: 'profile'): void;
  (e: 'settings'): void;
  (e: 'error-cleared'): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  user: null,
  error: null,
  loginText: 'Sign in with Google',
  logoutText: 'Sign out',
  loadingText: 'Authenticating...',
  showSecurityNote: true,
  showProfileButton: false,
  showSettingsButton: false
});

const emit = defineEmits<Emits>();

// Reactive state
const avatarError = ref(false);

// Computed properties
const userInitials = computed(() => {
  if (!props.user?.name) return '?';
  return props.user.name
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
});

const isAuthenticated = computed(() => !!props.user);

// Methods
const handleLogin = () => {
  if (props.loading) return;
  emit('login');
};

const handleLogout = () => {
  if (props.loading) return;
  emit('logout');
};

const handleAvatarError = () => {
  avatarError.value = true;
};

const clearError = () => {
  emit('error-cleared');
};

// Keyboard navigation support
const handleKeydown = (event: KeyboardEvent, action: string) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    switch (action) {
      case 'login':
        handleLogin();
        break;
      case 'logout':
        handleLogout();
        break;
      case 'profile':
        emit('profile');
        break;
      case 'settings':
        emit('settings');
        break;
      case 'clearError':
        clearError();
        break;
    }
  }
};

// Watch for user changes to reset avatar error
watch(() => props.user?.picture, () => {
  avatarError.value = false;
});

// Expose for testing
defineExpose({
  isAuthenticated,
  userInitials,
  handleLogin,
  handleLogout,
  clearError
});
</script>

<style scoped>
.auth-button-container {
  @apply space-y-4;
}

/* Loading State */
.auth-loading {
  @apply flex items-center justify-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200;
}

.loading-spinner {
  @apply w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin;
}

.loading-text {
  @apply text-gray-600 font-medium;
}

/* Login Button */
.login-button {
  @apply w-full bg-white border border-gray-300 rounded-lg px-4 py-3 
         flex items-center justify-center space-x-3 text-gray-700 font-medium
         hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 
         focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200;
}

.login-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.button-content {
  @apply flex items-center space-x-3;
}

.google-icon {
  @apply flex-shrink-0;
}

.google-icon .icon {
  @apply w-5 h-5;
}

.button-text {
  @apply select-none;
}

.security-note {
  @apply text-sm text-gray-500 text-center mt-2;
}

/* Authenticated State */
.auth-authenticated {
  @apply bg-white border border-gray-200 rounded-lg p-4 space-y-4;
}

.user-info {
  @apply flex items-center space-x-3;
}

.user-avatar {
  @apply flex-shrink-0 w-12 h-12;
}

.avatar-image {
  @apply w-full h-full rounded-full object-cover border border-gray-200;
}

.avatar-placeholder {
  @apply w-full h-full rounded-full bg-blue-100 text-blue-600 
         flex items-center justify-center font-semibold text-lg;
}

.user-details {
  @apply flex-1 min-w-0 space-y-1;
}

.user-name {
  @apply font-semibold text-gray-900 truncate;
}

.user-email {
  @apply text-sm text-gray-600 truncate;
}

.user-verification {
  @apply flex items-center;
}

.verification-badge {
  @apply inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full;
}

.verification-badge.verified {
  @apply bg-green-100 text-green-800;
}

.verification-badge:not(.verified) {
  @apply bg-yellow-100 text-yellow-800;
}

.verification-icon {
  @apply text-xs;
}

.user-actions {
  @apply flex flex-wrap gap-2 justify-end;
}

.action-button {
  @apply px-3 py-1.5 rounded text-sm font-medium transition-colors duration-200;
}

.action-button.secondary {
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200 
         focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50;
}

.action-button.logout {
  @apply bg-red-100 text-red-700 hover:bg-red-200 
         focus:ring-2 focus:ring-red-500 focus:ring-opacity-50;
}

.action-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

.action-button:focus {
  @apply outline-none;
}

/* Error State */
.auth-error {
  @apply bg-red-50 border border-red-200 rounded-lg p-4 space-y-3;
}

.error-message {
  @apply flex items-center space-x-2;
}

.error-icon {
  @apply text-red-600;
}

.error-text {
  @apply text-red-800 font-medium;
}

.error-retry {
  @apply text-sm text-red-600 hover:text-red-800 font-medium 
         focus:outline-none focus:underline;
}

/* Responsive Design */
@media (max-width: 640px) {
  .user-info {
    @apply flex-col items-start space-y-3 space-x-0;
  }
  
  .user-actions {
    @apply flex-col space-y-2;
  }
  
  .action-button {
    @apply w-full justify-center;
  }
}
</style>