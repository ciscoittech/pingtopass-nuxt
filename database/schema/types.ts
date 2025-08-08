// TypeScript type definitions for database schema
// Ensures full type safety across the application

export type Provider = 'google' | 'email'
export type UserRole = 'user' | 'admin' | 'moderator'
export type SubscriptionStatus = 'free' | 'premium' | 'enterprise'

export type QuestionType = 'multiple_choice' | 'multi_select' | 'true_false' | 'drag_drop' | 'hotspot'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision'

export type StudyMode = 'practice' | 'review' | 'speed_drill' | 'weak_areas' | 'custom'
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'
export type TestStatus = 'in_progress' | 'completed' | 'abandoned' | 'invalidated'

export type OpportunityType = 'reply' | 'quote' | 'follow'
export type OpportunityStatus = 'pending' | 'approved' | 'rejected' | 'executed'

export interface QuestionAnswer {
  id: string
  text: string
  isCorrect: boolean
  explanation?: string
}

export interface TweetMetrics {
  likes: number
  retweets: number
  replies: number
  impressions?: number
  engagements?: number
}

export interface TweetEntities {
  hashtags: string[]
  mentions: string[]
  urls: string[]
}

export interface AIAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral'
  topics: string[]
  engagementQuality: number
  relevanceScore?: number
}

export interface ObjectiveScore {
  [objectiveId: string]: number
}

export interface ObjectiveMastery {
  [objectiveId: string]: {
    level: number
    questionsAnswered: number
    lastStudied?: Date
  }
}

export interface ObjectiveBreakdown {
  [objectiveId: string]: {
    correct: number
    total: number
    percentage: number
  }
}

export interface DifficultyFilter {
  min: number
  max: number
}

export interface VoiceProfile {
  tone: string
  topics: string[]
  vocabulary: string[]
  examples: string[]
}