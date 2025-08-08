# PingToPass Deployment Checklist

Use this checklist to ensure successful deployments across all environments.

## 🚀 Pre-Deployment Setup (One-time)

### Prerequisites
- [ ] Node.js and pnpm installed
- [ ] Wrangler CLI installed and authenticated (`wrangler login`)
- [ ] Turso CLI installed and authenticated (`turso auth login`)
- [ ] Repository cloned and dependencies installed (`pnpm install`)

### Environment Setup
- [ ] Run environment setup: `pnpm setup:environments`
- [ ] Cloudflare resources created (KV, R2, Queues)
- [ ] Turso databases created with replicas
- [ ] Update `wrangler.toml` with KV namespace IDs
- [ ] Copy `.env.example` to `.env` and configure local environment

### Secret Configuration
- [ ] Set development secrets: `pnpm secrets:set-all development`
- [ ] Set preview secrets: `pnpm secrets:set-all preview` 
- [ ] Set staging secrets: `pnpm secrets:set-all staging`
- [ ] Set production secrets: `pnpm secrets:set-all production`
- [ ] Validate all secrets: `pnpm secrets:validate`

## 🧪 Development Deployment

### Local Testing
- [ ] Start local development: `pnpm dev:wrangler`
- [ ] Verify health endpoints: `pnpm health:dev`
- [ ] Test database connectivity
- [ ] Test authentication flow
- [ ] Verify API endpoints

### Development Environment
- [ ] Deploy to development: `pnpm deploy:dev`
- [ ] Run health checks: `pnpm health:dev`
- [ ] Test critical functionality
- [ ] Check logs: `pnpm wrangler:tail`

## 🔧 Staging Deployment

### Pre-Staging Checks
- [ ] All development tests passing
- [ ] Code changes committed and pushed
- [ ] Database migrations ready (if any)
- [ ] Staging secrets validated: `pnpm secrets:validate staging`

### Staging Deployment
- [ ] Deploy to staging: `pnpm deploy:staging`
- [ ] Wait for readiness: `./scripts/health-check.sh wait staging`
- [ ] Run comprehensive health check: `pnpm health:staging`
- [ ] Performance testing: `./scripts/health-check.sh performance staging`
- [ ] Manual acceptance testing
- [ ] Check SSL certificate validity

### Staging Validation
- [ ] All API endpoints responding correctly
- [ ] Database queries working
- [ ] Authentication flow functional
- [ ] Error handling working properly
- [ ] Performance within acceptable limits (<2s response time)

## 🚀 Production Deployment

### Pre-Production Checks
- [ ] Staging deployment successful and validated
- [ ] All tests passing: `pnpm ci:test`
- [ ] Production secrets validated: `pnpm secrets:validate production`
- [ ] Database migrations tested on staging
- [ ] Backup of current production state (if applicable)
- [ ] Stakeholder approval obtained

### Production Deployment
- [ ] Deploy to production: `pnpm deploy:prod`
  - [ ] Confirmation dialog completed
  - [ ] Pre-deployment tests passed
  - [ ] Build completed successfully
  - [ ] Deployment completed without errors
- [ ] Wait for readiness: `./scripts/health-check.sh wait production`
- [ ] Run health checks: `pnpm health:prod`

### Post-Production Validation
- [ ] Health check passed (all endpoints responding)
- [ ] Database connectivity verified
- [ ] SSL certificate valid
- [ ] Performance within limits
- [ ] Error rates normal
- [ ] Monitor for 10 minutes: `pnpm wrangler:tail:prod`

### Production Issues Response
If any issues detected:
- [ ] Assess impact and severity
- [ ] If critical: Execute rollback procedure
- [ ] If minor: Create hotfix plan
- [ ] Document incident and resolution

## 🔄 Rollback Procedure

### Automatic Rollback
The deployment script will offer automatic rollback if deployment verification fails.

### Manual Rollback
If manual rollback is needed:
1. [ ] List recent deployments: `wrangler deployments list --env production`
2. [ ] Identify last known good deployment ID
3. [ ] Execute rollback: `wrangler rollback <deployment-id> --env production`
4. [ ] Verify rollback: `pnpm health:prod`
5. [ ] Monitor logs: `pnpm wrangler:tail:prod`

### Post-Rollback
- [ ] Confirm service restored
- [ ] Document rollback reason
- [ ] Plan fix for original issue
- [ ] Communicate status to stakeholders

## 📊 Monitoring & Maintenance

### Regular Checks
- [ ] Weekly health checks: `pnpm health`
- [ ] Monthly secret rotation: `./scripts/manage-secrets.sh rotate-jwt production`
- [ ] SSL certificate expiry monitoring (30-day warning)
- [ ] Database performance monitoring
- [ ] Error rate tracking

### Emergency Procedures
- [ ] 24/7 monitoring setup configured
- [ ] Alert thresholds defined
- [ ] Escalation procedures documented
- [ ] Recovery runbooks accessible

## 🔐 Security Checklist

### Secrets Management
- [ ] No secrets in version control
- [ ] Environment-specific secrets configured
- [ ] Regular secret rotation schedule
- [ ] Secret backup procedure (names only)

### Access Control
- [ ] Production access limited to essential personnel
- [ ] Two-factor authentication enabled on all accounts
- [ ] Regular access reviews conducted
- [ ] Audit trails maintained

### Certificate Management
- [ ] SSL certificates valid and monitored
- [ ] Certificate renewal process automated
- [ ] Certificate backup maintained

## 📝 Documentation Updates

After successful deployment:
- [ ] Update deployment documentation
- [ ] Record deployment timestamp and version
- [ ] Update configuration documentation
- [ ] Share deployment summary with team

## 🚨 Troubleshooting Reference

### Common Issues
- **Authentication Failures**: `wrangler login && turso auth login`
- **Missing Secrets**: `pnpm secrets:validate && pnpm secrets:set-all <env>`
- **Database Issues**: `pnpm health:prod` and check logs
- **Build Failures**: Check TypeScript errors and dependencies

### Support Contacts
- **Technical Lead**: [Your contact]
- **DevOps Team**: [Team contact]
- **On-call Engineer**: [On-call contact]

### Reference Documentation
- **Deployment Scripts**: `scripts/README.md`
- **Architecture Docs**: `platform-specification/system-architecture/`
- **API Documentation**: `platform-specification/system-architecture/API_SPECIFICATION.md`
- **Database Schema**: `platform-specification/system-architecture/TURSO_SCHEMA.md`

---

## Quick Commands Reference

```bash
# Full deployment workflow
pnpm ci:test && pnpm deploy:prod && pnpm health:prod

# Emergency rollback
wrangler deployments list --env production
wrangler rollback <deployment-id> --env production

# Health monitoring
pnpm health:prod
pnpm wrangler:tail:prod

# Secret management
pnpm secrets:validate
pnpm secrets:set production JWT_SECRET

# Development cycle
pnpm dev:wrangler
pnpm deploy:dev
pnpm health:dev
```