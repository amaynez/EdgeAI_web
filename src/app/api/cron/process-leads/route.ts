import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { processLeadBackground } from '@/lib/leadProcessing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Simple auth for cron: Check for a custom secret header or token
  // Vercel Cron automatically sends a Bearer token in the Authorization header
  const authHeader = request.headers.get('authorization');

  if (!process.env.CRON_SECRET) {
      return new NextResponse('Server misconfiguration: CRON_SECRET not set', { status: 500 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Atomically find and claim leads that need processing
    const { rows } = await pool.query(
      `UPDATE leads
       SET processing_status = 'pending'
       WHERE id IN (
           SELECT id FROM leads
           WHERE processing_status != 'completed'
           AND processing_status != 'pending'
           AND (
             processing_status LIKE 'error:%'
             OR (processing_status = 'pending' AND timestamp < NOW() - INTERVAL '5 minutes')
           )
           LIMIT 5
           FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
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
