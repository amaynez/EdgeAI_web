import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, email, company, role, q1, q2, q3 } = data;

    if (!name || !email || !company || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
  
    // --- 2. Save to Local JSON File (Backup) ---
    const dataDir = path.join(process.cwd(), 'data');
    const leadsFile = path.join(dataDir, 'leads.json');

    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    let leads: any[] = [];
    try {
      const fileData = await fs.readFile(leadsFile, 'utf-8');
      leads = JSON.parse(fileData);
    } catch {
      // Ignore if file doesn't exist
    }

    leads.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...data,
      qualification: aiInsights
    });

    await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2), 'utf-8');

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
