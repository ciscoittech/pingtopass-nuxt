# 🚀 PingToPass Cloudflare Workers Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Process](#deployment-process)
6. [Preview Deployments](#preview-deployments)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Cost Management](#cost-management)

## Overview

PingToPass is deployed on Cloudflare Workers for edge-first performance with <200ms global response times. This guide covers the complete deployment process from development to production.

### Architecture Summary
- **Framework**: Nuxt 3 with Nitro server
- **Edge Runtime**: Cloudflare Workers
- **Database**: Turso (SQLite at edge)
- **Storage**: Cloudflare KV and R2
- **CI/CD**: GitHub Actions

### Environment Strategy
```
Development (local) → Preview (PRs) → Staging (main) → Production (releases)
```

## Prerequisites

### Required Tools
```bash
# Check versions
node --version      # >= 18.0.0
pnpm --version      # >= 8.0.0
wrangler --version  # >= 3.0.0
turso --version     # >= 0.90.0
gh --version        # >= 2.40.0
```

### Install Missing Tools
```bash
# Install pnpm
npm install -g pnpm

# Install Wrangler
pnpm add -g wrangler

# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Install GitHub CLI
brew install gh  # macOS
# or see: https://cli.github.com/
```

### Required Accounts
- [ ] Cloudflare account with Workers subscription ($5/month)
- [ ] Turso account (free tier available)
- [ ] GitHub account with repository access
- [ ] Google Cloud Console access (for OAuth)
- [ ] OpenRouter API key (for AI features)

## Initial Setup

### 1. Clone Repository
```bash
git clone https://github.com/ciscoittech/pingtopass-nuxt.git
cd pingtopass-nuxt
pnpm install
```

### 2. Run Environment Setup
```bash
# This creates all Cloudflare resources
./scripts/setup-environments.sh

# Follow the interactive prompts to:
# - Create KV namespaces
# - Set up R2 buckets
# - Create Turso databases
# - Configure queues
# - Set initial secrets
```

### 3. Configure DNS (Production Only)
```bash
# Add to Cloudflare DNS:
# A record: pingtopass.com → 192.0.2.1 (Cloudflare proxy)
# CNAME: www → pingtopass.com
# CNAME: staging → pingtopass.com
# CNAME: *.preview → pingtopass.com
```

## Environment Configuration

### Development Environment
```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your values:
TURSO_DATABASE_URL=libsql://pingtopass-dev.turso.io
TURSO_AUTH_TOKEN=your-dev-token
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
OPENROUTER_API_KEY=sk-or-v1-your-key
JWT_SECRET=your-jwt-secret
```

### Production Secrets
```bash
# Set production secrets via wrangler
wrangler secret put TURSO_DATABASE_URL --env production
wrangler secret put TURSO_AUTH_TOKEN --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
wrangler secret put OPENROUTER_API_KEY --env production
wrangler secret put JWT_SECRET --env production

# Or use the interactive script
./scripts/manage-secrets.sh set production
```

### Update KV Namespace IDs
After running setup-environments.sh, update wrangler.toml with actual IDs:
```toml
[[kv_namespaces]]
binding = "SESSION_STORE"
id = "abc123..."  # Replace with actual ID from setup output
```

## Deployment Process

### Local Development
```bash
# Standard Nuxt dev server
pnpm dev

# With Wrangler (Workers environment)
pnpm dev:wrangler

# With HTTPS (for OAuth testing)
pnpm dev:https
```

### Deploy to Staging
```bash
# Manual deployment
pnpm deploy:staging

# Or via script with health checks
./scripts/deploy.sh staging

# Automatic via GitHub (push to main branch)
git push origin main
```

### Deploy to Production
```bash
# Manual deployment with confirmation
pnpm deploy:prod

# Via script with full validation
./scripts/deploy.sh production

# Via GitHub Actions (manual trigger)
gh workflow run deploy.yml -f environment=production
```

## Preview Deployments

### Automatic PR Previews
1. Create a pull request
2. GitHub Actions automatically deploys preview
3. Bot comments with preview URL
4. Preview updates on each push

### Manual Preview Management
```bash
# Create preview for PR #123
./scripts/manage-preview.sh create 123 feature-branch

# List all previews
./scripts/manage-preview.sh list

# Delete specific preview
./scripts/manage-preview.sh delete 123

# Clean up old previews
./scripts/manage-preview.sh cleanup
```

### Preview URLs
- Format: `pr-{number}-{branch}.preview.pingtopass.com`
- Auto-deleted after 7 days or when PR closes
- Debug mode: Add `?_debug=true` to URL

## Production Deployment

### Pre-Deployment Checklist
```bash
# Run the validation script
./scripts/validate-production.sh

# Manual checks:
- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] Database migrations ready
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared
```

### Deployment Steps
1. **Create Release Tag**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Deploy via GitHub Actions**
   ```bash
   gh workflow run release.yml -f version=v1.0.0
   ```

3. **Verify Deployment**
   ```bash
   # Check health
   ./scripts/health-check.sh production

   # Monitor logs
   wrangler tail --env production
   ```

4. **Gradual Traffic Shift**
   ```bash
   # Start with 10% traffic
   wrangler deploy --env production --compatibility-date 2024-01-01

   # Monitor for 30 minutes, then increase
   # Automatic via GitHub Actions canary deployment
   ```

## Monitoring & Troubleshooting

### Real-time Monitoring
```bash
# View live logs
wrangler tail --env production

# Check health status
curl https://pingtopass.com/api/monitoring/health

# Access monitoring dashboard
open https://pingtopass.com/admin/monitoring
```

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
rm -rf .nuxt .output node_modules/.cache
pnpm install
pnpm build
```

#### 2. Secret Access Issues
```bash
# Verify secrets are set
wrangler secret list --env production

# Re-set specific secret
wrangler secret delete SECRET_NAME --env production
wrangler secret put SECRET_NAME --env production
```

#### 3. Database Connection Issues
```bash
# Test database connection
turso db shell pingtopass-prod --command "SELECT 1"

# Check replica status
turso db show pingtopass-prod --replicas
```

#### 4. Performance Issues
```bash
# Analyze slow queries
./scripts/log-analyzer.js logs/recent.jsonl --performance

# Check cache hit rates
curl https://pingtopass.com/api/monitoring/metrics | jq '.cache'
```

## Rollback Procedures

### Quick Rollback
```bash
# List recent deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback [deployment-id] --env production

# Verify rollback
./scripts/health-check.sh production
```

### Database Rollback
```bash
# Restore from backup
turso db restore pingtopass-prod backup-20240115.sql

# Verify data integrity
turso db shell pingtopass-prod --command "SELECT COUNT(*) FROM questions"
```

### Emergency Procedures
1. **Immediate Actions**
   ```bash
   # Switch to maintenance mode
   wrangler deploy --env production --var MAINTENANCE_MODE=true
   
   # Notify users via status page
   curl -X POST https://status.pingtopass.com/api/incidents
   ```

2. **Investigation**
   ```bash
   # Fetch recent logs
   ./scripts/cloudflare-log-fetcher.sh --last-hour
   
   # Analyze for errors
   ./scripts/log-analyzer.js logs/recent.jsonl --errors
   ```

3. **Recovery**
   ```bash
   # Deploy known good version
   git checkout v1.0.0
   pnpm deploy:prod
   
   # Disable maintenance mode
   wrangler deploy --env production --var MAINTENANCE_MODE=false
   ```

## Cost Management

### Current Usage (Estimated)
| Service | Usage | Cost |
|---------|-------|------|
| Workers | 10M requests/month | $5.00 |
| KV Storage | 1GB | $0.50 |
| R2 Storage | 5GB | $0.00 |
| Turso | Free tier | $0.00 |
| **Total** | | **$5.50/month** |

### Cost Optimization Tips
1. **Enable Aggressive Caching**
   ```typescript
   // In server/middleware/cache.ts
   const cacheControl = {
     'static/*': 'public, max-age=31536000', // 1 year
     'api/questions': 'private, max-age=300', // 5 minutes
   }
   ```

2. **Use KV for Session Storage**
   - Cheaper than database queries
   - Faster edge performance

3. **Monitor Usage**
   ```bash
   # Check current usage
   wrangler analytics --env production
   
   # Set up alerts for usage spikes
   ./scripts/setup-monitoring-alerts.sh --cost-alerts
   ```

4. **Clean Up Unused Resources**
   ```bash
   # Remove old preview environments
   ./scripts/manage-preview.sh cleanup --force
   
   # Clean up old KV data
   ./scripts/cleanup-kv.sh --older-than 30d
   ```

## Support Resources

### Documentation
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Nuxt 3 Deployment](https://nuxt.com/docs/getting-started/deployment)
- [Turso Documentation](https://docs.turso.tech/)
- [Project README](./README.md)

### Troubleshooting Contacts
- **Infrastructure Issues**: Check Cloudflare status page
- **Database Issues**: Turso support or Discord
- **Application Issues**: Create GitHub issue
- **Security Issues**: Email security@pingtopass.com

### Useful Commands Reference
```bash
# Deployment
pnpm deploy:dev          # Deploy to development
pnpm deploy:staging      # Deploy to staging  
pnpm deploy:prod         # Deploy to production

# Monitoring
pnpm health:prod         # Check production health
pnpm logs:prod          # View production logs
pnpm metrics            # View performance metrics

# Management
pnpm secrets:validate   # Validate all secrets
pnpm preview:cleanup    # Clean up preview environments
pnpm db:migrate        # Run database migrations

# Testing
pnpm test              # Run all tests
pnpm test:e2e         # Run E2E tests
pnpm test:smoke       # Run smoke tests
```

---

## Quick Start Checklist

For new team members, follow these steps:

1. [ ] Install all prerequisites
2. [ ] Clone repository and install dependencies
3. [ ] Run `./scripts/setup-environments.sh`
4. [ ] Configure `.env` file
5. [ ] Test local development with `pnpm dev`
6. [ ] Deploy to staging with `pnpm deploy:staging`
7. [ ] Verify deployment with health check
8. [ ] Access monitoring dashboard
9. [ ] Review this guide completely

---

*Last Updated: January 2024*
*Version: 1.0.0*