import { pool } from '@/lib/db';
import { LeadUpdateResult } from '@/lib/types';

export interface ExistingLeadRecord {
  qualification?: any;
  processing_status?: string | null;
  apollo_data?: any;
  email_sent_at?: string | Date | null;
  contacted?: boolean;
}

export async function getLeadById(leadId: string): Promise<ExistingLeadRecord | null> {
  const result = await pool.query(
    'SELECT qualification, processing_status, apollo_data, email_sent_at, contacted FROM leads WHERE id = $1',
    [leadId]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0] as ExistingLeadRecord;
}

export async function insertLeadErrorLog(leadId: string, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE leads SET processing_status = $1 WHERE id = $2`,
    [`error: ${errorMessage}`, leadId]
  );
}

export async function updateLeadRecord(res: LeadUpdateResult): Promise<void> {
  const { leadId, aiInsights, processingStatus, apolloData, emailSentSuccessfully } = res;

  const setClauses = [
    'qualification = $1',
    'processing_status = $2'
  ];
  const values: any[] = [JSON.stringify(aiInsights), processingStatus];

  if (apolloData) {
    values.push(JSON.stringify(apolloData));
    setClauses.push(`apollo_data = ${values.length}`);
  }

  if (emailSentSuccessfully) {
    setClauses.push('email_sent_at = NOW()');
  }

  values.push(leadId);
  const query = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = ${values.length}`;

  await pool.query(query, values);
}
