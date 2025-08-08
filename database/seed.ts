#!/usr/bin/env tsx
/**
 * Database Seeding System for PingToPass
 * Environment-aware seeding with comprehensive test data
 * Supports development, staging, and test environments
 */

import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { setDatabaseEnvironment, getDB, type DatabaseEnvironment } from '../server/utils/db'

// Load environment variables
config()

interface SeedOptions {
  environment?: DatabaseEnvironment
  force?: boolean
  verbose?: boolean
}

class DatabaseSeeder {
  private db: any
  private environment: DatabaseEnvironment

  constructor(environment: DatabaseEnvironment = 'development') {
    this.environment = environment
  }

  /**
   * Initialize seeder with database connection
   */
  async initialize() {
    setDatabaseEnvironment(this.environment)
    this.db = getDB()
  }

  /**
   * Check if database has been seeded
   */
  private async isSeeded(): Promise<boolean> {
    try {
      const result = await this.db.execute('SELECT COUNT(*) as count FROM users')
      return result.rows[0]?.count > 0
    } catch (error) {
      console.warn('⚠️ Could not check seed status:', error.message)
      return false
    }
  }

  /**
   * Clear all data from tables
   */
  private async clearData() {
    console.log('🧹 Clearing existing data...')
    
    // Disable foreign key constraints temporarily
    await this.db.execute('PRAGMA foreign_keys = OFF')
    
    const tables = [
      'user_progress', 'user_answers', 'test_attempts', 'study_sessions',
      'questions', 'objectives', 'exams', 'users'
    ]
    
    for (const table of tables) {
      await this.db.execute(`DELETE FROM ${table}`)
    }
    
    // Re-enable foreign key constraints
    await this.db.execute('PRAGMA foreign_keys = ON')
  }

  /**
   * Seed users with different roles and subscription levels
   */
  private async seedUsers() {
    console.log('👥 Seeding users...')
    
    const users = [
      // Admin user
      {
        email: 'admin@pingtopass.com',
        name: 'PingToPass Admin',
        role: 'admin',
        subscription_status: 'premium',
        email_verified: 1,
        is_active: 1
      },
      // Test users for development
      {
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        subscription_status: 'free',
        email_verified: 1,
        is_active: 1
      },
      {
        email: 'premium@example.com',
        name: 'Premium User',
        role: 'user',
        subscription_status: 'premium',
        email_verified: 1,
        is_active: 1,
        stripe_customer_id: 'cus_test_premium'
      },
      // Moderator for content review
      {
        email: 'moderator@pingtopass.com',
        name: 'Content Moderator',
        role: 'moderator',
        subscription_status: 'premium',
        email_verified: 1,
        is_active: 1
      }
    ]

    for (const user of users) {
      await this.db.execute({
        sql: `INSERT INTO users (email, name, role, subscription_status, email_verified, is_active, stripe_customer_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          user.email, user.name, user.role, user.subscription_status,
          user.email_verified, user.is_active, user.stripe_customer_id || null
        ]
      })
    }

    console.log(`✅ Seeded ${users.length} users`)
  }

  /**
   * Seed exam definitions
   */
  private async seedExams() {
    console.log('📚 Seeding exams...')
    
    const exams = [
      {
        vendor_id: 'comptia',
        code: 'N10-008',
        name: 'CompTIA Network+',
        description: 'Validates the knowledge and skills needed to troubleshoot, configure, and manage networks',
        passing_score: 0.72,
        question_count: 90,
        time_limit_minutes: 90,
        difficulty_level: 3,
        is_active: 1
      },
      {
        vendor_id: 'comptia',
        code: 'SY0-601',
        name: 'CompTIA Security+',
        description: 'Validates baseline cybersecurity skills and best practices',
        passing_score: 0.75,
        question_count: 90,
        time_limit_minutes: 90,
        difficulty_level: 3,
        is_active: 1
      },
      {
        vendor_id: 'cisco',
        code: 'CCNA',
        name: 'Cisco Certified Network Associate',
        description: 'Validates networking fundamentals and modern network solutions',
        passing_score: 0.825,
        question_count: 120,
        time_limit_minutes: 120,
        difficulty_level: 4,
        is_active: 1
      }
    ]

    for (const exam of exams) {
      const result = await this.db.execute({
        sql: `INSERT INTO exams (vendor_id, code, name, description, passing_score, question_count, time_limit_minutes, difficulty_level, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              RETURNING id`,
        args: [
          exam.vendor_id, exam.code, exam.name, exam.description,
          exam.passing_score, exam.question_count, exam.time_limit_minutes,
          exam.difficulty_level, exam.is_active
        ]
      })

      // Store exam ID for objective seeding
      exam['id'] = result.rows[0].id
    }

    console.log(`✅ Seeded ${exams.length} exams`)
    return exams
  }

  /**
   * Seed exam objectives
   */
  private async seedObjectives(exams: any[]) {
    console.log('🎯 Seeding objectives...')
    
    // Network+ objectives
    const networkPlusExam = exams.find(e => e.code === 'N10-008')
    if (networkPlusExam) {
      const objectives = [
        { code: '1.0', name: 'Networking Fundamentals', weight: 0.24 },
        { code: '2.0', name: 'Network Implementations', weight: 0.19 },
        { code: '3.0', name: 'Network Operations', weight: 0.20 },
        { code: '4.0', name: 'Network Security', weight: 0.19 },
        { code: '5.0', name: 'Network Troubleshooting', weight: 0.18 }
      ]

      for (const obj of objectives) {
        await this.db.execute({
          sql: `INSERT INTO objectives (exam_id, code, name, weight, is_active)
                VALUES (?, ?, ?, ?, 1)`,
          args: [networkPlusExam.id, obj.code, obj.name, obj.weight]
        })
      }
    }

    // Security+ objectives
    const securityPlusExam = exams.find(e => e.code === 'SY0-601')
    if (securityPlusExam) {
      const objectives = [
        { code: '1.0', name: 'Attacks, Threats, and Vulnerabilities', weight: 0.24 },
        { code: '2.0', name: 'Architecture and Design', weight: 0.21 },
        { code: '3.0', name: 'Implementation', weight: 0.25 },
        { code: '4.0', name: 'Operations and Incident Response', weight: 0.16 },
        { code: '5.0', name: 'Governance, Risk, and Compliance', weight: 0.14 }
      ]

      for (const obj of objectives) {
        await this.db.execute({
          sql: `INSERT INTO objectives (exam_id, code, name, weight, is_active)
                VALUES (?, ?, ?, ?, 1)`,
          args: [securityPlusExam.id, obj.code, obj.name, obj.weight]
        })
      }
    }

    console.log('✅ Seeded exam objectives')
  }

  /**
   * Seed sample questions for testing
   */
  private async seedQuestions(exams: any[]) {
    console.log('❓ Seeding sample questions...')
    
    // Get objectives for question seeding
    const objectivesResult = await this.db.execute('SELECT * FROM objectives')
    const objectives = objectivesResult.rows

    let questionCount = 0
    
    for (const exam of exams) {
      const examObjectives = objectives.filter(obj => obj.exam_id === exam.id)
      
      // Create sample questions for each objective
      for (const objective of examObjectives.slice(0, 3)) { // Limit for development
        const sampleQuestions = this.generateSampleQuestions(exam, objective)
        
        for (const question of sampleQuestions) {
          await this.db.execute({
            sql: `INSERT INTO questions (exam_id, objective_id, text, type, answers, explanation, difficulty, review_status, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [
              exam.id, objective.id, question.text, question.type,
              JSON.stringify(question.answers), question.explanation,
              question.difficulty, 'approved'
            ]
          })
          questionCount++
        }
      }
    }

    console.log(`✅ Seeded ${questionCount} sample questions`)
  }

  /**
   * Generate sample questions for an exam/objective
   */
  private generateSampleQuestions(exam: any, objective: any) {
    const baseQuestions = [
      {
        text: `Which protocol is primarily used for ${objective.name.toLowerCase()} in modern networks?`,
        type: 'multiple_choice',
        answers: [
          { id: 'a', text: 'TCP', is_correct: false },
          { id: 'b', text: 'HTTP', is_correct: true },
          { id: 'c', text: 'FTP', is_correct: false },
          { id: 'd', text: 'SMTP', is_correct: false }
        ],
        explanation: `This question tests understanding of ${objective.name}. The correct answer demonstrates knowledge of protocol usage.`,
        difficulty: 2
      },
      {
        text: `What is the primary concern when implementing ${objective.name.toLowerCase()}?`,
        type: 'multiple_choice',
        answers: [
          { id: 'a', text: 'Cost', is_correct: false },
          { id: 'b', text: 'Security', is_correct: true },
          { id: 'c', text: 'Speed', is_correct: false },
          { id: 'd', text: 'Compatibility', is_correct: false }
        ],
        explanation: `Security is typically the primary concern when implementing ${objective.name}.`,
        difficulty: 3
      },
      {
        text: `True or False: ${objective.name} is essential for ${exam.name}?`,
        type: 'true_false',
        answers: [
          { id: 'true', text: 'True', is_correct: true },
          { id: 'false', text: 'False', is_correct: false }
        ],
        explanation: `${objective.name} is indeed essential for ${exam.name} certification.`,
        difficulty: 1
      }
    ]

    return baseQuestions
  }

  /**
   * Seed development/test-specific data
   */
  private async seedDevelopmentData() {
    if (this.environment !== 'development' && this.environment !== 'test') {
      return
    }

    console.log('🛠️ Seeding development data...')

    // Create sample study session
    await this.db.execute({
      sql: `INSERT INTO study_sessions (user_id, exam_id, mode, status, total_questions, correct_answers, accuracy)
            VALUES (2, 1, 'practice', 'completed', 10, 7, 0.7)`,
      args: []
    })

    // Create sample user progress
    await this.db.execute({
      sql: `INSERT INTO user_progress (user_id, exam_id, total_questions_seen, total_correct, overall_accuracy, readiness_score)
            VALUES (2, 1, 50, 35, 0.70, 0.72)`,
      args: []
    })

    console.log('✅ Seeded development data')
  }

  /**
   * Main seeding method
   */
  async seed(options: SeedOptions = {}) {
    console.log(`🌱 Seeding database for ${this.environment} environment...`)
    
    // Check if already seeded
    if (!options.force && await this.isSeeded()) {
      console.log('⏭️ Database already seeded. Use --force to re-seed.')
      return
    }

    try {
      // Clear existing data if force is specified
      if (options.force) {
        await this.clearData()
      }

      // Seed core data
      await this.seedUsers()
      const exams = await this.seedExams()
      await this.seedObjectives(exams)
      await this.seedQuestions(exams)

      // Seed environment-specific data
      await this.seedDevelopmentData()

      console.log('🎉 Database seeding completed successfully!')

      // Show summary
      await this.showSeedSummary()

    } catch (error) {
      console.error('❌ Seeding failed:', error.message)
      if (options.verbose) {
        console.error(error.stack)
      }
      process.exit(1)
    }
  }

  /**
   * Show seeding summary
   */
  private async showSeedSummary() {
    const stats = await Promise.all([
      this.db.execute('SELECT COUNT(*) as count FROM users'),
      this.db.execute('SELECT COUNT(*) as count FROM exams'),
      this.db.execute('SELECT COUNT(*) as count FROM objectives'),
      this.db.execute('SELECT COUNT(*) as count FROM questions'),
      this.db.execute('SELECT COUNT(*) as count FROM study_sessions')
    ])

    console.log('\n📊 Seeding Summary:')
    console.log('===================')
    console.log(`Users: ${stats[0].rows[0]?.count || 0}`)
    console.log(`Exams: ${stats[1].rows[0]?.count || 0}`)
    console.log(`Objectives: ${stats[2].rows[0]?.count || 0}`)
    console.log(`Questions: ${stats[3].rows[0]?.count || 0}`)
    console.log(`Study Sessions: ${stats[4].rows[0]?.count || 0}`)
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)
  
  // Parse command line options
  const options: SeedOptions = {
    environment: (process.env.DATABASE_ENV || process.env.NODE_ENV || 'development') as DatabaseEnvironment,
    force: args.includes('--force') || args.includes('-f'),
    verbose: args.includes('--verbose') || args.includes('-v')
  }

  // Override environment if specified
  const envArg = args.find(arg => arg.startsWith('--env='))
  if (envArg) {
    options.environment = envArg.split('=')[1] as DatabaseEnvironment
  }

  console.log(`🌍 Seeding environment: ${options.environment}`)

  const seeder = new DatabaseSeeder(options.environment)
  await seeder.initialize()
  await seeder.seed(options)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
}

export { DatabaseSeeder }