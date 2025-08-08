// Drizzle Kit configuration for PingToPass
// Handles schema generation and migrations for Turso database

import type { Config } from 'drizzle-kit'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // Schema configuration
  schema: './database/schema/index.ts',
  out: './database/migrations',
  
  // Database configuration for Turso (libSQL)
  dialect: 'sqlite',
  
  // Database credentials (Turso connection)
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || ':memory:',
    authToken: process.env.TURSO_AUTH_TOKEN
  },
  
  // Development settings
  verbose: process.env.NODE_ENV === 'development',
  strict: true
} satisfies Config)