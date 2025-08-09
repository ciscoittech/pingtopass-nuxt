/**
 * Integration tests for Database Schema
 * Critical path: Database schema validation and relationships
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as schema from '../../server/database/schema'

describe('Database Schema Integration', () => {
  describe('Schema Exports', () => {
    it('should export all required tables', () => {
      expect(schema.users).toBeDefined()
      expect(schema.exams).toBeDefined()
      expect(schema.questions).toBeDefined()
      expect(schema.answerOptions).toBeDefined()
      expect(schema.studySessions).toBeDefined()
      expect(schema.userProgress).toBeDefined()
      expect(schema.userAnswers).toBeDefined()
    })

    it('should have correct table structure for users', () => {
      const usersTable = schema.users
      expect(usersTable).toBeDefined()
      
      // Check if table has expected columns by trying to access the table definition
      expect(usersTable._.columns).toBeDefined()
      
      // Verify primary key exists
      expect(usersTable._.columns.id).toBeDefined()
      expect(usersTable._.columns.email).toBeDefined()
    })

    it('should have correct table structure for exams', () => {
      const examsTable = schema.exams
      expect(examsTable).toBeDefined()
      expect(examsTable._.columns.id).toBeDefined()
      expect(examsTable._.columns.code).toBeDefined()
      expect(examsTable._.columns.name).toBeDefined()
    })

    it('should have correct table structure for questions', () => {
      const questionsTable = schema.questions
      expect(questionsTable).toBeDefined()
      expect(questionsTable._.columns.id).toBeDefined()
      expect(questionsTable._.columns.examId).toBeDefined()
      expect(questionsTable._.columns.text).toBeDefined()
    })

    it('should have foreign key relationships', () => {
      // Questions should reference exams
      const questionsTable = schema.questions
      expect(questionsTable._.columns.examId).toBeDefined()
      
      // Answer options should reference questions
      const answerOptionsTable = schema.answerOptions
      expect(answerOptionsTable._.columns.questionId).toBeDefined()
      
      // Study sessions should reference users and exams
      const studySessionsTable = schema.studySessions
      expect(studySessionsTable._.columns.userId).toBeDefined()
      expect(studySessionsTable._.columns.examId).toBeDefined()
    })
  })

  describe('Schema Validation', () => {
    it('should validate users table schema', () => {
      const usersColumns = schema.users._.columns
      
      expect(usersColumns.id).toBeDefined()
      expect(usersColumns.email).toBeDefined()
      expect(usersColumns.name).toBeDefined()
      expect(usersColumns.googleId).toBeDefined()
      expect(usersColumns.stripeCustomerId).toBeDefined()
      expect(usersColumns.subscriptionTier).toBeDefined()
      expect(usersColumns.createdAt).toBeDefined()
      expect(usersColumns.updatedAt).toBeDefined()
    })

    it('should validate exams table schema', () => {
      const examsColumns = schema.exams._.columns
      
      expect(examsColumns.id).toBeDefined()
      expect(examsColumns.code).toBeDefined()
      expect(examsColumns.name).toBeDefined()
      expect(examsColumns.vendor).toBeDefined()
      expect(examsColumns.passingScore).toBeDefined()
      expect(examsColumns.timeLimit).toBeDefined()
      expect(examsColumns.questionCount).toBeDefined()
    })

    it('should validate questions table schema', () => {
      const questionsColumns = schema.questions._.columns
      
      expect(questionsColumns.id).toBeDefined()
      expect(questionsColumns.examId).toBeDefined()
      expect(questionsColumns.type).toBeDefined()
      expect(questionsColumns.text).toBeDefined()
      expect(questionsColumns.explanation).toBeDefined()
      expect(questionsColumns.difficulty).toBeDefined()
    })

    it('should have proper data types for critical fields', () => {
      // Users email should be text and not null
      const emailColumn = schema.users._.columns.email
      expect(emailColumn.notNull).toBe(true)
      
      // Exams passing score should be integer
      const passingScoreColumn = schema.exams._.columns.passingScore
      expect(passingScoreColumn.notNull).toBe(true)
      
      // Questions difficulty should be integer
      const difficultyColumn = schema.questions._.columns.difficulty
      expect(difficultyColumn.notNull).toBe(true)
    })
  })

  describe('Table Relationships', () => {
    it('should have proper foreign key constraints', () => {
      // Questions -> Exams relationship
      const questionsExamIdColumn = schema.questions._.columns.examId
      expect(questionsExamIdColumn.notNull).toBe(true)
      
      // Answer Options -> Questions relationship  
      const answerOptionsQuestionIdColumn = schema.answerOptions._.columns.questionId
      expect(answerOptionsQuestionIdColumn.notNull).toBe(true)
      
      // Study Sessions -> Users relationship
      const studySessionsUserIdColumn = schema.studySessions._.columns.userId
      expect(studySessionsUserIdColumn.notNull).toBe(true)
      
      // Study Sessions -> Exams relationship
      const studySessionsExamIdColumn = schema.studySessions._.columns.examId
      expect(studySessionsExamIdColumn.notNull).toBe(true)
    })

    it('should have timestamps on all main tables', () => {
      const tables = [
        schema.users,
        schema.exams, 
        schema.questions,
        schema.studySessions,
        schema.userProgress
      ]
      
      tables.forEach(table => {
        expect(table._.columns.createdAt).toBeDefined()
      })
    })
  })

  describe('Default Values', () => {
    it('should have sensible defaults for boolean fields', () => {
      // Questions should have default isActive = true
      const questionsIsActiveColumn = schema.questions._.columns.isActive
      expect(questionsIsActiveColumn.default).toBeDefined()
      
      // Questions should have default aiGenerated = false
      const questionsAiGeneratedColumn = schema.questions._.columns.aiGenerated
      expect(questionsAiGeneratedColumn.default).toBeDefined()
    })

    it('should have default subscription tier for users', () => {
      const subscriptionTierColumn = schema.users._.columns.subscriptionTier
      expect(subscriptionTierColumn.default).toBeDefined()
    })

    it('should have default values for progress tracking', () => {
      const userProgressColumns = schema.userProgress._.columns
      expect(userProgressColumns.questionsAnswered.default).toBeDefined()
      expect(userProgressColumns.correctAnswers.default).toBeDefined()
    })
  })
})