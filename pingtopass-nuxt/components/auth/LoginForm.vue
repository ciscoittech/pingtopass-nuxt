<template>
  <div class="login-form-container">
    <form 
      role="form" 
      data-test="login-form"
      @submit.prevent="handleSubmit"
      class="space-y-6"
    >
      <div class="text-center">
        <h2 class="text-2xl font-bold text-gray-900">Sign In to PingToPass</h2>
        <p class="mt-2 text-sm text-gray-600">
          Continue your IT certification journey
        </p>
      </div>

      <!-- Error Message -->
      <div 
        v-if="error" 
        data-test="error-message"
        class="p-4 rounded-md bg-red-50 border border-red-200"
        role="alert"
      >
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Google OAuth Button -->
      <div>
        <button
          type="button"
          data-test="google-oauth-button"
          :disabled="isLoading"
          @click="handleGoogleSignIn"
          class="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </div>

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      <!-- Email Input -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <div class="mt-1">
          <input
            id="email"
            v-model="formData.email"
            data-test="email-input"
            type="email"
            name="email"
            autocomplete="email"
            required
            :disabled="isLoading"
            :aria-invalid="!!validationErrors.email"
            :aria-describedby="validationErrors.email ? 'email-error' : undefined"
            @input="handleEmailInput"
            @blur="validateEmail"
            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your email"
          />
        </div>
        <div
          v-if="validationErrors.email"
          id="email-error"
          data-test="email-error"
          class="mt-1 text-sm text-red-600"
          role="alert"
        >
          {{ validationErrors.email }}
        </div>
      </div>

      <!-- Password Input -->
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div class="mt-1">
          <input
            id="password"
            v-model="formData.password"
            data-test="password-input"
            type="password"
            name="password"
            autocomplete="current-password"
            required
            :disabled="isLoading"
            :aria-invalid="!!validationErrors.password"
            :aria-describedby="validationErrors.password ? 'password-error' : undefined"
            @input="handlePasswordInput"
            @blur="validatePassword"
            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your password"
          />
        </div>
        <div
          v-if="validationErrors.password"
          id="password-error"
          data-test="password-error"
          class="mt-1 text-sm text-red-600"
          role="alert"
        >
          {{ validationErrors.password }}
        </div>
      </div>

      <!-- Remember Me -->
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            v-model="formData.rememberMe"
            data-test="remember-me"
            type="checkbox"
            :disabled="isLoading"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label for="remember-me" class="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        <div class="text-sm">
          <a href="#" class="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </a>
        </div>
      </div>

      <!-- Submit Button -->
      <div>
        <button
          type="submit"
          data-test="submit-button"
          :disabled="isLoading || !isFormValid"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading" data-test="loading-spinner" class="mr-2">
            <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </button>
      </div>

      <!-- Sign Up Link -->
      <div class="text-center">
        <p class="text-sm text-gray-600">
          Don't have an account?
          <a href="/register" class="font-medium text-blue-600 hover:text-blue-500">
            Sign up for free
          </a>
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuth } from '../../composables/useAuth';

// Props
interface Props {
  redirectTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  redirectTo: '/'
});

// Emits
const emit = defineEmits<{
  success: [void]
}>();

// Composables
const { login, loginWithGoogle, isLoading, error, clearError } = useAuth();

// Form data
const formData = reactive({
  email: '',
  password: '',
  rememberMe: false
});

// Validation
const validationErrors = reactive({
  email: '',
  password: ''
});

// Computed
const isFormValid = computed(() => {
  return formData.email && formData.password;
});

// Methods
const validateEmail = () => {
  if (!formData.email) {
    validationErrors.email = 'Email is required';
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    validationErrors.email = 'Please enter a valid email address';
    return false;
  }
  
  validationErrors.email = '';
  return true;
};

const validatePassword = () => {
  if (!formData.password) {
    validationErrors.password = 'Password is required';
    return false;
  }
  
  if (formData.password.length < 6) {
    validationErrors.password = 'Password must be at least 6 characters';
    return false;
  }
  
  validationErrors.password = '';
  return true;
};

const handleEmailInput = () => {
  if (error.value) {
    clearError();
  }
  if (validationErrors.email) {
    validationErrors.email = '';
  }
};

const handlePasswordInput = () => {
  if (error.value) {
    clearError();
  }
  if (validationErrors.password) {
    validationErrors.password = '';
  }
};

const handleSubmit = async () => {
  // Clear previous errors
  clearError();
  
  // Basic validation
  if (!formData.email || !formData.password) {
    return;
  }
  
  try {
    await login({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe
    });
    
    emit('success');
    await navigateTo(props.redirectTo);
  } catch (err) {
    // Error is handled by the auth store
    console.error('Login failed:', err);
  }
};

const handleGoogleSignIn = () => {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.prompt();
  } else {
    // Initialize Google OAuth if not already done
    initializeGoogleOAuth();
  }
};

const handleGoogleSuccess = async (response: { credential: string }) => {
  try {
    await loginWithGoogle(response.credential);
    emit('success');
    await navigateTo(props.redirectTo);
  } catch (err) {
    console.error('Google login failed:', err);
  }
};

const handleGoogleError = () => {
  console.error('Google OAuth error');
  // Set a generic error message
  validationErrors.email = 'Google sign-in failed. Please try again.';
};

const initializeGoogleOAuth = () => {
  const config = useRuntimeConfig();
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: config.public.googleClientId,
      callback: handleGoogleSuccess,
      auto_select: false,
      cancel_on_tap_outside: false
    });
  }
};

// Lifecycle
onMounted(() => {
  // Initialize Google OAuth when component mounts
  if (typeof window !== 'undefined') {
    // Load Google OAuth script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleOAuth;
      document.head.appendChild(script);
    } else {
      initializeGoogleOAuth();
    }
  }
});

// Expose methods for testing
defineExpose({
  handleGoogleSuccess,
  handleGoogleError
});
</script>

<style scoped>
.login-form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 640px) {
  .login-form-container {
    padding: 1rem;
  }
}
</style>