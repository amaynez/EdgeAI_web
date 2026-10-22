import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { processLeadBackground } from '@/lib/leadProcessing';
import { updateLead, bulkUpdateLeads, bulkRecordErrors, LeadUpdateResult } from '@/lib/db/queries';

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

    /**
     * Helper to record a processing error in the database.
     * Prevents leads from being stuck in 'pending' status.
     */
    const recordError = async (leadId: string, errorMsg: string) => {
      try {
        await pool.query(
          `UPDATE leads SET processing_status = $1 WHERE id = $2`,
          [errorMsg, leadId]
        );
      } catch (dbErr) {
        console.error(`Failed to record error for lead ${leadId}:`, dbErr);
      }
    };

    const successfulUpdates: LeadUpdateResult[] = [];
    const errorUpdates: { leadId: string; errorMsg: string }[] = [];

    // Separate results into successes and errors
    results.forEach((settledResult, i) => {
      const leadId = rows[i].id;

      if (settledResult.status === 'fulfilled') {
        const res = settledResult.value;
        if (res) {
          successfulUpdates.push(res);
        } else {
          errorUpdates.push({ leadId, errorMsg: 'error: processing returned no result' });
        }
      } else {
        const reason = settledResult.reason;
        const msg = (reason instanceof Error ? reason.message : reason?.message) || 'Unknown error';
        console.error(`Processing failed for lead ${leadId}:`, reason);
        errorUpdates.push({ leadId, errorMsg: `error: ${msg}` });
      }
    });

    // Execute bulk updates with fallback
    if (successfulUpdates.length > 0) {
      try {
        await bulkUpdateLeads(successfulUpdates);
      } catch (bulkErr) {
        console.error('Bulk update failed, falling back to individual updates:', bulkErr);
        await Promise.all(successfulUpdates.map(async (res) => {
          try {
            await updateLead(res);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Failed to update lead ${res.leadId}:`, err);
            await recordError(res.leadId, `error: update failed (${msg})`);
          }
        }));
      }
    }

    if (errorUpdates.length > 0) {
      try {
        await bulkRecordErrors(errorUpdates);
      } catch (bulkErr) {
        console.error('Bulk record errors failed, falling back to individual updates:', bulkErr);
        await Promise.all(errorUpdates.map(async (err) => {
          await recordError(err.leadId, err.errorMsg);
        }));
      }
    }

    return NextResponse.json({ success: true, processed: rows.length });
  } catch (error: unknown) {
    console.error('Cron process-leads error:', error);
    return NextResponse.json({ error: 'Failed to process leads via cron' }, { status: 500 });
  }
}
