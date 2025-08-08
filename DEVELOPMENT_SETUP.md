# PingToPass Development Setup Guide

This guide walks you through setting up the complete PingToPass development environment, including databases, deployment configuration, and development tools.

## Quick Start

For the fastest setup, run our automated setup script:

```bash
# One-command setup (recommended)
./scripts/setup-dev-environment.sh

# Or step-by-step manual setup (see below)
```

## Prerequisites

### Required Software
- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **Git** for version control
- **A terminal/command line** interface

### Required Accounts
- **Turso Account** ([Sign up](https://turso.tech/)) - for edge database
- **Cloudflare Account** ([Sign up](https://cloudflare.com/)) - for deployment
- **Google Cloud Console** ([Access](https://console.cloud.google.com/)) - for OAuth
- **OpenRouter Account** ([Sign up](https://openrouter.ai/)) - for AI features
- **Stripe Account** ([Sign up](https://stripe.com/)) - for payments
- **Twitter Developer Account** ([Apply](https://developer.twitter.com/)) - for growth system

## Manual Setup Process

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ciscoittech/pingtopass-nuxt.git
cd pingtopass-nuxt

# Install dependencies
npm install

# Or if you prefer yarn/pnpm
yarn install
# pnpm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit the .env file with your actual values
nano .env  # or use your preferred editor
```

### Key Environment Variables to Configure:

#### Database (Turso)
```bash
TURSO_DATABASE_URL=libsql://pingtopass-dev-[username].turso.io
TURSO_AUTH_TOKEN=your-dev-auth-token
```

#### Google OAuth
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### OpenRouter AI
```bash
OPENROUTER_API_KEY=sk-or-your-openrouter-api-key
```

#### Stripe Payments
```bash
STRIPE_PUBLIC_KEY=pk_test_your-stripe-public-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
```

### 3. Install System Dependencies

#### Turso CLI (Required)
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login
```

#### mkcert for HTTPS Development (Optional)
```bash
# macOS
brew install mkcert

# Ubuntu/Debian
apt install libnss3-tools
curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Setup HTTPS certificates
npm run setup:https
```

### 4. Database Setup

#### Automated Database Setup (Recommended)
```bash
# Setup development database
npm run db:setup:dev

# This will:
# - Create Turso database
# - Apply schema
# - Display connection details
```

#### Manual Database Setup
```bash
# Create database manually
turso db create pingtopass-dev-$(whoami)

# Get connection details
turso db show pingtopass-dev-$(whoami) --url
turso db tokens create pingtopass-dev-$(whoami)

# Apply schema
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 5. Cloudflare Configuration

#### Setup Wrangler CLI
```bash
# Login to Cloudflare (if not already done)
npx wrangler login

# Or install globally
npm install -g wrangler
wrangler login
```

#### Configure wrangler.toml
The `wrangler.toml` file is already configured for multiple environments:
- **development**: `pingtopass-dev`
- **staging**: `pingtopass-staging`  
- **production**: `pingtopass-production`

### 6. Development Server

```bash
# Start development server
npm run dev

# With debugging
npm run dev:debug

# With HTTPS (requires mkcert setup)
npm run dev:https

# Access your app
open http://localhost:3000
```

## Available Scripts

### Development
```bash
npm run dev              # Start dev server
npm run dev:debug        # Start with Node.js inspector
npm run dev:https        # Start with HTTPS
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing
```bash
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run end-to-end tests
npm run test:e2e:debug   # Debug E2E tests
npm run test:all         # Run all tests
npm run test:ci          # Run tests for CI
```

### Database Operations
```bash
# Setup
npm run db:setup         # Setup all environments
npm run db:setup:dev     # Setup development only

# Migrations
npm run db:migrate       # Run migrations
npm run db:migrate:status # Check migration status

# Data seeding
npm run db:seed          # Seed development data
npm run db:seed:clear    # Clear and reseed data

# Database access
npm run db:shell         # Open database shell
npm run db:inspect       # Show database info
npm run db:backup        # Create backup
```

### Deployment
```bash
# Cloudflare Pages deployment
npm run deploy:dev       # Deploy to development
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production

# Deployment logs
npm run logs:dev         # View development logs
npm run logs:staging     # View staging logs
npm run logs:prod        # View production logs

# Advanced deployment
./scripts/deploy-cloudflare.sh production
./scripts/deploy-cloudflare.sh staging --dry-run
```

### Maintenance
```bash
npm run clean            # Clean build artifacts
npm run clean:full       # Clean and reinstall
npm run check            # Run type checking and linting
npm run fix              # Auto-fix linting issues
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run test:watch

# Check code quality
npm run check

# Commit changes
git add .
git commit -m "feat: add your feature description"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Testing Strategy
```bash
# Write tests first (TDD approach)
# 1. Write failing test
# 2. Implement feature
# 3. Make test pass
# 4. Refactor

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests only
npm run test:coverage    # With coverage report
```

### 3. Database Changes
```bash
# Create migration file
touch database/migrations/$(date +%Y%m%d_%H%M%S)_your_migration_name.sql

# Edit migration file with SQL changes
# Run migration
npm run db:migrate

# Test with seed data
npm run db:seed:clear
```

## Environment-Specific Configuration

### Development Environment
- **Database**: Local Turso development database
- **Payments**: Stripe test mode
- **AI**: Free tier models
- **OAuth**: Development redirect URLs

### Staging Environment
- **Database**: Turso staging database with replicas
- **Payments**: Stripe test mode
- **AI**: Production models
- **OAuth**: Staging redirect URLs

### Production Environment
- **Database**: Turso production database with global replicas
- **Payments**: Stripe live mode
- **AI**: Production models with rate limiting
- **OAuth**: Production redirect URLs

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Turso authentication
turso auth token

# Verify database exists
turso db list

# Test connection
npm run db:shell
```

#### Build Failures
```bash
# Clear build cache
npm run clean

# Reinstall dependencies
npm run clean:full

# Check TypeScript issues
npm run typecheck
```

#### Deployment Issues
```bash
# Check Cloudflare authentication
npx wrangler whoami

# Verify secrets are set
npx wrangler pages secret list --project-name=pingtopass

# Check deployment logs
npm run logs:dev
```

#### SSL Certificate Issues
```bash
# Reinstall certificates
rm -rf certs/
npm run setup:https

# Check mkcert installation
mkcert -version
```

### Environment Variables Checklist

Before starting development, ensure these are configured in your `.env`:

- [ ] `TURSO_DATABASE_URL` - Development database URL
- [ ] `TURSO_AUTH_TOKEN` - Development database token
- [ ] `JWT_SECRET` - Random 32+ character secret
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- [ ] `OPENROUTER_API_KEY` - AI integration key
- [ ] `STRIPE_PUBLIC_KEY` - Stripe publishable key (test)
- [ ] `STRIPE_SECRET_KEY` - Stripe secret key (test)

### Performance Optimization

#### Database Optimization
- Use proper indexes (already defined in schema)
- Keep queries under 200ms target
- Use Turso embedded replicas for read operations

#### Frontend Optimization
- Enable Nuxt devtools: `NUXT_DEVTOOLS=true`
- Use Vue DevTools browser extension
- Monitor bundle size with `npm run build`

#### Edge Performance
- Test with Cloudflare Workers: `npm run wrangler:dev`
- Monitor response times globally
- Use CDN caching for static assets

## Getting Help

### Documentation
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Turso Documentation](https://docs.turso.tech/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Project Architecture](./platform-specification/system-architecture/)

### Support Channels
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: Development team chat
- **Email**: tech-support@pingtopass.com

### Useful Commands Reference

```bash
# Quick health check
npm run check && npm run test && npm run build

# Full development reset
npm run clean:full && npm run db:seed:clear && npm run dev

# Production deployment
npm run test:all && ./scripts/deploy-cloudflare.sh production

# Database backup before major changes
npm run db:backup
```

---

## Next Steps

After completing the setup:

1. **Verify Everything Works**: Run `npm run dev` and visit `http://localhost:3000`
2. **Run Tests**: Execute `npm run test:all` to ensure everything passes
3. **Create Your First Feature**: Follow the development workflow above
4. **Deploy to Staging**: Use `npm run deploy:staging` when ready

Happy coding! 🚀