<template>
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <NuxtLink
        to="/"
        class="flex items-center space-x-2"
        data-test="logo"
      >
        <span class="text-2xl text-primary-600">🎓</span>
        <span class="text-xl font-bold text-gray-900">PingToPass</span>
      </NuxtLink>
      
      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-8">
        <NuxtLink
          to="/exams"
          class="text-gray-600 hover:text-primary-600 transition-colors"
          data-test="nav-exams"
        >
          Exams
        </NuxtLink>
        <NuxtLink
          to="/study"
          class="text-gray-600 hover:text-primary-600 transition-colors"
          data-test="nav-study"
        >
          Study
        </NuxtLink>
        <NuxtLink
          to="/progress"
          class="text-gray-600 hover:text-primary-600 transition-colors"
          data-test="nav-progress"
        >
          Progress
        </NuxtLink>
        <NuxtLink
          to="/pricing"
          class="text-gray-600 hover:text-primary-600 transition-colors"
          data-test="nav-pricing"
        >
          Pricing
        </NuxtLink>
      </nav>
      
      <!-- Search Bar -->
      <div class="hidden lg:block flex-1 max-w-md mx-8">
        <div class="relative">
          <input
            type="search"
            placeholder="Search exams... (Ctrl+K)"
            class="w-full px-4 py-2 pl-10 pr-4 text-gray-900 bg-gray-100 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-test="search-input"
          />
          <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>
      
      <!-- Login Button (when not authenticated) -->
      <BaseButton
        variant="primary"
        size="sm"
        data-test="login-button"
      >
        Sign In
      </BaseButton>
      
      <!-- User Menu (when authenticated) - hidden for now -->
      <div 
        class="hidden"
        data-test="user-menu"
      >
        User Menu
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Basic AppHeader implementation to pass initial tests
</script>