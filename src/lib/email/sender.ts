import nodemailer from 'nodemailer';
import { AIInsights, PersonaConfig, LeadData } from '@/lib/types';

// HTML-escape helper — prevents XSS when interpolating user data into email HTML.
export function escapeHtml(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendEmailNotification(
  aiInsights: AIInsights,
  leadData: LeadData,
  config: PersonaConfig
): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('GMAIL_USER or GMAIL_APP_PASSWORD missing. Skipping email.');
    return false;
  }

  const { name, role, company, email, linkedin, q1, q2, q3 } = leadData;
  const content = config.emailContent(aiInsights, company);

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
    subject: content.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="border-bottom: 2px solid #000; padding-bottom: 10px;">${content.header}</h2>

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
          <li><strong>Q1: ${content.q1}</strong><br> ${escapeHtml(q1)}</li>
          <li style="margin-top: 10px;"><strong>Q2: ${content.q2}</strong><br> ${escapeHtml(q2)}</li>
          <li style="margin-top: 10px;"><strong>Q3: ${content.q3}</strong><br> ${escapeHtml(q3)}</li>
        </ul>

        <h3 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px;">Drafted Email Response (via Gemini)</h3>
        <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px; font-family: sans-serif; white-space: pre-wrap;">${aiInsights.draftEmail}</div>

        <p style="font-size: 0.9em; color: #666; margin-top: 20px;"><em>You can just click 'Reply' on this email to reply back directly to ${escapeHtml(name)}! Just copy formatting from the drafted response.</em></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}
