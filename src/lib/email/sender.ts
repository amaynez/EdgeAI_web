import * as nodemailer from 'nodemailer';
import { escapeHtml } from '@/lib/sanitize';
import { AIInsights, LeadData } from '../types/lead';

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: unknown; isMissingCreds?: boolean };

export async function sendLeadEmail(
  leadData: LeadData,
  aiInsights: AIInsights,
  emailContent: {
    subject: string;
    header: string;
    q1: string;
    q2: string;
    q3: string;
  }
): Promise<SendEmailResult> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return { ok: false, reason: 'GMAIL_USER or GMAIL_APP_PASSWORD missing', isMissingCreds: true };
  }

  const { name, email, company, role, q1, q2, q3, linkedin } = leadData;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
      <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">${emailContent.header}</h2>

      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff;">
        <h3 style="margin-top: 0;">AI Qualification Insights</h3>
        <p><strong>Urgency Score:</strong>
          <span style="background-color: ${
            aiInsights.urgencyScore >= 7 ? '#ffc107' : '#e9ecef'
          }; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${
    aiInsights.urgencyScore
  }/10</span>
        </p>
        <p><strong>Potential Score:</strong>
          <span style="background-color: ${
            aiInsights.potentialScore >= 7 ? '#28a745' : '#e9ecef'
          }; color: ${
    aiInsights.potentialScore >= 7 ? '#fff' : '#000'
  }; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${
    aiInsights.potentialScore
  }/10</span>
        </p>
        <p><strong>Analysis:</strong> ${escapeHtml(aiInsights.analysis)}</p>
      </div>

      <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Executive Contact Identity</h3>
      <ul style="list-style-type: none; padding-left: 0;">
        <li style="margin-bottom: 8px;"><strong>Name:</strong> ${escapeHtml(name)}</li>
        <li style="margin-bottom: 8px;"><strong>Role:</strong> ${escapeHtml(role)}</li>
        <li style="margin-bottom: 8px;"><strong>Company:</strong> ${escapeHtml(company)}</li>
        <li style="margin-bottom: 8px;"><strong>Email:</strong> <a href="mailto:${encodeURIComponent(
          email
        )}" style="color: #007bff; text-decoration: none;">${escapeHtml(email)}</a></li>
        ${
          linkedin
            ? `<li style="margin-bottom: 8px;"><strong>LinkedIn:</strong> <a href="${escapeHtml(
                linkedin
              )}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none;">${escapeHtml(
                linkedin
              )}</a></li>`
            : ''
        }
      </ul>

      <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Vulnerability Assessment Answers</h3>
      <ul style="padding-left: 20px;">
        <li><strong>Q1: ${emailContent.q1}</strong><br> ${escapeHtml(q1 ?? '')}</li>
        <li style="margin-top: 10px;"><strong>Q2: ${emailContent.q2}</strong><br> ${escapeHtml(q2 ?? '')}</li>
        <li style="margin-top: 10px;"><strong>Q3: ${emailContent.q3}</strong><br> ${escapeHtml(q3 ?? '')}</li>
      </ul>

      <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Drafted Email Response (via Gemini)</h3>
      <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: sans-serif; white-space: pre-wrap;">${
        aiInsights.draftEmail
      }</div>

      <p style="font-size: 0.9em; color: #666; margin-top: 20px;"><em>You can just click 'Reply' on this email to reply back directly to ${escapeHtml(
        name
      )}! Just copy formatting from the drafted response.</em></p>
    </div>
  `;

  const mailOptions = {
    from: user,
    to: user, // Send to yourself
    replyTo: email,
    subject: emailContent.subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
