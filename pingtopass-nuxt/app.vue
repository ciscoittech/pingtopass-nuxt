<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// App setup with enhanced meta configuration for CSS loading
useHead({
  title: 'PingToPass - IT Certification Exam Platform',
  meta: [
    { name: 'description', content: 'Master IT certifications with AI-powered study tools and comprehensive exam preparation' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'color-scheme', content: 'light dark' },
    { name: 'theme-color', content: '#0085db' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

// Ensure CSS is loaded and processed correctly
onMounted(() => {
  // Verify CSS custom properties are loaded
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--spike-primary')
  if (!primaryColor) {
    console.warn('Spike theme CSS custom properties not loaded')
  } else {
    console.log('Spike theme CSS loaded successfully')
  }
  
  // Add CSS loading class to body for styling hooks
  document.body.classList.add('spike-theme-loaded')
})
</script>

<style>
/* Ensure CSS is imported at the app level for global availability */
@import '~/assets/css/spike-theme/index.css';

/* Critical CSS for preventing FOUC (Flash of Unstyled Content) */
html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--spike-background, #f8f9fa);
  color: var(--spike-text-primary, #212529);
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* Loading state styling */
body:not(.spike-theme-loaded) {
  opacity: 0.95;
}

body.spike-theme-loaded {
  opacity: 1;
  transition: opacity 0.3s ease;
}
</style>