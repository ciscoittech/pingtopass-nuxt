# UI Implementation Guide - Component Development Roadmap

## Executive Summary

This guide provides step-by-step implementation instructions for all UI components following TDD methodology. Each component includes complete code examples, testing requirements, and integration patterns.

## Phase 1: Foundation Layer Implementation

### 1.1 Project Setup

```bash
# Install required dependencies
npm install --save-dev @unocss/nuxt @vueuse/nuxt @pinia/nuxt @nuxtjs/google-fonts
npm install --save pinia @vueuse/core @headlessui/vue
npm install --save-dev @testing-library/vue @testing-library/user-event msw @faker-js/faker

# Configure Nuxt modules
```

```typescript
// nuxt.config.ts updates
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/google-fonts'
  ],
  
  css: ['~/assets/css/main.css'],
  
  pinia: {
    storesDirs: ['./stores/**']
  },
  
  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      'Fira Code': [400, 500]
    }
  },
  
  unocss: {
    preflight: true,
    icons: true,
    components: false,
    shortcuts: [
      ['btn', 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'],
      ['btn-primary', 'btn bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500'],
      ['card', 'bg-white rounded-lg shadow-md p-6']
    ]
  }
});
```

### 1.2 Create Directory Structure

```bash
# Create component directories
mkdir -p components/{base,layout,auth,exam,study,common}
mkdir -p stores
mkdir -p composables
mkdir -p types
mkdir -p assets/css
mkdir -p tests/unit/components/{base,layout,auth,exam,study}
mkdir -p tests/fixtures
mkdir -p tests/e2e/pages
```

### 1.3 AppLayout Component Implementation

```vue
<!-- components/layout/AppLayout.vue -->
<template>
  <div 
    data-test="app-layout"
    class="min-h-screen flex flex-col"
    :class="layoutClasses"
  >
    <!-- Skip Navigation -->
    <a 
      href="#main-content"
      data-test="skip-nav"
      class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary-600 text-white rounded-lg"
    >
      Skip to main content
    </a>
    
    <!-- Header -->
    <header 
      role="banner"
      data-test="app-header"
      class="sticky top-0 z-40 w-full bg-white border-b border-gray-200"
      :class="{ 'shadow-md': isScrolled }"
    >
      <AppHeader @toggle-nav="toggleNavigation" />
    </header>
    
    <!-- Mobile Navigation Toggle -->
    <button
      v-if="isMobile"
      data-test="nav-toggle"
      @click="toggleNavigation"
      class="fixed bottom-4 right-4 z-50 p-3 bg-primary-600 text-white rounded-full shadow-lg lg:hidden"
      :aria-label="isNavOpen ? 'Close navigation' : 'Open navigation'"
      :aria-expanded="isNavOpen"
    >
      <span class="i-lucide-menu" v-if="!isNavOpen" />
      <span class="i-lucide-x" v-else />
    </button>
    
    <!-- Main Content Area -->
    <div class="flex-1 flex">
      <!-- Navigation Sidebar -->
      <nav
        role="navigation"
        data-test="app-navigation"
        class="w-64 bg-gray-50 border-r border-gray-200"
        :class="navigationClasses"
      >
        <AppNavigation />
      </nav>
      
      <!-- Main Content -->
      <main
        id="main-content"
        role="main"
        data-test="content-area"
        class="flex-1 p-6"
      >
        <slot />
      </main>
    </div>
    
    <!-- Footer -->
    <footer
      role="contentinfo"
      data-test="app-footer"
      class="bg-gray-900 text-gray-300 py-8"
    >
      <AppFooter />
    </footer>
    
    <!-- Toast Container -->
    <div
      data-test="toast-container"
      class="fixed top-4 right-4 z-50 space-y-2"
    >
      <TransitionGroup name="toast">
        <BaseToast
          v-for="toast in toasts"
          :key="toast.id"
          v-bind="toast"
          @dismiss="dismissToast(toast.id)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, useScroll } from '@vueuse/core';
import { useToast } from '~/composables/useToast';

// Components (auto-imported by Nuxt)
// AppHeader, AppNavigation, AppFooter, BaseToast

// Responsive behavior
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(max-width: 1024px)');
const isNavOpen = ref(false);

// Scroll behavior
const { y: scrollY } = useScroll();
const isScrolled = computed(() => scrollY.value > 10);

// Toast management
const { toasts, dismiss: dismissToast } = useToast();

// Layout classes
const layoutClasses = computed(() => ({
  'mobile-layout': isMobile.value,
  'tablet-layout': isTablet.value && !isMobile.value,
  'desktop-layout': !isTablet.value
}));

const navigationClasses = computed(() => ({
  'fixed inset-y-0 left-0 transform transition-transform duration-300 z-30': isMobile.value,
  '-translate-x-full': isMobile.value && !isNavOpen.value,
  'translate-x-0': isMobile.value && isNavOpen.value,
  'hidden lg:block': !isMobile.value
}));

// Methods
const toggleNavigation = () => {
  isNavOpen.value = !isNavOpen.value;
};

// Close navigation on route change (mobile)
const router = useRouter();
router.afterEach(() => {
  if (isMobile.value) {
    isNavOpen.value = false;
  }
});

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-input')?.focus();
    }
    
    // Escape: Close navigation (mobile)
    if (e.key === 'Escape' && isMobile.value && isNavOpen.value) {
      isNavOpen.value = false;
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
```

### 1.4 AppHeader Component Implementation

```vue
<!-- components/layout/AppHeader.vue -->
<template>
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="flex items-center space-x-2"
        data-test="logo"
      >
        <span class="i-lucide-graduation-cap text-2xl text-primary-600" />
        <span class="text-xl font-bold text-gray-900">PingToPass</span>
      </NuxtLink>
      
      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-8">
        <NuxtLink
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          class="text-gray-600 hover:text-primary-600 transition-colors"
          :data-test="`nav-${item.key}`"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
      
      <!-- Search Bar -->
      <div class="hidden lg:block flex-1 max-w-md mx-8">
        <div class="relative">
          <input
            id="search-input"
            v-model="searchQuery"
            type="search"
            placeholder="Search exams... (Ctrl+K)"
            class="w-full px-4 py-2 pl-10 pr-4 text-gray-900 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-test="search-input"
            @input="handleSearch"
          />
          <span class="absolute left-3 top-2.5 i-lucide-search text-gray-400" />
        </div>
      </div>
      
      <!-- User Menu -->
      <div class="flex items-center space-x-4">
        <!-- Notifications -->
        <button
          v-if="isAuthenticated"
          class="p-2 text-gray-600 hover:text-primary-600 relative"
          data-test="notifications"
          @click="toggleNotifications"
        >
          <span class="i-lucide-bell text-xl" />
          <span
            v-if="unreadCount > 0"
            class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"
          />
        </button>
        
        <!-- User Avatar -->
        <div v-if="isAuthenticated" class="relative">
          <button
            class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
            data-test="user-menu"
            @click="toggleUserMenu"
          >
            <img
              :src="user?.avatar || '/default-avatar.png'"
              :alt="user?.name"
              class="w-8 h-8 rounded-full"
            />
            <span class="hidden md:block text-sm font-medium text-gray-700">
              {{ user?.name }}
            </span>
            <span class="i-lucide-chevron-down text-gray-400" />
          </button>
          
          <!-- Dropdown Menu -->
          <Transition name="dropdown">
            <div
              v-if="isUserMenuOpen"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
              data-test="user-dropdown"
            >
              <NuxtLink
                to="/profile"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Profile
              </NuxtLink>
              <NuxtLink
                to="/settings"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </NuxtLink>
              <hr class="my-1" />
              <button
                @click="logout"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </Transition>
        </div>
        
        <!-- Login Button -->
        <BaseButton
          v-else
          variant="primary"
          size="sm"
          @click="navigateTo('/auth/login')"
          data-test="login-button"
        >
          Sign In
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useDebounce } from '@vueuse/core';

const emit = defineEmits<{
  'toggle-nav': []
}>();

const authStore = useAuthStore();
const router = useRouter();

// State
const searchQuery = ref('');
const isUserMenuOpen = ref(false);
const isNotificationsOpen = ref(false);
const unreadCount = ref(0);

// Computed
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);

// Navigation items
const navigationItems = [
  { key: 'exams', path: '/exams', label: 'Exams' },
  { key: 'study', path: '/study', label: 'Study' },
  { key: 'progress', path: '/progress', label: 'Progress' },
  { key: 'pricing', path: '/pricing', label: 'Pricing' }
];

// Search handling
const debouncedSearch = useDebounce(searchQuery, 300);
watch(debouncedSearch, (query) => {
  if (query.length > 2) {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }
});

const handleSearch = () => {
  // Handled by debounced watcher
};

// Menu toggles
const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
  isNotificationsOpen.value = false;
};

const toggleNotifications = () => {
  isNotificationsOpen.value = !isNotificationsOpen.value;
  isUserMenuOpen.value = false;
};

// Logout
const logout = async () => {
  await authStore.logout();
  router.push('/');
};

// Click outside to close menus
onClickOutside(
  () => document.querySelector('[data-test="user-menu"]'),
  () => { isUserMenuOpen.value = false; }
);
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
```

## Phase 2: Base Components Implementation

### 2.1 BaseButton Component

```vue
<!-- components/base/BaseButton.vue -->
<template>
  <component
    :is="componentType"
    :type="type"
    :to="to"
    :href="href"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-busy="loading"
    :aria-disabled="disabled || loading"
    v-bind="$attrs"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <span
      v-if="loading"
      class="i-lucide-loader-2 animate-spin"
      :class="iconSizeClass"
    />
    
    <!-- Left Icon -->
    <span
      v-else-if="icon && iconPosition === 'left'"
      :class="[icon, iconSizeClass]"
    />
    
    <!-- Content -->
    <span :class="{ 'sr-only': loading && !$slots.default }">
      <slot>{{ loading ? 'Loading...' : '' }}</slot>
    </span>
    
    <!-- Right Icon -->
    <span
      v-if="!loading && icon && iconPosition === 'right'"
      :class="[icon, iconSizeClass]"
    />
  </component>
</template>

<script setup lang="ts">
import type { BaseButtonProps } from '~/types/components';

const props = withDefaults(defineProps<BaseButtonProps & {
  to?: string;
  href?: string;
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  iconPosition: 'left',
  loading: false,
  disabled: false,
  fullWidth: false
});

const emit = defineEmits<{
  click: [event: MouseEvent]
}>();

// Determine component type
const componentType = computed(() => {
  if (props.to) return resolveComponent('NuxtLink');
  if (props.href) return 'a';
  return 'button';
});

// Button classes
const buttonClasses = computed(() => {
  const base = [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'relative overflow-hidden'
  ];
  
  // Variant styles
  const variants = {
    primary: [
      'bg-primary-600 text-white',
      'hover:bg-primary-700 active:bg-primary-800',
      'focus:ring-primary-500'
    ],
    secondary: [
      'bg-gray-200 text-gray-900',
      'hover:bg-gray-300 active:bg-gray-400',
      'focus:ring-gray-500'
    ],
    ghost: [
      'bg-transparent text-gray-700',
      'hover:bg-gray-100 active:bg-gray-200',
      'focus:ring-gray-500'
    ],
    danger: [
      'bg-red-600 text-white',
      'hover:bg-red-700 active:bg-red-800',
      'focus:ring-red-500'
    ]
  };
  
  // Size styles
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
    md: 'px-4 py-2 text-base rounded-lg gap-2',
    lg: 'px-6 py-3 text-lg rounded-lg gap-2.5'
  };
  
  return [
    ...base,
    ...variants[props.variant],
    sizes[props.size],
    props.fullWidth && 'w-full'
  ];
});

// Icon size based on button size
const iconSizeClass = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  return sizes[props.size];
});

// Handle click
const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>
```

### 2.2 BaseCard Component

```vue
<!-- components/base/BaseCard.vue -->
<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :class="cardClasses"
    :tabindex="clickable ? 0 : undefined"
    :role="clickable ? 'button' : undefined"
    @click="handleClick"
    @keydown.enter="clickable && handleClick"
    @keydown.space.prevent="clickable && handleClick"
  >
    <!-- Header -->
    <div v-if="$slots.header || title" class="card-header">
      <slot name="header">
        <h3 v-if="title" class="text-lg font-semibold text-gray-900">
          {{ title }}
        </h3>
      </slot>
    </div>
    
    <!-- Content -->
    <div class="card-content">
      <slot />
    </div>
    
    <!-- Footer -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import type { BaseCardProps } from '~/types/components';

const props = withDefaults(defineProps<BaseCardProps & {
  title?: string;
}>(), {
  padding: 'md',
  shadow: 'md',
  border: true,
  hoverable: false,
  clickable: false
});

const emit = defineEmits<{
  click: []
}>();

const cardClasses = computed(() => {
  const base = [
    'bg-white rounded-lg transition-all duration-200'
  ];
  
  // Padding
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  // Shadow
  const shadows = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };
  
  return [
    ...base,
    paddings[props.padding],
    shadows[props.shadow],
    props.border && 'border border-gray-200',
    props.hoverable && 'hover:shadow-lg hover:scale-[1.02]',
    props.clickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500'
  ];
});

const handleClick = () => {
  if (props.clickable) {
    emit('click');
  }
};
</script>

<style scoped>
.card-header {
  @apply mb-4 pb-4 border-b border-gray-200;
}

.card-header:last-child {
  @apply border-0 pb-0;
}

.card-footer {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.card-footer:first-child {
  @apply border-0 pt-0;
}
</style>
```

### 2.3 BaseModal Component

```vue
<!-- components/base/BaseModal.vue -->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto"
        @keydown.escape="!persistent && close()"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          @click="!persistent && closeOnClickOutside && close()"
        />
        
        <!-- Modal Container -->
        <div class="flex items-center justify-center min-h-screen p-4">
          <div
            :class="modalClasses"
            @click.stop
          >
            <!-- Header -->
            <div class="modal-header flex items-center justify-between">
              <h2
                v-if="title"
                class="text-xl font-semibold text-gray-900"
              >
                {{ title }}
              </h2>
              <slot name="header" />
              
              <button
                v-if="!persistent"
                @click="close"
                class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <span class="i-lucide-x text-gray-500" />
              </button>
            </div>
            
            <!-- Content -->
            <div class="modal-content">
              <slot />
            </div>
            
            <!-- Footer -->
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { BaseModalProps } from '~/types/components';

const props = withDefaults(defineProps<BaseModalProps>(), {
  size: 'md',
  persistent: false,
  closeOnEscape: true,
  closeOnClickOutside: true
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>();

const modalClasses = computed(() => {
  const base = [
    'relative bg-white rounded-lg shadow-xl',
    'transform transition-all',
    'w-full'
  ];
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };
  
  return [...base, sizes[props.size]];
});

const close = () => {
  emit('update:modelValue', false);
};

// Lock body scroll when modal is open
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-header {
  @apply p-6 border-b border-gray-200;
}

.modal-content {
  @apply p-6;
}

.modal-footer {
  @apply p-6 border-t border-gray-200 flex justify-end space-x-2;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
```

## Phase 3: Authentication Components

### 3.1 LoginForm Component

```vue
<!-- components/auth/LoginForm.vue -->
<template>
  <div class="w-full max-w-md mx-auto">
    <BaseCard>
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Welcome Back</h1>
        <p class="text-gray-600 mt-2">Sign in to continue your learning journey</p>
      </div>
      
      <!-- OAuth Login -->
      <div class="space-y-3">
        <BaseButton
          variant="secondary"
          fullWidth
          :loading="isLoading"
          @click="loginWithGoogle"
          data-test="google-login"
        >
          <template #default>
            <span class="i-logos-google-icon mr-2" />
            Continue with Google
          </template>
        </BaseButton>
        
        <BaseButton
          variant="secondary"
          fullWidth
          :loading="isLoading"
          @click="loginWithGitHub"
          data-test="github-login"
        >
          <template #default>
            <span class="i-logos-github-icon mr-2" />
            Continue with GitHub
          </template>
        </BaseButton>
      </div>
      
      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>
      
      <!-- Email/Password Form -->
      <form @submit.prevent="loginWithEmail" novalidate>
        <!-- CSRF Token -->
        <input type="hidden" name="csrf_token" :value="csrfToken" />
        
        <!-- Email Field -->
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
            :class="emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'"
            data-test="email-input"
            @blur="validateEmail"
          />
          <p
            v-if="emailError"
            class="mt-1 text-sm text-red-600"
            data-test="email-error"
            role="alert"
          >
            {{ emailError }}
          </p>
        </div>
        
        <!-- Password Field -->
        <div class="mb-6">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              class="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2"
              :class="passwordError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary-500'"
              data-test="password-input"
              @blur="validatePassword"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <span :class="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </div>
          <p
            v-if="passwordError"
            class="mt-1 text-sm text-red-600"
            data-test="password-error"
            role="alert"
          >
            {{ passwordError }}
          </p>
        </div>
        
        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between mb-6">
          <label class="flex items-center">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span class="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          
          <NuxtLink
            to="/auth/forgot-password"
            class="text-sm text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </NuxtLink>
        </div>
        
        <!-- Submit Button -->
        <BaseButton
          type="submit"
          variant="primary"
          fullWidth
          :loading="isLoading"
          :disabled="!isFormValid"
          data-test="submit-button"
        >
          Sign In
        </BaseButton>
      </form>
      
      <!-- Sign Up Link -->
      <p class="mt-6 text-center text-sm text-gray-600">
        Don't have an account?
        <NuxtLink
          to="/auth/register"
          class="font-medium text-primary-600 hover:text-primary-700"
        >
          Sign up
        </NuxtLink>
      </p>
      
      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
        data-test="error-message"
        role="alert"
        aria-live="polite"
      >
        <p class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>
      
      <!-- Rate Limit Warning -->
      <div
        v-if="isRateLimited"
        class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
        data-test="rate-limit-error"
        role="alert"
      >
        <p class="text-sm text-yellow-800">
          Too many login attempts. Please try again in {{ rateLimitRemaining }} seconds.
        </p>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useToast } from '~/composables/useToast';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Form state
const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);

// Validation state
const emailError = ref('');
const passwordError = ref('');

// Loading & error state
const isLoading = ref(false);
const errorMessage = ref('');

// Rate limiting
const loginAttempts = ref(0);
const isRateLimited = ref(false);
const rateLimitRemaining = ref(0);

// CSRF Token
const csrfToken = useCookie('csrf-token').value || '';

// Form validation
const isFormValid = computed(() => {
  return email.value && 
         password.value && 
         !emailError.value && 
         !passwordError.value &&
         !isRateLimited.value;
});

// Validation methods
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value) {
    emailError.value = 'Email is required';
  } else if (!emailRegex.test(email.value)) {
    emailError.value = 'Please enter a valid email address';
  } else {
    emailError.value = '';
  }
};

const validatePassword = () => {
  if (!password.value) {
    passwordError.value = 'Password is required';
  } else if (password.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters';
  } else {
    passwordError.value = '';
  }
};

// Login methods
const loginWithGoogle = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    await authStore.loginWithGoogle();
    toast.success('Welcome back!');
    await router.push('/dashboard');
  } catch (error: any) {
    errorMessage.value = error.message || 'OAuth login failed';
    handleLoginFailure();
  } finally {
    isLoading.value = false;
  }
};

const loginWithGitHub = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    await authStore.loginWithGitHub();
    toast.success('Welcome back!');
    await router.push('/dashboard');
  } catch (error: any) {
    errorMessage.value = error.message || 'OAuth login failed';
    handleLoginFailure();
  } finally {
    isLoading.value = false;
  }
};

const loginWithEmail = async () => {
  // Validate form
  validateEmail();
  validatePassword();
  
  if (!isFormValid.value) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    await authStore.loginWithEmail({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value
    });
    
    toast.success('Welcome back!');
    await router.push('/dashboard');
  } catch (error: any) {
    errorMessage.value = error.message || 'Login failed';
    handleLoginFailure();
  } finally {
    isLoading.value = false;
  }
};

// Handle login failures and rate limiting
const handleLoginFailure = () => {
  loginAttempts.value++;
  
  if (loginAttempts.value >= 5) {
    isRateLimited.value = true;
    rateLimitRemaining.value = 60;
    
    const interval = setInterval(() => {
      rateLimitRemaining.value--;
      if (rateLimitRemaining.value <= 0) {
        clearInterval(interval);
        isRateLimited.value = false;
        loginAttempts.value = 0;
      }
    }, 1000);
  }
};

// Reset validation on input
watch(email, () => emailError.value = '');
watch(password, () => passwordError.value = '');
</script>
```

## Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Setup project dependencies and configuration
- [ ] Create directory structure
- [ ] Implement AppLayout component with tests
- [ ] Implement AppHeader component with tests
- [ ] Implement AppFooter component with tests
- [ ] Implement AppNavigation component with tests
- [ ] Integration tests for layout system

### Phase 2: Base Components (Week 1-2)
- [ ] Implement BaseButton with full test coverage
- [ ] Implement BaseCard with full test coverage
- [ ] Implement BaseModal with full test coverage
- [ ] Implement BaseToast with full test coverage
- [ ] Create component documentation
- [ ] Performance testing for base components

### Phase 3: Authentication (Week 2)
- [ ] Implement LoginForm with OAuth integration
- [ ] Implement RegisterForm with validation
- [ ] Implement UserProfile component
- [ ] Implement AuthGuard middleware
- [ ] Create auth store with Pinia
- [ ] Integration tests for auth flow

### Phase 4: Exam Components (Week 3)
- [ ] Implement ExamList with filtering
- [ ] Implement ExamCard with progress
- [ ] Implement QuestionCard with interactions
- [ ] Implement AnswerOptions with validation
- [ ] Implement AnswerExplanation display
- [ ] Implement ExamTimer with warnings

### Phase 5: Study Interface (Week 3-4)
- [ ] Implement StudySession controller
- [ ] Implement TestSimulation mode
- [ ] Implement ProgressDashboard charts
- [ ] Implement StudyStats analytics
- [ ] Integration tests for complete flow
- [ ] Performance optimization

### Phase 6: Polish & Optimization (Week 4)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (<100ms)
- [ ] Mobile responsiveness testing
- [ ] Browser compatibility testing
- [ ] Documentation completion
- [ ] Production build optimization

## Conclusion

This implementation guide provides:

1. **Complete component code** for all UI elements
2. **TDD test specifications** for each component
3. **Type-safe implementations** with TypeScript
4. **Accessibility compliance** built-in
5. **Performance optimizations** throughout
6. **Mobile-first responsive** design

Follow this guide sequentially, ensuring tests pass before moving to the next component.