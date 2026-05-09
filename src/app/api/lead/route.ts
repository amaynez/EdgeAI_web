import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { pool, ensureLeadsTable } from '@/lib/db';
import { processLeadBackground, LeadData } from '@/lib/leadProcessing';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';
import { validateLeadPayload, Q1Value, Q2Value, Q3Value } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    // --- Rate limiting ---
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // --- Parse & validate payload ---
    let data: Record<string, unknown>;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const validationErrors = validateLeadPayload(data);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed.', details: validationErrors },
        { status: 400 }
      );
    }

    // Safe to destructure after validation
    const { name, email, company, role, q1, q2, q3, linkedin } = data as {
      name: string; email: string; company: string; role: string;
      q1?: Q1Value; q2?: Q2Value; q3?: Q3Value; linkedin?: string;
    };

    // --- 1. Persist to Neon Postgres immediately ---
    await ensureLeadsTable();

    const leadId = crypto.randomUUID();
    const normalizedLinkedin = linkedin?.trim() === '' ? null : linkedin;

    await pool.query(
      `INSERT INTO leads (id, name, email, company, role, q1, q2, q3, linkedin, processing_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        leadId,
        name,
        email,
        company,
        role,
        q1 ?? null,
        q2 ?? null,
        q3 ?? null,
        normalizedLinkedin,
        'pending'
      ]
    );

    // --- 2. Hand off time-consuming tasks to waitUntil ---
    const leadData: LeadData = { name, email, company, role, q1, q2, q3, linkedin: normalizedLinkedin };
    waitUntil(processLeadBackground(leadId, leadData, { persona: 'MARGIN_RECOVERY' }));

    // Return immediate success
    return NextResponse.json({ success: true, message: 'Lead captured successfully and processing in background' }, { status: 200 });
  } catch (error: any) {
    console.error('API /lead error:', error);
    return NextResponse.json({ error: 'Failed to process lead request' }, { status: 500 });
  }
}
