#!/usr/bin/env node

// Simple database connection test
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

// Load environment variables manually
const envContent = readFileSync('.env', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=')
    if (key && value) {
      envVars[key.trim()] = value.trim()
    }
  }
})

const TURSO_URL = envVars.TURSO_DATABASE_URL
const TURSO_TOKEN = envVars.TURSO_AUTH_TOKEN

console.log('🧪 Testing Turso database connection...')
console.log('📍 URL:', TURSO_URL)
console.log('🔐 Token:', TURSO_TOKEN ? 'configured' : 'MISSING')

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

async function testConnection() {
  try {
    const startTime = Date.now()
    
    // Create client
    const client = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN
    })
    
    console.log('✅ Client created successfully')
    
    // Test basic connectivity
    const healthResult = await client.execute('SELECT 1 as health, datetime("now") as timestamp')
    const connectTime = Date.now() - startTime
    
    console.log('✅ Connection test passed')
    console.log('⏱️  Connection latency:', connectTime + 'ms')
    console.log('🕐 Database time:', healthResult.rows[0]?.timestamp)
    
    // Test schema
    const tablesResult = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `)
    
    const tableNames = tablesResult.rows.map(row => row.name)
    console.log('📊 Database tables:', tableNames.join(', '))
    
    // Test table row counts
    console.log('\n📈 Table statistics:')
    for (const tableName of tableNames) {
      try {
        const countResult = await client.execute(`SELECT COUNT(*) as count FROM ${tableName}`)
        const count = countResult.rows[0]?.count || 0
        console.log(`  ${tableName}: ${count} rows`)
      } catch (error) {
        console.log(`  ${tableName}: Error - ${error.message}`)
      }
    }
    
    const totalTime = Date.now() - startTime
    console.log(`\n🎯 Total test time: ${totalTime}ms`)
    console.log('✅ Database connection test completed successfully!')
    
    return true
    
  } catch (error) {
    console.error('❌ Database connection failed:')
    console.error('   Error:', error.message)
    console.error('   Details:', error)
    return false
  }
}

testConnection()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })