// Study queries comprehensive test suite
// Tests core learning functionality with performance benchmarks

import { describe, it, expect, beforeEach } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { 
  setupTestDatabase, 
  seedTestData, 
  PerformanceBenchmark,
  createTestUser,
  createTestStudySession 
} from './setup'
import { createQueries } from '~/database/utils/queries'
import * as schema from '~/database/schema'

const dbWrapper = setupTestDatabase()
let testData: Awaited<ReturnType<typeof seedTestData>>
let queries: ReturnType<typeof createQueries>

describe('Study Queries Performance & Functionality', () => {
  beforeEach(async () => {
    testData = await seedTestData(dbWrapper.db)
    queries = createQueries(dbWrapper.db)
  })

  describe('getStudyQuestions', () => {
    it('should retrieve questions within performance threshold', async () => {
      const benchmark = new PerformanceBenchmark()
      
      // Test different scenarios
      const scenarios = [
        { name: 'Basic practice mode', params: { mode: 'practice' as const, limit: 20 } },
        { name: 'Weak areas mode', params: { mode: 'weak_areas' as const, limit: 15 } },
        { name: 'Speed drill mode', params: { mode: 'speed_drill' as const, limit: 30 } },
        { name: 'Difficulty filtered', params: { difficulty: { min: 3, max: 5 }, limit: 10 } }
      ]

      for (const scenario of scenarios) {
        benchmark.start()
        
        const questions = await queries.study.getStudyQuestions({
          userId: testData.user.id,
          examId: testData.exam.id,
          ...scenario.params
        })
        
        const duration = benchmark.end()
        
        // Performance assertion: <50ms for question retrieval
        expect(duration).toBeLessThan(50)
        expect(questions.length).toBeGreaterThan(0)
        expect(questions.length).toBeLessThanOrEqual(scenario.params.limit)
        
        // Verify question structure
        questions.forEach(q => {
          expect(q).toMatchObject({
            id: expect.any(Number),
            text: expect.any(String),
            answers: expect.any(Array),
            difficulty: expect.any(Number)
          })
        })
      }

      console.log(`Average query time: ${benchmark.getAverage().toFixed(2)}ms`)
      console.log(`Max query time: ${benchmark.getMax().toFixed(2)}ms`)
    })

    it('should exclude recently seen questions', async () => {
      // Create a study session and answer some questions
      const [session] = await dbWrapper.db.insert(schema.studySessions)
        .values(createTestStudySession(testData.user.id, testData.exam.id))
        .returning()

      const questionsToAnswer = testData.questions.slice(0, 5)
      
      // Record answers for these questions
      for (const question of questionsToAnswer) {
        await dbWrapper.db.insert(schema.userAnswers).values({
          userId: testData.user.id,
          questionId: question.id,
          studySessionId: session.id,
          selectedAnswer: 'a',
          isCorrect: true,
          timeSpentSeconds: 45
        })
      }

      // Get new study questions - should exclude recently answered ones
      const newQuestions = await queries.study.getStudyQuestions({
        userId: testData.user.id,
        examId: testData.exam.id,
        excludeRecentHours: 24,
        limit: 20
      })

      // Verify excluded questions don't appear
      const newQuestionIds = newQuestions.map(q => q.id)
      const answeredIds = questionsToAnswer.map(q => q.id)
      
      for (const answeredId of answeredIds) {
        expect(newQuestionIds).not.toContain(answeredId)
      }
    })

    it('should filter by objectives correctly', async () => {
      const targetObjective = testData.objectives[0]
      
      const questions = await queries.study.getStudyQuestions({
        userId: testData.user.id,
        examId: testData.exam.id,
        objectiveIds: [targetObjective.id],
        limit: 20
      })

      // All questions should belong to the target objective
      questions.forEach(q => {
        expect(q.objectiveId).toBe(targetObjective.id)
      })
    })

    it('should respect difficulty filtering', async () => {
      const questions = await queries.study.getStudyQuestions({
        userId: testData.user.id,
        examId: testData.exam.id,
        difficulty: { min: 3, max: 4 },
        limit: 20
      })

      // All questions should be within difficulty range
      questions.forEach(q => {
        expect(q.difficulty).toBeGreaterThanOrEqual(3)
        expect(q.difficulty).toBeLessThanOrEqual(4)
      })
    })
  })

  describe('recordAnswer', () => {
    it('should record answer and update question statistics atomically', async () => {
      const question = testData.questions[0]
      const initialAttempts = question.totalAttempts
      const initialCorrect = question.correctAttempts
      
      const benchmark = new PerformanceBenchmark()
      benchmark.start()

      // Record a correct answer
      await queries.study.recordAnswer({
        userId: testData.user.id,
        questionId: question.id,
        selectedAnswer: 'a',
        isCorrect: true,
        timeSpentSeconds: 45,
        confidenceLevel: 4
      })

      const duration = benchmark.end()
      
      // Performance check: <100ms for answer recording
      expect(duration).toBeLessThan(100)

      // Verify user answer was recorded
      const userAnswers = await dbWrapper.db.select()
        .from(schema.userAnswers)
        .where(
          and(
            eq(schema.userAnswers.userId, testData.user.id),
            eq(schema.userAnswers.questionId, question.id)
          )
        )
      
      expect(userAnswers).toHaveLength(1)
      expect(userAnswers[0]).toMatchObject({
        selectedAnswer: 'a',
        isCorrect: true,
        timeSpentSeconds: 45,
        confidenceLevel: 4
      })

      // Verify question statistics were updated
      const [updatedQuestion] = await dbWrapper.db.select()
        .from(schema.questions)
        .where(eq(schema.questions.id, question.id))
      
      expect(updatedQuestion.totalAttempts).toBe(initialAttempts + 1)
      expect(updatedQuestion.correctAttempts).toBe(initialCorrect + 1)
      expect(updatedQuestion.avgTimeSeconds).toBeGreaterThan(0)
    })

    it('should handle incorrect answers properly', async () => {
      const question = testData.questions[0]
      const initialCorrect = question.correctAttempts

      await queries.study.recordAnswer({
        userId: testData.user.id,
        questionId: question.id,
        selectedAnswer: 'b',
        isCorrect: false,
        timeSpentSeconds: 60
      })

      // Verify correct attempts didn't increase
      const [updatedQuestion] = await dbWrapper.db.select()
        .from(schema.questions)
        .where(eq(schema.questions.id, question.id))
      
      expect(updatedQuestion.correctAttempts).toBe(initialCorrect)
      expect(updatedQuestion.totalAttempts).toBe(question.totalAttempts + 1)
    })

    it('should maintain data integrity on concurrent operations', async () => {
      const question = testData.questions[0]
      
      // Simulate concurrent answer submissions
      const promises = Array.from({ length: 5 }, (_, i) => 
        queries.study.recordAnswer({
          userId: testData.user.id,
          questionId: question.id,
          selectedAnswer: 'a',
          isCorrect: i % 2 === 0, // Alternating correct/incorrect
          timeSpentSeconds: 30 + i * 5
        })
      )

      await Promise.all(promises)

      // Verify all answers were recorded
      const userAnswers = await dbWrapper.db.select()
        .from(schema.userAnswers)
        .where(
          and(
            eq(schema.userAnswers.userId, testData.user.id),
            eq(schema.userAnswers.questionId, question.id)
          )
        )
      
      expect(userAnswers).toHaveLength(5)

      // Verify question statistics are correct
      const [updatedQuestion] = await dbWrapper.db.select()
        .from(schema.questions)
        .where(eq(schema.questions.id, question.id))
      
      expect(updatedQuestion.totalAttempts).toBe(question.totalAttempts + 5)
      expect(updatedQuestion.correctAttempts).toBe(question.correctAttempts + 3) // 3 correct out of 5
    })
  })

  describe('updateSessionProgress', () => {
    it('should calculate session metrics correctly', async () => {
      // Create session
      const [session] = await dbWrapper.db.insert(schema.studySessions)
        .values(createTestStudySession(testData.user.id, testData.exam.id))
        .returning()

      // Record several answers
      const answers = [
        { questionId: testData.questions[0].id, isCorrect: true, time: 30 },
        { questionId: testData.questions[1].id, isCorrect: true, time: 45 },
        { questionId: testData.questions[2].id, isCorrect: false, time: 60 },
        { questionId: testData.questions[3].id, isCorrect: true, time: 25 }
      ]

      for (const answer of answers) {
        await dbWrapper.db.insert(schema.userAnswers).values({
          userId: testData.user.id,
          questionId: answer.questionId,
          studySessionId: session.id,
          selectedAnswer: 'a',
          isCorrect: answer.isCorrect,
          timeSpentSeconds: answer.time
        })
      }

      const benchmark = new PerformanceBenchmark()
      benchmark.start()

      // Update session progress
      const updatedSession = await queries.study.updateSessionProgress(session.id)
      
      const duration = benchmark.end()
      expect(duration).toBeLessThan(150) // <150ms for session update

      expect(updatedSession).toBeDefined()
      expect(updatedSession!.totalQuestions).toBe(4)
      expect(updatedSession!.correctAnswers).toBe(3)
      expect(updatedSession!.accuracy).toBe(0.75)
      expect(updatedSession!.avgTimePerQuestion).toBe(40) // (30+45+60+25)/4
    })

    it('should calculate objective scores accurately', async () => {
      const [session] = await dbWrapper.db.insert(schema.studySessions)
        .values(createTestStudySession(testData.user.id, testData.exam.id))
        .returning()

      // Answer questions from different objectives
      const obj1Questions = testData.questions.filter(q => q.objectiveId === testData.objectives[0].id).slice(0, 3)
      const obj2Questions = testData.questions.filter(q => q.objectiveId === testData.objectives[1].id).slice(0, 2)

      // Objective 1: 2/3 correct
      await dbWrapper.db.insert(schema.userAnswers).values([
        { userId: testData.user.id, questionId: obj1Questions[0].id, studySessionId: session.id, selectedAnswer: 'a', isCorrect: true, timeSpentSeconds: 30 },
        { userId: testData.user.id, questionId: obj1Questions[1].id, studySessionId: session.id, selectedAnswer: 'a', isCorrect: true, timeSpentSeconds: 35 },
        { userId: testData.user.id, questionId: obj1Questions[2].id, studySessionId: session.id, selectedAnswer: 'b', isCorrect: false, timeSpentSeconds: 40 }
      ])

      // Objective 2: 1/2 correct  
      await dbWrapper.db.insert(schema.userAnswers).values([
        { userId: testData.user.id, questionId: obj2Questions[0].id, studySessionId: session.id, selectedAnswer: 'a', isCorrect: true, timeSpentSeconds: 25 },
        { userId: testData.user.id, questionId: obj2Questions[1].id, studySessionId: session.id, selectedAnswer: 'c', isCorrect: false, timeSpentSeconds: 50 }
      ])

      const updatedSession = await queries.study.updateSessionProgress(session.id)

      expect(updatedSession!.objectiveScores).toBeDefined()
      const scores = updatedSession!.objectiveScores as Record<string, number>
      
      expect(scores[String(testData.objectives[0].id)]).toBeCloseTo(2/3, 2)
      expect(scores[String(testData.objectives[1].id)]).toBe(0.5)
    })
  })

  describe('Performance Stress Tests', () => {
    it('should handle large question sets efficiently', async () => {
      // Create additional questions for stress testing
      const largeQuestionSet = Array.from({ length: 500 }, (_, i) => ({
        examId: testData.exam.id,
        objectiveId: testData.objectives[i % 3].id,
        text: `Stress test question ${i}`,
        type: 'multiple_choice' as const,
        answers: [
          { id: 'a', text: 'Answer A', isCorrect: true },
          { id: 'b', text: 'Answer B', isCorrect: false }
        ],
        difficulty: (i % 5) + 1,
        isActive: true,
        reviewStatus: 'approved' as const
      }))

      await dbWrapper.db.insert(schema.questions).values(largeQuestionSet)

      const benchmark = new PerformanceBenchmark()
      
      // Test multiple query patterns
      for (let i = 0; i < 10; i++) {
        benchmark.start()
        
        const questions = await queries.study.getStudyQuestions({
          userId: testData.user.id,
          examId: testData.exam.id,
          limit: 50
        })
        
        benchmark.end()
        expect(questions.length).toBe(50)
      }

      // Verify performance remains good with large dataset
      expect(benchmark.getAverage()).toBeLessThan(100) // <100ms average
      expect(benchmark.getMax()).toBeLessThan(200) // <200ms max
    })

    it('should maintain performance with many user answers', async () => {
      // Simulate user with extensive answer history
      const manyAnswers = Array.from({ length: 1000 }, (_, i) => ({
        userId: testData.user.id,
        questionId: testData.questions[i % testData.questions.length].id,
        selectedAnswer: 'a',
        isCorrect: Math.random() > 0.3, // ~70% correct rate
        timeSpentSeconds: Math.floor(Math.random() * 120) + 15,
        answeredAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random dates in last 30 days
      }))

      await dbWrapper.db.insert(schema.userAnswers).values(manyAnswers)

      const benchmark = new PerformanceBenchmark()
      benchmark.start()

      // Query should still be fast even with extensive history
      const questions = await queries.study.getStudyQuestions({
        userId: testData.user.id,
        examId: testData.exam.id,
        excludeRecentHours: 24,
        limit: 20
      })

      const duration = benchmark.end()
      
      expect(duration).toBeLessThan(100) // Should still be under 100ms
      expect(questions.length).toBeGreaterThan(0)
    })
  })
})