import { Pool } from '@neondatabase/serverless';

// Singleton pool — Next.js module caching ensures one instance per lambda warm start.
// Uses the pooler URL (PgBouncer) from Neon, which is safe for serverless.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Creates the `leads` table if it does not already exist.
 * Safe to call on every request — the IF NOT EXISTS guard makes it a no-op
 * after the first run.
 */
export async function ensureLeadsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id            TEXT        PRIMARY KEY,
      timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      name          TEXT        NOT NULL,
      email         TEXT        NOT NULL,
      company       TEXT        NOT NULL,
      role          TEXT        NOT NULL,
      q1            TEXT,
      q2            TEXT,
      q3            TEXT,
      contacted     BOOLEAN     NOT NULL DEFAULT FALSE,
      qualification JSONB
    )
  `);
}

export { pool };
