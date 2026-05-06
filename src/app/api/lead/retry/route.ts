import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { processLeadBackground } from '@/lib/leadProcessing';
import { waitUntil } from '@vercel/functions';

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `SELECT * FROM leads WHERE id = $1`,
      [leadId]
    );

    if (rows.length === 0) {
       return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const row = rows[0];

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

    // Update state to pending to provide immediate UI feedback atomically
    const updateRes = await pool.query(
       `UPDATE leads SET processing_status = 'pending'
        WHERE id = $1 AND processing_status != 'pending'
        RETURNING id`,
       [leadId]
    );

    if (updateRes.rowCount === 0) {
        return NextResponse.json({ error: 'Lead is already being processed' }, { status: 409 });
    }

    waitUntil(processLeadBackground(leadId, leadData));

    return NextResponse.json({ success: true, message: 'Retry initiated' });

  } catch (error: any) {
    console.error('API /lead/retry error:', error);
    return NextResponse.json({ error: 'Failed to initiate retry' }, { status: 500 });
  }
}
