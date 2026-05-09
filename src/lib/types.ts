export interface LeadData {
  name: string;
  email: string;
  company: string;
  role: string;
  q1?: string | null;
  q2?: string | null;
  q3?: string | null;
  linkedin?: string | null;
}

export interface AIInsights {
  urgencyScore: number;
  potentialScore: number;
  analysis: string;
  draftEmail: string;
}

export type Persona = 'AI_CONSULTANT' | 'MARGIN_RECOVERY';

export interface PersonaConfig {
  systemInstruction: string;
  prompt: (data: LeadData & { apolloDataStr: string }) => string;
  emailContent: (aiInsights: AIInsights, company: string) => {
    subject: string;
    header: string;
    q1: string;
    q2: string;
    q3: string;
  };
}

export interface LeadUpdateResult {
  leadId: string;
  aiInsights: AIInsights;
  processingStatus: string;
  apolloData: any | null; // using any to avoid cyclic dependency for now, or define ApolloData here
  emailSentSuccessfully: boolean;
}
