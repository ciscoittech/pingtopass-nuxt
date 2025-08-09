// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  ssr: true, // Enable SSR for better performance
  
  // Nitro configuration
  nitro: {
    // Development uses node-server, production uses cloudflare
    preset: process.env.NITRO_PRESET || 'node-server',
    // Cloudflare Workers compatibility
    experimental: {
      wasm: true
    },
    // Ensure static assets are handled properly
    publicAssets: [
      {
        dir: 'assets',
        maxAge: 60 * 60 * 24 * 30 // 30 days cache for assets
      }
    ]
  },
  
  // TypeScript configuration
  typescript: {
    strict: true
  },
  
  // CSS configuration for Spike theme
  css: [
    '~/assets/css/spike-theme/index.css',
    '~/assets/css/theme-integration.css'
  ],
  
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
    '@pinia/nuxt', // State management
    '@nuxt/ui' // Re-enabled with Spike theme integration
  ],

  // Components configuration for nested directories
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    }
  ],
  
  // UI module configuration with Spike theme integration
  ui: {
    global: true,
    icons: ['heroicons', 'simple-icons'],
    safelistColors: ['spike', 'neutral', 'success', 'warning', 'error', 'info']
  },
  
  // Pinia configuration
  pinia: {
    storesDirs: ['./stores/**']
  },
  
  // Development server configuration
  devServer: {
    port: 3002,
    host: 'localhost'
  },
  
  // Vite configuration for CSS processing
  vite: {
    clearScreen: false,
    logLevel: 'info',
    css: {
      preprocessorOptions: {
        css: {
          // Enable CSS custom properties processing
          charset: false
        }
      },
      postcss: {
        plugins: [
          // PostCSS import plugin for @import statements
          require('postcss-import')({
            path: ['assets/css', 'node_modules']
          }),
          // Custom properties plugin for CSS variables (v14+ doesn't support importFrom)
          require('postcss-custom-properties')({
            preserve: true // Keep CSS custom properties for runtime theming
          }),
          // Autoprefixer for vendor prefixes
          require('autoprefixer')({
            overrideBrowserslist: [
              'last 2 Chrome versions',
              'last 2 Firefox versions',
              'last 2 Safari versions',
              'last 2 Edge versions'
            ]
          }),
          // Add cssnano for production minification
          ...(process.env.NODE_ENV === 'production' ? [
            require('cssnano')({
              preset: ['default', {
                discardComments: {
                  removeAll: true
                },
                normalizeWhitespace: true,
                minifyFontValues: true,
                minifyGradients: true
              }]
            })
          ] : [])
        ]
      }
    },
    build: {
      // Ensure CSS is properly extracted in production
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Ensure consistent CSS file naming
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    }
  },
  
  // Hooks for critical CSS inlining and optimization
  hooks: {
    'render:html': (html, { event }) => {
      // Inline critical CSS to prevent FOUC (Flash of Unstyled Content)
      const criticalCSS = `
        <style id="critical-css">
          /* Critical CSS for above-the-fold content */
          :root {
            /* Core colors from Spike theme */
            --spike-primary: #1e40af;
            --spike-secondary: #64748b;
            --spike-background: #f8f9fa;
            --spike-text-primary: #212529;
            --spike-text-secondary: #6c757d;
            
            /* Typography */
            --spike-font-family-base: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --spike-font-size-base: 16px;
            --spike-line-height-base: 1.6;
          }
          
          /* Prevent layout shift */
          html {
            font-family: var(--spike-font-family-base);
            font-size: var(--spike-font-size-base);
            line-height: var(--spike-line-height-base);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          body {
            margin: 0;
            padding: 0;
            background-color: var(--spike-background);
            color: var(--spike-text-primary);
            min-height: 100vh;
          }
          
          /* Prevent FOUC for common elements */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
          }
          
          /* Loading state */
          .nuxt-loading-indicator {
            position: fixed;
            top: 0;
            right: 0;
            left: 0;
            pointer-events: none;
            width: auto;
            height: 3px;
            opacity: 0;
            background: var(--spike-primary);
            transform: scaleX(0);
            transform-origin: left;
            transition: transform 0.1s, height 0.4s, opacity 0.4s;
            z-index: 999999;
          }
        </style>
      `
      
      // Inject critical CSS into head
      html.head.unshift(criticalCSS)
    }
  },

  // PostCSS configuration for custom properties and modern CSS
  postcss: {
    plugins: {
      'postcss-import': {
        path: ['assets/css', 'node_modules']
      },
      'postcss-custom-properties': {
        preserve: true // Keep CSS custom properties for runtime theming (v14+ doesn't support importFrom)
      },
      'autoprefixer': {
        overrideBrowserslist: [
          'last 2 Chrome versions',
          'last 2 Firefox versions', 
          'last 2 Safari versions',
          'last 2 Edge versions',
          'not dead',
          '> 1%'
        ]
      },
      // Add cssnano for production minification
      ...(process.env.NODE_ENV === 'production' ? {
        'cssnano': {
          preset: ['default', {
            discardComments: {
              removeAll: true
            },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true
          }]
        }
      } : {})
    }
  }
})