# Test-Driven Development Framework - Edge Testing Strategy

## 1. TDD Philosophy for Edge Functions

### Core Principles
1. **Test First**: Write tests before implementation
2. **Edge-Compatible**: Tests that work with Workers runtime
3. **Fast Feedback**: Sub-second test execution
4. **Coverage Goals**: 
   - 90% overall coverage
   - 100% for critical paths (auth, payments, scoring)

### Testing Stack
- **Unit Tests**: Vitest for edge-compatible testing
- **Integration Tests**: Playwright for API testing
- **E2E Tests**: Playwright for full user flows
- **Performance Tests**: k6 for load testing

## 2. Project Test Structure

### 2.1 Directory Layout
```
pingtopass-nuxt/
├── tests/
│   ├── unit/                    # Unit tests
│   │   ├── server/
│   │   │   ├── utils/
│   │   │   │   ├── db.test.ts
│   │   │   │   ├── auth.test.ts
│   │   │   │   └── ai.test.ts
│   │   │   └── api/
│   │   │       ├── auth.test.ts
│   │   │       └── questions.test.ts
│   │   └── components/
│   │       ├── QuestionCard.test.ts
│   │       └── Dashboard.test.ts
│   ├── integration/             # API integration tests
│   │   ├── auth-flow.test.ts
│   │   ├── question-delivery.test.ts
│   │   └── session-management.test.ts
│   ├── e2e/                     # End-to-end tests
│   │   ├── study-session.test.ts
│   │   ├── test-attempt.test.ts
│   │   └── payment-flow.test.ts
│   ├── performance/             # Performance tests
│   │   ├── question-load.test.ts
│   │   └── concurrent-users.test.ts
│   ├── fixtures/                # Test data
│   │   ├── users.json
│   │   ├── questions.json
│   │   └── mock-db.sql
│   └── helpers/                 # Test utilities
│       ├── setup.ts
│       ├── auth.ts
│       └── db.ts
```

### 2.2 Test Configuration

#### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'edge-runtime',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '.nuxt/',
        '.output/'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})
```

#### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

## 3. Unit Testing Patterns

### 3.1 Database Testing with Mock Turso
```typescript
// tests/unit/server/utils/db.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClient } from '@libsql/client'
import { query, transaction } from '~/server/utils/db'

vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: vi.fn(),
    batch: vi.fn(),
    transaction: vi.fn()
  }))
}))

describe('Database Utils', () => {
  let mockDb: any
  
  beforeEach(() => {
    mockDb = createClient({ url: ':memory:' })
    vi.clearAllMocks()
  })
  
  describe('query', () => {
    it('should execute SQL query with parameters', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Test' }],
        columns: ['id', 'name']
      }
      mockDb.execute.mockResolvedValue(mockResult)
      
      const result = await query('SELECT * FROM users WHERE id = ?', [1])
      
      expect(mockDb.execute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [1]
      })
      expect(result).toEqual(mockResult.rows)
    })
    
    it('should retry on failure', async () => {
      mockDb.execute
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ rows: [] })
      
      const result = await query('SELECT 1')
      
      expect(mockDb.execute).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })
    
    it('should throw after max retries', async () => {
      mockDb.execute.mockRejectedValue(new Error('Connection failed'))
      
      await expect(query('SELECT 1')).rejects.toThrow('Connection failed')
      expect(mockDb.execute).toHaveBeenCalledTimes(3)
    })
  })
  
  describe('transaction', () => {
    it('should commit on success', async () => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
        commit: vi.fn(),
        rollback: vi.fn()
      }
      mockDb.transaction.mockResolvedValue(mockTx)
      
      const result = await transaction(async (tx) => {
        await tx.execute('INSERT INTO users VALUES (?)', [1])
        return 'success'
      })
      
      expect(mockTx.commit).toHaveBeenCalled()
      expect(mockTx.rollback).not.toHaveBeenCalled()
      expect(result).toBe('success')
    })
    
    it('should rollback on error', async () => {
      const mockTx = {
        execute: vi.fn().mockRejectedValue(new Error('Insert failed')),
        commit: vi.fn(),
        rollback: vi.fn()
      }
      mockDb.transaction.mockResolvedValue(mockTx)
      
      await expect(
        transaction(async (tx) => {
          await tx.execute('INSERT INTO users VALUES (?)', [1])
        })
      ).rejects.toThrow('Insert failed')
      
      expect(mockTx.rollback).toHaveBeenCalled()
      expect(mockTx.commit).not.toHaveBeenCalled()
    })
  })
})
```

### 3.2 Authentication Testing
```typescript
// tests/unit/server/utils/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import jwt from '@tsndr/cloudflare-worker-jwt'
import { generateToken, verifyToken, requireAuth } from '~/server/utils/auth'

vi.mock('@tsndr/cloudflare-worker-jwt')
vi.mock('~/server/utils/db')

describe('Authentication', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    subscription_status: 'free'
  }
  
  describe('generateToken', () => {
    it('should generate JWT with user data', async () => {
      vi.mocked(jwt.sign).mockResolvedValue('mock-token')
      
      const token = await generateToken(mockUser)
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '1',
          email: 'test@example.com',
          role: 'user',
          subscription: 'free'
        }),
        process.env.JWT_SECRET
      )
      expect(token).toBe('mock-token')
    })
    
    it('should set 24 hour expiration', async () => {
      vi.mocked(jwt.sign).mockResolvedValue('mock-token')
      const now = Date.now()
      
      await generateToken(mockUser)
      
      const callArgs = vi.mocked(jwt.sign).mock.calls[0][0]
      expect(callArgs.exp).toBeGreaterThan(now / 1000 + 86000)
      expect(callArgs.exp).toBeLessThan(now / 1000 + 86500)
    })
  })
  
  describe('verifyToken', () => {
    it('should verify and decode valid token', async () => {
      const mockPayload = {
        sub: '1',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      }
      
      vi.mocked(jwt.verify).mockResolvedValue(true)
      vi.mocked(jwt.decode).mockReturnValue({ payload: mockPayload })
      
      const payload = await verifyToken('valid-token')
      
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET)
      expect(payload).toEqual(mockPayload)
    })
    
    it('should throw on invalid token', async () => {
      vi.mocked(jwt.verify).mockResolvedValue(false)
      
      await expect(verifyToken('invalid-token')).rejects.toThrow('Invalid token')
    })
    
    it('should throw on expired token', async () => {
      vi.mocked(jwt.verify).mockResolvedValue(true)
      vi.mocked(jwt.decode).mockReturnValue({
        payload: {
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        }
      })
      
      await expect(verifyToken('expired-token')).rejects.toThrow('Token expired')
    })
  })
  
  describe('requireAuth', () => {
    it('should return user from valid cookie token', async () => {
      const mockEvent = {
        context: {},
        node: {
          req: {
            headers: {
              cookie: 'auth-token=valid-token'
            }
          }
        }
      }
      
      vi.mocked(jwt.verify).mockResolvedValue(true)
      vi.mocked(jwt.decode).mockReturnValue({
        payload: { sub: '1', exp: Date.now() / 1000 + 3600 }
      })
      vi.mocked(query).mockResolvedValue([mockUser])
      
      const user = await requireAuth(mockEvent)
      
      expect(user).toEqual(mockUser)
    })
    
    it('should throw when no token provided', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }
      
      await expect(requireAuth(mockEvent)).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          statusMessage: 'Authentication required'
        })
      )
    })
  })
})
```

### 3.3 Question Service Testing
```typescript
// tests/unit/server/utils/questions.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getQuestionBatch, recordAnswer } from '~/server/utils/questions'
import * as db from '~/server/utils/db'

vi.mock('~/server/utils/db')

describe('Question Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('getQuestionBatch', () => {
    it('should retrieve questions for exam and objectives', async () => {
      const mockQuestions = [
        {
          id: 1,
          text: 'Question 1',
          type: 'multiple_choice',
          difficulty: 3,
          answers: JSON.stringify([
            { id: 'a', text: 'Answer A', is_correct: true }
          ])
        }
      ]
      
      vi.mocked(db.query).mockResolvedValue(mockQuestions)
      
      const questions = await getQuestionBatch(1, [1, 2], 10)
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1, 1, 2, 10])
      )
      expect(questions[0].answers).toBeTypeOf('object')
      expect(questions[0].answers[0].id).toBe('a')
    })
    
    it('should exclude recent questions for user', async () => {
      const recentQuestions = [
        { question_id: 5 },
        { question_id: 6 }
      ]
      
      vi.mocked(db.query)
        .mockResolvedValueOnce(recentQuestions) // Recent questions query
        .mockResolvedValueOnce([]) // Main questions query
      
      await getQuestionBatch(1, [1], 10, 123)
      
      const mainQuery = vi.mocked(db.query).mock.calls[1]
      expect(mainQuery[0]).toContain('q.id NOT IN')
      expect(mainQuery[1]).toContain(5)
      expect(mainQuery[1]).toContain(6)
    })
    
    it('should handle empty results gracefully', async () => {
      vi.mocked(db.query).mockResolvedValue([])
      
      const questions = await getQuestionBatch(1, [1], 10)
      
      expect(questions).toEqual([])
    })
  })
  
  describe('recordAnswer', () => {
    it('should record answer and update session', async () => {
      vi.mocked(db.query).mockResolvedValue([])
      
      await recordAnswer(1, 2, 3, 'a', true, 30)
      
      // Should insert answer
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_answers'),
        [1, 2, 3, 'a', 1, 30]
      )
      
      // Should update session
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE study_sessions'),
        [1, 2]
      )
    })
  })
})
```

## 4. Integration Testing

### 4.1 API Integration Tests
```typescript
// tests/integration/auth-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await setup({
      server: true,
      browser: false
    })
  })
  
  afterAll(async () => {
    // Cleanup
  })
  
  describe('POST /api/auth/google', () => {
    it('should authenticate with valid Google token', async () => {
      const response = await $fetch('/api/auth/google', {
        method: 'POST',
        body: {
          credential: 'mock-google-token'
        }
      })
      
      expect(response.success).toBe(true)
      expect(response.data.user).toBeDefined()
      expect(response.data.token).toBeDefined()
    })
    
    it('should reject invalid token', async () => {
      await expect(
        $fetch('/api/auth/google', {
          method: 'POST',
          body: {
            credential: 'invalid-token'
          }
        })
      ).rejects.toThrow('401')
    })
  })
  
  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      // First login
      const loginResponse = await $fetch('/api/auth/google', {
        method: 'POST',
        body: { credential: 'mock-google-token' }
      })
      
      // Then get current user
      const response = await $fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${loginResponse.data.token}`
        }
      })
      
      expect(response.success).toBe(true)
      expect(response.data.user.email).toBeDefined()
    })
    
    it('should reject without token', async () => {
      await expect($fetch('/api/auth/me')).rejects.toThrow('401')
    })
  })
})
```

### 4.2 Performance-Critical Endpoint Testing
```typescript
// tests/integration/question-delivery.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'

describe('Question Delivery Performance', () => {
  let authToken: string
  
  beforeAll(async () => {
    await setup({ server: true })
    
    // Authenticate
    const auth = await $fetch('/api/auth/google', {
      method: 'POST',
      body: { credential: 'test-token' }
    })
    authToken = auth.data.token
  })
  
  describe('POST /api/questions/batch', () => {
    it('should deliver 65 questions under 100ms', async () => {
      const start = Date.now()
      
      const response = await $fetch('/api/questions/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          exam_id: 1,
          objective_ids: [1, 2, 3],
          count: 65
        }
      })
      
      const duration = Date.now() - start
      
      expect(response.success).toBe(true)
      expect(response.data.questions).toHaveLength(65)
      expect(response.data.retrieval_time_ms).toBeLessThan(100)
      expect(duration).toBeLessThan(150) // Include network overhead
    })
    
    it('should respect difficulty filters', async () => {
      const response = await $fetch('/api/questions/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          exam_id: 1,
          objective_ids: [1],
          count: 20,
          difficulty: { min: 1, max: 2 }
        }
      })
      
      expect(response.data.questions.every(
        (q: any) => q.difficulty >= 1 && q.difficulty <= 2
      )).toBe(true)
    })
    
    it('should exclude recent questions', async () => {
      // First batch
      const batch1 = await $fetch('/api/questions/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          exam_id: 1,
          objective_ids: [1],
          count: 10,
          exclude_recent: true
        }
      })
      
      const questionIds1 = batch1.data.questions.map((q: any) => q.id)
      
      // Submit answers to mark as recent
      for (const qId of questionIds1.slice(0, 5)) {
        await $fetch(`/api/questions/${qId}/answer`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: {
            session_id: 1,
            answer: 'a',
            time_spent: 10
          }
        })
      }
      
      // Second batch should exclude answered questions
      const batch2 = await $fetch('/api/questions/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          exam_id: 1,
          objective_ids: [1],
          count: 10,
          exclude_recent: true
        }
      })
      
      const questionIds2 = batch2.data.questions.map((q: any) => q.id)
      const overlap = questionIds1.slice(0, 5).filter(id => questionIds2.includes(id))
      
      expect(overlap).toHaveLength(0)
    })
  })
})
```

## 5. End-to-End Testing

### 5.1 Complete User Journey
```typescript
// tests/e2e/study-session.test.ts
import { test, expect } from '@playwright/test'

test.describe('Study Session Flow', () => {
  test('complete study session workflow', async ({ page }) => {
    // 1. Login
    await page.goto('/')
    await page.click('text=Sign in with Google')
    // Mock Google OAuth
    await page.fill('[name="email"]', 'test@example.com')
    await page.click('text=Continue')
    
    // 2. Select exam
    await page.waitForURL('/dashboard')
    await page.click('text=CompTIA Network+')
    
    // 3. Start study session
    await page.click('text=Start Practice')
    await expect(page).toHaveURL('/study/session')
    
    // 4. Answer questions
    for (let i = 0; i < 5; i++) {
      await expect(page.locator('.question-text')).toBeVisible()
      await page.click('.answer-option:first-child')
      await page.click('text=Submit Answer')
      
      // Check feedback
      await expect(page.locator('.explanation')).toBeVisible()
      await page.click('text=Next Question')
    }
    
    // 5. Complete session
    await page.click('text=End Session')
    await expect(page).toHaveURL('/study/results')
    
    // 6. Verify results
    await expect(page.locator('.accuracy-score')).toBeVisible()
    await expect(page.locator('.mastery-chart')).toBeVisible()
  })
  
  test('handles network errors gracefully', async ({ page }) => {
    await page.goto('/study/session')
    
    // Simulate offline
    await page.context().setOffline(true)
    
    await page.click('.answer-option:first-child')
    await page.click('text=Submit Answer')
    
    // Should show error message
    await expect(page.locator('.error-message')).toContainText('Connection error')
    
    // Should retry when back online
    await page.context().setOffline(false)
    await page.click('text=Retry')
    
    await expect(page.locator('.success-message')).toBeVisible()
  })
})
```

### 5.2 Payment Flow Testing
```typescript
// tests/e2e/payment-flow.test.ts
import { test, expect } from '@playwright/test'

test.describe('Premium Subscription Flow', () => {
  test('upgrade to premium subscription', async ({ page }) => {
    // Login as free user
    await page.goto('/dashboard')
    // ... login flow
    
    // Navigate to pricing
    await page.click('text=Upgrade to Premium')
    await expect(page).toHaveURL('/pricing')
    
    // Select plan
    await page.click('[data-plan="premium"]')
    
    // Stripe checkout
    await expect(page.frameLocator('iframe[name="stripe"]')).toBeVisible()
    
    const stripeFrame = page.frameLocator('iframe[name="stripe"]')
    await stripeFrame.fill('[placeholder="Card number"]', '4242424242424242')
    await stripeFrame.fill('[placeholder="MM / YY"]', '12/25')
    await stripeFrame.fill('[placeholder="CVC"]', '123')
    
    await page.click('text=Subscribe')
    
    // Wait for webhook processing
    await page.waitForURL('/dashboard', { timeout: 10000 })
    
    // Verify premium status
    await expect(page.locator('.subscription-badge')).toContainText('Premium')
  })
})
```

## 6. Performance Testing

### 6.1 Load Testing with k6
```javascript
// tests/performance/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<100'], // 95% of requests under 100ms
    'errors': ['rate<0.01'],            // Error rate under 1%
  },
}

const BASE_URL = 'https://pingtopass.com'

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/google`, {
    credential: 'test-token'
  })
  
  return { token: JSON.parse(loginRes.body).data.token }
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  }
  
  // Simulate user behavior
  const questionRes = http.post(
    `${BASE_URL}/api/questions/batch`,
    JSON.stringify({
      exam_id: 1,
      objective_ids: [1, 2, 3],
      count: 20,
    }),
    { headers }
  )
  
  const success = check(questionRes, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has questions': (r) => JSON.parse(r.body).data.questions.length > 0,
  })
  
  errorRate.add(!success)
  
  sleep(1) // Think time
  
  // Submit answer
  if (success) {
    const questions = JSON.parse(questionRes.body).data.questions
    const questionId = questions[0].id
    
    const answerRes = http.post(
      `${BASE_URL}/api/questions/${questionId}/answer`,
      JSON.stringify({
        session_id: 1,
        answer: 'a',
        time_spent: 30,
      }),
      { headers }
    )
    
    check(answerRes, {
      'answer submitted': (r) => r.status === 200,
    })
  }
  
  sleep(2) // Think time between questions
}
```

## 7. Test Helpers and Utilities

### 7.1 Test Database Setup
```typescript
// tests/helpers/db.ts
import { createClient } from '@libsql/client'
import fs from 'fs'

export async function setupTestDatabase() {
  const db = createClient({
    url: ':memory:',
    authToken: ''
  })
  
  // Load schema
  const schema = fs.readFileSync('database/schema.sql', 'utf-8')
  const statements = schema.split(';').filter(s => s.trim())
  
  for (const statement of statements) {
    await db.execute(statement)
  }
  
  // Load test data
  await seedTestData(db)
  
  return db
}

async function seedTestData(db: any) {
  // Insert test users
  await db.execute(`
    INSERT INTO users (email, name, role, subscription_status)
    VALUES 
      ('test@example.com', 'Test User', 'user', 'free'),
      ('admin@example.com', 'Admin User', 'admin', 'premium')
  `)
  
  // Insert test exam
  await db.execute(`
    INSERT INTO exams (vendor_id, code, name)
    VALUES ('comptia', 'N10-008', 'CompTIA Network+')
  `)
  
  // Insert test questions
  const questions = JSON.parse(
    fs.readFileSync('tests/fixtures/questions.json', 'utf-8')
  )
  
  for (const q of questions) {
    await db.execute(`
      INSERT INTO questions (exam_id, objective_id, text, type, difficulty, answers, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [1, 1, q.text, q.type, q.difficulty, JSON.stringify(q.answers), q.explanation])
  }
}
```

### 7.2 Authentication Helper
```typescript
// tests/helpers/auth.ts
export async function getTestToken(role: 'user' | 'admin' = 'user') {
  const users = {
    user: { id: 1, email: 'test@example.com', role: 'user' },
    admin: { id: 2, email: 'admin@example.com', role: 'admin' }
  }
  
  return await generateToken(users[role])
}

export function createAuthHeaders(token: string) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}
```

## 8. CI/CD Test Pipeline

### 8.1 GitHub Actions Test Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      turso:
        image: ghcr.io/tursodatabase/turso-cli:latest
        options: --health-cmd "turso --version"
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          turso db create test-db --type memory
          npm run db:migrate:test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TURSO_DATABASE_URL: libsql://test-db.turso.io
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
  
  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Run k6 performance tests
        uses: grafana/k6-action@v0.3.0
        with:
          filename: tests/performance/load-test.js
          flags: --out cloud
        env:
          K6_CLOUD_TOKEN: ${{ secrets.K6_CLOUD_TOKEN }}
```

## 9. Testing Commands

### 9.1 Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:performance": "k6 run tests/performance/load-test.js",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

## 10. TDD Workflow Example

### 10.1 Feature: Add Question Flagging
```typescript
// Step 1: Write failing test
// tests/unit/server/api/questions.test.ts
describe('Question Flagging', () => {
  it('should allow user to flag question for review', async () => {
    const response = await $fetch('/api/questions/1/flag', {
      method: 'POST',
      headers: authHeaders,
      body: {
        reason: 'incorrect_answer',
        comment: 'Answer B should be correct'
      }
    })
    
    expect(response.success).toBe(true)
    expect(response.data.flagged).toBe(true)
  })
})

// Step 2: Implement minimal code to pass
// server/api/questions/[id]/flag.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const questionId = getRouterParam(event, 'id')
  const { reason, comment } = await readBody(event)
  
  await query(
    'INSERT INTO question_flags (question_id, user_id, reason, comment) VALUES (?, ?, ?, ?)',
    [questionId, user.id, reason, comment]
  )
  
  return {
    success: true,
    data: { flagged: true }
  }
})

// Step 3: Refactor and add edge cases
describe('Question Flagging', () => {
  it('should prevent duplicate flags from same user', async () => {
    // First flag
    await $fetch('/api/questions/1/flag', {
      method: 'POST',
      headers: authHeaders,
      body: { reason: 'incorrect_answer' }
    })
    
    // Duplicate flag
    await expect(
      $fetch('/api/questions/1/flag', {
        method: 'POST',
        headers: authHeaders,
        body: { reason: 'incorrect_answer' }
      })
    ).rejects.toThrow('Already flagged')
  })
  
  it('should validate flag reason', async () => {
    await expect(
      $fetch('/api/questions/1/flag', {
        method: 'POST',
        headers: authHeaders,
        body: { reason: 'invalid_reason' }
      })
    ).rejects.toThrow('Invalid flag reason')
  })
})
```

This TDD framework provides:
- **Edge-compatible testing** with Vitest
- **Comprehensive test coverage** for all layers
- **Performance testing** with k6
- **CI/CD integration** with GitHub Actions
- **TDD workflow examples** with red-green-refactor
- **Test helpers** for common operations
- **Mock strategies** for external dependencies