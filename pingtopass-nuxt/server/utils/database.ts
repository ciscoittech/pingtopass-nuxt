import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../database/schema';

let db: ReturnType<typeof drizzle> | null = null;

export function getDB() {
  if (!db) {
    const tursoUrl = process.env.TURSO_DATABASE_URL || useRuntimeConfig().turso?.databaseUrl;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN || useRuntimeConfig().turso?.authToken;

    if (!tursoUrl || !tursoAuthToken) {
      throw new Error('Missing Turso database credentials. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
    }

    const client = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });

    db = drizzle(client, { schema });
  }

  return db;
}

// Export commonly used functions
export { sql, eq, and, or, desc, asc, inArray } from 'drizzle-orm';