# Cloudflare Deployment Strategy - Edge-First Production Architecture

## 1. Deployment Overview

### Architecture Stack
- **Hosting**: Cloudflare Pages (static) + Workers (API)
- **Database**: Turso (distributed SQLite)
- **CDN**: Cloudflare global network
- **CI/CD**: GitHub Actions → Cloudflare Pages
- **Environments**: Development, Staging, Production

### Key Benefits
- Zero cold starts with Workers
- Global edge deployment
- Built-in DDoS protection
- Automatic SSL/TLS
- Free tier generous limits

## 2. Project Configuration

### 2.1 Cloudflare Pages Setup
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Initialize project
npm create cloudflare@latest pingtopass-nuxt -- \
  --framework=nuxt \
  --typescript \
  --git

# Link to existing project
wrangler pages project create pingtopass
```

### 2.2 wrangler.toml Configuration
```toml
name = "pingtopass"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "pingtopass-production"
vars = { ENVIRONMENT = "production" }
kv_namespaces = [
  { binding = "CACHE", id = "your-kv-namespace-id" }
]

[env.staging]
name = "pingtopass-staging"
vars = { ENVIRONMENT = "staging" }

[env.development]
name = "pingtopass-dev"
vars = { ENVIRONMENT = "development" }

# Build configuration
[build]
command = "npm run build"
upload_format = "modules"

[build.upload]
dir = ".output/public"
main = ".output/server/index.mjs"

# Routes
[[routes]]
include = ["/*"]
exclude = ["/assets/*", "/favicon.ico"]
```

### 2.3 Environment Variables
```bash
# Production secrets (set via Cloudflare dashboard or CLI)
wrangler secret put TURSO_DATABASE_URL --env production
wrangler secret put TURSO_AUTH_TOKEN --env production
wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put OPENROUTER_API_KEY --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production

# Development secrets
wrangler secret put TURSO_DATABASE_URL --env development
# ... repeat for all secrets
```

## 3. Database Setup (Turso)

### 3.1 Turso Configuration
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create production database
turso db create pingtopass-prod --region sjc

# Create development database
turso db create pingtopass-dev --region sjc

# Get database URLs
turso db show pingtopass-prod --url
turso db show pingtopass-prod --token

# Create schema
turso db shell pingtopass-prod < database/schema.sql
```

### 3.2 Database Schema
```sql
-- database/schema.sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  provider TEXT DEFAULT 'google',
  provider_id TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  subscription_status TEXT DEFAULT 'free' CHECK(subscription_status IN ('free', 'premium')),
  stripe_customer_id TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exams table
CREATE TABLE exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  passing_score REAL DEFAULT 0.65,
  question_count INTEGER DEFAULT 65,
  time_limit_minutes INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vendor_id, code)
);

-- Objectives table
CREATE TABLE objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weight REAL DEFAULT 0.25,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Questions table (optimized for reads)
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  objective_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'multiple_choice',
  difficulty INTEGER DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),
  answers TEXT NOT NULL, -- JSON array
  explanation TEXT,
  reference TEXT,
  ai_generated BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Study sessions
CREATE TABLE study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  objectives TEXT, -- JSON array of objective IDs
  mode TEXT DEFAULT 'practice',
  status TEXT DEFAULT 'active',
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- User answers
CREATE TABLE user_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer TEXT NOT NULL,
  is_correct BOOLEAN,
  time_spent INTEGER,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id);
CREATE INDEX idx_questions_active ON questions(is_active);
CREATE INDEX idx_user_answers_recent ON user_answers(user_id, answered_at);
CREATE INDEX idx_sessions_user ON study_sessions(user_id, exam_id, status);
```

### 3.3 Migration Strategy
```bash
# database/migrate.ts
import { createClient } from '@libsql/client'
import fs from 'fs'
import path from 'path'

async function migrate() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  
  // Read schema
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf-8'
  )
  
  // Execute migrations
  const statements = schema.split(';').filter(s => s.trim())
  
  for (const statement of statements) {
    try {
      await db.execute(statement)
      console.log('✓ Executed:', statement.substring(0, 50) + '...')
    } catch (error) {
      console.error('✗ Failed:', error)
    }
  }
  
  console.log('Migration complete!')
}

migrate()
```

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Type check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NUXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          NUXT_PUBLIC_STRIPE_PUBLIC_KEY: ${{ secrets.STRIPE_PUBLIC_KEY_TEST }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pingtopass
          directory: .output/public
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NUXT_PUBLIC_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          NUXT_PUBLIC_STRIPE_PUBLIC_KEY: ${{ secrets.STRIPE_PUBLIC_KEY }}
      
      - name: Run database migrations
        run: npm run db:migrate:prod
        env:
          TURSO_DATABASE_URL: ${{ secrets.TURSO_DATABASE_URL_PROD }}
          TURSO_AUTH_TOKEN: ${{ secrets.TURSO_AUTH_TOKEN_PROD }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: pingtopass
          directory: .output/public
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
          branch: main
```

### 4.2 Preview Deployments
```yaml
# Automatic preview deployments for PRs
preview:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    
    - name: Deploy Preview
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: pingtopass
        directory: .output/public
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
        branch: preview-${{ github.event.pull_request.number }}
```

## 5. Monitoring & Observability

### 5.1 Cloudflare Analytics
```typescript
// server/middleware/analytics.ts
export default defineEventHandler(async (event) => {
  const start = Date.now()
  
  event.context.analytics = {
    requestId: crypto.randomUUID(),
    startTime: start
  }
  
  // Log to Cloudflare Analytics
  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const status = event.node.res.statusCode
    
    // Cloudflare will automatically collect these
    console.log(JSON.stringify({
      type: 'request',
      requestId: event.context.analytics.requestId,
      path: event.node.req.url,
      method: event.node.req.method,
      status,
      duration,
      timestamp: new Date().toISOString()
    }))
  })
})
```

### 5.2 Error Tracking
```typescript
// server/utils/monitoring.ts
export function logError(error: any, context: any = {}) {
  // Structured logging for Cloudflare Logs
  console.error(JSON.stringify({
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString()
  }))
}

// Use in error handlers
export default defineEventHandler(async (event) => {
  try {
    // ... handler logic
  } catch (error) {
    logError(error, {
      path: event.node.req.url,
      method: event.node.req.method,
      userId: event.context.user?.id
    })
    throw error
  }
})
```

## 6. Performance Optimization

### 6.1 Edge Caching Strategy
```typescript
// server/api/questions/[examId].get.ts
export default defineCachedEventHandler(async (event) => {
  const examId = getRouterParam(event, 'examId')
  
  // This will be cached at the edge
  const questions = await getQuestionsByExam(examId)
  
  return questions
}, {
  maxAge: 60 * 5, // Cache for 5 minutes
  name: 'questions-by-exam',
  getKey: (event) => getRouterParam(event, 'examId')!,
  shouldBypass: (event) => {
    // Don't cache for authenticated requests
    return !!event.context.user
  }
})
```

### 6.2 Static Asset Optimization
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    compressPublicAssets: true,
    prerender: {
      routes: ['/', '/about', '/pricing'] // Static pages
    }
  },
  
  // Image optimization
  image: {
    cloudflare: {
      baseURL: 'https://pingtopass.com'
    }
  },
  
  // Bundle optimization
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['vue', 'pinia', '@vueuse/core'],
            'ui': ['@headlessui/vue', '@heroicons/vue']
          }
        }
      }
    }
  }
})
```

## 7. Security Configuration

### 7.1 Headers & CSP
```typescript
// server/middleware/security.ts
export default defineEventHandler((event) => {
  // Security headers
  setHeaders(event, {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://openrouter.ai",
      "frame-src https://accounts.google.com https://checkout.stripe.com"
    ].join('; ')
  })
})
```

### 7.2 Rate Limiting
```typescript
// server/middleware/rateLimit.ts
const attempts = new Map<string, number[]>()

export default defineEventHandler(async (event) => {
  // Skip for static assets
  if (event.node.req.url?.startsWith('/assets')) return
  
  const ip = getClientIP(event) || 'unknown'
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100
  
  // Get attempts for this IP
  const userAttempts = attempts.get(ip) || []
  
  // Filter attempts within window
  const recentAttempts = userAttempts.filter(
    time => now - time < windowMs
  )
  
  if (recentAttempts.length >= maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests'
    })
  }
  
  // Record this attempt
  recentAttempts.push(now)
  attempts.set(ip, recentAttempts)
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, times] of attempts.entries()) {
      const recent = times.filter(t => now - t < windowMs)
      if (recent.length === 0) {
        attempts.delete(key)
      } else {
        attempts.set(key, recent)
      }
    }
  }
})
```

## 8. Deployment Commands

### 8.1 Package.json Scripts
```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "deploy:dev": "wrangler pages deploy .output/public --project-name=pingtopass --branch=dev",
    "deploy:staging": "wrangler pages deploy .output/public --project-name=pingtopass --branch=staging",
    "deploy:prod": "wrangler pages deploy .output/public --project-name=pingtopass --branch=main",
    "db:migrate": "tsx database/migrate.ts",
    "db:seed": "tsx database/seed.ts",
    "logs:dev": "wrangler pages deployment tail --project-name=pingtopass --environment=preview",
    "logs:prod": "wrangler pages deployment tail --project-name=pingtopass --environment=production"
  }
}
```

### 8.2 Quick Deploy Guide
```bash
# Initial setup
git clone https://github.com/yourusername/pingtopass-nuxt.git
cd pingtopass-nuxt
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Local development
npm run dev

# Deploy to staging
git checkout -b staging
git push origin staging
# GitHub Actions will auto-deploy

# Deploy to production
git checkout main
git merge staging
git push origin main
# GitHub Actions will auto-deploy

# Monitor deployment
wrangler pages deployment list --project-name=pingtopass

# View logs
npm run logs:prod
```

## 9. Rollback Strategy

### 9.1 Instant Rollback
```bash
# List deployments
wrangler pages deployment list --project-name=pingtopass

# Rollback to previous version
wrangler pages rollback --project-name=pingtopass --deployment-id=<previous-id>

# Or use Cloudflare Dashboard
# Pages > pingtopass > Deployments > Rollback
```

### 9.2 Database Rollback
```bash
# Keep backup before migrations
turso db backup create pingtopass-prod

# Restore if needed
turso db backup restore pingtopass-prod --backup-id=<backup-id>
```

## 10. Cost Optimization

### Free Tier Limits (Cloudflare)
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited requests
- **KV Storage**: 100,000 reads/day
- **Bandwidth**: Unlimited

### Turso Free Tier
- **Databases**: 3
- **Locations**: 3
- **Storage**: 8 GB total
- **Queries**: 1 billion reads/month

### Monitoring Usage
```bash
# Check Cloudflare usage
wrangler pages usage --project-name=pingtopass

# Check Turso usage
turso db usage pingtopass-prod
```

This deployment strategy ensures:
- **Zero-downtime deployments** with instant rollback
- **Global edge distribution** for low latency
- **Automatic scaling** with no configuration
- **Built-in security** with Cloudflare protection
- **Cost-effective** within free tier limits
- **Simple workflow** from dev to production