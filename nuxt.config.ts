// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // Cloudflare compatibility
  nitro: {
    preset: 'cloudflare-pages',
    rollupConfig: {
      external: ['cloudflare:sockets']
    }
  },
  
  // Runtime configuration
  runtimeConfig: {
    // Private (server-only)
    tursoUrl: process.env.TURSO_DATABASE_URL,
    tursoToken: process.env.TURSO_AUTH_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    
    // Public
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000'
    }
  },
  
  // Modules
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint'
  ],
  
  // Build configuration
  build: {
    transpile: ['@libsql/client', 'google-auth-library']
  },
  
  // TypeScript configuration
  typescript: {
    typeCheck: true
  },
  
  // CSS configuration
  css: ['~/assets/css/main.css'],
  
  // Compatibility
  compatibilityDate: '2024-01-01'
})