# API Specification - Nitro Server Routes Documentation

## 1. API Overview

### Base URLs
```
Production: https://pingtopass.com/api
Staging: https://staging.pingtopass.com/api  
Development: http://localhost:3000/api
```

### Authentication
- **Type**: JWT in httpOnly cookie or Bearer token
- **Cookie Name**: `auth-token`
- **Header**: `Authorization: Bearer <token>`
- **Token Lifetime**: 24 hours
- **Auto-refresh**: Via refresh token

### Response Format
```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId: string
    duration: number
  }
}
```

### Error Codes
```typescript
enum ErrorCode {
  // Auth errors (401)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  
  // Permission errors (403)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  
  // Validation errors (400)
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  
  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
```

## 2. Authentication Endpoints

### 2.1 Google OAuth Login
```typescript
// POST /api/auth/google
interface GoogleAuthRequest {
  credential: string // Google ID token
}

interface GoogleAuthResponse {
  user: {
    id: number
    email: string
    name: string
    picture?: string
    role: 'user' | 'admin'
    subscription: 'free' | 'premium'
  }
  token: string
  expiresAt: string
}

// Example implementation
export default defineEventHandler(async (event) => {
  const { credential } = await readBody<GoogleAuthRequest>(event)
  
  // Verify with Google
  const googleUser = await verifyGoogleToken(credential)
  
  // Find or create user
  const user = await findOrCreateUser(googleUser)
  
  // Generate JWT
  const token = await generateToken(user)
  
  // Set secure cookie
  setCookie(event, 'auth-token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 86400 // 24 hours
  })
  
  return {
    success: true,
    data: {
      user: sanitizeUser(user),
      token,
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    }
  }
})
```

### 2.2 Logout
```typescript
// POST /api/auth/logout
interface LogoutResponse {
  message: string
}

export default defineEventHandler(async (event) => {
  // Clear auth cookie
  deleteCookie(event, 'auth-token')
  
  return {
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  }
})
```

### 2.3 Get Current User
```typescript
// GET /api/auth/me
interface MeResponse {
  user: User
  subscription: {
    status: string
    expiresAt?: string
    features: string[]
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  return {
    success: true,
    data: {
      user: sanitizeUser(user),
      subscription: await getUserSubscription(user.id)
    }
  }
})
```

## 3. Question Endpoints

### 3.1 Get Question Batch (Performance Critical)
```typescript
// POST /api/questions/batch
interface QuestionBatchRequest {
  exam_id: number
  objective_ids: number[]
  count?: number // Default: 65
  difficulty?: {
    min: number // 1-5
    max: number // 1-5
  }
  exclude_recent?: boolean // Default: true
  mode?: 'practice' | 'test' | 'review'
}

interface QuestionBatchResponse {
  questions: Array<{
    id: number
    text: string
    type: 'multiple_choice' | 'multi_select' | 'true_false'
    difficulty: number
    objective_id: number
    answers: Array<{
      id: string
      text: string
      // is_correct excluded for security
    }>
    time_limit?: number // seconds
  }>
  count: number
  retrieval_time_ms: number
}

// Target: <100ms response time
export default defineEventHandler(async (event) => {
  const start = Date.now()
  const user = await requireAuth(event)
  const body = await readBody<QuestionBatchRequest>(event)
  
  // Validate subscription for premium features
  if (body.count && body.count > 20 && user.subscription_status === 'free') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Premium subscription required for more than 20 questions'
    })
  }
  
  // Get questions with caching
  const questions = await getCachedQuestions(
    body.exam_id,
    body.objective_ids,
    body.count || 65,
    body.exclude_recent ? user.id : undefined
  )
  
  // Remove correct answers
  const sanitized = questions.map(q => ({
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
  
  const duration = Date.now() - start
  
  // Log slow requests
  if (duration > 100) {
    console.warn(`Slow question batch: ${duration}ms`, {
      examId: body.exam_id,
      count: body.count,
      userId: user.id
    })
  }
  
  return {
    success: true,
    data: {
      questions: sanitized,
      count: sanitized.length,
      retrieval_time_ms: duration
    }
  }
})
```

### 3.2 Submit Answer
```typescript
// POST /api/questions/[id]/answer
interface SubmitAnswerRequest {
  session_id: number
  answer: string | string[] // string[] for multi_select
  time_spent: number // seconds
  confidence?: number // 1-5
}

interface SubmitAnswerResponse {
  is_correct: boolean
  correct_answer: string | string[]
  explanation: string
  points_earned?: number
  streak_bonus?: number
  mastery_change?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const questionId = getRouterParam(event, 'id')
  const body = await readBody<SubmitAnswerRequest>(event)
  
  // Get question with correct answer
  const question = await getQuestionWithAnswer(parseInt(questionId!))
  
  // Check answer
  const isCorrect = checkAnswer(question, body.answer)
  
  // Record in database
  await recordAnswer({
    userId: user.id,
    sessionId: body.session_id,
    questionId: question.id,
    answer: body.answer,
    isCorrect,
    timeSpent: body.time_spent,
    confidence: body.confidence
  })
  
  // Calculate points and mastery
  const points = calculatePoints(isCorrect, body.time_spent, question.difficulty)
  const mastery = await updateMastery(user.id, question.objective_id, isCorrect)
  
  return {
    success: true,
    data: {
      is_correct: isCorrect,
      correct_answer: question.correct_answer,
      explanation: question.explanation,
      points_earned: points,
      mastery_change: mastery.change
    }
  }
})
```

### 3.3 Search Questions
```typescript
// GET /api/questions/search
interface SearchQuestionsRequest {
  q: string // Search query
  exam_id?: number
  objective_ids?: number[]
  tags?: string[]
  limit?: number // Default: 20
}

interface SearchQuestionsResponse {
  questions: Question[]
  total: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  
  const results = await searchQuestions({
    query: query.q as string,
    examId: query.exam_id ? parseInt(query.exam_id as string) : undefined,
    limit: query.limit ? parseInt(query.limit as string) : 20
  })
  
  return {
    success: true,
    data: results
  }
})
```

## 4. Study Session Endpoints

### 4.1 Create Study Session
```typescript
// POST /api/sessions/study/create
interface CreateStudySessionRequest {
  exam_id: number
  objective_ids: number[]
  mode: 'practice' | 'review' | 'speed_drill' | 'weak_areas'
  question_count?: number // Default: 20
  time_limit?: number // minutes
}

interface CreateStudySessionResponse {
  session_id: number
  mode: string
  objectives: number[]
  questions_loaded: number
  expires_at: string
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<CreateStudySessionRequest>(event)
  
  // Create session
  const session = await createStudySession({
    userId: user.id,
    examId: body.exam_id,
    objectiveIds: body.objective_ids,
    mode: body.mode,
    questionCount: body.question_count
  })
  
  return {
    success: true,
    data: {
      session_id: session.id,
      mode: session.mode,
      objectives: session.objectives,
      questions_loaded: session.question_count,
      expires_at: new Date(Date.now() + 86400000).toISOString() // 24h
    }
  }
})
```

### 4.2 Get Session Progress
```typescript
// GET /api/sessions/[id]/progress
interface SessionProgressResponse {
  session: {
    id: number
    status: 'active' | 'paused' | 'completed'
    mode: string
    created_at: string
  }
  progress: {
    total_questions: number
    answered: number
    correct: number
    skipped: number
    accuracy: number
    time_spent: number // seconds
    current_streak: number
  }
  objectives: Array<{
    id: number
    name: string
    questions_answered: number
    accuracy: number
    mastery_level: number
  }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const sessionId = getRouterParam(event, 'id')
  
  const session = await getSessionWithProgress(
    parseInt(sessionId!),
    user.id
  )
  
  if (!session) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Session not found'
    })
  }
  
  return {
    success: true,
    data: session
  }
})
```

### 4.3 Complete Session
```typescript
// POST /api/sessions/[id]/complete
interface CompleteSessionRequest {
  feedback?: {
    difficulty: number // 1-5
    helpful: boolean
    comments?: string
  }
}

interface CompleteSessionResponse {
  summary: {
    total_questions: number
    correct_answers: number
    accuracy: number
    time_spent: number
    points_earned: number
    mastery_changes: Record<number, number> // objective_id -> change
  }
  achievements?: Array<{
    id: string
    name: string
    description: string
    icon: string
  }>
  recommendations: {
    weak_areas: string[]
    next_objectives: number[]
    study_tips: string[]
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const sessionId = getRouterParam(event, 'id')
  const body = await readBody<CompleteSessionRequest>(event)
  
  // Complete session and calculate results
  const summary = await completeSession(
    parseInt(sessionId!),
    user.id,
    body.feedback
  )
  
  // Check for new achievements
  const achievements = await checkAchievements(user.id, summary)
  
  // Generate AI recommendations
  const recommendations = await generateRecommendations(user.id, summary)
  
  return {
    success: true,
    data: {
      summary,
      achievements,
      recommendations
    }
  }
})
```

## 5. Test Attempt Endpoints

### 5.1 Start Test
```typescript
// POST /api/tests/start
interface StartTestRequest {
  exam_id: number
  mode: 'practice' | 'simulation' | 'certification'
}

interface StartTestResponse {
  test_id: number
  questions: Question[] // Without answers
  time_limit: number // minutes
  passing_score: number // percentage
  instructions: string[]
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody<StartTestRequest>(event)
  
  // Check if user can take test
  if (body.mode === 'certification') {
    await requirePremiumSubscription(user)
  }
  
  // Create test attempt
  const test = await createTestAttempt({
    userId: user.id,
    examId: body.exam_id,
    mode: body.mode
  })
  
  return {
    success: true,
    data: test
  }
})
```

### 5.2 Submit Test
```typescript
// POST /api/tests/[id]/submit
interface SubmitTestRequest {
  answers: Record<number, string | string[]> // question_id -> answer
  time_taken: number // seconds
}

interface SubmitTestResponse {
  score: number // percentage
  passed: boolean
  correct_count: number
  incorrect_count: number
  skipped_count: number
  time_taken: number
  objectives: Array<{
    id: number
    name: string
    score: number
    strength: 'weak' | 'moderate' | 'strong'
  }>
  certificate?: {
    id: string
    url: string
    issued_at: string
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const testId = getRouterParam(event, 'id')
  const body = await readBody<SubmitTestRequest>(event)
  
  // Score test
  const results = await scoreTest(
    parseInt(testId!),
    user.id,
    body.answers,
    body.time_taken
  )
  
  // Issue certificate if passed
  let certificate
  if (results.passed) {
    certificate = await issueCertificate(user.id, parseInt(testId!))
  }
  
  return {
    success: true,
    data: {
      ...results,
      certificate
    }
  }
})
```

## 6. User Progress Endpoints

### 6.1 Get Dashboard Data
```typescript
// GET /api/progress/dashboard
interface DashboardResponse {
  user: {
    name: string
    streak_days: number
    total_points: number
    level: number
  }
  exams: Array<{
    id: number
    name: string
    progress: number // percentage
    readiness: number // ML-calculated
    last_studied: string
    next_test_recommended: string
  }>
  recent_activity: Array<{
    type: 'study' | 'test' | 'achievement'
    description: string
    timestamp: string
    points?: number
  }>
  stats: {
    total_questions_answered: number
    overall_accuracy: number
    study_time_hours: number
    tests_passed: number
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  
  const dashboard = await getUserDashboard(user.id)
  
  return {
    success: true,
    data: dashboard
  }
})
```

### 6.2 Get Exam Progress
```typescript
// GET /api/progress/exam/[id]
interface ExamProgressResponse {
  exam: {
    id: number
    name: string
    description: string
  }
  overall: {
    progress: number
    readiness_score: number
    predicted_score: number
    confidence_interval: number
    estimated_ready_date: string
  }
  objectives: Array<{
    id: number
    name: string
    weight: number
    mastery_level: number
    questions_answered: number
    accuracy: number
    last_reviewed: string
    review_due: string
  }>
  weak_areas: Array<{
    topic: string
    accuracy: number
    priority: 'high' | 'medium' | 'low'
    recommended_questions: number[]
  }>
  test_history: Array<{
    date: string
    score: number
    passed: boolean
    time_taken: number
  }>
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const examId = getRouterParam(event, 'id')
  
  const progress = await getExamProgress(
    user.id,
    parseInt(examId!)
  )
  
  return {
    success: true,
    data: progress
  }
})
```

## 7. Admin Endpoints

### 7.1 Generate Questions (AI)
```typescript
// POST /api/admin/questions/generate
interface GenerateQuestionsRequest {
  exam_id: number
  objective_id: number
  count: number // How many to generate
  difficulty_distribution?: {
    easy: number // percentage
    medium: number
    hard: number
  }
}

interface GenerateQuestionsResponse {
  generated: number
  questions: Array<{
    id: number
    text: string
    status: 'pending_review'
  }>
  cost: {
    tokens_used: number
    cost_cents: number
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  
  const body = await readBody<GenerateQuestionsRequest>(event)
  
  // Generate using AI
  const result = await generateQuestionsWithAI({
    examId: body.exam_id,
    objectiveId: body.objective_id,
    count: body.count,
    distribution: body.difficulty_distribution
  })
  
  return {
    success: true,
    data: result
  }
})
```

### 7.2 Review AI Questions
```typescript
// PUT /api/admin/questions/[id]/review
interface ReviewQuestionRequest {
  status: 'approved' | 'rejected' | 'needs_revision'
  feedback?: string
  edited_content?: {
    text?: string
    answers?: any[]
    explanation?: string
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  
  const questionId = getRouterParam(event, 'id')
  const body = await readBody<ReviewQuestionRequest>(event)
  
  await reviewQuestion(
    parseInt(questionId!),
    user.id,
    body
  )
  
  return {
    success: true,
    data: {
      message: 'Question reviewed successfully'
    }
  }
})
```

### 7.3 Analytics Dashboard
```typescript
// GET /api/admin/analytics
interface AnalyticsResponse {
  users: {
    total: number
    active_today: number
    active_week: number
    new_week: number
    by_subscription: Record<string, number>
  }
  questions: {
    total: number
    by_exam: Record<string, number>
    ai_generated: number
    pending_review: number
    quality_scores: {
      excellent: number // >0.8 discrimination
      good: number // 0.5-0.8
      poor: number // <0.5
    }
  }
  revenue: {
    mrr: number
    arr: number
    new_subscriptions: number
    churn_rate: number
  }
  usage: {
    questions_answered_today: number
    tests_taken_today: number
    ai_tokens_used: number
    ai_cost_today: number
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireAdmin(user)
  
  const analytics = await getAdminAnalytics()
  
  return {
    success: true,
    data: analytics
  }
})
```

## 8. Webhook Endpoints

### 8.1 Stripe Webhook
```typescript
// POST /api/webhooks/stripe
export default defineEventHandler(async (event) => {
  const sig = getHeader(event, 'stripe-signature')
  const body = await readRawBody(event)
  
  // Verify webhook signature
  const stripeEvent = verifyStripeWebhook(body, sig)
  
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(stripeEvent.data)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(stripeEvent.data)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(stripeEvent.data)
      break
  }
  
  return { received: true }
})
```

## 9. Rate Limiting

### Rate Limits by Endpoint
```typescript
const rateLimits = {
  // Auth endpoints
  '/api/auth/google': '10/hour/ip',
  '/api/auth/logout': '20/hour/user',
  
  // Question endpoints  
  '/api/questions/batch': '100/minute/user',
  '/api/questions/*/answer': '200/minute/user',
  
  // AI endpoints (expensive)
  '/api/admin/questions/generate': '10/day/user',
  
  // General API
  'default': '1000/hour/user'
}
```

## 10. Error Handling

### Standard Error Response
```typescript
// Error handler middleware
export default defineEventHandler(async (event) => {
  try {
    // ... route logic
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const errorCode = error.code || 'INTERNAL_ERROR'
    
    // Log error
    console.error('API Error:', {
      path: event.node.req.url,
      method: event.node.req.method,
      error: error.message,
      stack: error.stack,
      user: event.context.user?.id
    })
    
    // Return standardized error
    setResponseStatus(event, statusCode)
    return {
      success: false,
      error: {
        code: errorCode,
        message: error.statusMessage || 'An error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: event.context.requestId
      }
    }
  }
})
```

## 11. API Client SDK

### TypeScript Client
```typescript
// lib/api-client.ts
class PingToPassAPI {
  private baseURL: string
  private token?: string
  
  constructor(baseURL = '/api') {
    this.baseURL = baseURL
  }
  
  async auth(credential: string) {
    const res = await this.post('/auth/google', { credential })
    this.token = res.data.token
    return res.data
  }
  
  async getQuestions(params: QuestionBatchRequest) {
    return this.post('/questions/batch', params)
  }
  
  async submitAnswer(questionId: number, answer: string) {
    return this.post(`/questions/${questionId}/answer`, { answer })
  }
  
  private async post(path: string, body?: any) {
    const res = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      body: JSON.stringify(body)
    })
    
    const data = await res.json()
    
    if (!data.success) {
      throw new APIError(data.error)
    }
    
    return data
  }
}
```

This API specification provides:
- **RESTful design** with consistent patterns
- **Type-safe** request/response interfaces
- **Performance-focused** with <100ms targets
- **Comprehensive error handling**
- **Admin capabilities** for content management
- **AI integration** for question generation
- **Webhook support** for payments
- **Rate limiting** for protection
- **SDK example** for client integration