import { pool } from '@/lib/db';
import { ApolloData, AIInsights } from '../types/lead';

export interface LeadUpdateResult {
  leadId: string;
  aiInsights: AIInsights;
  processingStatus: string;
  apolloData: ApolloData | null;
  emailSentSuccessfully: boolean;
}

export interface PartialLeadRow {
  apollo_data?: ApolloData | null;
  email_sent_at?: Date | null;
  contacted?: boolean;
}

export async function fetchLeadById(leadId: string): Promise<PartialLeadRow | null> {
  try {
    const { rows } = await pool.query(
      `SELECT apollo_data, email_sent_at, contacted FROM leads WHERE id = $1`,
      [leadId]
    );
    if (rows.length > 0) {
      return rows[0] as PartialLeadRow;
    }
    return null;
  } catch (err: unknown) {
    console.error('Error fetching existing lead data:', err);
    return null;
  }
}

export async function updateLead(res: LeadUpdateResult): Promise<void> {
  const { leadId, aiInsights, processingStatus, apolloData, emailSentSuccessfully } = res;

  const sets = ['qualification = $1', 'processing_status = $2'];
  const params: (string | number | null)[] = [JSON.stringify(aiInsights), processingStatus];

  if (apolloData) {
    params.push(JSON.stringify(apolloData));
    sets.push(`apollo_data = $${params.length}`);
  }

  if (emailSentSuccessfully) {
    sets.push('email_sent_at = NOW()');
  }

  params.push(leadId);
  const query = `UPDATE leads SET ${sets.join(', ')} WHERE id = $${params.length}`;

  await pool.query(query, params);
}

export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  await pool.query(`UPDATE leads SET processing_status = $1 WHERE id = $2`, [status, leadId]);
}
