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

export async function bulkUpdateLeads(updates: LeadUpdateResult[]): Promise<void> {
  if (updates.length === 0) return;

  const ids: string[] = [];
  const qualifications: string[] = [];
  const statuses: string[] = [];
  const apolloDatas: string[] = [];
  const emailSents: boolean[] = [];

  for (const update of updates) {
    ids.push(update.leadId);
    qualifications.push(JSON.stringify(update.aiInsights));
    statuses.push(update.processingStatus);
    apolloDatas.push(update.apolloData ? JSON.stringify(update.apolloData) : JSON.stringify(null));
    emailSents.push(update.emailSentSuccessfully);
  }

  const query = `
    UPDATE leads AS l
    SET
        qualification = (u.qualification)::jsonb,
        processing_status = u.processing_status,
        apollo_data = CASE
            WHEN u.apollo_data != 'null' THEN (u.apollo_data)::jsonb
            ELSE l.apollo_data
        END,
        email_sent_at = CASE
            WHEN u.email_sent = true THEN NOW()
            ELSE l.email_sent_at
        END
    FROM (
        SELECT
            unnest($1::text[]) AS id,
            unnest($2::text[]) AS qualification,
            unnest($3::text[]) AS processing_status,
            unnest($4::text[]) AS apollo_data,
            unnest($5::boolean[]) AS email_sent
    ) AS u
    WHERE l.id = u.id;
  `;

  await pool.query(query, [
    ids,
    qualifications,
    statuses,
    apolloDatas,
    emailSents
  ]);
}

export async function bulkRecordErrors(errors: { leadId: string; errorMsg: string }[]): Promise<void> {
  if (errors.length === 0) return;

  const ids: string[] = [];
  const errorMsgs: string[] = [];

  for (const err of errors) {
    ids.push(err.leadId);
    errorMsgs.push(err.errorMsg);
  }

  const query = `
    UPDATE leads AS l
    SET processing_status = u.error_msg
    FROM (
        SELECT
            unnest($1::text[]) AS id,
            unnest($2::text[]) AS error_msg
    ) AS u
    WHERE l.id = u.id;
  `;

  await pool.query(query, [ids, errorMsgs]);
}
