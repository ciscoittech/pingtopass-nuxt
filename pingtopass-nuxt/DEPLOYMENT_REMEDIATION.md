# 🔧 Deployment Configuration Remediation Checklist

## Priority 1: Critical Issues (Fix Immediately)

### ✅ Configuration Updates
- [ ] Replace all placeholder values in `wrangler.toml`:
  ```bash
  # Run setup script to get actual IDs
  ./scripts/setup-environments.sh
  # Update wrangler.toml with real KV namespace IDs
  # Update account_id with actual Cloudflare account ID
  ```

### ✅ GitHub Actions Setup
- [ ] Ensure `.github/workflows/` directory exists with all workflows
- [ ] Configure GitHub secrets:
  ```bash
  gh secret set CLOUDFLARE_API_TOKEN
  gh secret set CLOUDFLARE_ACCOUNT_ID
  ```

### ✅ Secret Validation
- [ ] Add to `scripts/deploy.sh` before deployment:
  ```bash
  # Validate all required secrets exist
  ./scripts/manage-secrets.sh validate $ENVIRONMENT
  ```

## Priority 2: Security Fixes

### ✅ Input Sanitization
- [ ] Update `server/utils/logger.ts` to sanitize headers:
  ```typescript
  // Add sanitization function
  function sanitizeHeader(value: string): string {
    return value.replace(/[^\w\s\-\.:]/g, '');
  }
  ```

### ✅ Rate Limiting Implementation
- [ ] Create `server/middleware/rate-limit.ts`:
  ```typescript
  export default defineEventHandler(async (event) => {
    const ip = getClientIP(event);
    const key = `rate-limit:${ip}`;
    // Implement rate limiting with KV
  });
  ```

### ✅ Error Message Sanitization
- [ ] Update `server/middleware/error-handler.ts`:
  ```typescript
  // Never expose stack traces in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    delete response.details;
  }
  ```

## Priority 3: Testing Implementation

### ✅ Unit Tests
- [ ] Install Vitest:
  ```bash
  pnpm add -D vitest @vitest/ui
  ```
- [ ] Update `package.json`:
  ```json
  "test:unit": "vitest run",
  "test:unit:watch": "vitest watch"
  ```

### ✅ E2E Tests
- [ ] Install Playwright:
  ```bash
  pnpm add -D @playwright/test
  pnpm exec playwright install
  ```
- [ ] Create basic E2E test suite

## Priority 4: Performance Optimization

### ✅ Database Connection Management
- [ ] Update `server/utils/database.ts` for Workers:
  ```typescript
  // Use per-request connections
  export function getDatabase() {
    return drizzle(createClient({
      url: useRuntimeConfig().turso.databaseUrl,
      authToken: useRuntimeConfig().turso.authToken,
    }));
  }
  ```

### ✅ Caching Strategy
- [ ] Implement tiered caching:
  ```typescript
  const CACHE_TTLS = {
    static: 86400,    // 24 hours
    questions: 3600,  // 1 hour
    sessions: 300,    // 5 minutes
  };
  ```

## Priority 5: Monitoring & Alerting

### ✅ Alert Configuration
- [ ] Set up Cloudflare notifications:
  ```bash
  ./scripts/setup-monitoring-alerts.sh
  ```

### ✅ Automated Rollback
- [ ] Add to deployment script:
  ```bash
  # Auto-rollback on high error rate
  if [ $(check_error_rate) -gt 5 ]; then
    rollback_deployment
  fi
  ```

## Verification Steps

After completing remediation:

1. **Run validation script**:
   ```bash
   ./scripts/validate-production.sh
   ```

2. **Test deployment to staging**:
   ```bash
   ./scripts/deploy.sh staging
   ```

3. **Run security audit**:
   ```bash
   npm audit
   ./scripts/security-scan.sh
   ```

4. **Performance test**:
   ```bash
   ./scripts/performance-test.sh staging
   ```

5. **Review monitoring**:
   ```bash
   ./scripts/health-check.sh staging
   ```

## Timeline

- **Week 1**: Complete Priority 1-2 (Critical & Security)
- **Week 2**: Complete Priority 3-4 (Testing & Performance)
- **Week 3**: Complete Priority 5 (Monitoring) + Production Testing

## Success Criteria

✅ All placeholder values replaced  
✅ GitHub Actions passing  
✅ Security vulnerabilities addressed  
✅ Tests implemented and passing  
✅ Monitoring and alerting active  
✅ Successful staging deployment  
✅ Performance < 200ms globally  

---

*Track progress in GitHub Issues #16 and #20*