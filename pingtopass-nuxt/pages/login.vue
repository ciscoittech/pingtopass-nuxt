<template>
  <div class="spike-login-page">
    <div class="spike-login-container">
      <div class="spike-login-header">
        <h1 class="spike-login-title">Sign In to PingToPass</h1>
        <p class="spike-login-subtitle">
          Access your personalized study dashboard
        </p>
      </div>
      
      <LoginForm />
      
      <div class="spike-login-footer">
        <p>By signing in, you agree to our</p>
        <div class="spike-login-links">
          <NuxtLink to="/terms" class="spike-link">
            Terms of Service
          </NuxtLink>
          <span class="spike-separator">•</span>
          <NuxtLink to="/privacy" class="spike-link">
            Privacy Policy
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Login page setup
</script>