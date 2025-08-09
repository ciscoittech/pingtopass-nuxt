export default defineNuxtPlugin((nuxtApp) => {
  // Client-side initialization
  console.log('PingToPass client initialized')
  
  // Initialize stores if needed
  const authStore = useAuthStore()
  
  // Check for existing session
  if (process.client) {
    const token = localStorage.getItem('auth-token')
    if (token) {
      // Validate token and restore session
      authStore.validateSession()
    }
  }
})