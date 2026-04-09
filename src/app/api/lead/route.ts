import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pool, ensureLeadsTable } from '@/lib/db';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

// Allowed enum values for the three qualification questions.
// Keep these in sync with the values emitted by the front-end form.
const Q1_VALUES = ['none', 'chatgpt', 'copilot', 'gemini', 'other', 'multiple'] as const;
const Q2_VALUES = ['yes', 'no', 'unsure'] as const;
const Q3_VALUES = ['yes', 'no', 'unsure'] as const;

type Q1Value = typeof Q1_VALUES[number];
type Q2Value = typeof Q2_VALUES[number];
type Q3Value = typeof Q3_VALUES[number];

function validateLeadPayload(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // --- Required string fields ---
  const stringFields: Array<{ key: string; maxLen: number }> = [
    { key: 'name',    maxLen: 100 },
    { key: 'email',   maxLen: 254 },
    { key: 'company', maxLen: 150 },
    { key: 'role',    maxLen: 100 },
  ];

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
    const { name, email, company, role, q1, q2, q3 } = data as {
      name: string; email: string; company: string; role: string;
      q1?: Q1Value; q2?: Q2Value; q3?: Q3Value;
    };

    // --- 1. AI Qualification using Gemini ---
    let aiInsights = {
      urgencyScore: 0,
      potentialScore: 0,
      analysis: 'AI Analysis Failed or Unavailable.',
      draftEmail: 'Failed to generate draft email.',
    };

    try {
      if (process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({
          model: 'gemini-flash-lite-latest',
          systemInstruction: `You are an expert B2B AI Consultant evaluator. Analyze this inbound lead for your consulting business. You must return ONLY a raw valid JSON object with the following schema, and no other text:
{
  "urgencyScore": (number 1-10, based on how urgently they need AI security/auditing based on answers),
  "potentialScore": (number 1-10, based on their role and company size potential),
  "analysis": "1-2 sentence concise analysis of their vulnerability and why they are a good lead",
  "draftEmail": "A professional HTML-formatted reply draft to the lead addressing their specific pain points, proposing a brief introductory chat. Emphasize how you can help them specifically based on their answers. Sign it as 'Armando Maynez, B2B AI Consultant'."
}`
        });

        const prompt = `
Lead Profile:
- Name: ${name}
- Role: ${role}
- Company: ${company}

Assessment Answers:
1. AI tools accessed (last 30 days)? ${q1}
2. Operational data containing PII/IP? ${q2}
3. Data exposed via cloud AI breach? ${q3}
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        
        try {
          aiInsights = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse Gemini output as JSON:', responseText);
        }
      } else {
        console.warn('GEMINI_API_KEY missing, skipping AI insights');
      }
    } catch (aiError) {
      console.error('Error during Gemini API call:', aiError);
    }
  
    // --- 2. Persist to Neon Postgres (atomic single INSERT — no race condition) ---
    await ensureLeadsTable();
    await pool.query(
      `INSERT INTO leads (id, name, email, company, role, q1, q2, q3, qualification)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        Date.now().toString(),
        name,
        email,
        company,
        role,
        q1 ?? null,
        q2 ?? null,
        q3 ?? null,
        JSON.stringify(aiInsights),
      ]
    );

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
        replyTo: email, // This allows you to just hit "Reply" and send the draft to them.
        subject: `[Lead: ${aiInsights.potentialScore}/10] AI Audit Request: ${company}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">New AI Audit Lead Captured</h2>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0;">AI Qualification Insights</h3>
              <p><strong>Urgency Score:</strong> 
                <span style="background-color: ${aiInsights.urgencyScore >= 7 ? '#ffc107' : '#e9ecef'}; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${aiInsights.urgencyScore}/10</span>
              </p>
              <p><strong>Potential Score:</strong>
                <span style="background-color: ${aiInsights.potentialScore >= 7 ? '#28a745' : '#e9ecef'}; color: ${aiInsights.potentialScore >= 7 ? '#fff' : '#000'}; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${aiInsights.potentialScore}/10</span>
              </p>
              <p><strong>Analysis:</strong> ${aiInsights.analysis}</p>
            </div>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Executive Contact Identity</h3>
            <ul style="list-style-type: none; padding-left: 0;">
              <li style="margin-bottom: 8px;"><strong>Name:</strong> ${name}</li>
              <li style="margin-bottom: 8px;"><strong>Role:</strong> ${role}</li>
              <li style="margin-bottom: 8px;"><strong>Company:</strong> ${company}</li>
              <li style="margin-bottom: 8px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #007bff; text-decoration: none;">${email}</a></li>
            </ul>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Vulnerability Assessment Answers</h3>
            <ul style="padding-left: 20px;">
              <li><strong>Q1: AI tools accessed (last 30 days)?</strong><br> ${q1 || 'Not Answered'}</li>
              <li style="margin-top: 10px;"><strong>Q2: Operational data containing PII/IP?</strong><br> ${q2 || 'Not Answered'}</li>
              <li style="margin-top: 10px;"><strong>Q3: Data exposed via cloud AI breach?</strong><br> ${q3 || 'Not Answered'}</li>
            </ul>

            <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Drafted Email Response (via Gemini)</h3>
            <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: sans-serif; white-space: pre-wrap;">${aiInsights.draftEmail}</div>
            
            <p style="font-size: 0.9em; color: #666; margin-top: 20px;"><em>You can just click 'Reply' on this email to reply back directly to ${name}! Just copy formatting from the drafted response.</em></p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn('GMAIL_USER or GMAIL_APP_PASSWORD missing. Skipping email.');
    }

    return NextResponse.json({ success: true, message: 'Email sent & saved successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('API /lead error:', error);
    return NextResponse.json({ error: 'Failed to process lead request' }, { status: 500 });
  }
}
