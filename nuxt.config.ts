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
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    
    // Authentication
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieHttpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
    
    // AI Integration
    openrouterKey: process.env.OPENROUTER_API_KEY,
    langchainApiKey: process.env.LANGCHAIN_API_KEY,
    langchainProject: process.env.LANGCHAIN_PROJECT || 'pingtopass-dev',
    aiModelDefault: process.env.AI_MODEL_DEFAULT || 'qwen/qwen2.5-7b-instruct',
    aiModelPremium: process.env.AI_MODEL_PREMIUM || 'qwen/qwen2.5-32b-instruct',
    aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
    aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    
    // Payment Processing
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL,
    stripeCancelUrl: process.env.STRIPE_CANCEL_URL,
    stripePriceIdPremium: process.env.STRIPE_PRICE_ID_PREMIUM,
    
    // Twitter Growth System
    twitterApiKey: process.env.TWITTER_API_KEY,
    twitterApiSecret: process.env.TWITTER_API_SECRET,
    twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN,
    twitterAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
    twitterMaxDailyEngagements: parseInt(process.env.TWITTER_MAX_DAILY_ENGAGEMENTS || '30'),
    twitterEngagementDelayMinutes: parseInt(process.env.TWITTER_ENGAGEMENT_DELAY_MINUTES || '15'),
    twitterVoiceProfile: process.env.TWITTER_VOICE_PROFILE || 'professional_helpful',
    
    // Email & Notifications
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    fromEmail: process.env.FROM_EMAIL || 'noreply@pingtopass.com',
    
    // Cloudflare
    cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareZoneId: process.env.CLOUDFLARE_ZONE_ID,
    cloudflareProjectName: process.env.CLOUDFLARE_PROJECT_NAME || 'pingtopass',
    
    // Monitoring & Performance
    performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
    slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '200'),
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // Development
    debugMode: process.env.DEBUG_MODE === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true',
    dbLogging: process.env.DB_LOGGING === 'true',
    
    // Feature Flags
    featureTwitterGrowth: process.env.FEATURE_TWITTER_GROWTH !== 'false',
    featureAiQuestionGeneration: process.env.FEATURE_AI_QUESTION_GENERATION !== 'false',
    featurePremiumFeatures: process.env.FEATURE_PREMIUM_FEATURES !== 'false',
    featureBetaExams: process.env.FEATURE_BETA_EXAMS === 'true',
    
    // Security & Rate Limiting
    rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
    rateLimitBurst: parseInt(process.env.RATE_LIMIT_BURST || '20'),
    enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
    enableCors: process.env.ENABLE_CORS !== 'false',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    
    // Public (client-side)
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      environment: process.env.NODE_ENV || 'development',
      
      // Feature flags (client-accessible)
      features: {
        twitterGrowth: process.env.FEATURE_TWITTER_GROWTH !== 'false',
        aiQuestionGeneration: process.env.FEATURE_AI_QUESTION_GENERATION !== 'false',
        premiumFeatures: process.env.FEATURE_PREMIUM_FEATURES !== 'false',
        betaExams: process.env.FEATURE_BETA_EXAMS === 'true'
      },
      
      // Performance settings
      performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
      
      // LangSmith tracing (client-side)
      langchainTracing: process.env.LANGCHAIN_TRACING_V2 === 'true'
    }
  },
  
  // Modules
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
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