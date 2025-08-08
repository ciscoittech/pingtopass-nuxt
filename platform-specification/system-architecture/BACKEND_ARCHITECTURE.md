# Backend Architecture - Nuxt 3 on Cloudflare Workers

## 1. Edge-First Architecture Overview

### Core Principles
- **Edge Runtime**: Nuxt 3 with Nitro on Cloudflare Workers
- **Database**: Turso (LibSQL) with edge-optimized connections
- **AI Integration**: LangChain with OpenRouter (Qwen3 models)
- **Authentication**: Google OAuth with JWT sessions
- **Payments**: Stripe integration with webhook handling
- **Caching**: Minimal initially, Cloudflare KV when needed

### Project Structure
```
pingtopass-nuxt/
├── server/                    # Nitro server (edge functions)
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── questions/       # Question delivery
│   │   ├── sessions/        # Study/test sessions
│   │   ├── admin/           # Admin endpoints
│   │   └── webhooks/        # Stripe webhooks
│   ├── utils/               # Server utilities
│   │   ├── db.ts           # Turso connection
│   │   ├── auth.ts         # Auth helpers
│   │   └── ai.ts           # LangChain setup
│   └── middleware/          # Server middleware
├── pages/                    # Nuxt pages
├── components/              # Vue components
├── composables/             # Shared logic
├── stores/                  # Pinia stores
├── public/                  # Static assets
├── tests/                   # Test suite
├── database/                # SQL migrations
│   ├── schema.sql          # Turso schema
│   ├── migrations/         # Migration files
│   └── seed.sql           # Initial data
└── nuxt.config.ts          # Nuxt configuration
```

## 2. Nitro Server Implementation

### 2.1 Database Connection (Turso)
```typescript
// server/utils/db.ts
import { createClient } from '@libsql/client/web'

let _db: ReturnType<typeof createClient> | null = null

export function useDB() {
  if (!_db) {
    _db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
      // Edge-optimized settings
      intMode: 'number',
      fetch: globalThis.fetch // Use native fetch
    })
  }
  return _db
}

// Query helper with automatic retries
export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const db = useDB()
  const maxRetries = 3
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await db.execute({
        sql,
        args: params
      })
      return result.rows as T[]
    } catch (error) {
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

// Transaction helper
export async function transaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const db = useDB()
  const tx = await db.transaction()
  try {
    const result = await callback(tx)
    await tx.commit()
    return result
  } catch (error) {
    await tx.rollback()
    throw error
  }
}
```

### 2.2 Authentication Service
```typescript
// server/utils/auth.ts
import jwt from '@tsndr/cloudflare-worker-jwt'
import { OAuth2Client } from 'google-auth-library'
import { query } from './db'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export interface User {
  id: number
  email: string
  name: string
  picture?: string
  role: 'user' | 'admin'
  subscription_status: 'free' | 'premium'
  created_at: string
}

export async function verifyGoogleToken(token: string): Promise<any> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    return ticket.getPayload()
  } catch {
    throw new Error('Invalid Google token')
  }
}

export async function findOrCreateUser(googleUser: any): Promise<User> {
  // Check if user exists
  const [existingUser] = await query<User>(
    'SELECT * FROM users WHERE email = ?',
    [googleUser.email]
  )
  
  if (existingUser) {
    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [existingUser.id]
    )
    return existingUser
  }
  
  // Create new user
  const [newUser] = await query<User>(
    `INSERT INTO users (email, name, picture, provider, provider_id, role, subscription_status) 
     VALUES (?, ?, ?, 'google', ?, 'user', 'free')
     RETURNING *`,
    [googleUser.email, googleUser.name, googleUser.picture, googleUser.sub]
  )
  
  return newUser
}

export async function generateToken(user: User): Promise<string> {
  const payload = {
    sub: user.id.toString(),
    email: user.email,
    role: user.role,
    subscription: user.subscription_status,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }
  
  return await jwt.sign(payload, process.env.JWT_SECRET!)
}

export async function verifyToken(token: string): Promise<any> {
  const isValid = await jwt.verify(token, process.env.JWT_SECRET!)
  if (!isValid) throw new Error('Invalid token')
  
  const decoded = jwt.decode(token)
  
  // Check if expired
  if (decoded.payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }
  
  return decoded.payload
}

// Middleware helper
export async function requireAuth(event: any): Promise<User> {
  const token = getCookie(event, 'auth-token') || 
                getHeader(event, 'authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
  
  try {
    const payload = await verifyToken(token)
    const [user] = await query<User>(
      'SELECT * FROM users WHERE id = ?',
      [payload.sub]
    )
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return user
  } catch (error) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid authentication'
    })
  }
}

export function requireAdmin(user: User): void {
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin access required'
    })
  }
}
```

### 2.3 Question Service (Performance Critical)
```typescript
// server/utils/questions.ts
import { query } from './db'

export interface Question {
  id: number
  exam_id: number
  objective_id: number
  text: string
  type: 'multiple_choice' | 'multi_select' | 'true_false'
  difficulty: number
  answers: Answer[]
  explanation: string
  created_at: string
}

export interface Answer {
  id: string
  text: string
  is_correct: boolean
}

// Optimized question retrieval
export async function getQuestionBatch(
  examId: number,
  objectiveIds: number[],
  count: number = 65,
  userId?: number
): Promise<Question[]> {
  // Build SQL for batch retrieval
  const objectivePlaceholders = objectiveIds.map(() => '?').join(',')
  
  // Get recent questions to exclude
  let recentQuestionIds: number[] = []
  if (userId) {
    const recentRows = await query<{ question_id: number }>(
      `SELECT DISTINCT question_id 
       FROM user_answers 
       WHERE user_id = ? 
       AND answered_at > datetime('now', '-24 hours')
       LIMIT 100`,
      [userId]
    )
    recentQuestionIds = recentRows.map(r => r.question_id)
  }
  
  // Build exclusion clause
  const excludeClause = recentQuestionIds.length > 0
    ? `AND q.id NOT IN (${recentQuestionIds.map(() => '?').join(',')})`
    : ''
  
  // Main query - optimized for edge runtime
  const sql = `
    SELECT 
      q.id,
      q.exam_id,
      q.objective_id,
      q.text,
      q.type,
      q.difficulty,
      q.explanation,
      q.answers
    FROM questions q
    WHERE q.exam_id = ?
      AND q.objective_id IN (${objectivePlaceholders})
      AND q.is_active = 1
      ${excludeClause}
    ORDER BY RANDOM()
    LIMIT ?
  `
  
  const params = [
    examId,
    ...objectiveIds,
    ...(recentQuestionIds.length > 0 ? recentQuestionIds : []),
    count
  ]
  
  const questions = await query<any>(sql, params)
  
  // Parse JSON answers field
  return questions.map(q => ({
    ...q,
    answers: JSON.parse(q.answers)
  }))
}

// Record answer for tracking
export async function recordAnswer(
  userId: number,
  sessionId: number,
  questionId: number,
  answer: string,
  isCorrect: boolean,
  timeSpent: number
): Promise<void> {
  await query(
    `INSERT INTO user_answers 
     (user_id, session_id, question_id, answer, is_correct, time_spent, answered_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [userId, sessionId, questionId, answer, isCorrect ? 1 : 0, timeSpent]
  )
  
  // Update session metrics
  await query(
    `UPDATE study_sessions 
     SET total_questions = total_questions + 1,
         correct_answers = correct_answers + ?,
         last_activity = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [isCorrect ? 1 : 0, sessionId]
  )
}
```

## 3. API Routes Implementation

### 3.1 Authentication Routes
```typescript
// server/api/auth/google.post.ts
export default defineEventHandler(async (event) => {
  const { token } = await readBody(event)
  
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token required'
    })
  }
  
  try {
    // Verify Google token
    const googleUser = await verifyGoogleToken(token)
    
    // Find or create user
    const user = await findOrCreateUser(googleUser)
    
    // Generate JWT
    const jwt = await generateToken(user)
    
    // Set cookie
    setCookie(event, 'auth-token', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        subscription: user.subscription_status
      },
      token: jwt
    }
  } catch (error: any) {
    throw createError({
      statusCode: 401,
      statusMessage: error.message || 'Authentication failed'
    })
  }
})
```

### 3.2 Question Delivery Route
```typescript
// server/api/questions/batch.post.ts
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  // Authenticate user
  const user = await requireAuth(event)
  
  // Get request params
  const { exam_id, objective_ids, count = 65 } = await readBody(event)
  
  // Validate inputs
  if (!exam_id || !objective_ids || !Array.isArray(objective_ids)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request parameters'
    })
  }
  
  try {
    // Get questions (optimized query)
    const questions = await getQuestionBatch(
      exam_id,
      objective_ids,
      count,
      user.id
    )
    
    // Remove correct answers from response
    const sanitizedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      difficulty: q.difficulty,
      objective_id: q.objective_id,
      answers: q.answers.map(a => ({
        id: a.id,
        text: a.text
      }))
    }))
    
    const retrievalTime = Date.now() - startTime
    
    // Log if slow
    if (retrievalTime > 100) {
      console.warn(`Slow question retrieval: ${retrievalTime}ms`)
    }
    
    return {
      questions: sanitizedQuestions,
      count: sanitizedQuestions.length,
      retrieval_time_ms: retrievalTime
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to retrieve questions'
    })
  }
})
```

### 3.3 Study Session Management
```typescript
// server/api/sessions/study/create.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const { exam_id, objective_ids, mode = 'practice' } = await readBody(event)
  
  // Create session
  const [session] = await query<{ id: number }>(
    `INSERT INTO study_sessions 
     (user_id, exam_id, objectives, mode, status, created_at)
     VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
     RETURNING id`,
    [user.id, exam_id, JSON.stringify(objective_ids), mode]
  )
  
  return {
    session_id: session.id,
    status: 'active',
    mode,
    objectives: objective_ids
  }
})

// server/api/sessions/[id]/answer.post.ts
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const sessionId = getRouterParam(event, 'id')
  const { question_id, answer, time_spent } = await readBody(event)
  
  // Verify correct answer
  const [question] = await query<any>(
    'SELECT answers FROM questions WHERE id = ?',
    [question_id]
  )
  
  const answers = JSON.parse(question.answers)
  const correctAnswer = answers.find((a: any) => a.is_correct)
  const isCorrect = answer === correctAnswer.id
  
  // Record answer
  await recordAnswer(
    user.id,
    parseInt(sessionId!),
    question_id,
    answer,
    isCorrect,
    time_spent
  )
  
  return {
    is_correct: isCorrect,
    correct_answer: correctAnswer.id,
    explanation: question.explanation
  }
})
```

## 4. AI Integration with LangChain

### 4.1 Question Generation Service
```typescript
// server/utils/ai.ts
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { StructuredOutputParser } from 'langchain/output_parsers'
import { z } from 'zod'

// Initialize Qwen model via OpenRouter
const model = new ChatOpenAI({
  modelName: 'qwen/qwen-2.5-72b-instruct',
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': process.env.SITE_URL || 'https://pingtopass.com',
      'X-Title': 'PingToPass'
    }
  },
  temperature: 0.7,
  maxTokens: 2000
})

// Question schema
const QuestionSchema = z.object({
  text: z.string(),
  type: z.enum(['multiple_choice', 'multi_select', 'true_false']),
  difficulty: z.number().min(1).max(5),
  answers: z.array(z.object({
    id: z.string(),
    text: z.string(),
    is_correct: z.boolean()
  })),
  explanation: z.string(),
  reference: z.string()
})

const parser = StructuredOutputParser.fromZodSchema(
  z.array(QuestionSchema)
)

// Generate questions for an objective
export async function generateQuestions(
  examName: string,
  objectiveName: string,
  objectiveDescription: string,
  count: number = 10
): Promise<any[]> {
  const prompt = PromptTemplate.fromTemplate(`
    You are an expert IT certification exam question writer.
    Generate {count} high-quality exam questions for:
    
    Exam: {examName}
    Objective: {objectiveName}
    Description: {objectiveDescription}
    
    Requirements:
    - Questions must be technically accurate
    - Mix difficulty levels (1-5 scale)
    - Include clear explanations
    - 4 answer options for multiple choice
    - Reference the specific exam objective
    
    {formatInstructions}
  `)
  
  const input = await prompt.format({
    count,
    examName,
    objectiveName,
    objectiveDescription,
    formatInstructions: parser.getFormatInstructions()
  })
  
  const response = await model.invoke(input)
  const questions = await parser.parse(response.content as string)
  
  return questions
}

// Pre-generate questions for exam (admin function)
export async function preGenerateExamQuestions(
  examId: number,
  targetPerObjective: number = 50
): Promise<void> {
  // Get exam and objectives
  const [exam] = await query<any>(
    'SELECT * FROM exams WHERE id = ?',
    [examId]
  )
  
  const objectives = await query<any>(
    'SELECT * FROM objectives WHERE exam_id = ?',
    [examId]
  )
  
  for (const objective of objectives) {
    // Check existing count
    const [{ count }] = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM questions WHERE objective_id = ?',
      [objective.id]
    )
    
    const needed = targetPerObjective - count
    if (needed <= 0) continue
    
    // Generate in batches
    const batchSize = 10
    for (let i = 0; i < needed; i += batchSize) {
      const questions = await generateQuestions(
        exam.name,
        objective.name,
        objective.description,
        Math.min(batchSize, needed - i)
      )
      
      // Insert questions
      for (const q of questions) {
        await query(
          `INSERT INTO questions 
           (exam_id, objective_id, text, type, difficulty, answers, explanation, ai_generated)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            examId,
            objective.id,
            q.text,
            q.type,
            q.difficulty,
            JSON.stringify(q.answers),
            q.explanation
          ]
        )
      }
      
      // Rate limit (respect OpenRouter limits)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
```

## 5. Edge Runtime Optimizations

### 5.1 Request Context
```typescript
// server/utils/context.ts
export interface RequestContext {
  user?: User
  requestId: string
  startTime: number
  env: 'development' | 'production'
}

export function createContext(event: any): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
    env: process.env.NODE_ENV as any || 'development'
  }
}

// Performance logging
export function logPerformance(
  context: RequestContext,
  operation: string
): void {
  const duration = Date.now() - context.startTime
  if (duration > 100) {
    console.warn(`Slow operation [${operation}]: ${duration}ms`, {
      requestId: context.requestId,
      userId: context.user?.id
    })
  }
}
```

### 5.2 Error Handling
```typescript
// server/utils/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message)
  }
}

export function handleError(error: any): any {
  console.error('Error:', error)
  
  if (error instanceof AppError) {
    throw createError({
      statusCode: error.statusCode,
      statusMessage: error.message,
      data: { code: error.code }
    })
  }
  
  // Database errors
  if (error.message?.includes('SQLITE')) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database error occurred'
    })
  }
  
  // Default error
  throw createError({
    statusCode: 500,
    statusMessage: 'An unexpected error occurred'
  })
}
```

## 6. Development Workflow

### 6.1 Local Development with Orbstack
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Initialize local Turso database
turso dev --db-file local.db

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev

# Access at:
# http://localhost:3000 (default)
# http://pingtopass.local.orbstack.dev (with Orbstack)
```

### 6.2 Environment Configuration
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'cloudflare-pages',
    // Cloudflare compatibility
    rollupConfig: {
      external: ['cloudflare:sockets']
    }
  },
  
  runtimeConfig: {
    // Private (server-only)
    tursoUrl: process.env.TURSO_DATABASE_URL,
    tursoToken: process.env.TURSO_AUTH_TOKEN,
    jwtSecret: process.env.JWT_SECRET,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    openrouterKey: process.env.OPENROUTER_API_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    
    // Public
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY,
      siteUrl: process.env.SITE_URL || 'http://localhost:3000'
    }
  },
  
  // Modules
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  
  // Build optimizations
  build: {
    transpile: ['@libsql/client']
  },
  
  // Development
  devtools: { enabled: true },
  
  // Compatibility
  compatibilityDate: '2024-01-01'
})
```

This architecture provides:
- **Edge-first design** optimized for Cloudflare Workers
- **Simple database layer** with Turso (SQLite at the edge)
- **Minimal dependencies** for fast cold starts
- **Built-in auth** with Google OAuth and JWT
- **AI integration** via LangChain and OpenRouter
- **Type safety** throughout with TypeScript
- **Performance focus** with <100ms response times
- **Local development** support with Orbstack