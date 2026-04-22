import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool, ensureLeadsTable } from '@/lib/db';
import { sanitizeHtml } from '@/lib/sanitize';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ---------------------------------------------------------------------------
// Cached DB table initializer — avoids a CREATE TABLE round-trip on every
// request. Set to false on cold-start; flipped to true after first success.
// ---------------------------------------------------------------------------
let tableInitialized = false;
async function ensureTableOnce(): Promise<void> {
  if (tableInitialized) return;
  await ensureLeadsTable();
  tableInitialized = true;
}

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

async function processLeadBackground(leadId: string, leadData: LeadData) {
  const { name, email, company, role, q1, q2, q3, linkedin } = leadData;
  let aiInsights = {
    urgencyScore: 0,
    potentialScore: 0,
    analysis: 'AI Analysis Failed or Unavailable.',
    draftEmail: 'Failed to generate draft email.',
  };
  let processingStatus = 'completed';

  try {
    // --- 1. Apollo.io Enrichment ---
    let apolloDataStr = '';
    const apolloApiKey = process.env.APOLLO_API_KEY;

    if (apolloApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

        const apolloRes = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            api_key: apolloApiKey,
            email: email,
            linkedin_url: linkedin || undefined
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (apolloRes.ok) {
          const apolloJson = await apolloRes.json();
          const person = apolloJson.person || {};
          const org = person.organization || {};

          const compressedData = {
            title: person.title,
            seniority: person.seniority,
            primary_phone: person.primary_phone,
            estimated_num_employees: org.estimated_num_employees,
            industry: org.industry,
            technology_names: org.technology_names?.slice(0, 10) // Limit to top 10 to save tokens
          };

          apolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(compressedData, null, 2)}`;
        } else {
          console.warn('Apollo API error:', await apolloRes.text());
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn('Apollo API timeout exceeded');
        } else {
          console.error('Error fetching from Apollo:', err);
        }
      }
    }

    // --- 2. AI Qualification using Gemini ---
    if (process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        systemInstruction: `You are an expert B2B Margin Recovery Consultant evaluator. Analyze this inbound lead for your consulting business. You must return ONLY a raw valid JSON object with the following schema, and no other text:
{
  "urgencyScore": (number 1-10, based on how urgently they need margin recovery/auditing based on answers and company context),
  "potentialScore": (number 1-10, based on their role, company size potential, and retailer exposure),
  "analysis": "1-2 sentence concise analysis of their margin leakage vulnerability and why they are a good lead",
  "draftEmail": "A professional HTML-formatted reply draft to the lead addressing their specific pain points, proposing a brief introductory chat. Emphasize how you can help them specifically based on their answers. Sign it as 'Armando Maynez, Founder at Zero Leak'."
}`
      });

      const prompt = `
Lead Profile:
- Name: ${name}
- Role: ${role}
- Company: ${company}
${linkedin ? `- LinkedIn: ${linkedin}` : ''}
${apolloDataStr}
Assessment Answers:
1. Retailers currently selling to? ${q1}
2. % of P&L attributed to trade spend/allowances? ${q2}
3. Experienced unexpected deductions/margin erosion in last 12 months? ${q3}
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();

      try {
        const parsed = JSON.parse(responseText);
        aiInsights = {
          urgencyScore:  Number.isFinite(Number(parsed.urgencyScore))  ? Number(parsed.urgencyScore)  : 0,
          potentialScore: Number.isFinite(Number(parsed.potentialScore)) ? Number(parsed.potentialScore) : 0,
          analysis:  typeof parsed.analysis === 'string'  ? parsed.analysis  : 'AI Analysis Failed or Unavailable.',
          draftEmail: sanitizeHtml(parsed.draftEmail ?? ''),
        };
      } catch (e) {
        console.error('Failed to parse Gemini output as JSON:', responseText);
        processingStatus = 'error: failed to parse Gemini output';
      }
    } else {
      console.warn('GEMINI_API_KEY missing, skipping AI insights');
      processingStatus = 'error: missing GEMINI_API_KEY';
    }

    // --- 3. Send via Email (Gmail SMTP) ---
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (user && pass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });

      const mailOptions = {
        from: user,
        to: user, // Send to yourself
        replyTo: email,
        subject: `[Lead: ${aiInsights.potentialScore}/10] Strategic Audit Request: ${escapeHtml(company)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">New Strategic Audit Lead Captured</h2>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0;">AI Qualification Insights</h3>
              <p><strong>Urgency Score:</strong> 
                <span style="background-color: ${aiInsights.urgencyScore >= 7 ? '#ffc107' : '#e9ecef'}; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${aiInsights.urgencyScore}/10</span>
              </p>
              <p><strong>Potential Score:</strong>
                <span style="background-color: ${aiInsights.potentialScore >= 7 ? '#28a745' : '#e9ecef'}; color: ${aiInsights.potentialScore >= 7 ? '#fff' : '#000'}; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${aiInsights.potentialScore}/10</span>
              </p>
              <p><strong>Analysis:</strong> ${escapeHtml(aiInsights.analysis)}</p>
            </div>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Executive Contact Identity</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Name:</strong> ${escapeHtml(name)}</li>
              <li style="margin-bottom: 8px;"><strong>Role:</strong> ${escapeHtml(role)}</li>
              <li style="margin-bottom: 8px;"><strong>Company:</strong> ${escapeHtml(company)}</li>
              <li style="margin-bottom: 8px;"><strong>Email:</strong> <a href="mailto:${encodeURIComponent(email)}" style="color: #007bff; text-decoration: none;">${escapeHtml(email)}</a></li>
              ${linkedin ? `<li style="margin-bottom: 8px;"><strong>LinkedIn:</strong> <a href="${escapeHtml(linkedin)}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none;">${escapeHtml(linkedin)}</a></li>` : ''}
            </ul>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Vulnerability Assessment Answers</h3>
            <ul style="padding-left: 20px;">
              <li><strong>Q1: Retailers currently selling to?</strong><br> ${escapeHtml(q1)}</li>
              <li style="margin-top: 10px;"><strong>Q2: % of P&L attributed to trade spend/allowances?</strong><br> ${escapeHtml(q2)}</li>
              <li style="margin-top: 10px;"><strong>Q3: Experienced unexpected deductions/margin erosion in last 12 months?</strong><br> ${escapeHtml(q3)}</li>
            </ul>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Drafted Email Response (via Gemini)</h3>
            <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: sans-serif; white-space: pre-wrap;">${aiInsights.draftEmail}</div>
            
            <p style="font-size: 0.9em; color: #666; margin-top: 20px;"><em>You can just click 'Reply' on this email to reply back directly to ${escapeHtml(name)}! Just copy formatting from the drafted response.</em></p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD missing. Skipping email.');
    }
  } catch (globalErr: any) {
    console.error('Error in background processing:', globalErr);
    processingStatus = `error: ${globalErr.message}`;
  } finally {
    // --- 4. Update Database with Retry Logic ---
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        await pool.query(
          `UPDATE leads SET qualification = $1, processing_status = $2 WHERE id = $3`,
          [JSON.stringify(aiInsights), processingStatus, leadId]
        );
        break; // Success
      } catch (dbErr) {
        console.error(`Failed to update lead (Attempt ${4 - retries}/3):`, dbErr);
        retries -= 1;
        if (retries === 0) {
          console.error(`FATAL: Could not persist AI insights for lead ${leadId} after 3 attempts. Payload:`, { aiInsights, processingStatus });
          // In a production system, you would enqueue this to a dead-letter queue or persistent store here.
        } else {
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
  }
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
    await ensureTableOnce();

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
    waitUntil(processLeadBackground(leadId, leadData));

    // Return immediate success
    return NextResponse.json({ success: true, message: 'Lead captured successfully and processing in background' }, { status: 200 });
  } catch (error: any) {
    console.error('API /lead error:', error);
    return NextResponse.json({ error: 'Failed to process lead request' }, { status: 500 });
  }
}
