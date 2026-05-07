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

let initPromise: Promise<void> | null = null;

/**
 * Creates the `leads` table if it does not already exist.
 * Safe to call on every request — the initialization is cached via a Promise
 * to avoid duplicate queries, reducing network round-trips.
 */
export function ensureLeadsTable(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
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
      qualification     JSONB,
      linkedin          TEXT,
      apollo_data       JSONB,
      processing_status TEXT,
      email_sent_at     TIMESTAMPTZ
    )
  `);

  // In case the table was created before the 'linkedin' column existed, attempt to add it safely
  try {
    await pool.query(`ALTER TABLE leads ADD COLUMN linkedin TEXT`);
  } catch (err: unknown) {
    // Ignore if the column already exists
    const isDuplicateColumn = typeof err === 'object' && err !== null && 'code' in err && (err as Record<string, unknown>).code === '42701';
    if (!isDuplicateColumn) {
      console.warn('Failed to add linkedin column to leads table, it may already exist:', err);
    }
  }

  // Add processing_status column for async task tracking
  try {
    await pool.query(`ALTER TABLE leads ADD COLUMN processing_status TEXT`);
  } catch (err: unknown) {
    // Ignore if the column already exists
    const isDuplicateColumn = typeof err === 'object' && err !== null && 'code' in err && (err as Record<string, unknown>).code === '42701';
    if (!isDuplicateColumn) {
      console.warn('Failed to add processing_status column to leads table:', err);
    }
  }

      // Add email_sent_at column
      try {
        await pool.query(`ALTER TABLE leads ADD COLUMN email_sent_at TIMESTAMPTZ`);
      } catch (err: unknown) {
        const isDuplicateColumn = typeof err === 'object' && err !== null && 'code' in err && (err as Record<string, unknown>).code === '42701';
        if (!isDuplicateColumn) {
          console.warn('Failed to add email_sent_at column to leads table:', err);
        }
      }
    } catch (error) {
      initPromise = null; // Reset cache on failure so it can be retried
      throw error;
    }
  })();

  return initPromise;
}

export { pool };
