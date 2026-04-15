import { Pool } from '@neondatabase/serverless';

// Validate at startup so the app fails fast on misconfiguration.
const _dbUrl = process.env.DATABASE_URL;
if (!_dbUrl) {
  throw new Error('Missing required env DATABASE_URL');
}

// Singleton pool — Next.js module caching ensures one instance per lambda warm start.
// Uses the pooler URL (PgBouncer) from Neon, which is safe for serverless.
const pool = new Pool({
  connectionString: _dbUrl,
  max: 1,               // Keep at 1 for serverless — each lambda has its own pool.
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
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
      qualification JSONB,
      linkedin      TEXT,
      apollo_data   JSONB
    )
  `);

  // In case the table was created before the 'linkedin' column existed, attempt to add it safely
  try {
    await pool.query(`ALTER TABLE leads ADD COLUMN linkedin TEXT`);
  } catch (err: any) {
    // Ignore if the column already exists
    if (err.code !== '42701') {
      console.warn('Failed to add linkedin column to leads table, it may already exist:', err);
    }
  }

  // Add processing_status column for async task tracking
  try {
    await pool.query(`ALTER TABLE leads ADD COLUMN processing_status TEXT`);
  } catch (err: any) {
    // Ignore if the column already exists
    if (err.code !== '42701') {
      console.warn('Failed to add processing_status column to leads table:', err);
    }
  }
}

export { pool };
