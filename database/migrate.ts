// Database migration script for PingToPass
// Handles migration from raw SQL to Drizzle ORM with zero downtime

import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createClient } from '@libsql/client'
import { promises as fs } from 'fs'
import { join } from 'path'

interface MigrationConfig {
  url: string
  authToken: string
  migrationsFolder: string
  backupPath?: string
}

class DatabaseMigrator {
  private db: ReturnType<typeof drizzle>
  private config: MigrationConfig

  constructor(config: MigrationConfig) {
    this.config = config
    
    const client = createClient({
      url: config.url,
      authToken: config.authToken
    })
    
    this.db = drizzle(client)
  }

  /**
   * Create a full database backup before migration
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = `backup-${timestamp}.sql`
    const backupPath = this.config.backupPath || './database/backups'
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true })
      
      // Get all table names
      const tables = await this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)
      
      let backupSql = '-- Database backup created at ' + new Date().toISOString() + '\n\n'
      backupSql += 'PRAGMA foreign_keys = OFF;\n'
      backupSql += 'BEGIN TRANSACTION;\n\n'
      
      for (const table of tables) {
        const tableName = table.name
        
        // Get table schema
        const schema = await this.db.get(`
          SELECT sql FROM sqlite_master 
          WHERE type='table' AND name = ?
        `, [tableName])
        
        backupSql += `${schema?.sql};\n\n`
        
        // Get table data
        const rows = await this.db.all(`SELECT * FROM ${tableName}`)
        
        if (rows.length > 0) {
          const columns = Object.keys(rows[0])
          const columnList = columns.join(', ')
          
          for (const row of rows) {
            const values = columns.map(col => {
              const value = row[col]
              if (value === null) return 'NULL'
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
              return String(value)
            }).join(', ')
            
            backupSql += `INSERT INTO ${tableName} (${columnList}) VALUES (${values});\n`
          }
          backupSql += '\n'
        }
      }
      
      backupSql += 'COMMIT;\n'
      backupSql += 'PRAGMA foreign_keys = ON;\n'
      
      const fullBackupPath = join(backupPath, backupFile)
      await fs.writeFile(fullBackupPath, backupSql, 'utf-8')
      
      console.log(`✅ Database backup created: ${fullBackupPath}`)
      return fullBackupPath
    } catch (error) {
      console.error('❌ Failed to create backup:', error)
      throw error
    }
  }

  /**
   * Validate current database state
   */
  async validateDatabase(): Promise<boolean> {
    try {
      // Check if critical tables exist
      const criticalTables = ['users', 'exams', 'questions', 'study_sessions']
      
      for (const tableName of criticalTables) {
        const table = await this.db.get(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name = ?
        `, [tableName])
        
        if (!table) {
          console.warn(`⚠️  Critical table missing: ${tableName}`)
          return false
        }
      }
      
      // Check data integrity
      const userCount = await this.db.get('SELECT COUNT(*) as count FROM users')
      const questionCount = await this.db.get('SELECT COUNT(*) as count FROM questions')
      
      console.log(`📊 Database validation:`)
      console.log(`   Users: ${userCount?.count}`)
      console.log(`   Questions: ${questionCount?.count}`)
      
      return true
    } catch (error) {
      console.error('❌ Database validation failed:', error)
      return false
    }
  }

  /**
   * Run Drizzle migrations
   */
  async runMigrations(): Promise<void> {
    try {
      console.log('🚀 Starting database migration...')
      
      await migrate(this.db, {
        migrationsFolder: this.config.migrationsFolder
      })
      
      console.log('✅ Migrations completed successfully!')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * Verify migration success
   */
  async verifyMigration(): Promise<boolean> {
    try {
      // Check if all expected tables exist with correct schema
      const expectedTables = [
        'users', 'exams', 'objectives', 'questions',
        'study_sessions', 'test_attempts', 'user_answers', 'user_progress',
        'twitter_accounts', 'tweets', 'engagement_opportunities',
        'growth_metrics', 'voice_profiles',
        'ai_generation_log', 'audit_log'
      ]
      
      for (const tableName of expectedTables) {
        const table = await this.db.get(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name = ?
        `, [tableName])
        
        if (!table) {
          console.error(`❌ Expected table missing after migration: ${tableName}`)
          return false
        }
      }
      
      // Test basic operations
      await this.db.get('SELECT 1 FROM users LIMIT 1')
      await this.db.get('SELECT 1 FROM questions LIMIT 1')
      
      console.log('✅ Migration verification successful!')
      return true
    } catch (error) {
      console.error('❌ Migration verification failed:', error)
      return false
    }
  }

  /**
   * Complete migration process with safety checks
   */
  async migrate(): Promise<void> {
    try {
      console.log('🔄 Starting database migration process...\n')
      
      // Step 1: Validate current database
      console.log('1️⃣  Validating current database state...')
      const isValid = await this.validateDatabase()
      if (!isValid) {
        throw new Error('Database validation failed. Please check your database state.')
      }
      
      // Step 2: Create backup
      console.log('\n2️⃣  Creating database backup...')
      const backupPath = await this.createBackup()
      
      // Step 3: Run migrations
      console.log('\n3️⃣  Running Drizzle migrations...')
      await this.runMigrations()
      
      // Step 4: Verify migration
      console.log('\n4️⃣  Verifying migration...')
      const isSuccess = await this.verifyMigration()
      if (!isSuccess) {
        throw new Error('Migration verification failed')
      }
      
      console.log('\n🎉 Database migration completed successfully!')
      console.log(`📁 Backup saved to: ${backupPath}`)
      
    } catch (error) {
      console.error('\n❌ Migration process failed:', error)
      console.log('\n🔄 To restore from backup, run:')
      console.log('   turso db shell your-db < path/to/backup.sql')
      throw error
    }
  }
}

// Migration script execution
async function runMigration() {
  const environment = process.env.NODE_ENV || 'development'
  const isDev = environment === 'development'
  
  // Determine database URL based on environment
  const databaseUrl = isDev 
    ? process.env.TURSO_DATABASE_URL_DEV || process.env.TURSO_DATABASE_URL
    : process.env.TURSO_DATABASE_URL_PROD || process.env.TURSO_DATABASE_URL
  
  const authToken = process.env.TURSO_AUTH_TOKEN
  
  if (!databaseUrl || !authToken) {
    console.error('❌ Missing required environment variables:')
    console.error('   TURSO_DATABASE_URL (or TURSO_DATABASE_URL_DEV/PROD)')
    console.error('   TURSO_AUTH_TOKEN')
    process.exit(1)
  }
  
  const migrator = new DatabaseMigrator({
    url: databaseUrl,
    authToken,
    migrationsFolder: './database/migrations',
    backupPath: './database/backups'
  })
  
  try {
    await migrator.migrate()
    console.log('\n✨ Ready to use Drizzle ORM!')
    console.log('\n📚 Next steps:')
    console.log('   1. Update your API routes to use Drizzle queries')
    console.log('   2. Run tests to ensure everything works')
    console.log('   3. Deploy to production')
    
  } catch (error) {
    console.error('\n💥 Migration failed. Please check the error above.')
    process.exit(1)
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
}

export { DatabaseMigrator }
export default runMigration