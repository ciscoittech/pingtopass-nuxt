# Cloudflare Workers Deployment Guide - PingToPass

## Overview

PingToPass is deployed on **Cloudflare Workers** (not Pages, as Pages is being discontinued) using Nuxt 3 with Nitro. This provides a globally distributed, serverless edge platform with excellent performance and cost efficiency.

## Architecture

### Infrastructure Stack
- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Nuxt 3 with Nitro adapter
- **Database**: Turso (libSQL) with Drizzle ORM
- **Storage**: Cloudflare KV for caching
- **CDN**: Cloudflare's global network
- **Domains**: Managed via Cloudflare DNS

## Prerequisites

### Required Tools

```bash
# Install Node.js 20+
curl -fsSL https://fnm.vercel.app/install | bash
fnm use 20

# Install pnpm
npm install -g pnpm

# Install Wrangler CLI (Cloudflare Workers CLI)
pnpm add -g wrangler

# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Authenticate with Cloudflare
wrangler login

# Authenticate with Turso
turso auth login
```

### Account Setup

1. Create a [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Create a [Turso account](https://turso.tech)
3. Set up billing (Workers free tier: 100k requests/day)

## Project Configuration

### Wrangler Configuration

```toml
# wrangler.toml
name = "pingtopass"
main = ".output/server/index.mjs"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]
account_id = "your-account-id"

# Build configuration
[build]
command = "pnpm build"
upload.format = "service-worker"

# KV Namespaces for caching
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"

# Environment variables (non-sensitive)
[vars]
NUXT_PUBLIC_SITE_URL = "https://pingtopass.com"
NUXT_PUBLIC_GA_ID = "G-XXXXXXXXXX"

# Routes (custom domain)
[[routes]]
pattern = "pingtopass.com/*"
zone_name = "pingtopass.com"

[[routes]]
pattern = "www.pingtopass.com/*"
zone_name = "pingtopass.com"

# Development settings
[dev]
port = 3000
local_protocol = "http"
upstream_protocol = "https"

# Preview environment
[env.preview]
name = "pingtopass-preview"
routes = [
  { pattern = "preview.pingtopass.com", zone_name = "pingtopass.com" }
]

[env.preview.vars]
NUXT_PUBLIC_SITE_URL = "https://preview.pingtopass.com"

# Production environment
[env.production]
name = "pingtopass-production"
routes = [
  { pattern = "pingtopass.com", zone_name = "pingtopass.com" },
  { pattern = "www.pingtopass.com", zone_name = "pingtopass.com" }
]

[env.production.vars]
NUXT_PUBLIC_SITE_URL = "https://pingtopass.com"

# Placement for better performance
[placement]
mode = "smart"
```

### Nuxt Configuration for Workers

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare',
    
    // Cloudflare-specific options
    cloudflare: {
      wrangler: {
        configPath: './wrangler.toml'
      }
    },
    
    // Build options
    minify: true,
    sourceMap: false,
    
    // Storage for caching
    storage: {
      cache: {
        driver: 'cloudflare-kv-binding',
        binding: 'CACHE'
      }
    },
    
    // Runtime config
    runtimeConfig: {
      tursoUrl: '', // Set via env
      tursoToken: '', // Set via env
      jwtSecret: '', // Set via env
      public: {
        siteUrl: '', // Set via env
      }
    }
  },
  
  // Module configuration
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
  ],
  
  // Build optimizations
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['vue', 'vue-router', 'pinia'],
          }
        }
      }
    }
  }
});
```

## Database Setup

### Create Turso Databases

```bash
# Development database
turso db create pingtopass-dev
turso db show pingtopass-dev --url  # Copy this URL
turso db tokens create pingtopass-dev  # Copy this token

# Production database with replicas
turso db create pingtopass-prod --group production
turso db replicate pingtopass-prod ams  # Amsterdam
turso db replicate pingtopass-prod sjc  # San Jose  
turso db replicate pingtopass-prod sin  # Singapore
turso db replicate pingtopass-prod syd  # Sydney

# Get production credentials
turso db show pingtopass-prod --url
turso db tokens create pingtopass-prod
```

### Initialize Schema with Drizzle

```bash
# Install dependencies
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit

# Generate and push schema
pnpm drizzle-kit generate:sqlite
pnpm drizzle-kit push:sqlite

# Verify schema
turso db shell pingtopass-prod "SELECT name FROM sqlite_master WHERE type='table';"
```

## Deployment Process

### Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
pnpm dev

# Test with Wrangler locally
pnpm build
wrangler dev
```

### Environment Variables Setup

```bash
# Set secrets for production (sensitive data)
wrangler secret put TURSO_DATABASE_URL --env production
wrangler secret put TURSO_AUTH_TOKEN --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put OPENROUTER_API_KEY --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production

# Set secrets for preview environment
wrangler secret put TURSO_DATABASE_URL --env preview
# ... repeat for other secrets
```

### Deploy to Preview

```bash
# Build the application
pnpm build

# Deploy to preview environment
wrangler deploy --env preview

# Or deploy from a specific branch
wrangler deploy --env preview --branch feature/new-feature

# View deployment
wrangler tail --env preview
```

### Deploy to Production

```bash
# Run tests first
pnpm test
pnpm test:e2e

# Build for production
pnpm build

# Deploy to production
wrangler deploy --env production

# Verify deployment
curl -I https://pingtopass.com

# Monitor logs
wrangler tail --env production
```

## CI/CD with GitHub Actions

### Workflow Configuration

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      - name: Deploy to Preview
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: preview
          
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployed to https://preview.pingtopass.com'
            })

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: production
```

## Custom Domain Setup

### Configure DNS

```bash
# Add domain to Cloudflare
# 1. Go to Cloudflare Dashboard > Add Site
# 2. Enter pingtopass.com
# 3. Update nameservers at registrar

# DNS Records (in Cloudflare Dashboard)
# Type  Name  Content                    Proxy
# A     @     192.0.2.1                 ✓ (Proxied)
# AAAA  @     100::                     ✓ (Proxied)
# CNAME www   pingtopass.com            ✓ (Proxied)

# The A/AAAA records are dummy values - Workers will intercept requests
```

### SSL/TLS Configuration

```bash
# In Cloudflare Dashboard:
# 1. SSL/TLS > Overview > Full (strict)
# 2. SSL/TLS > Edge Certificates > Always Use HTTPS: On
# 3. SSL/TLS > Edge Certificates > HTTP Strict Transport Security: Enable
```

## Performance Optimization

### Caching Strategy

```typescript
// server/middleware/cache.ts
export default defineEventHandler(async (event) => {
  // Skip caching for authenticated routes
  if (event.node.req.url?.includes('/api/auth')) return;
  
  // Cache static assets aggressively
  if (event.node.req.url?.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?)$/)) {
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
    setHeader(event, 'CDN-Cache-Control', 'public, max-age=31536000');
  }
  
  // Cache API responses
  if (event.node.req.url?.startsWith('/api/exams')) {
    setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400');
    setHeader(event, 'CDN-Cache-Control', 'public, max-age=86400');
  }
});
```

### Worker Limits & Optimization

```typescript
// Consider Workers limits:
// - 128MB memory per request
// - 50ms CPU time (Free), 30s (Paid)
// - 1MB request/response size (Free), 100MB (Paid)

// Optimize with streaming for large responses
export default defineEventHandler(async (event) => {
  const questions = await streamLargeQuestionSet();
  
  // Use streaming response
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of questions) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });
});
```

## Monitoring & Analytics

### Cloudflare Analytics

```bash
# View real-time logs
wrangler tail --env production

# Format logs for better readability
wrangler tail --env production --format pretty

# Filter logs
wrangler tail --env production --search "error"
```

### Custom Metrics

```typescript
// server/middleware/metrics.ts
export default defineEventHandler(async (event) => {
  const start = Date.now();
  
  event.node.res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log to Workers Analytics
    if (globalThis.ANALYTICS) {
      globalThis.ANALYTICS.writeDataPoint({
        indexes: [event.node.req.url],
        doubles: [duration],
      });
    }
    
    // Log slow requests
    if (duration > 200) {
      console.warn({
        url: event.node.req.url,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  });
});
```

## Rollback & Recovery

### Quick Rollback

```bash
# List recent deployments
wrangler deployments list --env production

# Rollback to specific version
wrangler rollback [deployment-id] --env production

# Or use percentage rollout
wrangler deploy --env production --compatibility-flags gradually_rollout@50
```

### Backup Strategy

```bash
# Database backup (automated daily)
turso db dump pingtopass-prod > backups/$(date +%Y%m%d).sql

# Application backup
git tag -a v$(date +%Y%m%d) -m "Production deployment $(date)"
git push origin --tags
```

## Cost Management

### Workers Pricing (2024)
- **Free Plan**: 100,000 requests/day, 10ms CPU time
- **Paid Plan**: $5/month + $0.50 per million requests
- **Workers KV**: 100,000 reads/day free, then $0.50 per million

### Optimization Tips
1. Use KV caching aggressively
2. Minimize external API calls
3. Optimize bundle size (<1MB)
4. Use Cloudflare Images for media
5. Enable Auto Minify in Cloudflare

## Security

### Security Headers

```typescript
// server/middleware/security.ts
export default defineEventHandler(async (event) => {
  // Security headers
  setHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline';",
  });
});
```

### Rate Limiting

```typescript
// Configure in wrangler.toml
[[rate_limiting]]
threshold = 50
period = 60
action = "challenge"
```

## Troubleshooting

### Common Issues

```bash
# Build fails
pnpm clean && pnpm install --frozen-lockfile && pnpm build

# Deployment fails
wrangler whoami  # Check authentication
wrangler deploy --dry-run  # Test without deploying

# Secret not working
wrangler secret list --env production
wrangler secret delete KEY --env production
wrangler secret put KEY --env production

# Custom domain not working
# Check DNS propagation
dig pingtopass.com
nslookup pingtopass.com

# Performance issues
wrangler tail --env production --format json | grep duration
```

### Debug Mode

```typescript
// Add debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', {
    url: event.node.req.url,
    method: event.node.req.method,
    headers: event.node.req.headers,
  });
}
```

## Useful Commands Reference

```bash
# Development
pnpm dev                        # Start dev server
wrangler dev                    # Test with Workers runtime

# Deployment
wrangler deploy                 # Deploy to default environment
wrangler deploy --env preview   # Deploy to preview
wrangler deploy --env production # Deploy to production

# Monitoring
wrangler tail                   # View real-time logs
wrangler deployments list       # List deployments

# Secrets Management
wrangler secret list            # List secrets
wrangler secret put KEY         # Add/update secret
wrangler secret delete KEY      # Remove secret

# KV Management
wrangler kv:namespace list      # List KV namespaces
wrangler kv:key put --binding=CACHE "key" "value"  # Put value
wrangler kv:key get --binding=CACHE "key"          # Get value
```