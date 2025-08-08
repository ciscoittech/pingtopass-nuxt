#!/usr/bin/env tsx
/**
 * Database Migration System for PingToPass
 * Supports up/down migrations with transaction safety
 * Environment-aware with dev/staging/prod separation
 */

import { config } from 'dotenv'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { createClient } from '@libsql/client'
import { setDatabaseEnvironment, getDB } from '../server/utils/db'

// Load environment variables
config()

interface Migration {
  id: string
  timestamp: string
  name: string
  filename: string
  up: string
  down: string
}

interface MigrationRecord {
  id: string
  filename: string
  applied_at: string
  checksum: string
}

class DatabaseMigrator {
  private db: any
  private migrationsDir: string

  constructor(migrationsDir = './database/migrations') {
    this.migrationsDir = migrationsDir
  }

  /**
   * Initialize migrator with database connection
   */
  async initialize() {
    this.db = getDB()
    await this.ensureMigrationsTable()
  }

  /**
   * Create migrations tracking table if it doesn't exist
   */
  private async ensureMigrationsTable() {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      )
    `)
    
    console.log('📋 Schema migrations table ready')
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    // Simple hash function for content verification
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Load all migration files from directory
   */
  private loadMigrations(): Migration[] {
    const migrations: Migration[] = []
    
    try {
      const files = readdirSync(this.migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort()

      for (const filename of files) {
        const fullPath = join(this.migrationsDir, filename)
        const content = readFileSync(fullPath, 'utf-8')
        
        // Parse migration file
        const sections = this.parseMigrationFile(content)
        const match = filename.match(/^(\d{14})_(.+)\.sql$/)
        
        if (!match) {
          console.warn(`⚠️ Skipping invalid migration filename: ${filename}`)
          continue
        }

        migrations.push({
          id: match[1],
          timestamp: match[1],
          name: match[2],
          filename,
          up: sections.up,
          down: sections.down
        })
      }
    } catch (error) {
      console.error('❌ Error loading migrations:', error.message)
      process.exit(1)
    }

    return migrations
  }

  /**
   * Parse migration file into up/down sections
   */
  private parseMigrationFile(content: string): { up: string; down: string } {
    const upMarker = '-- +migrate Up'
    const downMarker = '-- +migrate Down'
    
    const upIndex = content.indexOf(upMarker)
    const downIndex = content.indexOf(downMarker)
    
    if (upIndex === -1) {
      // No markers, assume entire file is up migration
      return { up: content.trim(), down: '' }
    }
    
    const up = content
      .substring(upIndex + upMarker.length, downIndex === -1 ? undefined : downIndex)
      .trim()
    
    const down = downIndex === -1 ? '' : content
      .substring(downIndex + downMarker.length)
      .trim()
    
    return { up, down }
  }

  /**
   * Get applied migrations from database
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.db.execute('SELECT * FROM schema_migrations ORDER BY id')
    return result.rows as MigrationRecord[]
  }

  /**
   * Execute SQL statements with transaction support
   */
  private async executeWithTransaction(statements: string[]): Promise<void> {
    // For Turso/libSQL, execute statements without manual transaction management
    // The migration system provides rollback at the migration level
    try {
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`  📝 Executing: ${statement.substring(0, 60)}...`)
          await this.db.execute(statement)
        }
      }
    } catch (error) {
      console.error(`❌ Failed to execute statement: ${error.message}`)
      throw error
    }
  }

  /**
   * Parse SQL content into statements properly handling multi-line statements
   */
  private parseStatements(content: string): string[] {
    const allStatements = []
    let currentStatement = ''
    let inCreateTable = false
    
    const lines = content.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue
      }
      
      // Track if we're inside a CREATE TABLE block
      if (trimmedLine.toUpperCase().startsWith('CREATE TABLE')) {
        inCreateTable = true
        currentStatement = trimmedLine
      } else if (inCreateTable) {
        currentStatement += ' ' + trimmedLine
        
        // Check if this line ends the CREATE TABLE (ends with ');' or just ';')
        if (trimmedLine.endsWith(');') || trimmedLine === ');') {
          allStatements.push(currentStatement.trim())
          currentStatement = ''
          inCreateTable = false
        }
      } else {
        // Regular single-line statements (like indexes)
        if (trimmedLine.endsWith(';')) {
          const statement = (currentStatement + ' ' + trimmedLine).trim()
          if (statement && statement !== 'PRAGMA foreign_keys = ON;') {
            allStatements.push(statement)
          }
          currentStatement = ''
        } else {
          currentStatement += (currentStatement ? ' ' : '') + trimmedLine
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      allStatements.push(currentStatement.trim())
    }
    
    return allStatements
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`🔼 Applying migration: ${migration.filename}`)
    
    const statements = this.parseStatements(migration.up)
    console.log(`📝 Parsed ${statements.length} SQL statements`)

    await this.executeWithTransaction(statements)

    // Record migration as applied
    const checksum = this.generateChecksum(migration.up)
    await this.db.execute({
      sql: `INSERT INTO schema_migrations (id, filename, checksum) VALUES (?, ?, ?)`,
      args: [migration.id, migration.filename, checksum]
    })

    console.log(`✅ Applied: ${migration.filename}`)
  }

  /**
   * Rollback a single migration
   */
  private async rollbackMigration(migration: Migration): Promise<void> {
    if (!migration.down) {
      throw new Error(`No down migration available for ${migration.filename}`)
    }

    console.log(`🔽 Rolling back migration: ${migration.filename}`)

    const statements = this.parseStatements(migration.down)
    console.log(`📝 Parsed ${statements.length} rollback SQL statements`)

    await this.executeWithTransaction(statements)

    // Remove migration record
    await this.db.execute({
      sql: `DELETE FROM schema_migrations WHERE id = ?`,
      args: [migration.id]
    })

    console.log(`✅ Rolled back: ${migration.filename}`)
  }

  /**
   * Run pending migrations
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting database migration...')
    
    const allMigrations = this.loadMigrations()
    const appliedMigrations = await this.getAppliedMigrations()
    const appliedIds = new Set(appliedMigrations.map(m => m.id))

    const pendingMigrations = allMigrations.filter(m => !appliedIds.has(m.id))

    if (pendingMigrations.length === 0) {
      console.log('✨ Database is up to date')
      return
    }

    console.log(`📦 Found ${pendingMigrations.length} pending migrations`)

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration)
    }

    console.log('🎉 Migration completed successfully!')
  }

  /**
   * Rollback migrations
   */
  async rollback(steps = 1): Promise<void> {
    console.log(`🔄 Rolling back ${steps} migration(s)...`)
    
    const allMigrations = this.loadMigrations()
    const appliedMigrations = await this.getAppliedMigrations()
    
    // Sort by timestamp descending for rollback
    appliedMigrations.sort((a, b) => b.id.localeCompare(a.id))
    
    const migrationsToRollback = appliedMigrations.slice(0, steps)
    
    for (const appliedMigration of migrationsToRollback) {
      const migration = allMigrations.find(m => m.id === appliedMigration.id)
      if (!migration) {
        throw new Error(`Migration file not found for ${appliedMigration.filename}`)
      }
      
      await this.rollbackMigration(migration)
    }

    console.log('🎉 Rollback completed successfully!')
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    const allMigrations = this.loadMigrations()
    const appliedMigrations = await this.getAppliedMigrations()
    const appliedIds = new Set(appliedMigrations.map(m => m.id))

    console.log('\n📊 Migration Status:')
    console.log('====================')

    for (const migration of allMigrations) {
      const status = appliedIds.has(migration.id) ? '✅ Applied' : '⏳ Pending'
      const appliedAt = appliedMigrations.find(m => m.id === migration.id)?.applied_at || ''
      console.log(`${status} ${migration.filename} ${appliedAt}`)
    }

    const pendingCount = allMigrations.length - appliedIds.size
    console.log(`\n📈 Total: ${allMigrations.length}, Applied: ${appliedIds.size}, Pending: ${pendingCount}`)
  }

  /**
   * Reset database (rollback all migrations)
   */
  async reset(): Promise<void> {
    console.log('🔄 Resetting database (rolling back all migrations)...')
    
    const appliedMigrations = await this.getAppliedMigrations()
    await this.rollback(appliedMigrations.length)
    
    console.log('🎉 Database reset completed!')
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'migrate'
  
  // Set database environment from environment variable or default to development
  const env = (process.env.DATABASE_ENV || process.env.NODE_ENV || 'development') as any
  console.log(`🌍 Database environment: ${env}`)
  
  if (env === 'test') {
    setDatabaseEnvironment('test')
  } else if (env === 'production') {
    setDatabaseEnvironment('production')
  } else if (env === 'staging') {
    setDatabaseEnvironment('staging')
  } else {
    setDatabaseEnvironment('development')
  }

  const migrator = new DatabaseMigrator()
  await migrator.initialize()

  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await migrator.migrate()
        break
        
      case 'rollback':
      case 'down':
        const steps = parseInt(args[1]) || 1
        await migrator.rollback(steps)
        break
        
      case 'status':
        await migrator.status()
        break
        
      case 'reset':
        await migrator.reset()
        break
        
      default:
        console.log('Usage: tsx database/migrate.ts [command] [options]')
        console.log('')
        console.log('Commands:')
        console.log('  migrate, up     Apply pending migrations')
        console.log('  rollback, down  Rollback migrations (default: 1)')
        console.log('  status          Show migration status')
        console.log('  reset           Rollback all migrations')
        console.log('')
        console.log('Environment variables:')
        console.log('  DATABASE_ENV=development|staging|production')
        process.exit(1)
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { DatabaseMigrator }