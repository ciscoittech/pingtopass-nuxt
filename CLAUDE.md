# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Project Status: PingToPass Platform Development

**Current Phase**: Building PingToPass certification platform on Nuxt 3/Cloudflare Workers architecture  
**Repository**: https://github.com/ciscoittech/pingtopass-nuxt  
**Target Go-Live**: Q1 2024

## Project Overview

**PingToPass** - IT Certification Exam Platform built on edge-first architecture for global <200ms performance within $50/month budget.

### Platform Goals
- **Exam Content**: 10,000+ questions with AI-powered generation
- **Learning System**: Adaptive learning with progress tracking
- **Performance**: <200ms response time globally
- **Cost**: Stay within $50/month infrastructure budget

## New Architecture (Active Development)

### Tech Stack
- **Full-Stack Framework**: Nuxt 3 with Nitro (universal Vue app)
- **Database**: Turso (SQLite at the edge) with Drizzle ORM - Free tier
- **ORM**: Drizzle ORM (type-safe, no raw SQL needed)
- **Deployment**: Cloudflare Workers - $5-25/month
- **Authentication**: Google OAuth with JWT (configured)
- **AI Integration**: LangChain + OpenRouter (configured)
- **Payments**: Stripe (to be implemented)
- **Development**: Local with wrangler dev

### Project Structure
```
pingtopass-nuxt/
├── server/                 # Nitro server (API routes)
│   ├── api/               # RESTful endpoints
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # Authentication
│   │   ├── questions/    # Exam questions
│   │   ├── sessions/     # Study sessions
│   │   └── webhooks/     # Stripe webhooks
│   ├── database/         # Drizzle ORM schema
│   │   └── schema.ts    # Type-safe database schema
│   ├── middleware/        # Auth, logging, etc.
│   ├── utils/            # Database, AI clients
│   │   ├── database.ts  # Drizzle client
│   │   └── ai/          # LangChain config
│   └── plugins/          # Server plugins
├── app/                   # Nuxt app directory
├── pages/                 # File-based routing (if using pages/)
├── components/            # Vue components
├── composables/          # Shared composition functions
├── stores/               # Pinia state management
├── drizzle/              # Generated migrations (gitignored)
├── public/               # Static assets
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── drizzle.config.ts     # Drizzle configuration
├── nuxt.config.ts        # Nuxt configuration
├── wrangler.toml         # Cloudflare Workers config
└── package.json          # Dependencies and scripts
```

## 🤖 Installed Claude Code Agents

### Core Platform Agents
- **ui-ux-designer** - UI/UX design patterns for exam interface
- **frontend-developer** - Vue 3/Nuxt best practices
- **backend-architect** - Nitro server API design
- **database-optimizer** - Turso/SQLite query optimization
- **database-admin** - Database maintenance and migrations
- **javascript-pro** - Advanced JavaScript/TypeScript patterns
- **sql-pro** - Complex SQL query optimization
- **code-reviewer** - Automated code quality checks
- **debugger** - Advanced debugging strategies

### Business & Payment Agents
- **business-analyst** - Feature prioritization and ROI analysis
- **payment-integration** - Stripe integration best practices
- **sales-automator** - Growth automation workflows
- **market-research-analyst** - Competitor and market analysis

### DevOps & Infrastructure Agents
- **cloud-architect** - Cloudflare Workers optimization
- **deployment-engineer** - CI/CD pipeline management
- **devops-troubleshooter** - Infrastructure debugging
- **agent-expert** - Multi-agent coordination

## 🛠️ CLI Tools Priority (Per Anthropic Best Practices)

**IMPORTANT**: Always prefer native CLI tools over MCP servers for better performance and reliability:

### Priority Order for Tools
1. **GitHub CLI (`gh`)** - For all GitHub operations
2. **Wrangler CLI** - For Cloudflare Workers deployment
3. **Turso CLI (`turso`)** - For database operations
4. **Direct file operations** - For code changes
5. MCP servers only as last resort

## Key Commands

### Development Setup (From Cloudflare Template)
```bash
# Clone Cloudflare's Nuxt template
git clone https://github.com/cloudflare/workers-sdk
cd workers-sdk/templates/experimental/nuxt

# Or use C3 (Create Cloudflare CLI)
npm create cloudflare@latest my-nuxt-app -- --framework=nuxt

# Install dependencies
npm install

# Local development
wrangler dev
```

### GitHub Workflow (Using `gh` CLI)
```bash
# Create feature branch and PR
gh issue create --title "Feature: Add exam timer" --body "Implementation details..."
gh issue develop 123 --checkout  # Creates branch from issue
gh pr create --fill             # Create PR with template

# Review and merge
gh pr review --approve 456
gh pr merge 456 --squash

# Project management
gh project item-add 1 --owner @me --url https://github.com/ciscoittech/pingtopass-nuxt/issues/123
gh workflow run deploy.yml
```

### Cloudflare Workers Deployment (Using `wrangler`)
```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Environment management
wrangler secret put TURSO_DATABASE_URL
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put OPENROUTER_API_KEY

# Preview deployments
wrangler dev  # Local development
wrangler deploy --env preview  # Preview environment

# View logs and analytics
wrangler tail
```

### Database Operations (Using Turso CLI)
```bash
# Create new databases
turso db create pingtopass-dev   # Development database
turso db create pingtopass-prod  # Production database

# Get database credentials for .env
turso db show pingtopass-dev --url     # Get TURSO_DATABASE_URL
turso db tokens create pingtopass-dev  # Get TURSO_AUTH_TOKEN

# Connect to database shell
turso db shell pingtopass-dev
turso db shell pingtopass-prod

# Create replicas for edge performance
turso db replicate pingtopass-prod ams  # Amsterdam
turso db replicate pingtopass-prod sjc  # San Jose
turso db replicate pingtopass-prod sin  # Singapore

# Monitor and backup
turso db inspect pingtopass-prod
turso db dump pingtopass-prod > backup-$(date +%Y%m%d).sql
```

### Database Operations with Drizzle ORM
```bash
# Generate SQL migrations from schema changes
pnpm run db:generate

# Push schema changes to database
pnpm run db:push

# Open Drizzle Studio for visual database management
pnpm run db:studio

# Apply migrations
pnpm run db:migrate
```

### Testing
```bash
# Unit tests with Vitest
npm run test:unit          # Run unit tests
npm run test:unit:ui       # With UI
npm run test:coverage      # Generate coverage report

# E2E tests with Playwright
npm run test:e2e           # Run E2E tests
npm run test:e2e:debug     # Debug mode with browser

# Performance testing
npm run test:perf          # Run k6 performance tests
```

## 📊 Critical Performance Metrics

### Edge-First Performance
- **Target**: <200ms globally
- **Strategy**: Turso edge replicas + Cloudflare Workers
- **Caching**: Browser → Cloudflare Cache → Turso embedded replicas

### Database Schema with Drizzle ORM
```typescript
// server/database/schema.ts
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

// Define tables with type-safe schema
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull(),
  objectiveId: text('objective_id'),
  text: text('text').notNull(),
  difficulty: integer('difficulty').notNull(),
  explanation: text('explanation')
}, (table) => ({
  examObjectiveIdx: index('idx_exam_objective').on(table.examId, table.objectiveId),
  difficultyIdx: index('idx_difficulty').on(table.examId, table.difficulty)
}))

// Type-safe queries with Drizzle
const difficultQuestions = await db
  .select()
  .from(questions)
  .where(and(
    eq(questions.examId, 'aws-saa'),
    gte(questions.difficulty, 4)
  ))
  .limit(10)
```

## 🧪 TDD Requirements (Simplified)

### Test Coverage Goals
- **Critical Paths**: 100% (auth, payments, scoring)
- **API Routes**: 90% coverage
- **UI Components**: 80% coverage
- **Overall Target**: 85%

### Testing Workflow
```bash
# TDD cycle
npm run test:watch         # Watch mode for TDD
npm run test:coverage      # Check coverage
npm run test:ci           # Full CI suite before commit
```

## 🎯 Development Best Practices

### 1. Prefer CLI Tools
```bash
# Good: Use native CLIs
gh issue create           # GitHub CLI
wrangler deploy          # Cloudflare CLI
turso db shell           # Turso CLI

# Avoid: MCP servers unless necessary
```

### 2. Edge-First Patterns with Drizzle
```typescript
// server/api/questions/[id].get.ts
import { db } from '~/server/utils/database'
import { questions } from '~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Get from edge cache first
  const cached = await getCachedQuestion(event.context.params.id)
  if (cached) return cached
  
  // Type-safe query with Drizzle (automatically uses nearest Turso replica)
  const question = await db
    .select()
    .from(questions)
    .where(eq(questions.id, event.context.params.id))
    .get()
  
  // Cache for next request
  await setCachedQuestion(question, 300) // 5 min TTL
  return question
})
```

### 3. Type Safety with Nuxt
```typescript
// types/index.ts
export interface Question {
  id: string
  text: string
  answers: Answer[]
  difficulty: 1 | 2 | 3 | 4 | 5
}

// Auto-imported in components/pages
const { data: questions } = await useFetch<Question[]>('/api/questions')
```

### 4. Error Handling
```typescript
// server/api/protected.ts
export default defineEventHandler(async (event) => {
  try {
    const user = await requireAuth(event)
    // Protected logic here
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
})
```

## 🔐 Environment Variables

### Local Development (.env)
```bash
# Core
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# Database (Get these from turso db show & turso db tokens create)
TURSO_DATABASE_URL=libsql://pingtopass-dev.turso.io
TURSO_AUTH_TOKEN=your-token

# Auth (Already configured - from Google Cloud Console)
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret

# AI (Already configured - from OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
LANGCHAIN_API_KEY=ls__your-langchain-key  # Optional for tracing
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=pingtopass

# Payments (To be implemented - from Stripe Dashboard)
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### Production (Set via Wrangler)
```bash
# Use wrangler CLI to set secrets
wrangler secret put TURSO_DATABASE_URL
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put OPENROUTER_API_KEY
```

## 🚧 Common Development Tasks

### Adding New Features
```bash
# 1. Create issue and branch
gh issue create --title "Feature: Add progress tracking"
gh issue develop 123 --checkout

# 2. Write tests first (TDD)
npm run test:watch

# 3. Implement feature
# 4. Commit with conventional commits
git commit -m "feat: add progress tracking to study sessions"

# 5. Create PR
gh pr create --fill
```

### Database Changes with Drizzle
```bash
# 1. Update schema in server/database/schema.ts
# Add new column to existing table:
# tags: text('tags').$type<string[]>()

# 2. Generate migration
pnpm run db:generate

# 3. Push to development database
pnpm run db:push

# 4. Test locally with Drizzle Studio
pnpm run db:studio

# 5. Deploy to production
wrangler secret put TURSO_DATABASE_URL --env production
pnpm run db:push --env production
```

### AI Question Generation with Drizzle
```typescript
// server/api/admin/generate-questions.post.ts
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { db } from '~/server/utils/database'
import { questions } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const model = new ChatOpenAI({
    modelName: "qwen/qwen-2.5-7b-instruct",
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1'
    }
  })
  
  // Generate 500 questions per exam
  const generatedQuestions = await generateQuestions(model, examId, 500)
  
  // Type-safe batch insert with Drizzle
  await db.batch(
    generatedQuestions.map(q => 
      db.insert(questions).values({
        id: q.id,
        examId: q.examId,
        text: q.text,
        answers: JSON.stringify(q.answers),
        difficulty: q.difficulty,
        explanation: q.explanation
      })
    )
  )
})
```

## 📈 Monitoring & Analytics

### Cloudflare Analytics (Built-in)
```bash
# View real-time logs
wrangler tail

# Analytics dashboard
# Visit: https://dash.cloudflare.com/analytics
```

### Performance Monitoring
```typescript
// server/middleware/timing.ts
export default defineEventHandler(async (event) => {
  const start = Date.now()
  
  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    
    // Log slow requests
    if (duration > 200) {
      console.warn(`Slow request: ${event.node.req.url} took ${duration}ms`)
    }
  })
})
```

## 🎓 Current Sprint Focus

### Sprint 1: Foundation & Architecture (In Progress)
- [x] Architecture migration plan (FastAPI → Nuxt 3)
- [x] Claude Code agents installation
- [x] Install Drizzle ORM and configure for Turso
- [x] Create environment variable templates
- [ ] Create Turso databases using Turso CLI
- [ ] Set up Cloudflare Workers deployment
- [ ] Configure Cloudflare Nuxt template
- [ ] Implement Google OAuth (credentials ready)
- [ ] Create base UI components

### Sprint 2: Core Platform Features
- [ ] Question delivery API
- [ ] Study session management
- [ ] Progress tracking
- [ ] Basic exam simulation
- [ ] LangChain integration for question generation

### Sprint 3: Monetization & Launch
- [ ] Stripe subscription setup
- [ ] Feature gating by tier
- [ ] Performance optimization (<200ms globally)
- [ ] Launch marketing strategy

## 📚 Important Principles

1. **Edge-First** - Everything runs at the edge for global performance
2. **Simple Over Complex** - Start minimal, add complexity only when needed
3. **Cost-Conscious** - Stay within $50/month budget
4. **Type-Safe** - TypeScript everywhere with strict mode
5. **Test-Driven** - Write tests before implementation
6. **CLI-First** - Use native CLIs over MCP servers
7. **Progressive Enhancement** - Core features work without JavaScript

## Getting Help

### Architecture Documentation
- **API Routes**: See `platform-specification/system-architecture/API_SPECIFICATION.md`
- **Database Schema**: See `platform-specification/system-architecture/TURSO_SCHEMA.md`
- **Deployment Guide**: See `platform-specification/system-architecture/CLOUDFLARE_DEPLOYMENT.md`
- **Testing Strategy**: See `platform-specification/system-architecture/TDD_FRAMEWORK.md`

### Claude Code Agents
- **Agents Directory**: `.claude/agents/`
- **Agent Documentation**: `.claude/AGENTS.md`
- **Install More**: `npx claude-code-templates@latest --agent=<name>`

## 🔗 Quick Links

### Development
- **Repository**: https://github.com/ciscoittech/pingtopass-nuxt
- **Project Board**: https://github.com/ciscoittech/pingtopass-nuxt/projects/1
- **Claude Templates**: https://github.com/davila7/claude-code-templates
- **Cloudflare Nuxt Guide**: https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/

### Infrastructure
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Turso Dashboard**: https://turso.tech/dashboard
- **OpenRouter**: https://openrouter.ai
- **Stripe Dashboard**: https://dashboard.stripe.com