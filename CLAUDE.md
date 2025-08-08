# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PingToPass - IT Certification Exam Platform built with FastAPI, MongoDB, and Docker. This is a comprehensive exam preparation system with focus on performance (<100ms question delivery) and scalability.

## Architecture

### Tech Stack
- **Backend**: FastAPI with async Python 3.11
- **Database**: MongoDB 7.0 with replica sets for production
- **Cache**: Redis 7 for multi-level caching
- **Queue**: Celery with Redis broker for background tasks
- **API**: RESTful with WebSocket support for real-time features
- **Deployment**: Docker Compose orchestration on Vultr VPS
- **AI Integration**: OpenRouter API for question generation

### Project Structure
```
fastmongo/
├── app/                    # FastAPI application code
│   ├── api/v1/            # API endpoints
│   ├── services/          # Business logic layer
│   ├── models/            # Pydantic models
│   ├── core/              # Core configuration
│   └── workers/           # Background tasks
├── tests/                 # Test suite (90% coverage required)
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── performance/      # Performance tests
├── dockerfiles/          # Docker configurations
├── config/               # Service configurations
└── platform-specification/  # Complete system documentation
```

## Key Commands

### Development
```bash
# Start development environment
docker-compose up -d

# Run with hot reload
docker-compose exec api uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access MongoDB shell
docker exec -it pingtopass-mongodb mongosh

# Access Redis CLI
docker exec -it pingtopass-redis redis-cli
```

### Testing
```bash
# Run all tests with coverage
pytest --cov=app --cov-report=html --cov-fail-under=90

# Run unit tests only
pytest tests/unit -v

# Run performance tests
pytest tests/performance -v -m performance

# Run specific test file
pytest tests/unit/services/test_question_service.py -v
```

### Production Deployment
```bash
# Deploy to production
./scripts/deploy.sh production

# Initialize MongoDB replica set (first time only)
./scripts/deploy.sh production --init-replica

# Run health checks
./scripts/health-check.sh

# Create backup
./scripts/backup.sh
```

### Database Operations
```bash
# Run migrations
docker exec pingtopass-api python -m app.migrations.run_migrations

# Create indexes
docker exec pingtopass-mongodb mongosh --eval "db.questions.createIndex({exam_id: 1, objective_id: 1, difficulty: 1})"

# Monitor slow queries
docker exec pingtopass-mongodb mongosh --eval "db.setProfilingLevel(1, {slowms: 100})"
```

## Critical Performance Requirements

### Question Delivery
- **Target**: <100ms for 65 questions batch retrieval
- **Strategy**: Multi-level caching (local memory → Redis → MongoDB)
- **Implementation**: See `app/services/question_service.py`

### Key Indexes Required
```javascript
// Questions collection - MUST have these indexes
db.questions.createIndex({ "exam_id": 1, "objective_id": 1, "difficulty": 1 })
db.questions.createIndex({ "exam_id": 1, "status": 1 })
db.questions.createIndex({ "tags": 1 })

// Study sessions
db.study_sessions.createIndex({ "user_id": 1, "exam_id": 1, "status": 1 })

// User progress
db.user_progress.createIndex({ "user_id": 1, "exam_id": 1 }, { unique: true })
```

## TDD Requirements

### Test Coverage Minimums
- Overall: 90%
- Critical paths (auth, payments, scoring): 100%
- All new code must have tests BEFORE implementation

### Test Execution Order
1. Write failing test (Red)
2. Write minimal code to pass (Green)
3. Refactor while keeping tests green

## API Patterns

### Authentication
All protected endpoints require JWT Bearer token:
```python
from fastapi import Depends
from app.deps import get_current_user

@app.get("/api/v1/protected")
async def protected_route(current_user: CurrentUser):
    # CurrentUser is a type alias for authenticated user
```

### Service Layer Pattern
```python
# Always use dependency injection
async def endpoint(
    db: Database,           # MongoDB client
    cache: Cache,          # Redis client
    current_user: CurrentUser
):
    service = QuestionService(db, cache)
    return await service.get_questions(...)
```

### Error Handling
```python
# Use custom exceptions
raise QuestionNotFoundError("Question not found")
raise SessionExpiredError("Session has expired")
raise QuotaExceededError("Daily limit exceeded")
```

## Environment Variables

Create `.env` file from `.env.example`:
```bash
ENV=development
MONGODB_URL=mongodb://localhost:27017/pingtopass_dev
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENROUTER_API_KEY=your-openrouter-key
```

## Common Development Tasks

### Adding New Endpoint
1. Define request/response models in `app/models/`
2. Write tests in `tests/unit/` and `tests/integration/`
3. Implement service in `app/services/`
4. Create endpoint in `app/api/v1/`
5. Update API documentation

### Implementing Background Task
1. Define task in `app/workers/tasks.py`
2. Use Celery for async execution
3. Monitor with Flower dashboard

### Performance Optimization
1. Profile with `pytest-benchmark`
2. Add caching where appropriate
3. Optimize MongoDB queries with explain()
4. Use bulk operations for batch updates

## Monitoring & Debugging

### View Logs
```bash
docker-compose logs -f api
docker-compose logs --tail=100 mongodb
```

### Performance Profiling
```python
# Add to slow endpoints
import time
start = time.perf_counter()
# ... operation ...
elapsed = time.perf_counter() - start
logger.warning(f"Operation took {elapsed:.3f}s")
```

### MongoDB Query Analysis
```javascript
db.questions.find({...}).explain("executionStats")
```

## Important Notes

1. **Never commit secrets** - Use environment variables
2. **Always run tests** before committing
3. **Check performance** for question delivery endpoints
4. **Follow TDD** - Tests first, implementation second
5. **Use type hints** - FastAPI relies on them for validation
6. **Implement caching** for frequently accessed data
7. **Document API changes** in API_SPECIFICATION.md

## Getting Help

- Architecture details: See `platform-specification/system-architecture/`
- API documentation: See `platform-specification/system-architecture/API_SPECIFICATION.md`
- Database schema: See `platform-specification/system-architecture/MONGODB_SCHEMA.md`
- Testing guide: See `platform-specification/system-architecture/TDD_FRAMEWORK.md`