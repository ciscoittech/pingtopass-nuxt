<template>
  <div 
    data-test="app-layout"
    class="min-h-screen flex flex-col"
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
    >
      <AppHeader />
    </header>
    
    <!-- Main Content Area with Navigation -->
    <div class="flex-1 flex">
      <!-- Navigation Sidebar -->
      <nav
        role="navigation"
        data-test="app-navigation"
      >
        <AppNavigation />
      </nav>
      
      <!-- Main Content -->
      <main
        id="main-content"
        role="main"
        data-test="content-area"
        class="flex-1"
      >
        <slot />
      </main>
    </div>
    
    <!-- Footer -->
    <footer
      role="contentinfo"
      data-test="app-footer"
    >
      <AppFooter />
    </footer>
  </div>
</template>

<script setup lang="ts">
// Minimal implementation to pass initial tests
</script>