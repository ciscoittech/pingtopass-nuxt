# PingToPass Testing Architecture

## Executive Summary

Comprehensive testing architecture for PingToPass Nuxt 3 application, designed for edge-first performance with <200ms response times and 85% overall test coverage.

## Testing Stack

- **Unit/Integration**: Vitest 1.4.0 with happy-dom
- **E2E**: Playwright 1.42.1
- **Performance**: Playwright performance tests
- **Database**: In-memory Turso/SQLite for isolation
- **Mocking**: Vitest built-in mocks for external services

## Test Coverage Strategy

### Coverage Targets
| Layer | Target | Priority |
|-------|--------|----------|
| Critical Paths (auth, payments, scoring) | 100% | P0 |
| API Routes | 90% | P0 |
| Vue Components | 80% | P1 |
| Utilities/Helpers | 85% | P1 |
| Overall | 85% | P0 |

### Critical Paths Requiring 100% Coverage
1. **Authentication Flow**
   - Google OAuth integration
   - JWT generation/validation
   - Session management
   - Role-based access control

2. **Payment Processing**
   - Stripe subscription creation
   - Webhook handling
   - Feature gating by tier
   - Billing cycle management

3. **Exam Scoring**
   - Answer validation
   - Score calculation
   - Progress tracking
   - Mastery score computation

## Testing Architecture Layers

### 1. Unit Testing (Vitest)

#### Configuration
```typescript
// vitest.config.ts
{
  environment: 'happy-dom',
  coverage: {
    provider: 'v8',
    thresholds: { lines: 85, functions: 85, branches: 80 }
  }
}
```

#### Test Organization
```
tests/unit/
├── server/           # Nitro server tests
│   ├── api/         # API route tests
│   ├── utils/       # Utility function tests
│   └── middleware/  # Middleware tests
├── components/      # Vue component tests
├── stores/         # Pinia store tests
└── composables/    # Composable tests
```

#### Key Testing Patterns

**API Route Testing**
```typescript
describe('POST /api/questions/batch', () => {
  it('delivers 65 questions under 100ms', async () => {
    const start = performance.now();
    const result = await handler({ body: {...} });
    expect(performance.now() - start).toBeLessThan(100);
    expect(result.data.questions).toHaveLength(65);
  });
});
```

**Database Mocking**
```typescript
vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: vi.fn(),
    batch: vi.fn(),
    transaction: vi.fn()
  }))
}));
```

**AI Service Mocking**
```typescript
vi.mock('langchain', () => ({
  OpenRouter: vi.fn(() => ({
    call: vi.fn().mockResolvedValue({ text: 'AI response' })
  }))
}));
```

### 2. Integration Testing (Vitest + @nuxt/test-utils)

#### Test Scenarios
- Complete API workflows
- Database transactions
- Multi-service interactions
- Cache behavior
- Rate limiting

#### Example Integration Test
```typescript
describe('Authentication Flow', () => {
  it('complete OAuth login process', async () => {
    // 1. Initiate OAuth
    const authUrl = await $fetch('/api/auth/google');
    
    // 2. Mock Google callback
    const token = await $fetch('/api/auth/callback', {
      body: { code: 'google_code' }
    });
    
    // 3. Verify session creation
    const user = await $fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(user.email).toBe('test@example.com');
  });
});
```

### 3. E2E Testing (Playwright)

#### Configuration
```typescript
// playwright.config.ts
{
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' }
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  }
}
```

#### Critical User Flows
1. **Study Session Flow**
   - Login → Select Exam → Configure Session → Answer Questions → View Results

2. **Subscription Flow**
   - View Pricing → Select Plan → Stripe Checkout → Verify Access

3. **Twitter Integration Flow**
   - Connect Account → Configure Voice → Review Queue → Track Metrics

#### Performance Testing
```typescript
test('questions load under 200ms', async ({ page }) => {
  const metrics = await page.evaluate(() => 
    performance.getEntriesByType('navigation')[0]
  );
  expect(metrics.loadEventEnd - metrics.fetchStart).toBeLessThan(200);
});
```

### 4. Test Data Management

#### Factory Pattern
```typescript
// tests/factories/user.factory.ts
export class UserFactory {
  static create(options = {}) {
    return {
      id: options.id || 1,
      email: options.email || 'test@example.com',
      subscription_status: options.subscription || 'free'
    };
  }
}
```

#### Database Seeding
```typescript
// tests/helpers/database.ts
export async function setupTestDatabase() {
  const db = createClient({ url: ':memory:' });
  await db.execute(schema);
  await seedTestData(db);
  return db;
}
```

#### Mock Data Providers
```typescript
// tests/mocks/index.ts
export const mockQuestions = QuestionFactory.createBatch(100);
export const mockUsers = UserFactory.createBatch(10);
export const mockSessions = SessionFactory.createBatch(20);
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Coverage Reporting
- **Codecov Integration**: Automatic PR comments with coverage delta
- **Coverage Badges**: README badges showing current coverage
- **Failure Thresholds**: Block PRs below 85% coverage

## Performance Benchmarks

### Response Time Requirements
| Endpoint | Target | Max |
|----------|--------|-----|
| Question Batch (65) | <100ms | 150ms |
| Single Question | <50ms | 100ms |
| Answer Submission | <100ms | 200ms |
| Session Creation | <150ms | 300ms |
| Dashboard Load | <200ms | 400ms |

### Load Testing Targets
- 100 concurrent users
- 1000 requests/minute
- <1% error rate
- P95 latency <200ms

## Testing Best Practices

### 1. Test Organization
- One test file per module/component
- Descriptive test names
- Group related tests in describe blocks
- Use beforeEach for common setup

### 2. Mock Strategy
- Mock external services (Stripe, Google, OpenRouter)
- Use in-memory database for unit tests
- Real database for integration tests
- Minimize mocking in E2E tests

### 3. Assertion Patterns
```typescript
// Custom matchers
expect(response.time).toBeWithinResponseTime(100);
expect(token).toHaveValidJWT();
expect(questions).toMatchDifficulty(3);
```

### 4. Test Data
- Use factories for consistent data
- Reset database between tests
- Avoid hardcoded IDs
- Use realistic data volumes

### 5. Performance Testing
- Test with production-like data volumes
- Measure cold start times
- Test under network constraints
- Monitor memory usage

## Implementation Roadmap

### Phase 1: Framework Setup (Week 1)
- [x] Configure Vitest
- [x] Configure Playwright
- [x] Setup test helpers
- [x] Create factories
- [ ] CI/CD pipeline

### Phase 2: Unit Tests (Week 2-3)
- [ ] API route tests (90% coverage)
- [ ] Database utility tests
- [ ] Authentication tests
- [ ] AI service tests

### Phase 3: Integration Tests (Week 3-4)
- [ ] Complete user flows
- [ ] Payment integration
- [ ] Twitter system
- [ ] Performance benchmarks

### Phase 4: E2E Tests (Week 4-5)
- [ ] Critical paths
- [ ] Mobile testing
- [ ] Visual regression
- [ ] Load testing

## Test Execution Commands

```bash
# Unit tests
npm run test              # Run all tests
npm run test:unit        # Unit tests only
npm run test:watch       # Watch mode for TDD
npm run test:coverage    # Generate coverage report

# Integration tests
npm run test:integration # Integration tests only

# E2E tests
npm run test:e2e         # Run E2E tests
npm run test:e2e:debug   # Debug mode with browser
npm run test:e2e:mobile  # Mobile-specific tests

# Performance tests
npm run test:perf        # Performance benchmarks

# Full suite
npm run test:all         # Run everything
```

## Monitoring & Reporting

### Test Metrics Dashboard
- Daily test run statistics
- Coverage trends
- Performance regression detection
- Flaky test identification

### Alert Thresholds
- Coverage drops below 85%
- Performance regression >20%
- Test failure rate >5%
- Critical path test failures

## Security Testing Considerations

### Security Test Coverage
- SQL injection prevention
- XSS protection
- CSRF token validation
- Rate limiting effectiveness
- Authentication bypass attempts

### Compliance Testing
- GDPR data handling
- PCI compliance (Stripe integration)
- OAuth 2.0 standards
- JWT security best practices

## Success Criteria

### Immediate (Sprint 1)
- [x] Testing framework configured
- [x] Test structure established
- [ ] 50% unit test coverage
- [ ] CI/CD pipeline active

### Short-term (Month 1)
- [ ] 85% overall coverage achieved
- [ ] All critical paths at 100%
- [ ] E2E tests for main flows
- [ ] Performance benchmarks met

### Long-term (Quarter 1)
- [ ] Automated visual regression
- [ ] Load testing integrated
- [ ] Security test suite
- [ ] <1% test flakiness

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Nuxt Test Utils](https://nuxt.com/docs/getting-started/testing)

### Tools
- **Coverage Viewer**: `npx vite preview --outDir coverage`
- **Playwright UI**: `npx playwright test --ui`
- **Test Reporter**: `npx playwright show-report`

## Support

For testing questions or issues:
1. Check test documentation in `/tests/README.md`
2. Review existing test patterns
3. Consult team lead for architectural decisions
4. Use #testing Slack channel for quick questions