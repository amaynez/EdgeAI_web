import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { processLeadBackground, updateLead } from '@/lib/leadProcessing';

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

    const results = await Promise.allSettled(rows.map(async (row) => {
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
      // We pass the existing data (including apollo_data from the row) to avoid a redundant SELECT.
      // We use skipUpdate: true to batch the updates together at the end.
      return await processLeadBackground(row.id, leadData, {
        existingData: {
          apollo_data: row.apollo_data,
          email_sent_at: row.email_sent_at,
          contacted: row.contacted,
        },
        skipUpdate: true
      });
    }));

    // Update the processed leads
    for (let i = 0; i < results.length; i++) {
      const settledResult = results[i];
      const leadId = rows[i].id;

      if (settledResult.status === 'fulfilled') {
        const res = settledResult.value;
        if (res) {
          try {
            await updateLead(res);
          } catch (updateErr) {
            console.error(`Failed to update lead ${leadId}:`, updateErr);
          }
        }
      } else {
        // Handle failure: Update lead status to error
        console.error(`Processing failed for lead ${leadId}:`, settledResult.reason);
        try {
          await pool.query(
            `UPDATE leads SET processing_status = $1 WHERE id = $2`,
            [`error: ${settledResult.reason?.message || 'Unknown error'}`, leadId]
          );
        } catch (dbErr) {
          console.error(`Failed to record error for lead ${leadId}:`, dbErr);
        }
      }
    }

    return NextResponse.json({ success: true, processed: rows.length });
  } catch (error: any) {
    console.error('Cron process-leads error:', error);
    return NextResponse.json({ error: 'Failed to process leads via cron' }, { status: 500 });
  }
}
