<template>
  <div v-if="isAuthenticated">
    <slot />
  </div>
  <div v-else class="spike-login-redirect">
    <div class="spike-login-redirect-card">
      <h2>Authentication Required</h2>
      <p>Please sign in to access this page.</p>
      <SpikeButton @click="navigateTo('/login')" variant="primary">
        Sign In
      </SpikeButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);

// Redirect to login if not authenticated
watchEffect(() => {
  if (!isAuthenticated.value && process.client) {
    navigateTo('/login');
  }
});
</script>

<style scoped>
.spike-login-redirect {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--spike-primary-alpha-10) 0%, var(--spike-surface) 100%);
}

.spike-login-redirect-card {
  background: var(--spike-surface);
  padding: var(--spike-space-8);
  border-radius: 12px;
  box-shadow: var(--spike-shadow-lg);
  text-align: center;
  max-width: 400px;
}

.spike-login-redirect-card h2 {
  color: var(--spike-text-primary);
  margin-bottom: var(--spike-space-4);
}

.spike-login-redirect-card p {
  color: var(--spike-text-secondary);
  margin-bottom: var(--spike-space-6);
}
</style>