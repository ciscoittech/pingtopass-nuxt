# GitHub Actions CI/CD Pipeline

This directory contains the complete CI/CD pipeline configuration for the PingToPass Nuxt 3 application deployed on Cloudflare Workers.

## 🔧 Required GitHub Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository:

### Cloudflare Configuration
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token with Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### Database Configuration (Turso)
- `TURSO_DATABASE_URL` - Production database URL
- `TURSO_AUTH_TOKEN` - Production database auth token
- `TURSO_DATABASE_URL_PREVIEW` - Preview/staging database URL (optional)
- `TURSO_AUTH_TOKEN_PREVIEW` - Preview/staging database auth token (optional)

### Optional Security Scanning
- `SNYK_TOKEN` - Snyk API token for vulnerability scanning (optional)

## 📋 Workflow Overview

### 1. Main Deployment (`deploy.yml`)
- **Triggers:** Push to main/develop, tags, manual dispatch
- **Features:** 
  - Smart change detection
  - Multi-environment deployment (development, staging, production)
  - Database migration handling
  - Health checks
  - PR comments with deployment status

### 2. Testing (`test.yml`)
- **Triggers:** Pull requests, pushes to main/develop
- **Features:**
  - Matrix testing across Node.js versions (18, 20, 22)
  - Unit, integration, and E2E tests
  - Code coverage reporting
  - Build verification
  - Security scanning

### 3. Preview Deployments (`preview.yml`)
- **Triggers:** Pull request opened/updated/closed
- **Features:**
  - Automatic preview deployments for PRs
  - Unique URLs per PR
  - Smoke testing
  - Automatic cleanup when PR closed

### 4. Security Scanning (`security.yml`)
- **Triggers:** Daily schedule, pushes to main, manual dispatch
- **Features:**
  - Dependency vulnerability scanning
  - Secret detection
  - Static code analysis (CodeQL)
  - Infrastructure security checks
  - License compliance

### 5. Release Management (`release.yml`)
- **Triggers:** Version tags, manual dispatch
- **Features:**
  - Full test suite execution
  - Staging deployment
  - Production deployment (for stable releases)
  - GitHub release creation
  - Release announcement

## 🚀 Usage

### Creating a New Release
1. **Tag-based release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Manual release:**
   - Go to Actions → Release & Production Deployment
   - Click "Run workflow"
   - Enter version and options

### Environment URLs
- **Production:** https://pingtopass.com
- **Staging:** https://staging.pingtopass.com  
- **Development:** https://dev.pingtopass.com
- **Preview:** https://pr-123-branch.preview.pingtopass.com

### Deployment Environments
- **Development:** Automatic deployment from `develop` branch
- **Staging:** Automatic deployment from `main` branch
- **Production:** Manual deployment via release tags
- **Preview:** Automatic deployment for all PRs

## 🔒 Security Features

- Automated dependency scanning
- Secret detection in code
- Infrastructure configuration validation
- License compliance checking
- Security issue creation for violations

## 📊 Monitoring & Notifications

- PR status comments
- Deployment success/failure notifications
- Security issue creation
- Release announcements

## 🧪 Test Configuration

The pipeline supports various testing strategies:
- **Unit Tests:** Fast, isolated component testing
- **Integration Tests:** API and service integration
- **E2E Tests:** Full user journey testing
- **Security Tests:** Vulnerability and compliance scanning

## 💡 Best Practices

1. **Branch Protection:** Enable branch protection rules for `main` and `develop`
2. **Required Checks:** Make test workflows required for PR merging
3. **Environment Secrets:** Use environment-specific secrets for production
4. **Manual Approval:** Require manual approval for production deployments
5. **Rollback Plan:** Always have a rollback strategy for production releases

## 🔧 Customization

### Adding New Environments
1. Update `wrangler.toml` with new environment configuration
2. Add environment-specific secrets to GitHub
3. Update workflow files to include new environment
4. Configure DNS and routing in Cloudflare

### Modifying Test Strategy
1. Update `package.json` with test commands
2. Modify test workflows to include new test types
3. Configure coverage thresholds
4. Add new test artifacts upload

### Security Scanning Options
1. Add additional security tools
2. Configure custom security policies
3. Set up security notifications
4. Integrate with external security platforms

## 🐛 Troubleshooting

### Common Issues
1. **Deployment Failures:** Check Cloudflare API token permissions
2. **Test Failures:** Verify Node.js version compatibility
3. **Secret Issues:** Ensure all required secrets are configured
4. **Performance Issues:** Check cache configuration

### Debug Mode
Enable debug logging by adding `DEBUG: true` to workflow environment variables.

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nuxt 3 Documentation](https://nuxt.com/)
- [Turso Documentation](https://docs.turso.tech/)

---

*This CI/CD pipeline is designed for production use with comprehensive testing, security scanning, and deployment automation.*