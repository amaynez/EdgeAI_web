import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { processLeadBackground } from '@/lib/leadProcessing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple auth for cron: Check for a custom secret header or token
  // Vercel Cron automatically sends a Bearer token in the Authorization header
  const authHeader = request.headers.get('authorization');

  // Note: For local testing, we might want to bypass this or provide a fallback.
  // In a real application, verify CRON_SECRET matches exactly.
  if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return new NextResponse('Unauthorized', { status: 401 });
      }
  }

  try {
    // Find leads that are either pending for a long time or have error statuses
    // Exclude 'completed' status
    const { rows } = await pool.query(
      `SELECT * FROM leads
       WHERE processing_status != 'completed'
       AND (
         processing_status LIKE 'error:%'
         OR (processing_status = 'pending' AND timestamp < NOW() - INTERVAL '5 minutes')
       )
       LIMIT 5` // Limit batch size to prevent hitting execution limits
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: true, message: 'No leads to process' });
    }

    const promises = rows.map(async (row) => {
      // Re-map the DB row back into the LeadData structure expected by processLeadBackground
      const leadData = {
        name: row.name,
        email: row.email,
        company: row.company,
        role: row.role,
        q1: row.q1,
        q2: row.q2,
        q3: row.q3,
        linkedin: row.linkedin,
      };

      // Set to pending while processing to avoid concurrent pick-ups
      await pool.query(
         `UPDATE leads SET processing_status = 'pending' WHERE id = $1`,
         [row.id]
      );

      // We await it here so the cron job runs them. Note: Vercel functions have timeouts,
      // so if the array is large we might exceed the limit. We used LIMIT 5 above to help.
      await processLeadBackground(row.id, leadData);
    });

    await Promise.all(promises);

    return NextResponse.json({ success: true, processed: rows.length });
  } catch (error: any) {
    console.error('Cron process-leads error:', error);
    return NextResponse.json({ error: 'Failed to process leads via cron' }, { status: 500 });
  }
}
