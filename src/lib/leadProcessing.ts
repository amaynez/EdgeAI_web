import { pool } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';
import { sanitizeHtml } from '@/lib/sanitize';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface LeadData {
  name: string;
  email: string;
  company: string;
  role: string;
  q1?: string | null;
  q2?: string | null;
  q3?: string | null;
  linkedin?: string | null;
}

// HTML-escape helper — prevents XSS when interpolating user data into email HTML.
function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function processLeadBackground(leadId: string, leadData: LeadData) {
  const { name, email, company, role, q1, q2, q3, linkedin } = leadData;
  let aiInsights = {
    urgencyScore: 0,
    potentialScore: 0,
    analysis: 'AI Analysis Failed or Unavailable.',
    draftEmail: 'Failed to generate draft email.',
  };

  let processingStatus = 'completed';

  try {
    // --- 0. Check if existing apollo_data exists (e.g. from a prior run) ---
    let existingApolloDataStr = null;
    let emailAlreadySent = false;
    try {
      const { rows } = await pool.query(`SELECT apollo_data, email_sent_at, contacted FROM leads WHERE id = $1`, [leadId]);
      if (rows.length > 0) {
        if (rows[0].email_sent_at || rows[0].contacted) {
            emailAlreadySent = true;
        }

        if (rows[0].apollo_data && rows[0].apollo_data.raw_data) {
          // Build the string from the saved data to avoid recalling Apollo
          const data = rows[0].apollo_data.compressed_data;
          if (data) {
            existingApolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(data, null, 2)}`;
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching existing lead data:', err);
    }

    // --- 1. Apollo.io Enrichment ---
    let apolloDataStr = existingApolloDataStr || '';
    let apolloRawData = null;
    let apolloCompressedData = null;
    const apolloApiKey = process.env.APOLLO_API_KEY;

    let apolloFailed = false;

    if (!existingApolloDataStr && apolloApiKey) {
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
          apolloRawData = apolloJson; // Save raw data for DB

          const person = apolloJson.person || {};
          const org = person.organization || {};

          apolloCompressedData = {
            title: person.title,
            seniority: person.seniority,
            primary_phone: person.primary_phone,
            estimated_num_employees: org.estimated_num_employees,
            industry: org.industry,
            technology_names: org.technology_names?.slice(0, 10) // Limit to top 10 to save tokens
          };

          apolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(apolloCompressedData, null, 2)}`;
        } else {
          console.warn('Apollo API error:', await apolloRes.text());
          apolloFailed = true;
        }
      } catch (err: any) {
        apolloFailed = true;
        if (err.name === 'AbortError') {
          console.warn('Apollo API timeout exceeded');
        } else {
          console.error('Error fetching from Apollo:', err);
        }
      }
    } else if (!existingApolloDataStr && !apolloApiKey) {
      // Missing API key counts as failed apollo for status logic
      apolloFailed = true;
    }

    // --- 2. AI Qualification using Gemini ---
    let geminiFailed = false;
    let geminiError = '';

    if (process.env.GEMINI_API_KEY) {
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-lite-latest',
        systemInstruction: `You are an expert B2B AI Consultant evaluator. Analyze this inbound lead for your consulting business. You must return ONLY a raw valid JSON object with the following schema, and no other text:
{
  "urgencyScore": (number 1-10, based on how urgently they need AI security/auditing based on answers and company context),
  "potentialScore": (number 1-10, based on their role, company size potential, and tech stack),
  "analysis": "1-2 sentence concise analysis of their vulnerability and why they are a good lead",
  "draftEmail": "A professional HTML-formatted reply draft to the lead addressing their specific pain points, proposing a brief introductory chat. Emphasize how you can help them specifically based on their answers. Sign it as 'Armando Maynez, B2B AI Consultant'."
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
1. AI tools accessed (last 30 days)? ${q1}
2. Operational data containing PII/IP? ${q2}
3. Data exposed via cloud AI breach? ${q3}
      `;

      try {
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
        } catch (e: any) {
          console.error('Failed to parse Gemini output as JSON:', responseText);
          geminiFailed = true;
          geminiError = 'failed to parse Gemini output';
        }
      } catch (e: any) {
         console.error('Failed to generate Gemini content:', e);
         geminiFailed = true;
         geminiError = e.message || 'Gemini API call failed';
      }

    } else {
      console.warn('GEMINI_API_KEY missing, skipping AI insights');
      geminiFailed = true;
      geminiError = 'missing GEMINI_API_KEY';
    }

    // Assign overall processing status
    if (apolloFailed && geminiFailed) {
      processingStatus = 'error: apollo_and_gemini';
    } else if (apolloFailed) {
      processingStatus = 'error: apollo';
    } else if (geminiFailed) {
      processingStatus = `error: gemini (${geminiError})`;
    } else {
      processingStatus = 'completed';
    }

    // --- 3. Send via Email (Gmail SMTP) ---
    // Only send email if we have draftEmail, indicating Gemini succeeded
    let emailSentSuccessfully = false;
    if (!geminiFailed && !emailAlreadySent) {
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
          subject: `[Lead: ${aiInsights.potentialScore}/10] AI Audit Request: ${escapeHtml(company)}`,
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
                <li><strong>Q1: AI tools accessed (last 30 days)?</strong><br> ${escapeHtml(q1)}</li>
                <li style="margin-top: 10px;"><strong>Q2: Operational data containing PII/IP?</strong><br> ${escapeHtml(q2)}</li>
                <li style="margin-top: 10px;"><strong>Q3: Data exposed via cloud AI breach?</strong><br> ${escapeHtml(q3)}</li>
              </ul>

              <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Drafted Email Response (via Gemini)</h3>
              <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: sans-serif; white-space: pre-wrap;">${aiInsights.draftEmail}</div>

              <p style="font-size: 0.9em; color: #666; margin-top: 20px;"><em>You can just click 'Reply' on this email to reply back directly to ${escapeHtml(name)}! Just copy formatting from the drafted response.</em></p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        emailSentSuccessfully = true;
      } else {
        console.warn('GMAIL_USER or GMAIL_APP_PASSWORD missing. Skipping email.');
      }
    }

    // --- 4. Update Database with Retry Logic ---
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        if (apolloRawData && apolloCompressedData && !existingApolloDataStr) {
           await pool.query(
             `UPDATE leads SET qualification = $1, processing_status = $2, apollo_data = $3${emailSentSuccessfully ? ', email_sent_at = NOW()' : ''} WHERE id = $4`,
             [JSON.stringify(aiInsights), processingStatus, JSON.stringify({ raw_data: apolloRawData, compressed_data: apolloCompressedData }), leadId]
           );
        } else {
           await pool.query(
             `UPDATE leads SET qualification = $1, processing_status = $2${emailSentSuccessfully ? ', email_sent_at = NOW()' : ''} WHERE id = $3`,
             [JSON.stringify(aiInsights), processingStatus, leadId]
           );
        }
        break; // Success
      } catch (dbErr: any) {
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
  } catch (globalErr: any) {
    console.error('Error in background processing:', globalErr);

    // Fatal error update
    try {
      await pool.query(
         `UPDATE leads SET processing_status = $1 WHERE id = $2`,
         [`error: ${globalErr.message}`, leadId]
      );
    } catch (e: any) {
      console.error('Failed to write fatal error to DB', e);
    }
  }
}
