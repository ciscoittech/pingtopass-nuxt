// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // Configure for Cloudflare Workers
  nitro: {
    preset: 'cloudflare-module', // Use module preset for Workers
    
    // Cloudflare specific options
    cloudflare: {
      wrangler: {
        configPath: './wrangler.toml'
      }
    },
    
    // Rollup configuration for optimal Workers bundle
    rollupConfig: {
      external: ['node:async_hooks'],
      output: {
        entryFileNames: 'index.js',
        format: 'esm'
      }
    },
    
    // Performance optimizations
    minify: true,
    sourceMap: false,
    
    // Workers-specific settings
    experimental: {
      wasm: true // Enable WebAssembly if needed
    }
  },
  
  // TypeScript configuration
  typescript: {
    strict: true
  },
  
  // Runtime configuration
  runtimeConfig: {
    // Private runtime config (server-side only)
    turso: {
      databaseUrl: process.env.TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || '',
    },
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    langchainApiKey: process.env.LANGCHAIN_API_KEY || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    jwtSecret: process.env.JWT_SECRET || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    
    // Public runtime config (exposed to client)
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    }
  },
  
  // Configure modules we'll use
  modules: [
    // We'll add modules here as we verify compatibility
  ]
})