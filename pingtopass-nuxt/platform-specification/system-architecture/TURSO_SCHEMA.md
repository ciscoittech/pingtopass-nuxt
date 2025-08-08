# Turso Database Schema - PingToPass

## Overview

PingToPass uses **Turso** (libSQL) as its edge database with **Drizzle ORM** for type-safe database operations. Turso provides SQLite compatibility with global replication for sub-50ms query times worldwide.

## Database Setup

### Initial Setup with Turso CLI

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Authenticate
turso auth login

# Create databases
turso db create pingtopass-dev --group default
turso db create pingtopass-prod --group default

# Get database URLs
turso db show pingtopass-dev --url
turso db show pingtopass-dev --token

# Create replicas for global performance
turso db replicate pingtopass-prod ams  # Amsterdam
turso db replicate pingtopass-prod sjc  # San Jose
turso db replicate pingtopass-prod sin  # Singapore
turso db replicate pingtopass-prod syd  # Sydney
```

### Environment Configuration

```bash
# .env.local
TURSO_DATABASE_URL=libsql://pingtopass-dev-[org].turso.io
TURSO_AUTH_TOKEN=your-token-here

# Production (set in Cloudflare Workers)
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
```

## Drizzle ORM Schema

### Complete Schema Definition

```typescript
// server/database/schema.ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Custom ID generator
export const generateId = () => createId();

// Users table
export const users = sqliteTable('users', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  googleId: text('google_id').unique(),
  avatarUrl: text('avatar_url'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  subscriptionTier: text('subscription_tier', { 
    enum: ['free', 'pro', 'enterprise'] 
  }).default('free'),
  subscriptionStatus: text('subscription_status', {
    enum: ['active', 'canceled', 'past_due', 'trialing']
  }),
  trialEndsAt: integer('trial_ends_at', { mode: 'timestamp' }),
  credits: integer('credits').default(0), // For pay-per-use model
  settings: text('settings', { mode: 'json' }).$type<UserSettings>(),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  stripeCustomerIdx: index('users_stripe_customer_idx').on(table.stripeCustomerId),
}));

// Exams table
export const exams = sqliteTable('exams', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'CCNA-200-301'
  name: text('name').notNull(),
  vendor: text('vendor').notNull(), // Cisco, AWS, Microsoft, etc.
  category: text('category').notNull(), // Networking, Cloud, Security, etc.
  description: text('description'),
  objectives: text('objectives', { mode: 'json' }).$type<ExamObjective[]>(),
  passingScore: integer('passing_score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  timeLimit: integer('time_limit'), // in minutes
  price: real('price'), // Exam cost
  retireDate: integer('retire_date', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isBeta: integer('is_beta', { mode: 'boolean' }).default(false),
  metadata: text('metadata', { mode: 'json' }).$type<ExamMetadata>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  codeIdx: uniqueIndex('exams_code_idx').on(table.code),
  vendorIdx: index('exams_vendor_idx').on(table.vendor),
  categoryIdx: index('exams_category_idx').on(table.category),
  activeIdx: index('exams_active_idx').on(table.isActive),
}));

// Questions table
export const questions = sqliteTable('questions', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  type: text('type', { 
    enum: ['single', 'multiple', 'drag-drop', 'hotspot', 'simulation'] 
  }).notNull(),
  text: text('text').notNull(),
  explanation: text('explanation'),
  referenceUrl: text('reference_url'),
  difficulty: integer('difficulty').notNull(), // 1-5 scale
  objectiveId: text('objective_id'),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  exhibitUrl: text('exhibit_url'), // For questions with images/diagrams
  simulationData: text('simulation_data', { mode: 'json' }), // For simulation questions
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).default(false),
  aiModel: text('ai_model'), // Track which AI model generated it
  reviewStatus: text('review_status', {
    enum: ['pending', 'approved', 'rejected']
  }).default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  statistics: text('statistics', { mode: 'json' }).$type<QuestionStats>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  examIdx: index('questions_exam_idx').on(table.examId),
  examObjectiveIdx: index('questions_exam_objective_idx').on(table.examId, table.objectiveId),
  difficultyIdx: index('questions_difficulty_idx').on(table.examId, table.difficulty),
  activeIdx: index('questions_active_idx').on(table.isActive),
  reviewStatusIdx: index('questions_review_status_idx').on(table.reviewStatus),
}));

// Answer options table
export const answerOptions = sqliteTable('answer_options', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  questionId: text('question_id').notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  explanation: text('explanation'), // Why this answer is correct/incorrect
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
}, (table) => ({
  questionIdx: index('answer_options_question_idx').on(table.questionId),
  questionOrderIdx: index('answer_options_question_order_idx').on(table.questionId, table.order),
}));

// Study sessions table
export const studySessions = sqliteTable('study_sessions', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => exams.id),
  mode: text('mode', { 
    enum: ['practice', 'timed', 'exam', 'review', 'adaptive'] 
  }).notNull(),
  totalQuestions: integer('total_questions').notNull(),
  answeredQuestions: integer('answered_questions').default(0),
  correctAnswers: integer('correct_answers').default(0),
  timeLimit: integer('time_limit'), // in seconds
  timeSpent: integer('time_spent'), // in seconds
  score: real('score'),
  passed: integer('passed', { mode: 'boolean' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }).$type<SessionMetadata>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('study_sessions_user_idx').on(table.userId),
  userExamIdx: index('study_sessions_user_exam_idx').on(table.userId, table.examId),
  modeIdx: index('study_sessions_mode_idx').on(table.mode),
  completedIdx: index('study_sessions_completed_idx').on(table.completedAt),
}));

// User answers table
export const userAnswers = sqliteTable('user_answers', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  sessionId: text('session_id').notNull()
    .references(() => studySessions.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id),
  selectedOptions: text('selected_options', { mode: 'json' }).$type<string[]>().notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  isMarked: integer('is_marked', { mode: 'boolean' }).default(false), // For review
  timeSpent: integer('time_spent'), // in seconds
  confidence: integer('confidence'), // 1-5 scale
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
}, (table) => ({
  sessionIdx: index('user_answers_session_idx').on(table.sessionId),
  sessionQuestionIdx: uniqueIndex('user_answers_session_question_idx')
    .on(table.sessionId, table.questionId),
  correctIdx: index('user_answers_correct_idx').on(table.isCorrect),
}));

// User progress table
export const userProgress = sqliteTable('user_progress', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: text('exam_id').notNull().references(() => exams.id),
  totalSessions: integer('total_sessions').default(0),
  questionsAnswered: integer('questions_answered').default(0),
  correctAnswers: integer('correct_answers').default(0),
  averageScore: real('average_score'),
  bestScore: real('best_score'),
  weakAreas: text('weak_areas', { mode: 'json' }).$type<WeakArea[]>(),
  strongAreas: text('strong_areas', { mode: 'json' }).$type<string[]>(),
  studyStreak: integer('study_streak').default(0),
  totalTimeSpent: integer('total_time_spent').default(0), // in seconds
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  readyForExam: integer('ready_for_exam', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .$onUpdate(() => sql`(unixepoch())`),
}, (table) => ({
  userExamIdx: uniqueIndex('user_progress_user_exam_idx').on(table.userId, table.examId),
  lastActivityIdx: index('user_progress_last_activity_idx').on(table.lastActivityAt),
}));

// Bookmarks table
export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
}, (table) => ({
  userQuestionIdx: uniqueIndex('bookmarks_user_question_idx').on(table.userId, table.questionId),
  userIdx: index('bookmarks_user_idx').on(table.userId),
}));

// Feedback table
export const feedback = sqliteTable('feedback', {
  id: text('id').$defaultFn(() => generateId()).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  questionId: text('question_id').references(() => questions.id),
  type: text('type', {
    enum: ['error', 'improvement', 'general']
  }).notNull(),
  message: text('message').notNull(),
  status: text('status', {
    enum: ['pending', 'reviewed', 'resolved']
  }).default('pending'),
  response: text('response'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
}, (table) => ({
  statusIdx: index('feedback_status_idx').on(table.status),
  questionIdx: index('feedback_question_idx').on(table.questionId),
}));

// Type definitions
export type UserSettings = {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  showTimer: boolean;
  autoAdvance: boolean;
  soundEffects: boolean;
  emailNotifications: boolean;
};

export type ExamObjective = {
  id: string;
  domain: string;
  weight: number; // Percentage weight in exam
  topics: string[];
};

export type ExamMetadata = {
  vendor_url?: string;
  prerequisites?: string[];
  recertification?: number; // months
  languages?: string[];
};

export type QuestionStats = {
  timesAnswered: number;
  correctRate: number;
  averageTime: number;
  difficultyScore: number; // Calculated from user performance
};

export type SessionMetadata = {
  objectives?: string[];
  difficulty?: number;
  questionsPerObjective?: Record<string, number>;
  clientInfo?: {
    userAgent: string;
    ip?: string;
  };
};

export type WeakArea = {
  objectiveId: string;
  domain: string;
  correctRate: number;
  questionsAnswered: number;
};
```

## Database Migrations

### Using Drizzle Kit

```bash
# Install Drizzle Kit
npm install -D drizzle-kit

# Generate migrations from schema changes
npx drizzle-kit generate:sqlite

# Push schema to database
npx drizzle-kit push:sqlite

# Run Drizzle Studio for database inspection
npx drizzle-kit studio
```

### Migration Configuration

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

### Manual Migration Example

```sql
-- server/database/migrations/0001_initial.sql
-- Create all tables with indexes
-- This is auto-generated by Drizzle Kit

-- Apply migration
turso db shell pingtopass-prod < server/database/migrations/0001_initial.sql
```

## Database Utilities

### Connection Setup

```typescript
// server/utils/database.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '~/server/database/schema';

// Create Turso client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for type inference
export type Database = typeof db;
```

### Common Queries with Drizzle

```typescript
// Get exam with question count
const examWithStats = await db
  .select({
    exam: exams,
    questionCount: sql<number>`count(${questions.id})`,
  })
  .from(exams)
  .leftJoin(questions, eq(exams.id, questions.examId))
  .where(eq(exams.code, 'CCNA-200-301'))
  .groupBy(exams.id);

// Get user's recent sessions
const recentSessions = await db
  .select()
  .from(studySessions)
  .where(eq(studySessions.userId, userId))
  .orderBy(desc(studySessions.createdAt))
  .limit(10);

// Complex aggregation for user stats
const userStats = await db
  .select({
    totalQuestions: sql<number>`count(distinct ${userAnswers.questionId})`,
    correctAnswers: sql<number>`sum(case when ${userAnswers.isCorrect} then 1 else 0 end)`,
    totalTime: sql<number>`sum(${userAnswers.timeSpent})`,
    avgConfidence: sql<number>`avg(${userAnswers.confidence})`,
  })
  .from(userAnswers)
  .innerJoin(studySessions, eq(userAnswers.sessionId, studySessions.id))
  .where(eq(studySessions.userId, userId));
```

## Performance Optimizations

### Critical Indexes
All indexes are defined in the schema using Drizzle's index functions:
- User lookups by email, googleId
- Question filtering by exam, difficulty, objectives
- Session queries by user and exam
- Answer retrieval by session

### Query Optimization Tips

1. **Use Drizzle's query builder** for type safety and optimal SQL generation
2. **Batch operations** with transactions for multiple inserts
3. **Select only needed columns** to reduce data transfer
4. **Use prepared statements** for frequently executed queries
5. **Leverage Turso's edge replicas** for geographic distribution

### Caching Strategy

```typescript
// Use Cloudflare KV for caching with Drizzle results
export async function getCachedExam(code: string) {
  // Check cache first
  const cached = await env.KV.get(`exam:${code}`, 'json');
  if (cached) return cached;
  
  // Query with Drizzle
  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.code, code))
    .limit(1);
  
  // Cache for 1 hour
  if (exam) {
    await env.KV.put(`exam:${code}`, JSON.stringify(exam), {
      expirationTtl: 3600,
    });
  }
  
  return exam;
}
```

## Backup and Recovery

```bash
# Create backup
turso db dump pingtopass-prod > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
turso db shell pingtopass-prod < backup-20240101-120000.sql

# Export specific tables with Drizzle Studio
npx drizzle-kit studio
# Use export feature in UI
```

## Monitoring

```bash
# Database stats
turso db inspect pingtopass-prod

# Show replicas
turso db show pingtopass-prod

# Connection info
turso db tokens pingtopass-prod
```

## Security Best Practices

1. **Use Drizzle ORM** - Prevents SQL injection with parameterized queries
2. **Row-level security** - Implement in application layer
3. **Encrypt sensitive data** - Use application-level encryption for PII
4. **Rotate tokens regularly** - Update Turso auth tokens quarterly
5. **Audit logging** - Track all data modifications
6. **Use transactions** - Ensure data consistency with Drizzle transactions

## Testing

```typescript
// server/tests/database.test.ts
import { describe, it, expect } from 'vitest';
import { db } from '~/server/utils/database';
import { users, exams } from '~/server/database/schema';

describe('Database Operations', () => {
  it('should insert and retrieve user', async () => {
    const [user] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        name: 'Test User',
      })
      .returning();
    
    expect(user.email).toBe('test@example.com');
  });
});
```