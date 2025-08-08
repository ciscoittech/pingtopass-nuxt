import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import type { Provider, UserRole, SubscriptionStatus } from './types'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  
  // Authentication
  provider: text('provider').$type<Provider>().default('google'),
  providerId: text('provider_id'),
  passwordHash: text('password_hash'),
  
  // Roles & Permissions  
  role: text('role').$type<UserRole>().default('user'),
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  
  // Subscription
  subscriptionStatus: text('subscription_status').$type<SubscriptionStatus>().default('free'),
  subscriptionExpiresAt: integer('subscription_expires_at', { mode: 'timestamp' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  
  // Profile
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
  preferredLanguage: text('preferred_language').default('en'),
  
  // Activity
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  loginCount: integer('login_count').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Optimized indexes for common query patterns
  emailIdx: index('idx_users_email').on(table.email),
  providerIdx: index('idx_users_provider').on(table.provider, table.providerId),
  stripeIdx: index('idx_users_stripe').on(table.stripeCustomerId),
  activeIdx: index('idx_users_active').on(table.isActive, table.subscriptionStatus)
}))

export const usersRelations = relations(users, ({ many }) => ({
  studySessions: many(studySessions),
  testAttempts: many(testAttempts),
  userAnswers: many(userAnswers),
  userProgress: many(userProgress),
  reviewedQuestions: many(questions, { relationName: 'reviewer' })
}))

// Import statements need to be declared for relations
import { studySessions } from './study-sessions'
import { testAttempts } from './test-attempts'  
import { userAnswers } from './user-answers'
import { userProgress } from './user-progress'
import { questions } from './questions'

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert