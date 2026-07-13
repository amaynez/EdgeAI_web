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

export interface ApolloData {
  raw_data: unknown;
  compressed_data: {
    title?: string;
    seniority?: string;
    primary_phone?: string;
    estimated_num_employees?: number;
    industry?: string;
    technology_names?: string[];
  };
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
