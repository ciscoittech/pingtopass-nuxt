// Development authentication middleware
// This automatically authenticates users in development mode
// REMOVE THIS FILE IN PRODUCTION

export default defineNuxtRouteMiddleware((to, from) => {
  // Only run in development and on client side
  if (!process.client) {
    return;
  }

  // Skip if already on dev-login page
  if (to.path === '/dev-login') {
    return;
  }

  const authStore = useAuthStore();
  
  // If not authenticated, check for saved dev session
  if (!authStore.isAuthenticated) {
    const savedUser = localStorage.getItem('dev-auth-user');
    const savedToken = localStorage.getItem('dev-auth-token');
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        // Use the store's setUser method instead of direct assignment
        authStore.setUser(user);
        console.log(`🔄 [Dev Auth] Restored session for ${user.name}`);
      } catch (e) {
        console.error('[Dev Auth] Failed to restore session:', e);
      }
    } else {
      // Auto-login as student for development
      const defaultUser = {
        id: 'dev-auto-001',
        email: 'dev@test.com',
        name: 'Dev User',
        role: 'student',
        subscription: 'premium', // Give premium access for testing
        exams: ['comptia-network-plus', 'comptia-security-plus', 'cisco-ccna'],
        progress: {
          totalQuestions: 500,
          correctAnswers: 425,
          studyStreak: 7,
          level: 4
        }
      };
      
      // Use the store's setUser method
      authStore.setUser(defaultUser);
      
      // Save to localStorage
      localStorage.setItem('dev-auth-user', JSON.stringify(defaultUser));
      localStorage.setItem('dev-auth-token', `dev-auto-token-${Date.now()}`);
      
      console.log('🚀 [Dev Auth] Auto-authenticated as Dev User');
      console.log('💡 Visit /dev-login to switch users');
    }
  }
});