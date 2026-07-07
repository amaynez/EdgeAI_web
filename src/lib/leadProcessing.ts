import { pool } from '@/lib/db';
import { LeadData, AIInsights, ApolloData, Persona, PersonaConfig } from './types/lead';
import { fetchApolloEnrichment } from './apollo/client';
import { generateAIInsights } from './ai/gemini';
import { sendLeadEmail } from './email/sender';
import { fetchLeadById, updateLead, LeadUpdateResult, PartialLeadRow } from './db/queries';

export { type LeadData, type AIInsights, type ApolloData, type Persona, type PersonaConfig };

const PERSONA_CONFIGS: Record<Persona, PersonaConfig> = {
  AI_CONSULTANT: {
    systemInstruction: `You are an expert B2B AI Consultant evaluator. Analyze this inbound lead for your consulting business. You must return ONLY a raw valid JSON object with the following schema, and no other text:
{
  "urgencyScore": (number 1-10, based on how urgently they need AI security/auditing based on answers and company context),
  "potentialScore": (number 1-10, based on their role, company size potential, and tech stack),
  "analysis": "1-2 sentence concise analysis of their vulnerability and why they are a good lead",
  "draftEmail": "A professional HTML-formatted reply draft to the lead addressing their specific pain points, proposing a brief introductory chat. Emphasize how you can help them specifically based on their answers. Sign it as 'Armando Maynez, B2B AI Consultant'."
}`,
    prompt: (d) => `
Lead Profile:
- Name: ${d.name}
- Role: ${d.role}
- Company: ${d.company}
${d.linkedin ? `- LinkedIn: ${d.linkedin}` : ''}
${d.apolloDataStr}

Assessment Answers:
1. AI tools accessed (last 30 days)? ${d.q1}
2. Operational data containing PII/IP? ${d.q2}
3. Data exposed via cloud AI breach? ${d.q3}
      `,
    emailContent: (ai, company) => ({
      subject: `[Lead: ${ai.potentialScore}/10] AI Audit Request: ${company}`,
      header: 'New AI Audit Lead Captured',
      q1: 'AI tools accessed (last 30 days)?',
      q2: 'Operational data containing PII/IP?',
      q3: 'Data exposed via cloud AI breach?'
    })
  },
  MARGIN_RECOVERY: {
    systemInstruction: `You are an expert B2B Margin Recovery Consultant evaluator. Analyze this inbound lead for your consulting business. You must return ONLY a raw valid JSON object with the following schema, and no other text:
{
  "urgencyScore": (number 1-10, based on how urgently they need margin recovery/auditing based on answers and company context),
  "potentialScore": (number 1-10, based on their role, company size potential, and retailer exposure),
  "analysis": "1-2 sentence concise analysis of their margin leakage vulnerability and why they are a good lead",
  "draftEmail": "A professional HTML-formatted reply draft to the lead addressing their specific pain points, proposing a brief introductory chat. Emphasize how you can help them specifically based on their answers. Sign it as 'Armando Maynez, Founder at Zero Leak'."
}`,
    prompt: (d) => `
Lead Profile:
- Name: ${d.name}
- Role: ${d.role}
- Company: ${d.company}
${d.linkedin ? `- LinkedIn: ${d.linkedin}` : ''}
${d.apolloDataStr}
Assessment Answers:
1. Retailers currently selling to? ${d.q1}
2. % of P&L attributed to trade spend/allowances? ${d.q2}
3. Experienced unexpected deductions/margin erosion in last 12 months? ${d.q3}
      `,
    emailContent: (ai, company) => ({
      subject: `[Lead: ${ai.potentialScore}/10] Strategic Audit Request: ${company}`,
      header: 'New Strategic Audit Lead Captured',
      q1: 'Retailers currently selling to?',
      q2: '% of P&L attributed to trade spend/allowances?',
      q3: 'Experienced unexpected deductions/margin erosion in last 12 months?'
    })
  }
};

/**
 * Extract context string and sent status from existing lead data to avoid redundant API calls.
 */
function extractExistingLeadContext(data: PartialLeadRow | undefined): { existingApolloDataStr: string | null; emailAlreadySent: boolean } {
  if (!data) return { existingApolloDataStr: null, emailAlreadySent: false };

  const emailAlreadySent = !!(data.email_sent_at || data.contacted);
  let existingApolloDataStr = null;

  if (data.apollo_data && data.apollo_data.raw_data) {
    const compressed = data.apollo_data.compressed_data;
    if (compressed) {
      existingApolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(compressed, null, 2)}`;
    }
  }

  return { existingApolloDataStr, emailAlreadySent };
}

export async function processLeadBackground(
  leadId: string,
  leadData: LeadData,
  options: {
    existingData?: PartialLeadRow;
    skipUpdate?: boolean;
    persona?: Persona;
  } = {}
): Promise<LeadUpdateResult | void> {
  const { email, linkedin, company } = leadData;
  const persona = options.persona || 'AI_CONSULTANT';
  const config = PERSONA_CONFIGS[persona];

  let processingStatus = 'completed';

  try {
    // --- 0. Check if existing context exists (e.g. from a prior run) ---
    let existingApolloDataStr: string | null = null;
    let emailAlreadySent = false;

    if (options.existingData) {
      ({ existingApolloDataStr, emailAlreadySent } = extractExistingLeadContext(options.existingData));
    } else {
      const dbRow = await fetchLeadById(leadId);
      ({ existingApolloDataStr, emailAlreadySent } = extractExistingLeadContext(dbRow || undefined));
    }

    // --- 1. Apollo.io Enrichment ---
    let apolloDataStr = existingApolloDataStr || '';
    let apolloDataToSave: ApolloData | null = null;
    let apolloFailed = false;

    if (!existingApolloDataStr) {
      const apolloRes = await fetchApolloEnrichment(email, linkedin);

      if (apolloRes.ok) {
        apolloDataStr = apolloRes.apolloDataStr;
        apolloDataToSave = apolloRes.value;
      } else {
        apolloFailed = true;
        if (!apolloRes.isMissingKey) {
          console.warn('Apollo fetch failed:', apolloRes.reason);
        }
      }
    } else if (!process.env.APOLLO_API_KEY) {
      // Logic for missing api key even if data exists
      apolloFailed = true;
    }

    // --- 2. AI Qualification using Gemini ---
    let geminiFailed = false;
    let geminiError = '';

    let aiInsights: AIInsights = {
      urgencyScore: 0,
      potentialScore: 0,
      analysis: 'AI Analysis Failed or Unavailable.',
      draftEmail: 'Failed to generate draft email.',
    };

    const prompt = config.prompt({ ...leadData, apolloDataStr });
    const geminiRes = await generateAIInsights(config.systemInstruction, prompt);

    if (geminiRes.ok) {
      aiInsights = geminiRes.value;
    } else {
      geminiFailed = true;
      geminiError = geminiRes.timeout ? 'timeout' : (geminiRes.isMissingKey ? 'missing GEMINI_API_KEY' : String(geminiRes.reason));
      if (!geminiRes.isMissingKey) {
        console.error('Gemini failure:', geminiRes.reason);
      } else {
        console.warn('GEMINI_API_KEY missing, skipping AI insights');
      }
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
      const emailContent = config.emailContent(aiInsights, company);
      const emailRes = await sendLeadEmail(leadData, aiInsights, emailContent);

      if (emailRes.ok) {
        emailSentSuccessfully = true;
      } else {
        if (emailRes.isMissingCreds) {
          console.warn('GMAIL_USER or GMAIL_APP_PASSWORD missing. Skipping email.');
        } else {
          console.error('Failed to send email:', emailRes.reason);
        }
      }
    }

    const result: LeadUpdateResult = {
      leadId,
      aiInsights,
      processingStatus,
      apolloData: apolloDataToSave,
      emailSentSuccessfully
    };

    if (options.skipUpdate) {
      return result;
    }

    // --- 4. Update Database ---
    try {
      await updateLead(result);
    } catch (dbErr: unknown) {
      console.error(`FATAL: Could not persist AI insights for lead ${leadId}. Payload:`, { aiInsights, processingStatus });
      throw dbErr; // Re-throw to be caught by globalErr and written to DB
    }
  } catch (globalErr: unknown) {
    console.error('Error in background processing:', globalErr);

    if (options.skipUpdate) {
      throw globalErr;
    }

    // Fatal error update
    try {
      const errorMessage = globalErr instanceof Error ? globalErr.message : String(globalErr);
      await pool.query(
         `UPDATE leads SET processing_status = $1 WHERE id = $2`,
         [`error: ${errorMessage}`, leadId]
      );
    } catch (e: unknown) {
      console.error('Failed to write fatal error to DB', e);
    }
  }
}
