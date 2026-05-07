import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { pool, ensureLeadsTable } from '@/lib/db';
import { processLeadBackground } from '@/lib/leadProcessing';

// ---------------------------------------------------------------------------
// In-memory rate limiter (10 requests per IP per 15-minute window).
// NOTE: In a multi-instance/serverless environment each cold-start gets its
// own Map. For stricter limits use a shared store such as Upstash Redis.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateEntry { count: number; windowStart: number }
const rateLimitStore = new Map<string, RateEntry>();

function getClientIp(request: Request): string {
  // Vercel / common reverse-proxy headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Prune stale entries to prevent unbounded Map growth.
  for (const [key, rec] of rateLimitStore) {
    if (now - rec.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }

  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count += 1;
  return false;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

// Allowed enum values for the three qualification questions.
// Keep these in sync with the values emitted by the front-end form.
const Q1_VALUES = ['amazon', 'walmart', 'both', 'other'] as const;
const Q2_VALUES = ['under5', '5to15', 'over15', 'unsure'] as const;
const Q3_VALUES = ['yes_significant', 'somewhat', 'no', 'unsure'] as const;

type Q1Value = typeof Q1_VALUES[number];
type Q2Value = typeof Q2_VALUES[number];
type Q3Value = typeof Q3_VALUES[number];

// ---------------------------------------------------------------------------
// HTML-escape helper — prevents XSS when interpolating user data into email HTML.
// ---------------------------------------------------------------------------
function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function validateLeadPayload(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // --- Required string fields ---
  const stringFields: Array<{ key: string; maxLen: number }> = [
    { key: 'name',    maxLen: 100 },
    { key: 'email',   maxLen: 254 },
    { key: 'company', maxLen: 150 },
    { key: 'role',    maxLen: 100 },
  ];

  // --- LinkedIn validation based on email domain ---
  let isGenericEmail = false;
  if (typeof data.email === 'string') {
    const emailDomain = data.email.split('@')[1]?.toLowerCase();
    if (emailDomain && GENERIC_DOMAINS.includes(emailDomain)) {
      isGenericEmail = true;
    }
  }

  const linkedinVal = data.linkedin;
  if (isGenericEmail) {
    if (!linkedinVal || typeof linkedinVal !== 'string' || linkedinVal.trim() === '') {
      errors.push('"linkedin" is required for generic email providers.');
    }
  }

  if (linkedinVal !== undefined && linkedinVal !== null && linkedinVal !== '') {
    if (typeof linkedinVal !== 'string') {
      errors.push(`"linkedin" must be a string.`);
    } else {
      const trimmedLinkedin = linkedinVal.trim();
      if (trimmedLinkedin.length > 255) {
        errors.push(`"linkedin" must be at most 255 characters.`);
      }
      if (!LINKEDIN_REGEX.test(trimmedLinkedin)) {
        errors.push('"linkedin" must be a valid LinkedIn profile URL.');
      }
    }
  }

  for (const { key, maxLen } of stringFields) {
    const val = data[key];
    if (!val || typeof val !== 'string' || val.trim() === '') {
      errors.push(`"${key}" is required.`);
    } else if (val.length > maxLen) {
      errors.push(`"${key}" must be at most ${maxLen} characters.`);
    }
  }

  // --- Email format ---
  if (typeof data.email === 'string' && data.email.trim() !== '') {
    if (!EMAIL_REGEX.test(data.email)) {
      errors.push('"email" must be a valid email address.');
    }
  }

  // --- Optional qualification questions (enum + max-length) ---
  const enumChecks: Array<{ key: string; allowed: readonly string[]; maxLen: number }> = [
    { key: 'q1', allowed: Q1_VALUES, maxLen: 500 },
    { key: 'q2', allowed: Q2_VALUES, maxLen: 500 },
    { key: 'q3', allowed: Q3_VALUES, maxLen: 500 },
  ];

  for (const { key, allowed, maxLen } of enumChecks) {
    const val = data[key];
    if (val === undefined || val === null || val === '') continue; // optional
    if (typeof val !== 'string') {
      errors.push(`"${key}" must be a string.`);
      continue;
    }
    if (val.length > maxLen) {
      errors.push(`"${key}" must be at most ${maxLen} characters.`);
    }
    if (!allowed.includes(val as string)) {
      errors.push(`"${key}" must be one of: ${allowed.join(', ')}.`);
    }
  }

  return errors;
}

interface LeadData {
  name: string;
  email: string;
  company: string;
  role: string;
  q1?: Q1Value | null;
  q2?: Q2Value | null;
  q3?: Q3Value | null;
  linkedin?: string | null;
}


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
    const leadData = { name, email, company, role, q1, q2, q3, linkedin: normalizedLinkedin };
    waitUntil(processLeadBackground(leadId, leadData, { persona: 'MARGIN_RECOVERY' }));

    // Return immediate success
    return NextResponse.json({ success: true, message: 'Lead captured successfully and processing in background' }, { status: 200 });
  } catch (error: any) {
    console.error('API /lead error:', error);
    return NextResponse.json({ error: 'Failed to process lead request' }, { status: 500 });
  }
}
