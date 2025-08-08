// Complete Drizzle ORM Schema for PingToPass Platform
// Optimized for Turso (SQLite at the edge) with full TypeScript integration

export * from './users'
export * from './exams'
export * from './objectives'
export * from './questions'
export * from './study-sessions'
export * from './test-attempts'
export * from './user-answers'
export * from './user-progress'
export * from './twitter'
export * from './audit'
export * from './types'

// Re-export all relations for drizzle configuration
import { usersRelations } from './users'
import { examsRelations } from './exams'
import { objectivesRelations } from './objectives'
import { questionsRelations } from './questions'
import { studySessionsRelations } from './study-sessions'
import { testAttemptsRelations } from './test-attempts'
import { userAnswersRelations } from './user-answers'
import { userProgressRelations } from './user-progress'
import { twitterRelations } from './twitter'

export const relations = {
  usersRelations,
  examsRelations,
  objectivesRelations,
  questionsRelations,
  studySessionsRelations,
  testAttemptsRelations,
  userAnswersRelations,
  userProgressRelations,
  twitterRelations
}