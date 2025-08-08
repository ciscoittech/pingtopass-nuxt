# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Project Status: Dual-System Development

**Current Phase**: Building PingToPass certification platform + Twitter Growth System on unified Nuxt 3/Cloudflare edge architecture  
**Repository**: https://github.com/ciscoittech/pingtopass-nuxt  
**Target Go-Live**: Q1 2024

## Project Overview

**PingToPass** - IT Certification Exam Platform with integrated Twitter Growth System for organic marketing. Built on edge-first architecture for global <200ms performance within $50/month budget.

### Dual System Goals
1. **PingToPass Platform**: 10,000+ exam questions, AI-powered generation, adaptive learning
2. **Twitter Growth System**: 500-1000 quality followers/month at <$0.05 per follower using AI automation

## New Architecture (Active Development)

### Tech Stack
- **Full-Stack Framework**: Nuxt 3 with Nitro (universal Vue app)
- **Database**: Turso (SQLite at the edge) - Free tier
- **Deployment**: Cloudflare Pages/Workers - $5-25/month
- **Authentication**: Google OAuth with JWT
- **AI Integration**: LangChain + OpenRouter (Qwen3 models)
- **Payments**: Stripe (handles all billing complexity)
- **Development**: Local with Orbstack support

### Project Structure
```
pingtopass-nuxt/
├── server/                 # Nitro server (API routes)
│   ├── api/               # RESTful endpoints
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # Authentication
│   │   ├── questions/    # Exam questions
│   │   ├── sessions/     # Study sessions
│   │   ├── twitter/      # Twitter Growth System
│   │   └── webhooks/     # Stripe, Twitter webhooks
│   ├── middleware/        # Auth, logging, etc.
│   ├── utils/            # Database, AI clients
│   │   ├── twitter/      # Twitter utilities
│   │   └── ai/          # LangChain config
│   └── plugins/          # Server plugins
├── pages/                 # Nuxt pages
│   ├── admin/            # Admin dashboard
│   │   └── twitter/      # Twitter management
│   └── exams/           # Exam interface
├── components/            # Vue components
├── composables/          # Shared composition functions
├── stores/               # Pinia state management
├── workers/              # Cloudflare Workers
│   ├── twitter-analyzer.ts
│   └── twitter-queue.ts
├── tests/                # Vitest + Playwright tests
├── database/             # Turso schemas and migrations
├── .claude/              # Claude Code configuration
│   └── agents/          # Installed AI agents
└── platform-specification/ # System documentation
    └── system-architecture/
        ├── TWITTER_GROWTH_SYSTEM_V2.md
        └── API_SPECIFICATION.md
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

### Business & Growth Agents
- **business-analyst** - Feature prioritization and ROI analysis
- **payment-integration** - Stripe integration best practices
- **sales-automator** - Growth automation workflows
- **twitter-ai-influencer-manager** - Twitter engagement automation
- **market-research-analyst** - Competitor and market analysis

### DevOps & Infrastructure Agents
- **cloud-architect** - Cloudflare edge optimization
- **deployment-engineer** - CI/CD pipeline management
- **devops-troubleshooter** - Infrastructure debugging
- **agent-expert** - Multi-agent coordination

## 🐦 Twitter Growth System Integration

### System Components
1. **API Routes** (`server/api/twitter/`)
   - Profile analysis
   - Reply generation (LangChain + OpenRouter)
   - Engagement queue management
   - Metrics tracking

2. **Cloudflare Workers** (`workers/`)
   - Scheduled tweet analysis (hourly)
   - Queue processing for approved engagements
   - Webhook handlers for real-time events

3. **Admin Dashboard** (`pages/admin/twitter/`)
   - Approval queue for AI-generated responses
   - Metrics dashboard (followers, engagement rate, costs)
   - Voice profile management

### Key Metrics & Targets
- **Monthly Followers**: 500-1000 quality followers
- **Cost Per Follower**: <$0.05 (using free-tier AI models)
- **Engagement Rate**: >5% on tweets
- **Daily Actions**: 20-30 automated engagements
- **Response Time**: <200ms globally

## 🛠️ CLI Tools Priority (Per Anthropic Best Practices)

**IMPORTANT**: Always prefer native CLI tools over MCP servers for better performance and reliability:

### Priority Order for Tools
1. **GitHub CLI (`gh`)** - For all GitHub operations
2. **Cloudflare CLI (`wrangler`)** - For deployments and edge config
3. **Turso CLI (`turso`)** - For database operations
4. **Direct file operations** - For code changes
5. MCP servers only as last resort

## Key Commands

### Development (New Stack)
```bash
# Clone and setup
gh repo clone ciscoittech/pingtopass-nuxt
cd pingtopass-nuxt
npm install

# Database setup (Turso CLI)
turso db create pingtopass-dev
turso db create pingtopass-prod
turso db shell pingtopass-dev < database/schema.sql

# Local development
npm run dev                  # Start Nuxt dev server
npm run dev:debug           # With Node inspector
npm run dev:https           # With HTTPS (for OAuth testing)

# Cloudflare local testing
wrangler pages dev --compatibility-date=2024-01-01
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

### Cloudflare Deployment (Using `wrangler`)
```bash
# Deploy to Cloudflare Pages
wrangler pages deploy ./dist --project-name=pingtopass

# Environment management
wrangler pages secret put TURSO_DATABASE_URL --env production
wrangler pages secret put GOOGLE_CLIENT_ID --env production

# Preview deployments
wrangler pages deployment create --branch=feature/new-ui

# View logs and analytics
wrangler pages deployment tail
```

### Database Operations (Using Turso CLI)
```bash
# Connect to database
turso db shell pingtopass-prod

# Run migrations
turso db shell pingtopass-prod < database/migrations/001_initial.sql

# Create replica for edge performance
turso db replicate pingtopass-prod ams  # Amsterdam
turso db replicate pingtopass-prod sjc  # San Jose

# Monitor and backup
turso db inspect pingtopass-prod
turso db dump pingtopass-prod > backup-$(date +%Y%m%d).sql
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
- **Target**: <200ms globally (relaxed from 100ms)
- **Strategy**: Turso edge replicas + Cloudflare CDN
- **Caching**: Browser → Cloudflare Cache → Turso embedded replicas

### Database Optimization (Turso/SQLite)
```sql
-- Critical indexes for <200ms query performance
CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id);
CREATE INDEX idx_questions_difficulty ON questions(exam_id, difficulty);
CREATE INDEX idx_sessions_user_exam ON study_sessions(user_id, exam_id);
CREATE INDEX idx_progress_user ON user_progress(user_id, exam_id);

-- Full-text search for questions
CREATE VIRTUAL TABLE questions_fts USING fts5(text, explanation);
```

## 🧪 TDD Requirements (Simplified)

### Test Coverage Goals
- **Critical Paths**: 100% (auth, payments, scoring)
- **API Routes**: 90% coverage
- **UI Components**: 80% coverage
- **Overall Target**: 85% (reduced from 90% for faster iteration)

### Testing Workflow
```bash
# TDD cycle
npm run test:watch         # Watch mode for TDD
npm run test:coverage      # Check coverage
npm run test:ci           # Full CI suite before commit
```

## 🎯 Development Best Practices (Anthropic Guidelines)

### 1. Prefer CLI Tools
```bash
# Good: Use native CLIs
gh issue create           # GitHub CLI
wrangler pages deploy     # Cloudflare CLI
turso db shell           # Turso CLI

# Avoid: MCP servers unless necessary
```

### 2. Edge-First Patterns
```typescript
// server/api/questions/[id].get.ts
export default defineEventHandler(async (event) => {
  // Get from edge cache first
  const cached = await getCachedQuestion(event.context.params.id)
  if (cached) return cached
  
  // Query Turso (automatically uses nearest replica)
  const question = await turso.execute({
    sql: "SELECT * FROM questions WHERE id = ?",
    args: [event.context.params.id]
  })
  
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
TURSO_DATABASE_URL=libsql://pingtopass-dev.turso.io
TURSO_AUTH_TOKEN=your-token

# Auth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret

# AI
OPENROUTER_API_KEY=your-openrouter-key
LANGCHAIN_API_KEY=your-langchain-key

# Payments
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

### Production (Set in Cloudflare Dashboard)
```bash
# Use wrangler CLI to set secrets
wrangler pages secret put TURSO_DATABASE_URL
wrangler pages secret put GOOGLE_CLIENT_SECRET
wrangler pages secret put OPENROUTER_API_KEY
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

### Database Changes
```bash
# 1. Create migration
echo "ALTER TABLE questions ADD COLUMN tags JSON;" > database/migrations/002_add_tags.sql

# 2. Test locally
turso db shell pingtopass-dev < database/migrations/002_add_tags.sql

# 3. Deploy to production
turso db shell pingtopass-prod < database/migrations/002_add_tags.sql
```

### AI Question Generation
```typescript
// server/api/admin/generate-questions.post.ts
import { LangChain } from '@langchain/core'
import { OpenRouter } from '@langchain/community/llms/openrouter'

export default defineEventHandler(async (event) => {
  const llm = new OpenRouter({
    model: "qwen/qwen3-30b-a3b-instruct-2507",
    apiKey: process.env.OPENROUTER_API_KEY
  })
  
  // Generate 500 questions per exam
  const questions = await generateQuestions(llm, examId, 500)
  
  // Batch insert to Turso
  await turso.batch(questions.map(q => ({
    sql: "INSERT INTO questions ...",
    args: [q.text, q.answers, ...]
  })))
})
```

## 📈 Monitoring & Analytics

### Cloudflare Analytics (Built-in)
```bash
# View real-time logs
wrangler pages deployment tail

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
- [x] Twitter Growth System V2 specification
- [x] Claude Code agents installation
- [ ] Set up Cloudflare Pages deployment
- [ ] Configure Turso databases (dev/prod)
- [ ] Implement Google OAuth
- [ ] Create base UI components

### Sprint 2: Core Platform Features
- [ ] Question delivery API
- [ ] Study session management
- [ ] Progress tracking
- [ ] Basic exam simulation
- [ ] LangChain integration for question generation

### Sprint 3: Twitter Growth System
- [ ] Twitter API v2 integration
- [ ] Voice profile system
- [ ] AI reply generation (OpenRouter free tier)
- [ ] Engagement approval queue
- [ ] Cloudflare Workers for automation

### Sprint 4: Monetization & Launch
- [ ] Stripe subscription setup
- [ ] Feature gating by tier
- [ ] Performance optimization (<200ms globally)
- [ ] Launch marketing through Twitter system

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
- **Twitter Growth System**: See `platform-specification/system-architecture/TWITTER_GROWTH_SYSTEM_V2.md`
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

### Infrastructure
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Turso Dashboard**: https://turso.tech/dashboard
- **OpenRouter**: https://openrouter.ai
- **Stripe Dashboard**: https://dashboard.stripe.com

### Twitter Growth
- **Twitter Developer**: https://developer.twitter.com
- **Twitter Analytics**: https://analytics.twitter.com