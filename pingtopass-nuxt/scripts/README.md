# PingToPass Deployment Scripts

This directory contains comprehensive deployment automation scripts for the PingToPass Nuxt 3 application on Cloudflare Workers.

## 📜 Scripts Overview

### 1. `deploy.sh` - Main Deployment Script
Handles full deployment to all environments with safety checks, testing, and rollback capabilities.

**Features:**
- ✅ Pre-deployment checks (prerequisites, authentication)
- ✅ Automated testing (TypeScript, linting, unit tests)
- ✅ Build and deployment
- ✅ Health verification after deployment
- ✅ Automatic rollback on failure
- ✅ Color-coded output for clarity
- ✅ Production deployment confirmation

**Usage:**
```bash
# Deploy to specific environment
./scripts/deploy.sh <environment> [skip-tests]

# Examples
./scripts/deploy.sh development
./scripts/deploy.sh staging
./scripts/deploy.sh production
./scripts/deploy.sh preview skip-tests  # Skip tests (not recommended for production)

# Using package.json scripts
pnpm deploy:dev        # Deploy to development
pnpm deploy:staging    # Deploy to staging  
pnpm deploy:prod       # Deploy to production
pnpm deploy:dev:quick  # Deploy without tests
```

### 2. `setup-environments.sh` - Environment Setup Script
Creates all necessary Cloudflare resources and Turso databases for each environment.

**Features:**
- ✅ Creates KV namespaces for session and cache storage
- ✅ Sets up R2 buckets for assets and backups
- ✅ Creates Cloudflare Queues for background tasks
- ✅ Sets up Analytics Engine datasets
- ✅ Creates Turso databases with global replicas
- ✅ Generates database tokens
- ✅ Interactive secret configuration
- ✅ Generates `.env.example` file

**Usage:**
```bash
# Interactive setup (recommended for first-time setup)
./scripts/setup-environments.sh

# Using package.json script
pnpm setup:environments
```

**Resources Created:**
- **KV Namespaces:** SESSION_STORE, CACHE_STORE (per environment)
- **R2 Buckets:** pingtopass-assets, pingtopass-backups
- **Queues:** pingtopass-tasks, pingtopass-dlq
- **Databases:** pingtopass-dev, pingtopass-staging, pingtopass-prod (with replicas)

### 3. `manage-secrets.sh` - Secret Management Script
Manages environment secrets with safety checks, validation, and rotation capabilities.

**Features:**
- ✅ Interactive and command-line interfaces
- ✅ Set/delete/list secrets per environment
- ✅ Secret validation against requirements
- ✅ JWT secret rotation
- ✅ Secret backup (names only, not values)
- ✅ Copy secrets between environments
- ✅ Production confirmation dialogs

**Usage:**
```bash
# Interactive mode (recommended)
./scripts/manage-secrets.sh

# Command line mode
./scripts/manage-secrets.sh list production
./scripts/manage-secrets.sh set staging JWT_SECRET
./scripts/manage-secrets.sh set-all development
./scripts/manage-secrets.sh validate
./scripts/manage-secrets.sh rotate-jwt production

# Using package.json scripts
pnpm secrets:list production
pnpm secrets:validate
pnpm secrets:backup staging
```

**Required Secrets:**
- `TURSO_DATABASE_URL` - Database connection URL
- `TURSO_AUTH_TOKEN` - Database authentication token
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `JWT_SECRET` - JWT signing secret
- `OPENROUTER_API_KEY` - AI service API key

**Production-only Secrets:**
- `STRIPE_SECRET_KEY` - Payment processing
- `STRIPE_WEBHOOK_SECRET` - Webhook verification

### 4. `health-check.sh` - Health Check Script
Verifies deployment health and critical functionality across all environments.

**Features:**
- ✅ Basic connectivity testing with retry logic
- ✅ Health endpoint verification
- ✅ Database connectivity checks
- ✅ Authentication endpoint testing
- ✅ Critical API endpoint validation
- ✅ SSL certificate verification (HTTPS)
- ✅ Performance benchmarking
- ✅ Multi-environment checking
- ✅ Deployment readiness waiting

**Usage:**
```bash
# Check specific environment
./scripts/health-check.sh check production
./scripts/health-check.sh check development

# Check all environments
./scripts/health-check.sh check

# Wait for deployment to be ready
./scripts/health-check.sh wait staging

# Performance testing only
./scripts/health-check.sh performance production

# Using package.json scripts
pnpm health:prod        # Check production
pnpm health            # Check all environments
pnpm health:wait staging
```

## 🚀 Getting Started

### Prerequisites
Install required CLI tools:
```bash
# Node.js and pnpm
npm install -g pnpm

# Wrangler CLI
npm install -g wrangler

# Turso CLI
brew install turso  # macOS
# or
curl -sSfL https://get.tur.so/install.sh | bash  # Linux/macOS

# Authentication
wrangler login
turso auth login
```

### Initial Setup Workflow

1. **Environment Setup** (one-time):
   ```bash
   # Create all Cloudflare resources and databases
   pnpm setup:environments
   ```

2. **Configure Secrets**:
   ```bash
   # Set up secrets for each environment
   pnpm setup:secrets
   ```

3. **Deploy to Development**:
   ```bash
   # Test deployment locally first
   pnpm dev:wrangler

   # Deploy to development
   pnpm deploy:dev
   ```

4. **Verify Health**:
   ```bash
   # Check deployment health
   pnpm health:dev
   ```

5. **Deploy to Higher Environments**:
   ```bash
   # Deploy to staging
   pnpm deploy:staging
   pnpm health:staging

   # Deploy to production
   pnpm deploy:prod
   pnpm health:prod
   ```

## 🏗️ Deployment Workflow

### Development Cycle
```bash
# 1. Make code changes
# 2. Test locally
pnpm dev:wrangler

# 3. Deploy to development
pnpm deploy:dev

# 4. Verify deployment
pnpm health:dev
```

### Staging Release
```bash
# 1. Deploy to staging
pnpm deploy:staging

# 2. Run comprehensive health check
pnpm health:staging

# 3. Performance validation
./scripts/health-check.sh performance staging
```

### Production Release
```bash
# 1. Final checks
pnpm ci:test

# 2. Deploy with confirmation
pnpm deploy:prod

# 3. Verify production health
pnpm health:prod

# 4. Monitor logs
pnpm wrangler:tail:prod
```

## 🔧 Environment Configuration

### Environment URLs
- **Development:** `http://localhost:3000`
- **Preview:** `https://preview.pingtopass.com`
- **Staging:** `https://staging.pingtopass.com`
- **Production:** `https://pingtopass.com`

### Database Configuration
- **Development:** `pingtopass-dev` (single region)
- **Staging:** `pingtopass-staging` (single region)
- **Production:** `pingtopass-prod` (with global replicas in AMS, SIN, SYD)

### Secret Management
Secrets are managed per environment using Wrangler CLI. The secret management script provides:
- Interactive secret setting
- Validation of required secrets
- Safe production secret handling
- JWT secret rotation

## 📊 Monitoring & Health Checks

### Health Check Endpoints
The health check script validates these endpoints:
- `/api/health` - Basic health status
- `/api/health/database` - Database connectivity
- `/api/auth/status` - Authentication service
- `/api/questions` - Core API functionality
- `/api/exams` - Exam management

### Performance Metrics
- **Target Response Time:** <2000ms
- **Success Rate:** >95%
- **SSL Certificate:** Must not expire within 30 days
- **Database:** Must respond within timeout

### Monitoring Commands
```bash
# Real-time logs
pnpm wrangler:tail:prod

# Deployment logs
pnpm wrangler:logs

# Health monitoring
pnpm health:prod

# Performance testing
./scripts/health-check.sh performance production
```

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Failures**:
   ```bash
   wrangler login
   turso auth login
   ```

2. **Missing Secrets**:
   ```bash
   pnpm secrets:validate
   pnpm secrets:set-all <environment>
   ```

3. **Database Connection Issues**:
   ```bash
   # Check database status
   turso db show pingtopass-prod
   
   # Test connectivity
   pnpm health:prod
   ```

4. **Deployment Failures**:
   ```bash
   # Check prerequisites
   ./scripts/deploy.sh development
   
   # Skip tests for debugging
   ./scripts/deploy.sh development skip-tests
   ```

### Rollback Procedures
If a deployment fails:
1. The deploy script will offer automatic rollback
2. Manual rollback: `wrangler rollback <deployment-id> --env <environment>`
3. Health check the rolled-back version: `pnpm health:<env>`

### Log Analysis
```bash
# Deployment logs
wrangler pages deployment tail

# Worker logs
wrangler tail --env production

# Local development logs
wrangler dev --inspect
```

## 🔐 Security Best Practices

### Secret Management
- Never commit secrets to version control
- Use environment-specific secrets
- Rotate JWT secrets regularly
- Backup secret names (not values) before changes

### Production Safety
- Always require confirmation for production deployments
- Run full test suite before production
- Use health checks after deployment
- Monitor for at least 5 minutes post-deployment

### Access Control
- Limit production access to essential personnel
- Use separate Cloudflare accounts for environments if possible
- Regular audit of secret access

## 📚 Additional Resources

### Documentation
- **Deployment Guide:** `../platform-specification/system-architecture/CLOUDFLARE_DEPLOYMENT.md`
- **API Specification:** `../platform-specification/system-architecture/API_SPECIFICATION.md`
- **Database Schema:** `../platform-specification/system-architecture/TURSO_SCHEMA.md`

### External Links
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Turso Documentation](https://docs.turso.tech/)
- [Nuxt 3 Documentation](https://nuxt.com/)

### Support
- Check script logs for detailed error messages
- Use `--help` flag with any script for usage information
- Review the troubleshooting section above
- Refer to the main project documentation in `CLAUDE.md`