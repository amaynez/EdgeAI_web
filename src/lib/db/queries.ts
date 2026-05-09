import { pool } from '@/lib/db';
import { LeadUpdateResult } from '@/lib/types';
import { ApolloData } from '@/lib/apollo/client';

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

  if (apolloData) {
    if (emailSentSuccessfully) {
      await pool.query(
        'UPDATE leads SET qualification = $1, processing_status = $2, apollo_data = $3, email_sent_at = NOW() WHERE id = $4',
        [JSON.stringify(aiInsights), processingStatus, JSON.stringify(apolloData), leadId]
      );
    } else {
      await pool.query(
        'UPDATE leads SET qualification = $1, processing_status = $2, apollo_data = $3 WHERE id = $4',
        [JSON.stringify(aiInsights), processingStatus, JSON.stringify(apolloData), leadId]
      );
    }
  } else {
    if (emailSentSuccessfully) {
      await pool.query(
        'UPDATE leads SET qualification = $1, processing_status = $2, email_sent_at = NOW() WHERE id = $3',
        [JSON.stringify(aiInsights), processingStatus, leadId]
      );
    } else {
      await pool.query(
        'UPDATE leads SET qualification = $1, processing_status = $2 WHERE id = $3',
        [JSON.stringify(aiInsights), processingStatus, leadId]
      );
    }
  }
}
