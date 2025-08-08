# Twitter Growth System V2 - Nuxt 3/Edge Architecture

## 1. System Overview

### Purpose
Automated Twitter growth system for PingToPass using edge-native architecture with Nuxt 3, Cloudflare Workers, and Turso database.

### Architecture Alignment
- **Framework**: Nuxt 3 with Nitro server
- **Database**: Turso (SQLite at edge)
- **AI**: LangChain + OpenRouter (Qwen3 models)
- **Deployment**: Cloudflare Workers (unified platform)
- **Queue**: Cloudflare Queues
- **Storage**: Cloudflare R2 (if needed)

### MVP Scope
- Monitor and analyze your tweets for optimization
- Identify engagement opportunities in AI/networking space
- Generate contextual replies maintaining your voice
- Track growth attribution and ROI
- Simple approval workflow for all actions
- Cost-effective AI usage (<$0.05 per follower)

### Growth Targets
- **Monthly Follower Goal**: 500-1000 quality followers
- **Engagement Rate**: >5% on tweets
- **Cost Per Follower**: <$0.05 (AI costs)
- **Daily Actions**: 20-30 engagements
- **Response Time**: <200ms globally

## 2. Database Schema (Turso)

```sql
-- Twitter accounts monitoring
CREATE TABLE twitter_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tweet_count INTEGER DEFAULT 0,
  is_own_account BOOLEAN DEFAULT FALSE,
  is_competitor BOOLEAN DEFAULT FALSE,
  is_target_audience BOOLEAN DEFAULT FALSE,
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tweets storage and analysis
CREATE TABLE tweets (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  text TEXT NOT NULL,
  metrics JSON, -- {likes, retweets, replies, impressions}
  entities JSON, -- {hashtags, mentions, urls}
  ai_analysis JSON, -- {sentiment, topics, engagement_quality}
  created_at TIMESTAMP,
  analyzed_at TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES twitter_accounts(id)
);

-- Engagement opportunities
CREATE TABLE engagement_opportunities (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tweet_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  opportunity_type TEXT CHECK(opportunity_type IN ('reply', 'quote', 'follow')),
  relevance_score REAL,
  suggested_response TEXT,
  ai_model_used TEXT,
  ai_cost REAL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'executed')),
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tweet_id) REFERENCES tweets(id),
  FOREIGN KEY (account_id) REFERENCES twitter_accounts(id)
);

-- Growth metrics tracking
CREATE TABLE growth_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  followers_count INTEGER,
  following_count INTEGER,
  tweets_sent INTEGER,
  engagements_made INTEGER,
  impressions INTEGER,
  profile_visits INTEGER,
  ai_costs REAL,
  new_followers INTEGER,
  lost_followers INTEGER,
  engagement_rate REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice profile for consistent responses
CREATE TABLE voice_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  tone TEXT, -- professional, casual, friendly, etc.
  topics JSON, -- array of preferred topics
  vocabulary JSON, -- preferred words/phrases
  examples JSON, -- example tweets/responses
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_tweets_account ON tweets(account_id);
CREATE INDEX idx_tweets_created ON tweets(created_at DESC);
CREATE INDEX idx_opportunities_status ON engagement_opportunities(status);
CREATE INDEX idx_opportunities_created ON engagement_opportunities(created_at DESC);
CREATE INDEX idx_metrics_date ON growth_metrics(date DESC);
```

## 3. Nuxt 3 Server Routes

### 3.1 Twitter API Integration
```typescript
// server/api/twitter/profile/[username].get.ts
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')
  
  // Get from cache first
  const cached = await getCachedProfile(username)
  if (cached && !isStale(cached)) return cached
  
  // Fetch from Twitter API v2
  const profile = await $fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
    headers: {
      'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
    },
    params: {
      'user.fields': 'public_metrics,description,created_at'
    }
  })
  
  // Store in Turso
  await turso.execute({
    sql: `
      INSERT OR REPLACE INTO twitter_accounts 
      (id, username, display_name, bio, followers_count, following_count, tweet_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      profile.data.id,
      profile.data.username,
      profile.data.name,
      profile.data.description,
      profile.data.public_metrics.followers_count,
      profile.data.public_metrics.following_count,
      profile.data.public_metrics.tweet_count
    ]
  })
  
  // Cache for 5 minutes
  await setCachedProfile(username, profile, 300)
  
  return profile
})
```

### 3.2 AI-Powered Reply Generation
```typescript
// server/api/twitter/generate-reply.post.ts
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'

export default defineEventHandler(async (event) => {
  const { tweetId, tweetText, authorUsername } = await readBody(event)
  
  // Verify user is authenticated
  const user = await requireAuth(event)
  
  // Get voice profile
  const voiceProfile = await turso.execute({
    sql: 'SELECT * FROM voice_profiles WHERE is_active = TRUE LIMIT 1'
  })
  
  // Use OpenRouter with free-tier model when possible
  const model = new ChatOpenAI({
    modelName: 'qwen/qwen-2.5-7b-instruct-free',
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1'
    }
  })
  
  const prompt = PromptTemplate.fromTemplate(`
    You are managing a Twitter account for PingToPass, an IT certification exam platform.
    
    Voice Profile: {voiceProfile}
    
    Original Tweet: {tweetText}
    Author: @{authorUsername}
    
    Generate a helpful, engaging reply that:
    1. Adds value to the conversation
    2. Subtly mentions PingToPass if relevant
    3. Maintains our professional but friendly tone
    4. Is under 280 characters
    
    Reply:
  `)
  
  const chain = prompt.pipe(model)
  const response = await chain.invoke({
    voiceProfile: JSON.stringify(voiceProfile.rows[0]),
    tweetText,
    authorUsername
  })
  
  // Calculate cost (free tier = $0)
  const cost = 0 // Using free model
  
  // Store opportunity
  await turso.execute({
    sql: `
      INSERT INTO engagement_opportunities 
      (tweet_id, account_id, opportunity_type, suggested_response, ai_model_used, ai_cost)
      VALUES (?, ?, 'reply', ?, 'qwen-2.5-7b-free', ?)
    `,
    args: [tweetId, authorUsername, response.content, cost]
  })
  
  return {
    reply: response.content,
    cost,
    model: 'qwen-2.5-7b-free'
  }
})
```

### 3.3 Engagement Queue Management
```typescript
// server/api/twitter/opportunities/pending.get.ts
export default defineEventHandler(async (event) => {
  const { data } = await turso.execute({
    sql: `
      SELECT 
        o.*,
        t.text as tweet_text,
        a.username,
        a.display_name
      FROM engagement_opportunities o
      JOIN tweets t ON o.tweet_id = t.id
      JOIN twitter_accounts a ON o.account_id = a.id
      WHERE o.status = 'pending'
      ORDER BY o.relevance_score DESC, o.created_at DESC
      LIMIT 20
    `
  })
  
  return data
})

// server/api/twitter/opportunities/[id]/approve.post.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = await requireAuth(event)
  
  // Update status
  await turso.execute({
    sql: 'UPDATE engagement_opportunities SET status = "approved" WHERE id = ?',
    args: [id]
  })
  
  // Queue for execution
  await queueEngagement(id)
  
  return { success: true }
})
```

## 4. Integrated Twitter Automation (Within Nuxt Worker)

### 4.1 Scheduled Tweet Analysis (Cron Handler)
```typescript
// server/api/_cron.ts
export default defineEventHandler(async (event) => {
  // Verify cron trigger from Cloudflare
  const trigger = getHeader(event, 'x-cloudflare-cron')
  if (!trigger) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
  }
  
  async function analyzeTwitterAccounts() {
    
    // Get accounts to analyze
    const accounts = await env.DB.prepare(`
      SELECT * FROM twitter_accounts 
      WHERE is_target_audience = TRUE 
      AND (last_analyzed_at IS NULL OR last_analyzed_at < datetime('now', '-1 hour'))
      LIMIT 10
    `).all()
    
    for (const account of accounts.results) {
      // Fetch recent tweets
      const tweets = await fetchTwitterTimeline(account.username)
      
      // Analyze for engagement opportunities
      for (const tweet of tweets) {
        const relevance = await analyzeTweetRelevance(tweet, env)
        
        if (relevance.score > 0.7) {
          // Queue for reply generation
          await env.TWITTER_QUEUE.send({
            type: 'generate_reply',
            tweetId: tweet.id,
            accountId: account.id
          })
        }
      }
      
      // Update last analyzed timestamp
      await env.DB.prepare(
        'UPDATE twitter_accounts SET last_analyzed_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(account.id).run()
    }
  }
}
```

### 4.2 Queue Processing (Queue Consumer)
```typescript
// server/api/_queue.ts
export default defineEventHandler(async (event) => {
  // Handle queue messages from Cloudflare Queues
  if (event.node.req.method !== 'POST') {
    throw createError({ statusCode: 405 })
  }
  
  const batch = await readBody(event)
  const env = event.context.cloudflare?.env
  
  async function processQueue(batch: MessageBatch<TwitterTask>) {
    for (const message of batch.messages) {
      const task = message.body
      
      switch (task.type) {
        case 'generate_reply':
          // Call our Nuxt API to generate reply
          const response = await fetch(`${env.APP_URL}/api/twitter/generate-reply`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.INTERNAL_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tweetId: task.tweetId,
              accountId: task.accountId
            })
          })
          
          if (response.ok) {
            message.ack()
          } else {
            message.retry()
          }
          break
          
        case 'execute_engagement':
          // Execute approved engagement
          await executeTwitterAction(task, env)
          message.ack()
          break
      }
    }
  }
}
```

## 5. Vue Components for Dashboard

### 5.1 Twitter Dashboard
```vue
<!-- pages/admin/twitter.vue -->
<template>
  <div class="twitter-dashboard">
    <h1>Twitter Growth Dashboard</h1>
    
    <!-- Metrics Overview -->
    <TwitterMetrics :metrics="metrics" />
    
    <!-- Approval Queue -->
    <div class="approval-queue">
      <h2>Pending Engagements</h2>
      <EngagementCard
        v-for="opportunity in opportunities"
        :key="opportunity.id"
        :opportunity="opportunity"
        @approve="approveEngagement"
        @reject="rejectEngagement"
        @edit="editResponse"
      />
    </div>
    
    <!-- Cost Tracking -->
    <CostTracker :daily-limit="5.00" :current="todayCost" />
  </div>
</template>

<script setup lang="ts">
const { data: metrics } = await useFetch('/api/twitter/metrics/today')
const { data: opportunities } = await useFetch('/api/twitter/opportunities/pending')
const todayCost = computed(() => metrics.value?.ai_costs || 0)

async function approveEngagement(id: string) {
  await $fetch(`/api/twitter/opportunities/${id}/approve`, { method: 'POST' })
  await refreshNuxtData('opportunities')
}
</script>
```

## 6. Testing Strategy

### 6.1 Unit Tests
```typescript
// tests/unit/twitter/voice-analyzer.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeVoiceConsistency } from '~/server/utils/twitter/voice-analyzer'

describe('Voice Analyzer', () => {
  it('should maintain consistent tone across responses', () => {
    const profile = {
      tone: 'professional',
      topics: ['IT', 'certifications', 'networking']
    }
    
    const response = 'Great insight! This reminds me of CCNA subnetting concepts.'
    const score = analyzeVoiceConsistency(response, profile)
    
    expect(score).toBeGreaterThan(0.8)
  })
  
  it('should detect off-brand responses', () => {
    const profile = {
      tone: 'professional',
      topics: ['IT', 'certifications']
    }
    
    const response = 'LOL that\'s hilarious! 😂😂😂'
    const score = analyzeVoiceConsistency(response, profile)
    
    expect(score).toBeLessThan(0.5)
  })
})
```

### 6.2 Integration Tests
```typescript
// tests/integration/twitter/workflow.test.ts
import { describe, it, expect } from 'vitest'
import { $fetch } from '@nuxt/test-utils'

describe('Twitter Engagement Workflow', () => {
  it('should complete full engagement cycle', async () => {
    // 1. Analyze tweet
    const tweet = await $fetch('/api/twitter/analyze', {
      method: 'POST',
      body: { tweetId: 'test_tweet_123' }
    })
    
    expect(tweet.relevance_score).toBeDefined()
    
    // 2. Generate reply
    const reply = await $fetch('/api/twitter/generate-reply', {
      method: 'POST',
      body: { tweetId: 'test_tweet_123' }
    })
    
    expect(reply.cost).toBeLessThan(0.05)
    
    // 3. Approve engagement
    const approval = await $fetch(`/api/twitter/opportunities/${reply.id}/approve`, {
      method: 'POST'
    })
    
    expect(approval.success).toBe(true)
  })
})
```

## 7. Cost Optimization Strategy

### AI Model Selection
```typescript
// server/utils/twitter/model-selector.ts
export function selectOptimalModel(task: EngagementTask) {
  // Use free tier for simple tasks
  if (task.complexity === 'simple') {
    return {
      model: 'qwen/qwen-2.5-7b-instruct-free',
      cost: 0
    }
  }
  
  // Use cheap models for medium complexity
  if (task.complexity === 'medium') {
    return {
      model: 'mistral/mistral-7b-instruct',
      cost: 0.0002 // $0.20 per 1M tokens
    }
  }
  
  // Reserve expensive models for high-value targets
  return {
    model: 'anthropic/claude-3-haiku',
    cost: 0.0008
  }
}
```

### Caching Strategy
- Cache Twitter profiles for 24 hours
- Cache tweet analyses for 7 days
- Cache generated responses for reuse
- Use Cloudflare KV for edge caching

## 8. Deployment Configuration

### wrangler.toml (Main Configuration)
```toml
name = "pingtopass"
main = ".output/server/index.mjs"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Queues for Twitter automation
[[queues.producers]]
queue = "twitter-tasks"
binding = "TWITTER_QUEUE"

[[queues.consumers]]
queue = "twitter-tasks"
max_batch_size = 10
max_batch_timeout = 30

# Cron triggers for scheduled tasks
[triggers]
crons = ["0 * * * *"]  # Every hour

[vars]
APP_URL = "https://pingtopass.com"

[env.production.vars]
OPENROUTER_API_KEY = "@OPENROUTER_API_KEY"
TWITTER_BEARER_TOKEN = "@TWITTER_BEARER_TOKEN"
```

## 9. Monitoring & Analytics

### Key Metrics to Track
- **Growth Rate**: New followers per day/week/month
- **Engagement Rate**: Likes + Retweets / Impressions
- **Cost Per Follower**: Total AI costs / New followers
- **Response Quality**: Approval rate of generated content
- **ROI**: New PingToPass signups from Twitter / Costs

### Dashboard Queries
```sql
-- Daily growth summary
SELECT 
  date,
  new_followers,
  engagements_made,
  ai_costs,
  ROUND(ai_costs / NULLIF(new_followers, 0), 4) as cost_per_follower
FROM growth_metrics
WHERE date >= date('now', '-30 days')
ORDER BY date DESC;

-- Top performing content
SELECT 
  t.text,
  t.metrics->>'$.likes' as likes,
  t.metrics->>'$.retweets' as retweets,
  a.username
FROM tweets t
JOIN twitter_accounts a ON t.account_id = a.id
WHERE a.is_own_account = TRUE
ORDER BY CAST(t.metrics->>'$.likes' AS INTEGER) DESC
LIMIT 10;
```

## 10. Future Enhancements

### Phase 2 Features
- Multi-account management
- A/B testing for responses
- Sentiment analysis for brand mentions
- Competitor monitoring dashboard
- Automated thread creation

### Phase 3 Features
- Influencer identification
- Campaign tracking
- Twitter Spaces scheduling
- DM automation (with consent)
- Integration with email campaigns

## Success Metrics

### Month 1 Goals
- [ ] 100-200 new quality followers
- [ ] <$0.10 cost per follower (learning phase)
- [ ] 50% approval rate on generated content
- [ ] 5% engagement rate on tweets

### Month 3 Goals
- [ ] 500+ new quality followers/month
- [ ] <$0.05 cost per follower
- [ ] 80% approval rate on generated content
- [ ] 7%+ engagement rate on tweets
- [ ] 10+ PingToPass signups attributed to Twitter