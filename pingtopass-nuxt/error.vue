<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-red-500 mb-4">{{ error?.statusCode || 500 }}</h1>
      <h2 class="text-2xl font-semibold mb-4">
        {{ error?.statusCode === 404 ? 'Page Not Found' : 'An Error Occurred' }}
      </h2>
      <p class="text-gray-600 dark:text-gray-300 mb-8">
        {{ error?.statusMessage || 'Something went wrong. Please try again.' }}
      </p>
      <NuxtLink 
        to="/"
        class="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Go Home
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  error: Object
})
</script>