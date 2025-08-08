# Performance Optimization Strategy - Edge-First Speed Techniques

## 1. Edge Runtime Optimization

### 1.1 Cloudflare Workers Performance
```typescript
// Cold Start Optimization
// Keep bundle size minimal for fast cold starts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Use native APIs when possible
    const url = new URL(request.url)
    
    // Early return for static assets
    if (url.pathname.startsWith('/assets/')) {
      return fetch(request)
    }
    
    // Process dynamic requests
    return handleRequest(request, env)
  }
}

// Lazy load heavy dependencies
const loadLangChain = async () => {
  const { ChatOpenAI } = await import('@langchain/openai')
  return new ChatOpenAI({
    // config
  })
}
```

### 1.2 Turso Query Optimization
```typescript
// Connection pooling for edge
import { createClient } from '@libsql/client/web'

// Global connection (persists across requests in same worker)
let db: ReturnType<typeof createClient> | null = null

export function getDB(env: Env) {
  if (!db) {
    db = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
      // Edge optimizations
      intMode: 'number',
      concurrency: 10, // Parallel query execution
      fetch: globalThis.fetch // Use native fetch
    })
  }
  return db
}

// Batch operations for efficiency
export async function batchQuery<T>(
  queries: Array<{ sql: string; args: any[] }>
): Promise<T[]> {
  const db = getDB()
  const results = await db.batch(queries)
  return results.map(r => r.rows) as T[]
}
```

## 2. Database Query Optimization

### 2.1 Index Strategy for <100ms Retrieval
```sql
-- Primary performance indexes for Turso
-- Questions: Covering index for main query
CREATE INDEX idx_questions_covering ON questions(
  exam_id, 
  objective_id, 
  difficulty, 
  is_active,
  id,
  text,
  type,
  answers,
  explanation
);

-- User answers: Optimize recent question lookup
CREATE INDEX idx_user_answers_window ON user_answers(
  user_id,
  answered_at DESC,
  question_id
) WHERE answered_at > datetime('now', '-7 days');

-- Query execution plan analysis
EXPLAIN QUERY PLAN
SELECT id, text, type, difficulty, answers
FROM questions
WHERE exam_id = 1
  AND objective_id IN (1, 2, 3)
  AND is_active = 1
ORDER BY RANDOM()
LIMIT 65;

/* Expected output:
SEARCH questions USING INDEX idx_questions_covering 
  (exam_id=? AND objective_id=?)
USE TEMP B-TREE FOR ORDER BY
*/
```

### 2.2 Optimized Query Patterns
```typescript
// FAST: Single query with JSON aggregation
export async function getExamQuestionsOptimized(
  examId: number,
  objectiveIds: number[],
  count: number = 65
): Promise<Question[]> {
  const db = getDB()
  
  // Use parameterized placeholders
  const placeholders = objectiveIds.map(() => '?').join(',')
  
  const result = await db.execute({
    sql: `
      WITH random_questions AS (
        SELECT 
          id, text, type, difficulty, answers, explanation, objective_id,
          ROW_NUMBER() OVER (PARTITION BY objective_id ORDER BY RANDOM()) as rn
        FROM questions
        WHERE exam_id = ?
          AND objective_id IN (${placeholders})
          AND is_active = 1
      )
      SELECT * FROM random_questions
      WHERE rn <= ?
      LIMIT ?
    `,
    args: [examId, ...objectiveIds, Math.ceil(count / objectiveIds.length), count]
  })
  
  return result.rows.map(row => ({
    ...row,
    answers: JSON.parse(row.answers as string)
  })) as Question[]
}

// FAST: Prepared statements for repeated queries
const preparedStatements = new Map<string, any>()

export async function getPreparedQuery(
  key: string,
  sql: string,
  args: any[]
): Promise<any> {
  const db = getDB()
  
  if (!preparedStatements.has(key)) {
    preparedStatements.set(key, await db.prepare(sql))
  }
  
  const stmt = preparedStatements.get(key)
  return await stmt.all(args)
}
```

### 2.3 Connection Management
```typescript
// Edge-optimized connection settings
export const dbConfig = {
  // Connection pool
  maxConnections: 10,
  idleTimeout: 30000, // 30 seconds
  
  // Query optimization
  syncInterval: 0, // Disable sync for read-heavy workload
  
  // Retry logic
  retryConfig: {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 1000,
    backoffMultiplier: 2
  }
}

// Automatic retry wrapper
export async function withRetry<T>(
  fn: () => Promise<T>,
  config = dbConfig.retryConfig
): Promise<T> {
  let lastError: any
  let delay = config.initialDelay
  
  for (let i = 0; i < config.maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (i < config.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
      }
    }
  }
  
  throw lastError
}
```

## 3. Caching Strategy

### 3.1 Multi-Layer Cache Architecture
```typescript
// Layer 1: In-memory cache (per worker instance)
const memoryCache = new Map<string, { data: any; expires: number }>()

// Layer 2: Cloudflare KV (eventually consistent)
interface CacheLayer {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
}

class EdgeCache implements CacheLayer {
  constructor(
    private kv: KVNamespace,
    private memory = memoryCache
  ) {}
  
  async get(key: string): Promise<any> {
    // Check memory cache first
    const memItem = this.memory.get(key)
    if (memItem && memItem.expires > Date.now()) {
      return memItem.data
    }
    
    // Check KV store
    const kvData = await this.kv.get(key, 'json')
    if (kvData) {
      // Populate memory cache
      this.memory.set(key, {
        data: kvData,
        expires: Date.now() + 60000 // 1 minute
      })
      return kvData
    }
    
    return null
  }
  
  async set(key: string, value: any, ttl = 300): Promise<void> {
    // Set in both layers
    this.memory.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    })
    
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl
    })
  }
}

// Cache-aside pattern for questions
export async function getCachedQuestions(
  examId: number,
  objectiveIds: number[],
  cache: EdgeCache
): Promise<Question[]> {
  const cacheKey = `questions:${examId}:${objectiveIds.sort().join(',')}`
  
  // Try cache first
  const cached = await cache.get(cacheKey)
  if (cached) return cached
  
  // Fetch from database
  const questions = await getExamQuestionsOptimized(examId, objectiveIds)
  
  // Cache for 5 minutes
  await cache.set(cacheKey, questions, 300)
  
  return questions
}
```

### 3.2 Smart Cache Invalidation
```typescript
// Invalidate related caches on update
export async function invalidateQuestionCache(
  examId: number,
  objectiveId?: number
): Promise<void> {
  const kv = getKV()
  
  // List all cache keys for this exam
  const list = await kv.list({ prefix: `questions:${examId}:` })
  
  // Delete matching keys
  const deletions = list.keys.map(key => kv.delete(key.name))
  await Promise.all(deletions)
  
  // Clear memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`questions:${examId}:`)) {
      memoryCache.delete(key)
    }
  }
}
```

## 4. Response Optimization

### 4.1 Response Compression
```typescript
// Automatic compression for large responses
export function compressResponse(
  data: any,
  headers: Headers = new Headers()
): Response {
  const json = JSON.stringify(data)
  
  // Use compression for responses > 1KB
  if (json.length > 1024) {
    headers.set('Content-Encoding', 'gzip')
    headers.set('Content-Type', 'application/json')
    
    const encoder = new TextEncoder()
    const compressed = gzip(encoder.encode(json))
    
    return new Response(compressed, { headers })
  }
  
  return Response.json(data, { headers })
}
```

### 4.2 Streaming Responses
```typescript
// Stream large datasets
export async function streamQuestions(
  examId: number,
  batchSize = 20
): Promise<Response> {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  
  // Start streaming
  ;(async () => {
    await writer.write(encoder.encode('{"questions":['))
    
    let offset = 0
    let first = true
    
    while (true) {
      const batch = await db.execute({
        sql: 'SELECT * FROM questions WHERE exam_id = ? LIMIT ? OFFSET ?',
        args: [examId, batchSize, offset]
      })
      
      if (batch.rows.length === 0) break
      
      for (const row of batch.rows) {
        if (!first) await writer.write(encoder.encode(','))
        await writer.write(encoder.encode(JSON.stringify(row)))
        first = false
      }
      
      offset += batchSize
    }
    
    await writer.write(encoder.encode(']}'))
    await writer.close()
  })()
  
  return new Response(readable, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    }
  })
}
```

## 5. Client-Side Optimization

### 5.1 Prefetching Strategy
```typescript
// composables/usePrefetch.ts
export const usePrefetch = () => {
  const prefetchQueue = new Set<string>()
  
  const prefetchQuestions = async (examId: number, objectiveIds: number[]) => {
    const key = `${examId}:${objectiveIds.join(',')}`
    
    if (prefetchQueue.has(key)) return
    prefetchQueue.add(key)
    
    // Prefetch in background
    requestIdleCallback(async () => {
      await $fetch('/api/questions/batch', {
        method: 'POST',
        body: { exam_id: examId, objective_ids: objectiveIds }
      })
    })
  }
  
  return { prefetchQuestions }
}
```

### 5.2 Optimistic UI Updates
```typescript
// stores/questions.ts
export const useQuestionsStore = defineStore('questions', () => {
  const questions = ref<Question[]>([])
  const loading = ref(false)
  
  const submitAnswer = async (
    questionId: number,
    answer: string
  ) => {
    // Optimistic update
    const question = questions.value.find(q => q.id === questionId)
    if (question) {
      question.userAnswer = answer
      question.isAnswered = true
    }
    
    try {
      const result = await $fetch(`/api/questions/${questionId}/answer`, {
        method: 'POST',
        body: { answer }
      })
      
      // Update with server response
      if (question) {
        question.isCorrect = result.is_correct
        question.explanation = result.explanation
      }
    } catch (error) {
      // Rollback on error
      if (question) {
        delete question.userAnswer
        question.isAnswered = false
      }
      throw error
    }
  }
  
  return { questions, loading, submitAnswer }
})
```

## 6. Load Testing & Monitoring

### 6.1 Performance Benchmarks
```typescript
// tests/performance/load-test.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('Question retrieval under 100ms', async ({ request }) => {
    const start = Date.now()
    
    const response = await request.post('/api/questions/batch', {
      data: {
        exam_id: 1,
        objective_ids: [1, 2, 3],
        count: 65
      }
    })
    
    const duration = Date.now() - start
    
    expect(response.ok()).toBeTruthy()
    expect(duration).toBeLessThan(100)
    
    const data = await response.json()
    expect(data.questions).toHaveLength(65)
  })
  
  test('Concurrent user load', async ({ request }) => {
    const requests = Array(100).fill(0).map(() =>
      request.post('/api/questions/batch', {
        data: {
          exam_id: 1,
          objective_ids: [1, 2, 3],
          count: 20
        }
      })
    )
    
    const start = Date.now()
    const responses = await Promise.all(requests)
    const duration = Date.now() - start
    
    // All requests should succeed
    responses.forEach(r => expect(r.ok()).toBeTruthy())
    
    // Average response time should be under 200ms
    expect(duration / 100).toBeLessThan(200)
  })
})
```

### 6.2 Real-time Monitoring
```typescript
// server/middleware/monitoring.ts
export default defineEventHandler(async (event) => {
  const start = Date.now()
  
  // Add request ID for tracing
  event.context.requestId = crypto.randomUUID()
  
  // Log request start
  console.log(JSON.stringify({
    type: 'request_start',
    requestId: event.context.requestId,
    path: event.node.req.url,
    method: event.node.req.method,
    timestamp: new Date().toISOString()
  }))
  
  // Track response
  event.node.res.on('finish', () => {
    const duration = Date.now() - start
    const status = event.node.res.statusCode
    
    // Log metrics
    console.log(JSON.stringify({
      type: 'request_complete',
      requestId: event.context.requestId,
      path: event.node.req.url,
      method: event.node.req.method,
      status,
      duration,
      timestamp: new Date().toISOString(),
      slow: duration > 100 // Flag slow requests
    }))
    
    // Send to analytics if slow
    if (duration > 100) {
      // Could send to external monitoring service
      logSlowRequest(event.context.requestId, duration)
    }
  })
})
```

## 7. Performance Targets

### 7.1 Key Metrics
| Metric | Target | Acceptable | Alert Threshold |
|--------|--------|------------|-----------------|
| Question Batch (65) | <100ms | <150ms | >200ms |
| Single Question | <20ms | <30ms | >50ms |
| Auth Check | <10ms | <20ms | >30ms |
| Dashboard Load | <200ms | <300ms | >500ms |
| Cold Start | <50ms | <100ms | >150ms |
| Memory Usage | <128MB | <256MB | >384MB |

### 7.2 Optimization Checklist
```typescript
// Performance audit checklist
const performanceChecklist = {
  database: {
    'Indexes created': true,
    'Queries analyzed': true,
    'N+1 queries eliminated': true,
    'Batch operations used': true
  },
  caching: {
    'Memory cache implemented': true,
    'KV cache configured': true,
    'Cache keys optimized': true,
    'TTLs appropriate': true
  },
  edge: {
    'Bundle size < 1MB': true,
    'Lazy loading used': true,
    'Native APIs preferred': true,
    'Global state minimized': true
  },
  client: {
    'Prefetching enabled': true,
    'Optimistic updates': true,
    'Debouncing implemented': true,
    'Virtual scrolling': true
  }
}
```

## 8. Turso-Specific Optimizations

### 8.1 Read Replicas
```typescript
// Use read replicas for better geographic distribution
const readReplicas = {
  'us-west': 'libsql://replica-sjc.turso.io',
  'us-east': 'libsql://replica-iad.turso.io',
  'europe': 'libsql://replica-ams.turso.io',
  'asia': 'libsql://replica-sin.turso.io'
}

export function getClosestReplica(region: string): string {
  return readReplicas[region] || readReplicas['us-west']
}
```

### 8.2 Embedded Replicas
```typescript
// For extreme performance, use embedded replicas
import { createClient } from '@libsql/client'
import { createSyncedClient } from '@libsql/client/sync'

export async function createEmbeddedClient() {
  return createSyncedClient({
    syncUrl: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    syncInterval: 60, // Sync every 60 seconds
    embedded: {
      path: ':memory:' // In-memory for Workers
    }
  })
}
```

This optimization strategy ensures:
- **Sub-100ms response times** for critical paths
- **Efficient edge runtime** with minimal cold starts
- **Smart caching** with multiple layers
- **Database query optimization** with proper indexes
- **Real-time monitoring** for performance issues
- **Client-side optimizations** for better UX