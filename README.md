# PingToPass - Nuxt 3 Edge Platform

> IT Certification Exam Platform built with Nuxt 3, Turso, and Cloudflare Edge

## Architecture Stack

- **Frontend**: Nuxt 3 + Vue 3 + TypeScript
- **UI Components**: Nuxt UI + Tailwind CSS
- **Database**: Turso (SQLite at the edge)
- **Authentication**: Google OAuth + JWT
- **AI Integration**: LangChain + OpenRouter (Qwen3 models)
- **Payments**: Stripe
- **Deployment**: Cloudflare Pages + Workers
- **Testing**: Vitest + Playwright

## Quick Start

### Prerequisites

- Node.js 18+
- GitHub CLI (for repository management)
- Turso CLI (for database)
- Wrangler CLI (for Cloudflare deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/ciscoittech/pingtopass-nuxt.git
cd pingtopass-nuxt

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
npm run db:migrate
npm run db:seed

# Start development
npm run dev
```

### Development URLs

- **Local**: http://localhost:3000
- **Orbstack**: http://pingtopass.local.orbstack.dev (if using Orbstack)

## Key Commands

### Development
```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing
```bash
npm run test             # Unit tests (Vitest)
npm run test:e2e         # E2E tests (Playwright)
npm run test:all         # All tests + linting + typecheck
npm run typecheck        # TypeScript validation
npm run lint             # ESLint
```

### Database
```bash
npm run db:migrate       # Run migrations (development)
npm run db:migrate:prod  # Run migrations (production)
npm run db:seed          # Seed with test data
```

### Deployment
```bash
npm run deploy:dev       # Deploy to development
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
```

## Project Structure

```
pingtopass-nuxt/
├── server/                 # Nitro server (edge functions)
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── questions/    # Question delivery
│   │   ├── sessions/     # Study/test sessions
│   │   ├── admin/        # Admin endpoints
│   │   └── webhooks/     # Payment webhooks
│   ├── utils/            # Server utilities
│   │   ├── db.ts         # Turso connection
│   │   ├── auth.ts       # Auth helpers
│   │   └── ai.ts         # LangChain setup
│   └── middleware/       # Server middleware
├── pages/                 # Nuxt pages
├── components/            # Vue components
├── composables/           # Shared logic
├── stores/                # Pinia stores
├── assets/                # Static assets
├── database/              # SQL migrations & schema
│   ├── schema.sql        # Turso schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Initial data
├── tests/                 # Test suite
│   ├── unit/            # Unit tests
│   ├── integration/     # API tests
│   └── e2e/             # End-to-end tests
└── platform-specification/ # System documentation
```

## Environment Configuration

Create `.env` file from `.env.example` and configure:

### Required Services

1. **Turso Database**
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash
   
   # Create database
   turso db create pingtopass-dev
   turso db show pingtopass-dev --url
   turso db show pingtopass-dev --token
   ```

2. **Google OAuth**
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins

3. **OpenRouter API**
   - Sign up at https://openrouter.ai
   - Get API key for AI question generation

4. **Stripe Account**
   - Create Stripe account
   - Get publishable and secret keys
   - Configure webhooks

## Performance Targets

- **Question Delivery**: < 100ms for 65 questions
- **Database Queries**: < 50ms average
- **Global Edge**: < 200ms worldwide
- **Lighthouse Score**: 95+ on all metrics

## Deployment Environments

- **Development**: Local with hot reload
- **Staging**: Preview deployments via branches  
- **Production**: Cloudflare global edge

## Contributing

1. Create feature branch: `git checkout -b feature/issue-123-description`
2. Write tests first (TDD approach)
3. Implement feature with 90%+ test coverage
4. Submit PR with clear description
5. All tests must pass before merge

## Documentation

- [System Architecture](./platform-specification/system-architecture/)
- [API Documentation](./platform-specification/system-architecture/API_SPECIFICATION.md)
- [Database Schema](./platform-specification/system-architecture/TURSO_SCHEMA.md)
- [Deployment Guide](./platform-specification/system-architecture/CLOUDFLARE_DEPLOYMENT.md)

## License

MIT License - see LICENSE file for details