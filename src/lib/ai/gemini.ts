import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeHtml } from '@/lib/sanitize';
import { AIInsights } from '../types/lead';

export type GenerateAIInsightsResult =
  | { ok: true; value: AIInsights }
  | { ok: false; reason: unknown; isMissingKey?: boolean; timeout?: boolean };

export async function generateAIInsights(
  systemInstruction: string,
  prompt: string
): Promise<GenerateAIInsightsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: 'missing GEMINI_API_KEY', isMissingKey: true };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-lite-latest',
    systemInstruction,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new Error('AbortError: Gemini request timed out'))
        );
      }),
    ]);

    const responseText = result.response
      .text()
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      const parsed = JSON.parse(responseText);
      const aiInsights: AIInsights = {
        urgencyScore: Number.isFinite(Number(parsed.urgencyScore))
          ? Number(parsed.urgencyScore)
          : 0,
        potentialScore: Number.isFinite(Number(parsed.potentialScore))
          ? Number(parsed.potentialScore)
          : 0,
        analysis:
          typeof parsed.analysis === 'string'
            ? parsed.analysis
            : 'AI Analysis Failed or Unavailable.',
        draftEmail: sanitizeHtml(parsed.draftEmail ?? ''),
      };
      return { ok: true, value: aiInsights };
    } catch (e: unknown) {
      return { ok: false, reason: 'failed to parse Gemini output as JSON' };
    }
  } catch (e: unknown) {
    const isAbort =
      e instanceof Error &&
      (e.message.includes('AbortError') || e.name === 'AbortError');
    if (isAbort) {
      return { ok: false, reason: 'timeout', timeout: true };
    } else {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : 'Gemini API call failed',
      };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
