"use server";

import { pool, ensureLeadsTable } from '@/lib/db';

export async function toggleContacted(leadId: string, contacted: boolean) {
  try {
    await ensureLeadsTable();
    const result = await pool.query(
      'UPDATE leads SET contacted = $1 WHERE id = $2',
      [contacted, leadId]
    );
    if (result.rowCount === 0) {
      return { success: false, error: 'Lead not found' };
    }
    return { success: true };
  } catch (error) {
    console.error('Error toggling contacted status:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
