# API Specification - PingToPass Edge Platform

## Architecture Overview

PingToPass runs on **Cloudflare Workers** with Nuxt 3/Nitro, providing a globally distributed edge-first architecture with sub-200ms response times worldwide.

### Tech Stack
- **Runtime**: Cloudflare Workers (V8 isolates)
- **Framework**: Nuxt 3 with Nitro server
- **Database**: Turso (libSQL) with Drizzle ORM
- **Authentication**: Google OAuth with JWT
- **AI Integration**: LangChain + OpenRouter
- **Deployment**: Cloudflare Workers (via wrangler CLI)

## API Structure

All API routes are defined in the `server/api/` directory using Nuxt's file-based routing.

### Authentication Endpoints

#### POST `/api/auth/google`
Google OAuth callback handler.

```typescript
// server/api/auth/google.post.ts
import { db } from '~/server/utils/database';
import { users } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  const { code } = await readBody(event);
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  const userInfo = await fetchGoogleUserInfo(tokens.access_token);
  
  // Upsert user with Drizzle ORM
  const [user] = await db
    .insert(users)
    .values({
      id: generateId(),
      email: userInfo.email,
      name: userInfo.name,
      googleId: userInfo.id,
    })
    .onConflictDoUpdate({
      target: users.googleId,
      set: {
        name: userInfo.name,
        updatedAt: new Date(),
      },
    })
    .returning();
  
  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  
  return { token, user };
});
```

#### GET `/api/auth/verify`
Verify JWT token and return user info.

```typescript
// server/api/auth/verify.get.ts
import { verifyJWT } from '~/server/utils/auth';
import { db } from '~/server/utils/database';
import { users } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'No token provided' });
  }
  
  const payload = await verifyJWT(token);
  
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }
  
  return user;
});
```

### Exam Management

#### GET `/api/exams`
List all available exams.

```typescript
// server/api/exams.get.ts
import { db } from '~/server/utils/database';
import { exams } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  // Edge-cached query with Drizzle
  const examList = await db
    .select()
    .from(exams)
    .where(eq(exams.isActive, true))
    .orderBy(exams.vendor, exams.name);
  
  // Set cache headers for Cloudflare edge
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=86400');
  setHeader(event, 'CDN-Cache-Control', 'public, max-age=86400');
  
  return examList;
});
```

#### GET `/api/exams/[code]`
Get exam details by code.

```typescript
// server/api/exams/[code].get.ts
import { db } from '~/server/utils/database';
import { exams } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code');
  
  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.code, code!))
    .limit(1);
  
  if (!exam) {
    throw createError({ statusCode: 404, statusMessage: 'Exam not found' });
  }
  
  // Cache for 1 hour at edge
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  
  return exam;
});
```

### Question Delivery

#### GET `/api/questions`
Get questions for an exam with pagination.

```typescript
// server/api/questions.get.ts
import { db } from '~/server/utils/database';
import { questions, answerOptions } from '~/server/database/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { examId, limit = 20, offset = 0, difficulty, mode = 'practice' } = query;
  
  await requireAuth(event); // Verify user is authenticated
  
  // Build query with Drizzle
  const conditions = [
    eq(questions.examId, examId as string),
    eq(questions.isActive, true),
  ];
  
  if (difficulty) {
    conditions.push(eq(questions.difficulty, Number(difficulty)));
  }
  
  // Fetch questions with answers using Drizzle relations
  const questionList = await db
    .select({
      question: questions,
      answers: answerOptions,
    })
    .from(questions)
    .leftJoin(answerOptions, eq(questions.id, answerOptions.questionId))
    .where(and(...conditions))
    .limit(Number(limit))
    .offset(Number(offset));
  
  // Group answers by question
  const grouped = questionList.reduce((acc, row) => {
    const qId = row.question.id;
    if (!acc[qId]) {
      acc[qId] = {
        ...row.question,
        answers: [],
      };
    }
    if (row.answers) {
      acc[qId].answers.push(row.answers);
    }
    return acc;
  }, {} as Record<string, any>);
  
  return Object.values(grouped);
});
```

### Study Sessions

#### POST `/api/sessions`
Start a new study session.

```typescript
// server/api/sessions.post.ts
import { db } from '~/server/utils/database';
import { studySessions } from '~/server/database/schema';
import { generateId } from '~/server/utils/ids';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const { examId, mode, questionCount } = await readBody(event);
  
  const [session] = await db
    .insert(studySessions)
    .values({
      id: generateId(),
      userId: user.id,
      examId,
      mode,
      totalQuestions: questionCount,
      correctAnswers: 0,
      timeSpent: 0,
    })
    .returning();
  
  return session;
});
```

#### POST `/api/sessions/[id]/answer`
Submit an answer for a question.

```typescript
// server/api/sessions/[id]/answer.post.ts
import { db } from '~/server/utils/database';
import { userAnswers, questions, answerOptions } from '~/server/database/schema';
import { eq, and, inArray } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const sessionId = getRouterParam(event, 'id');
  const { questionId, selectedOptionIds, timeSpent } = await readBody(event);
  
  // Verify correct answers with Drizzle
  const correctOptions = await db
    .select()
    .from(answerOptions)
    .where(
      and(
        eq(answerOptions.questionId, questionId),
        eq(answerOptions.isCorrect, true)
      )
    );
  
  const correctIds = correctOptions.map(o => o.id);
  const isCorrect = 
    selectedOptionIds.length === correctIds.length &&
    selectedOptionIds.every((id: string) => correctIds.includes(id));
  
  // Store answer
  const [answer] = await db
    .insert(userAnswers)
    .values({
      id: generateId(),
      sessionId: sessionId!,
      questionId,
      selectedOptions: JSON.stringify(selectedOptionIds),
      isCorrect,
      timeSpent,
    })
    .returning();
  
  return { answer, isCorrect, explanation: correctOptions[0]?.explanation };
});
```

#### PUT `/api/sessions/[id]/complete`
Complete a study session and calculate score.

```typescript
// server/api/sessions/[id]/complete.put.ts
import { db } from '~/server/utils/database';
import { studySessions, userAnswers, userProgress } from '~/server/database/schema';
import { eq, sql } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  const sessionId = getRouterParam(event, 'id');
  
  // Calculate session stats with Drizzle aggregation
  const stats = await db
    .select({
      correctCount: sql<number>`count(case when is_correct = 1 then 1 end)`,
      totalCount: sql<number>`count(*)`,
      totalTime: sql<number>`sum(time_spent)`,
    })
    .from(userAnswers)
    .where(eq(userAnswers.sessionId, sessionId!));
  
  const score = (stats[0].correctCount / stats[0].totalCount) * 100;
  
  // Update session
  await db
    .update(studySessions)
    .set({
      correctAnswers: stats[0].correctCount,
      score,
      timeSpent: stats[0].totalTime,
      completedAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId!));
  
  // Update user progress
  await updateUserProgress(user.id, sessionId!);
  
  return { score, ...stats[0] };
});
```

### Progress Tracking

#### GET `/api/progress`
Get user progress for all exams.

```typescript
// server/api/progress.get.ts
import { db } from '~/server/utils/database';
import { userProgress, exams } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event);
  
  const progress = await db
    .select({
      progress: userProgress,
      exam: exams,
    })
    .from(userProgress)
    .innerJoin(exams, eq(userProgress.examId, exams.id))
    .where(eq(userProgress.userId, user.id))
    .orderBy(userProgress.lastActivityAt);
  
  return progress;
});
```

### AI Question Generation (Admin)

#### POST `/api/admin/generate-questions`
Generate questions using AI.

```typescript
// server/api/admin/generate-questions.post.ts
import { db } from '~/server/utils/database';
import { questions, answerOptions } from '~/server/database/schema';
import { generateQuestions } from '~/server/utils/ai';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  
  const { examId, count = 50, objectives } = await readBody(event);
  
  // Generate questions with LangChain + OpenRouter
  const generatedQuestions = await generateQuestions({
    examId,
    count,
    objectives,
    model: 'qwen/qwen-2.5-coder-32b-instruct',
  });
  
  // Batch insert with Drizzle transaction
  await db.transaction(async (tx) => {
    for (const q of generatedQuestions) {
      const [question] = await tx
        .insert(questions)
        .values({
          id: generateId(),
          examId,
          type: q.type,
          text: q.text,
          explanation: q.explanation,
          difficulty: q.difficulty,
          objectiveId: q.objectiveId,
          aiGenerated: true,
        })
        .returning();
      
      // Insert answer options
      await tx.insert(answerOptions).values(
        q.answers.map((a: any, idx: number) => ({
          id: generateId(),
          questionId: question.id,
          text: a.text,
          isCorrect: a.isCorrect,
          order: idx,
        }))
      );
    }
  });
  
  return { generated: generatedQuestions.length };
});
```

## Middleware

### Authentication Middleware
```typescript
// server/middleware/auth.ts
export async function requireAuth(event: any) {
  const token = getCookie(event, 'auth-token') || 
                getHeader(event, 'authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' });
  }
  
  const payload = await verifyJWT(token);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);
  
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
  }
  
  event.context.user = user;
  return user;
}
```

### Rate Limiting
```typescript
// server/middleware/rateLimit.ts
const limiter = new Map();

export default defineEventHandler(async (event) => {
  if (!event.node.req.url?.startsWith('/api/')) return;
  
  const ip = getClientIP(event) || 'unknown';
  const key = `${ip}:${event.node.req.url}`;
  
  const limit = limiter.get(key) || { count: 0, reset: Date.now() + 60000 };
  
  if (Date.now() > limit.reset) {
    limit.count = 0;
    limit.reset = Date.now() + 60000;
  }
  
  limit.count++;
  limiter.set(key, limit);
  
  if (limit.count > 100) { // 100 requests per minute
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' });
  }
});
```

## Error Handling

All errors are handled consistently:

```typescript
// server/api/[...].ts (catch-all)
export default defineEventHandler(async (event) => {
  throw createError({
    statusCode: 404,
    statusMessage: 'API endpoint not found',
  });
});
```

## Response Format

### Success Response
```json
{
  "data": { },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "cached": false
  }
}
```

### Error Response
```json
{
  "error": {
    "statusCode": 400,
    "statusMessage": "Invalid request",
    "details": { }
  }
}
```

## Performance Optimizations

1. **Edge Caching**: All read-heavy endpoints use Cloudflare cache headers
2. **Database Pooling**: Turso connection pooling with Drizzle
3. **Query Optimization**: Indexed queries with proper joins
4. **Response Compression**: Automatic via Cloudflare
5. **Global Distribution**: Turso replicas in multiple regions

## Security

1. **Authentication**: JWT with secure httpOnly cookies
2. **Authorization**: Role-based access control
3. **Input Validation**: Zod schemas for all inputs
4. **SQL Injection**: Protected via Drizzle ORM parameterized queries
5. **Rate Limiting**: Per-IP rate limits on all endpoints
6. **CORS**: Configured for specific origins only

## Testing

```bash
# Unit tests for API endpoints
npm run test:api

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Deploy to preview environment
wrangler deploy --env preview

# Deploy to production
wrangler deploy --env production
```