import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import type { OpportunityType, OpportunityStatus, TweetMetrics, TweetEntities, AIAnalysis, VoiceProfile } from './types'

// Twitter accounts monitoring and analysis
export const twitterAccounts = sqliteTable('twitter_accounts', {
  id: text('id').primaryKey(), // Twitter user ID
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  bio: text('bio'),
  followersCount: integer('followers_count').default(0),
  followingCount: integer('following_count').default(0),
  tweetCount: integer('tweet_count').default(0),
  
  // Account Classification
  isOwnAccount: integer('is_own_account', { mode: 'boolean' }).default(false),
  isCompetitor: integer('is_competitor', { mode: 'boolean' }).default(false),
  isTargetAudience: integer('is_target_audience', { mode: 'boolean' }).default(false),
  
  // Analysis Tracking
  lastAnalyzedAt: integer('last_analyzed_at', { mode: 'timestamp' }),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for account management
  usernameIdx: index('idx_twitter_accounts_username').on(table.username),
  ownAccountIdx: index('idx_twitter_accounts_own').on(table.isOwnAccount),
  targetAudienceIdx: index('idx_twitter_accounts_target').on(table.isTargetAudience, table.lastAnalyzedAt),
  competitorIdx: index('idx_twitter_accounts_competitor').on(table.isCompetitor, table.lastAnalyzedAt)
}))

// Tweets storage and analysis
export const tweets = sqliteTable('tweets', {
  id: text('id').primaryKey(), // Twitter tweet ID
  accountId: text('account_id').notNull().references(() => twitterAccounts.id),
  text: text('text').notNull(),
  
  // Twitter Metrics (JSON format)
  metrics: text('metrics', { mode: 'json' }).$type<TweetMetrics>(),
  
  // Twitter Entities (hashtags, mentions, URLs)
  entities: text('entities', { mode: 'json' }).$type<TweetEntities>(),
  
  // AI Analysis Results
  aiAnalysis: text('ai_analysis', { mode: 'json' }).$type<AIAnalysis>(),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }), // Original tweet timestamp
  analyzedAt: integer('analyzed_at', { mode: 'timestamp' })
}, (table) => ({
  // Performance indexes for tweet analysis
  accountIdx: index('idx_tweets_account').on(table.accountId),
  createdIdx: index('idx_tweets_created').on(table.createdAt),
  analyzedIdx: index('idx_tweets_analyzed').on(table.analyzedAt),
  accountCreatedIdx: index('idx_tweets_account_created').on(table.accountId, table.createdAt)
}))

// Engagement opportunities for AI-powered responses
export const engagementOpportunities = sqliteTable('engagement_opportunities', {
  id: text('id').primaryKey().default(sql`lower(hex(randomblob(16)))`), // UUID v4 equivalent
  tweetId: text('tweet_id').notNull().references(() => tweets.id),
  accountId: text('account_id').notNull().references(() => twitterAccounts.id),
  
  // Opportunity Details
  opportunityType: text('opportunity_type').$type<OpportunityType>(),
  relevanceScore: real('relevance_score'), // 0-1 score of how relevant this opportunity is
  suggestedResponse: text('suggested_response'),
  
  // AI Generation Tracking
  aiModelUsed: text('ai_model_used'),
  aiCost: real('ai_cost'), // Cost in USD
  
  // Workflow Status
  status: text('status').$type<OpportunityStatus>().default('pending'),
  executedAt: integer('executed_at', { mode: 'timestamp' }),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for opportunity management
  statusIdx: index('idx_opportunities_status').on(table.status),
  createdIdx: index('idx_opportunities_created').on(table.createdAt),
  relevanceIdx: index('idx_opportunities_relevance').on(table.relevanceScore),
  statusCreatedIdx: index('idx_opportunities_status_created').on(table.status, table.createdAt),
  tweetIdx: index('idx_opportunities_tweet').on(table.tweetId)
}))

// Growth metrics tracking for ROI analysis
export const growthMetrics = sqliteTable('growth_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(), // DATE format: YYYY-MM-DD
  
  // Follower Metrics
  followersCount: integer('followers_count'),
  followingCount: integer('following_count'),
  newFollowers: integer('new_followers'),
  lostFollowers: integer('lost_followers'),
  
  // Activity Metrics
  tweetsSent: integer('tweets_sent'),
  engagementsMade: integer('engagements_made'),
  impressions: integer('impressions'),
  profileVisits: integer('profile_visits'),
  
  // Performance Metrics
  engagementRate: real('engagement_rate'), // Percentage
  
  // Cost Tracking
  aiCosts: real('ai_costs'), // Total AI costs for the day
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for analytics dashboard
  dateIdx: index('idx_metrics_date').on(table.date),
  followersIdx: index('idx_metrics_followers').on(table.date, table.newFollowers),
  costsIdx: index('idx_metrics_costs').on(table.date, table.aiCosts)
}))

// Voice profile for consistent AI-generated responses
export const voiceProfiles = sqliteTable('voice_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  
  // Voice Characteristics
  tone: text('tone'), // 'professional', 'casual', 'friendly', 'technical'
  topics: text('topics', { mode: 'json' }).$type<string[]>(), // Preferred topics
  vocabulary: text('vocabulary', { mode: 'json' }).$type<string[]>(), // Key phrases/words
  examples: text('examples', { mode: 'json' }).$type<string[]>(), // Example tweets/responses
  
  // Additional Voice Data
  voiceData: text('voice_data', { mode: 'json' }).$type<VoiceProfile>(),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes
  activeIdx: index('idx_voice_profiles_active').on(table.isActive),
  nameIdx: index('idx_voice_profiles_name').on(table.name)
}))

// Relations for Twitter system
export const twitterRelations = relations(twitterAccounts, ({ many }) => ({
  tweets: many(tweets),
  engagementOpportunities: many(engagementOpportunities)
}))

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  account: one(twitterAccounts, {
    fields: [tweets.accountId],
    references: [twitterAccounts.id]
  }),
  engagementOpportunities: many(engagementOpportunities)
}))

export const engagementOpportunitiesRelations = relations(engagementOpportunities, ({ one }) => ({
  tweet: one(tweets, {
    fields: [engagementOpportunities.tweetId],
    references: [tweets.id]
  }),
  account: one(twitterAccounts, {
    fields: [engagementOpportunities.accountId],
    references: [twitterAccounts.id]
  })
}))

// Type exports
export type TwitterAccount = typeof twitterAccounts.$inferSelect
export type NewTwitterAccount = typeof twitterAccounts.$inferInsert

export type Tweet = typeof tweets.$inferSelect
export type NewTweet = typeof tweets.$inferInsert

export type EngagementOpportunity = typeof engagementOpportunities.$inferSelect
export type NewEngagementOpportunity = typeof engagementOpportunities.$inferInsert

export type GrowthMetric = typeof growthMetrics.$inferSelect
export type NewGrowthMetric = typeof growthMetrics.$inferInsert

export type VoiceProfileRecord = typeof voiceProfiles.$inferSelect
export type NewVoiceProfile = typeof voiceProfiles.$inferInsert