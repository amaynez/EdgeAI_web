import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeHtml } from '@/lib/sanitize';
import { AIInsights, PersonaConfig } from '@/lib/types';
import { LeadData } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AIEnrichmentResult {
  aiInsights: AIInsights | null;
  failed: boolean;
  error: string;
}

export async function generateAIInsights(
  config: PersonaConfig,
  leadData: LeadData,
  apolloDataStr: string
): Promise<AIEnrichmentResult> {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY missing, skipping AI insights');
    return { aiInsights: null, failed: true, error: 'missing GEMINI_API_KEY' };
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction: config.systemInstruction
  });

  const prompt = config.prompt({ ...leadData, apolloDataStr });

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(responseText);
      const aiInsights: AIInsights = {
        urgencyScore: Number.isFinite(Number(parsed.urgencyScore)) ? Number(parsed.urgencyScore) : 0,
        potentialScore: Number.isFinite(Number(parsed.potentialScore)) ? Number(parsed.potentialScore) : 0,
        analysis: typeof parsed.analysis === 'string' ? parsed.analysis : 'AI Analysis Failed or Unavailable.',
        draftEmail: sanitizeHtml(parsed.draftEmail ?? ''),
      };

      return { aiInsights, failed: false, error: '' };
    } catch (e: any) {
      console.error('Failed to parse Gemini output as JSON:', responseText);
      return { aiInsights: null, failed: true, error: 'failed to parse Gemini output' };
    }
  } catch (e: any) {
    console.error('Failed to generate Gemini content:', e);
    return { aiInsights: null, failed: true, error: e.message || 'Gemini API call failed' };
  }
}
