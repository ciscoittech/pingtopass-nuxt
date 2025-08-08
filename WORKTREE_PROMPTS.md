# 🚀 PingToPass Worktree Development Prompts

## Master Prompt Template for Each Worktree

Use these prompts when starting Claude in each worktree to ensure proper agent selection and task execution.

---

## 📦 PHASE 1: FOUNDATION WORKTREE

### Initial Prompt:
```
You are working in the foundation worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: foundation
- Branch: feature/foundation-setup
- Tech stack: Nuxt 3, Cloudflare Workers, Drizzle ORM, Turso

TASKS TO COMPLETE:
1. Issue #7: Setup Local Development Environment
2. Issue #18: Create and Configure Turso Databases with CLI

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to coordinate everything
- @agent-system-architect-tdd to design the system architecture
- @agent-senior-engineer-tdd to implement the code
- @agent-devops-docker-cloud for environment and deployment setup
- @agent-database-optimizer for Turso database optimization
- @agent-code-review-analyzer after implementation

EXECUTION ORDER:
1. First, use @agent-workflow-orchestrator-v2 to plan the entire foundation setup
2. Have @agent-system-architect-tdd design the architecture
3. Use @agent-senior-engineer-tdd to implement the design
2. Setup local development environment with proper .env configuration
3. Install all dependencies using pnpm
4. Create Turso databases (dev and prod) using Turso CLI
5. Configure Drizzle ORM connection
6. Test database connectivity
7. Create initial migration
8. Document setup process in README

DELIVERABLES:
- Working local development environment
- Turso databases created and configured
- .env file properly configured with all credentials
- Database connection tested and working
- Initial schema migrated to Turso
- Documentation updated

When complete, commit changes and mark issues as resolved.
```

---

## 💾 PHASE 2A: DATABASE LAYER WORKTREE

### Initial Prompt:
```
You are working in the database-layer worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: database-layer
- Branch: feature/database-layer
- Foundation setup is complete (Turso databases exist, .env configured)

TASKS TO COMPLETE (SEQUENTIAL):
1. Issue #8: Setup Drizzle ORM with Turso Database
2. Issue #17: Migrate Database Queries to Drizzle ORM
3. Issue #19: Implement Type-Safe Database Queries with Drizzle

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to coordinate the database migration
- @agent-system-architect-tdd to design the database architecture
- @agent-senior-engineer-tdd to implement Drizzle ORM and queries
- @agent-database-optimizer for query and schema optimization
- @agent-sql-pro for complex SQL operations
- @agent-code-review-analyzer after implementation

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to plan database layer implementation
2. Have @agent-system-architect-tdd design the database schema and query patterns
3. Use @agent-senior-engineer-tdd to implement the architecture with TDD
2. Create complete Drizzle schema in server/database/schema.ts
3. Generate and apply migrations
4. Create database utility functions with type safety
5. Implement all CRUD operations with Drizzle
6. Write comprehensive tests for database layer
7. Optimize queries with proper indexing
8. Document all database operations

DELIVERABLES:
- Complete Drizzle ORM schema
- All database tables created with proper relationships
- Type-safe query functions
- Database utilities and helpers
- Comprehensive test coverage (>90%)
- Performance optimized queries
- Documentation of all database operations

When complete, ensure all tests pass before committing.
```

---

## 🧪 PHASE 2B: TESTING SETUP WORKTREE

### Initial Prompt:
```
You are working in the testing-setup worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: testing-setup
- Branch: feature/testing-setup
- Can work in parallel with other Phase 2 worktrees

TASK TO COMPLETE:
- Issue #9: Configure Testing Framework with Vitest and Playwright

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to plan testing strategy
- @agent-system-architect-tdd to design the testing architecture
- @agent-senior-engineer-tdd to implement test framework and write tests
- @agent-frontend-developer for Vue/Nuxt component testing
- @agent-backend-architect for Nitro server API testing
- @agent-code-review-analyzer for test quality review

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to design comprehensive testing strategy
2. Setup Vitest for unit testing
3. Configure Playwright for E2E testing
4. Create test utilities and factories
5. Write unit tests for existing components
6. Create E2E test scenarios
7. Setup CI/CD test pipeline
8. Configure coverage reporting
9. Document testing practices

DELIVERABLES:
- Vitest configuration complete
- Playwright configuration complete
- Test utilities and factories
- Unit tests for critical paths
- E2E tests for user flows
- CI/CD pipeline with tests
- Coverage reporting setup
- Testing documentation and best practices

Aim for 85% overall test coverage.
```

---

## ☁️ PHASE 2C: CLOUDFLARE DEPLOYMENT WORKTREE

### Initial Prompt:
```
You are working in the cloudflare-deployment worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: cloudflare-deployment
- Branch: feature/cloudflare-deployment
- Using Cloudflare Workers (NOT Pages - Pages is discontinued)

TASKS TO COMPLETE (SEQUENTIAL):
1. Issue #16: Configure Cloudflare Workers Deployment
2. Issue #20: Update Wrangler Configuration for Workers Deployment

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to plan deployment strategy
- @agent-system-architect-tdd to design the deployment architecture
- @agent-senior-engineer-tdd to implement deployment configurations
- @agent-cloud-architect for Cloudflare Workers optimization
- @agent-devops-docker-cloud for deployment pipeline
- @agent-git-devops-workflow for CI/CD and GitHub Actions
- @agent-deployment-engineer for deployment scripts
- @agent-code-review-analyzer for configuration review

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to design deployment architecture
2. Configure wrangler.toml for Workers deployment
3. Setup environment variables and secrets
4. Configure build process for Workers
5. Create deployment scripts
6. Setup GitHub Actions for CI/CD
7. Configure preview deployments
8. Test production deployment
9. Setup monitoring and logging
10. Document deployment process

DELIVERABLES:
- Complete wrangler.toml configuration
- Environment variables configured
- GitHub Actions workflow
- Deployment scripts (dev, preview, production)
- Preview deployment working
- Production deployment tested
- Monitoring configured
- Deployment documentation

Ensure zero-downtime deployments are possible.
```

---

## 🔄 CONTINUITY PROMPT (For Resuming Work)

### When Resuming Any Worktree:
```
I'm resuming work in the [WORKTREE_NAME] worktree for PingToPass.

Please:
1. Check git status to see current progress
2. Review the GitHub issues assigned to this worktree
3. Check which tasks are already completed
4. Continue from where we left off
5. Use the same agents specified in the original prompt
6. Maintain consistency with previous work

Current worktree: [WORKTREE_NAME]
Branch: [BRANCH_NAME]
Issues: [ISSUE_NUMBERS]

Show me the current status and let's continue with the next uncompleted task.
```

---

## 🎯 EPIC PROGRESSION PROMPT

### For Moving Through Epics:
```
We've completed Epic [X]. Now moving to Epic [Y].

CURRENT STATUS:
- Completed Epics: [LIST]
- Current Epic: [EPIC_NUMBER] - [EPIC_TITLE]
- Related Issues: [ISSUE_NUMBERS]

Please:
1. Use @agent-workflow-orchestrator-v2 to break down this epic
2. Identify which worktrees need updates
3. Create implementation plan
4. Assign appropriate agents for each task
5. Ensure dependencies from previous epics are met

Epic Details:
[EPIC_DESCRIPTION]

Required Capabilities:
[LIST_REQUIRED_FEATURES]

Start by analyzing the epic and creating a detailed implementation plan.
```

---

## 📝 QUICK REFERENCE

### Agent Selection by Task Type:

**Master Coordination (Always Start Here):**
- @agent-workflow-orchestrator-v2 - Orchestrates all work
- @agent-system-architect-tdd - Designs architecture (before implementation)
- @agent-senior-engineer-tdd - Implements the designed architecture

**Infrastructure & Deployment:**
- @agent-devops-docker-cloud - Docker and cloud setup
- @agent-cloud-architect - Cloudflare Workers optimization
- @agent-git-devops-workflow - Git workflows and CI/CD
- @agent-deployment-engineer - Deployment scripts and automation

**Database Work:**
- @agent-database-optimizer - Query and schema optimization
- @agent-database-admin - Database maintenance
- @agent-sql-pro - Complex SQL operations

**Frontend (Nuxt/Vue):**
- @agent-frontend-developer - Vue components and Nuxt pages
- @agent-ui-ux-designer - UI/UX patterns
- @agent-javascript-pro - Advanced JavaScript/TypeScript

**Backend (Nitro Server):**
- @agent-backend-architect - API design and server architecture
- @agent-api-security-audit - Security reviews

**Testing & Quality:**
- @agent-code-review-analyzer - Code quality reviews
- @agent-debugger - Complex debugging

**Product & Business:**
- @agent-product-manager-github - GitHub project management
- @agent-business-analyst - Feature prioritization
- @agent-market-research-analyst - Market analysis

**AI & Automation:**
- @agent-ai-solutions-architect - LangChain and AI integration
- @agent-prompt-engineer - Prompt optimization
- @agent-sales-automator - Growth automation

**Payments:**
- @agent-payment-integration - Stripe integration

---

## 🚀 USAGE INSTRUCTIONS

1. **Copy the appropriate prompt** for your worktree
2. **Start Claude** in the worktree directory
3. **Paste the prompt** to begin work
4. **Follow the execution order** specified
5. **Use continuity prompt** when resuming
6. **Commit regularly** with descriptive messages
7. **Update GitHub issues** as tasks complete

**CRITICAL WORKFLOW:**
1. Always start with @agent-workflow-orchestrator-v2 to orchestrate
2. Then @agent-system-architect-tdd designs the architecture
3. Then @agent-senior-engineer-tdd implements with TDD
4. Other specialized agents support as needed
5. Finally @agent-code-review-analyzer reviews the implementation

This is a Nuxt 3 project with Nitro server, NOT FastAPI!