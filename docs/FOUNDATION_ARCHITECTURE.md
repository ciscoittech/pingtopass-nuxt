# PingToPass Foundation Architecture

## Overview

This document describes the comprehensive foundation architecture for PingToPass, an IT certification exam platform built with Nuxt 3 and optimized for edge deployment on Cloudflare.

## Architecture Decisions

### 1. Database Connection Pooling

**Decision**: Environment-aware connection pooling with singleton pattern
**Implementation**: `server/utils/db.ts`

```typescript
// Environment-specific configuration
type DatabaseEnvironment = 'development' | 'production' | 'test' | 'staging'

// Connection pool with performance optimization
class TursoConnectionPool {
  private connections: Map<string, Client> = new Map()
  private currentEnvironment: DatabaseEnvironment
  
  // Environment-specific sync settings
  // - Production: 15s interval, 3s period (low latency)
  // - Development: 60s interval, 10s period (higher tolerance)
  // - Test: In-memory database, no sync
}
```

**Benefits**:
- Sub-100ms database query performance
- Environment isolation
- Automatic connection recovery
- Edge-optimized sync intervals

### 2. Migration System

**Decision**: Transaction-safe migrations with rollback support
**Implementation**: `database/migrate.ts`

```bash
# Migration commands
tsx database/migrate.ts migrate    # Apply pending migrations
tsx database/migrate.ts rollback 2 # Rollback 2 migrations
tsx database/migrate.ts status     # Show migration status
DATABASE_ENV=production tsx database/migrate.ts migrate
```

**Features**:
- Up/down migration support
- Transaction safety
- Checksum verification
- Environment-aware execution
- Rollback capabilities

### 3. Database Seeding

**Decision**: Environment-aware seeding with realistic test data
**Implementation**: `database/seed.ts`

```bash
# Seeding commands
tsx database/seed.ts                    # Seed development
tsx database/seed.ts --force            # Force re-seed
DATABASE_ENV=test tsx database/seed.ts  # Seed test environment
```

**Data Sets**:
- **Development**: Full sample data (users, exams, questions)
- **Test**: Minimal data for testing
- **Production**: Admin users only

### 4. Test Infrastructure

**Decision**: Comprehensive TDD framework with performance benchmarks
**Implementation**: `tests/` directory structure

```
tests/
├── unit/           # Individual component tests
├── integration/    # API and workflow tests
├── e2e/           # End-to-end browser tests
├── helpers/       # Test utilities
└── fixtures/      # Test data
```

**Test Types**:
- **Unit Tests**: Database utilities, API handlers
- **Integration Tests**: Complete workflows
- **Performance Tests**: <200ms response time validation
- **E2E Tests**: Full user journeys

## Environment Configuration

### Environment Variables

```bash
# Core Application
NODE_ENV=development|production|test
SITE_URL=http://localhost:3000

# Database (Environment-specific)
TURSO_DATABASE_URL_DEV=libsql://dev.turso.io
TURSO_AUTH_TOKEN_DEV=dev-token
TURSO_DATABASE_URL_PROD=libsql://prod.turso.io
TURSO_AUTH_TOKEN_PROD=prod-token

# Authentication
JWT_SECRET=secure-32-char-secret
GOOGLE_CLIENT_ID=oauth-client-id
GOOGLE_CLIENT_SECRET=oauth-secret

# AI Integration
OPENROUTER_API_KEY=openrouter-key
LANGCHAIN_API_KEY=langsmith-key

# Payment Processing
STRIPE_SECRET_KEY=stripe-secret
STRIPE_PUBLIC_KEY=stripe-public
```

### Environment Separation

| Environment | Database | Sync Interval | Performance Target |
|-------------|----------|---------------|-------------------|
| Test | In-memory | None | <50ms |
| Development | Turso Dev | 60s | <200ms |
| Staging | Turso Staging | 30s | <150ms |
| Production | Turso Prod | 15s | <100ms |

## Performance Architecture

### Database Optimization

1. **Connection Pooling**
   - Maximum 10 concurrent connections
   - 30s connection timeout
   - Environment-specific sync settings

2. **Query Optimization**
   - Strategic indexes for <100ms queries
   - Batch operations for bulk inserts
   - JSON field optimization for flexibility

3. **Edge Performance**
   - Turso replicas in multiple regions
   - Cloudflare CDN integration
   - <200ms global response times

### Critical Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_questions_exam_objective ON questions(exam_id, objective_id, is_active);
CREATE INDEX idx_user_answers_recent ON user_answers(user_id, answered_at DESC);
CREATE INDEX idx_sessions_active ON study_sessions(user_id, status, last_activity DESC);
```

## Testing Strategy

### Test-Driven Development (TDD)

1. **Write Tests First**: All features start with failing tests
2. **Implementation**: Minimal code to pass tests
3. **Refactoring**: Improve with test coverage maintained

### Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| Critical Paths (auth, payments) | 100% | TBD |
| API Routes | 90% | TBD |
| Database Utilities | 95% | TBD |
| Overall | 85% | TBD |

### Performance Benchmarks

```typescript
// Example performance test
it('should fetch 65 questions under 100ms', async () => {
  const start = Date.now()
  const questions = await getQuestionBatch(1, [1, 2, 3], 65)
  const duration = Date.now() - start
  
  expect(questions).toHaveLength(65)
  expect(duration).toBeLessThan(100)
})
```

## Development Workflow

### Database Operations

```bash
# Setup development environment
cp .env.example .env
# Edit .env with your values

# Database operations
npm run db:migrate:dev      # Apply migrations
npm run db:seed            # Seed development data
npm run db:migrate:prod    # Deploy to production

# Development
npm run dev                # Start development server
npm run test:watch        # TDD mode
npm run typecheck         # Type checking
```

### Migration Workflow

```bash
# Create new migration
echo "-- +migrate Up
CREATE TABLE new_table (...);
-- +migrate Down  
DROP TABLE new_table;" > database/migrations/20240108120001_add_new_table.sql

# Test migration
DATABASE_ENV=test tsx database/migrate.ts migrate
DATABASE_ENV=test tsx database/migrate.ts rollback 1

# Apply to development
npm run db:migrate:dev

# Deploy to production
npm run db:migrate:prod
```

### Testing Workflow

```bash
# TDD cycle
npm run test:watch        # Continuous testing
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:all         # Full test suite
```

## Deployment Architecture

### Cloudflare Pages + Workers

1. **Pages**: Static Nuxt build
2. **Workers**: API routes and edge functions
3. **KV Storage**: Session and cache data
4. **D1**: Future SQLite integration option

### Database Deployment

1. **Turso Databases**:
   - Development: `pingtopass-dev`
   - Staging: `pingtopass-staging`
   - Production: `pingtopass-prod`

2. **Edge Replicas**:
   - Primary: US East
   - Replicas: Europe, Asia-Pacific

### Environment Promotion

```bash
# Development → Staging
wrangler pages deploy --env staging

# Staging → Production
wrangler pages deploy --env production

# Database migrations
DATABASE_ENV=staging npm run db:migrate
DATABASE_ENV=production npm run db:migrate
```

## Security Considerations

### Authentication

1. **JWT Tokens**: 24-hour expiration
2. **Google OAuth**: Primary authentication method
3. **Email Verification**: Required for account activation
4. **Role-Based Access**: User, Moderator, Admin roles

### Database Security

1. **Connection Security**: TLS encryption
2. **Parameter Binding**: SQL injection prevention
3. **Row-Level Security**: Future Turso feature
4. **Audit Logging**: User action tracking

### API Security

1. **Rate Limiting**: Per-user request limits
2. **Input Validation**: Zod schema validation
3. **CORS Configuration**: Restricted origins
4. **CSRF Protection**: Token-based protection

## Monitoring and Observability

### Health Monitoring

```typescript
// Health check endpoint: /api/health
{
  "status": "healthy",
  "database": { "healthy": true, "latency": 45 },
  "performance": { "totalLatency": 120, "status": "✅ FAST" }
}
```

### Performance Metrics

1. **Response Times**: <200ms global target
2. **Database Latency**: <100ms query target
3. **Error Rates**: <1% error threshold
4. **Uptime**: 99.9% availability target

### Logging Strategy

```typescript
// Structured logging
console.log({
  level: 'info',
  message: 'Database query executed',
  duration: 45,
  query: 'SELECT_QUESTIONS',
  user_id: 123,
  timestamp: new Date().toISOString()
})
```

## Cost Architecture

### Target Budget: $50/month

| Service | Estimated Cost | Usage |
|---------|----------------|--------|
| Turso Database | $0-25 | 1M queries/month |
| Cloudflare Pages | $0-5 | Static hosting |
| Cloudflare Workers | $5-10 | API requests |
| OpenRouter (AI) | $10-15 | Question generation |
| **Total** | **$15-55** | **Within budget** |

## Risk Mitigation

### Database Risks

1. **Connection Failures**:
   - Risk: Turso service outage
   - Mitigation: Connection retry logic, graceful degradation

2. **Performance Degradation**:
   - Risk: Slow queries affecting UX
   - Mitigation: Query optimization, monitoring, caching

3. **Data Loss**:
   - Risk: Accidental data deletion
   - Mitigation: Automated backups, migration rollbacks

### Application Risks

1. **Security Vulnerabilities**:
   - Risk: Data breaches, unauthorized access
   - Mitigation: Security audits, input validation, JWT expiration

2. **Scalability Issues**:
   - Risk: Performance under load
   - Mitigation: Edge caching, connection pooling, performance testing

3. **Deployment Failures**:
   - Risk: Production deployment issues
   - Mitigation: Staging environment, rollback procedures, health checks

## Success Criteria

### Foundation Goals

- [x] Environment-aware database connections
- [x] Transaction-safe migration system
- [x] Comprehensive test infrastructure
- [x] Performance-optimized queries (<200ms)
- [x] TDD workflow implementation
- [ ] Production deployment pipeline
- [ ] Monitoring and alerting system

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Database Query Time | <100ms | TBD | 🟡 Testing |
| API Response Time | <200ms | TBD | 🟡 Testing |
| Test Coverage | 85%+ | TBD | 🟡 Implementing |
| Deployment Time | <5min | TBD | 🟡 Planning |

### Quality Gates

1. **All tests must pass** before deployment
2. **Performance benchmarks** must be met
3. **Security audit** must be completed
4. **Documentation** must be up-to-date

## Next Steps

1. **Complete Testing**: Achieve 85%+ test coverage
2. **Performance Optimization**: Meet <200ms targets
3. **Production Setup**: Configure Turso production database
4. **Monitoring**: Implement comprehensive logging
5. **CI/CD Pipeline**: Automated testing and deployment

This foundation provides a robust, scalable, and maintainable base for the PingToPass platform with strong emphasis on performance, security, and developer experience.