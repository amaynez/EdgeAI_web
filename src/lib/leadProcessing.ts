import { LeadData, Persona, PersonaConfig, AIInsights, LeadUpdateResult } from '@/lib/types';
import { fetchApolloEnrichment } from '@/lib/apollo/client';
import { generateAIInsights } from '@/lib/ai/gemini';
import { sendEmailNotification } from '@/lib/email/sender';
import { getLeadById, insertLeadErrorLog, updateLeadRecord } from '@/lib/db/queries';

export { updateLeadRecord as updateLead }; // Export under old name for backward compatibility with existing imports
export type { LeadData, Persona, AIInsights, LeadUpdateResult };

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

export async function processLeadBackground(
  leadId: string,
  leadData: LeadData,
  options: {
    skipUpdate?: boolean;
    persona?: Persona;
    existingData?: {
      qualification?: any;
      processing_status?: string | null;
      apollo_data?: any;
      email_sent_at?: string | Date | null;
      contacted?: boolean;
    };
  } = {}
) {
  const { email, linkedin } = leadData;
  const config = PERSONA_CONFIGS[options.persona || 'AI_CONSULTANT'];

  try {
    let aiInsights: AIInsights | null = null;
    let processingStatus = 'pending';
    let emailAlreadySent = false;
    let existingApolloDataStr = '';

    const existingData = options.existingData || await getLeadById(leadId);

    if (existingData) {
      if (existingData.qualification) {
         try {
           aiInsights = typeof existingData.qualification === 'string'
             ? JSON.parse(existingData.qualification) as AIInsights
             : existingData.qualification as AIInsights;
         } catch (e) {
           console.error('Failed to parse existing qualification:', e);
         }
      }
      if (existingData.processing_status) {
         processingStatus = existingData.processing_status;
      }
      if (existingData.email_sent_at || existingData.contacted) {
         emailAlreadySent = true;
      }
      if (existingData.apollo_data) {
        try {
          const parsedApollo = typeof existingData.apollo_data === 'string'
             ? JSON.parse(existingData.apollo_data)
             : existingData.apollo_data;

          if (parsedApollo && parsedApollo.compressed_data) {
             existingApolloDataStr = `\nApollo.io Enrichment Data (for context):\n${JSON.stringify(parsedApollo.compressed_data, null, 2)}`;
          }
        } catch (e) {
           console.error('Failed to parse existing apollo data:', e);
        }
      }
    }

    // --- 1. Apollo.io Enrichment ---
    let apolloDataStr = existingApolloDataStr;
    let apolloResult = null;
    let apolloFailed = false;

    if (!existingApolloDataStr) {
      apolloResult = await fetchApolloEnrichment(email, linkedin);
      apolloFailed = apolloResult.failed;
      if (!apolloFailed && apolloResult.dataStr) {
        apolloDataStr = apolloResult.dataStr;
      }
    }

    // --- 2. AI Qualification using Gemini ---
    let geminiFailed = false;
    let geminiError = '';

    if (!aiInsights) {
      const aiResult = await generateAIInsights(config, leadData, apolloDataStr);
      aiInsights = aiResult.aiInsights;
      geminiFailed = aiResult.failed;
      geminiError = aiResult.error;
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
    let emailSentSuccessfully = false;
    if (aiInsights && !geminiFailed && !emailAlreadySent) {
      emailSentSuccessfully = await sendEmailNotification(aiInsights, leadData, config);
    }

    const result: LeadUpdateResult = {
      leadId,
      aiInsights: aiInsights || { urgencyScore: 0, potentialScore: 0, analysis: '', draftEmail: '' },
      processingStatus,
      apolloData: apolloResult && !apolloResult.failed && apolloResult.rawData && apolloResult.compressedData
        ? { raw_data: apolloResult.rawData, compressed_data: apolloResult.compressedData }
        : null,
      emailSentSuccessfully
    };

    if (options.skipUpdate) {
      return result;
    }

    // --- 4. Update Database ---
    try {
      await updateLeadRecord(result);
    } catch (dbErr: unknown) {
      console.error(`FATAL: Could not persist AI insights for lead ${leadId}. Payload:`, { aiInsights, processingStatus });
      throw dbErr;
    }
  } catch (globalErr: unknown) {
    console.error('Error in background processing:', globalErr);

    if (options.skipUpdate) {
      throw globalErr;
    }

    // Fatal error update
    try {
      const errorMessage = globalErr instanceof Error ? globalErr.message : String(globalErr);
      await insertLeadErrorLog(leadId, errorMessage);
    } catch (e: unknown) {
      console.error('Failed to write fatal error to DB', e);
    }
  }
}
