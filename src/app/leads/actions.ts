"use server";

import { pool, ensureLeadsTable } from '@/lib/db';

export async function fetchLeads() {
  try {
    await ensureLeadsTable();
    const { rows } = await pool.query(
      `SELECT * FROM leads
       ORDER BY COALESCE((qualification->>'urgencyScore')::int, 0) DESC`
    );
    return { success: true, leads: rows };
  } catch (error) {
    console.error('Error reading leads from DB:', error);
    return { success: false, error: 'Failed to fetch leads' };
  }
}

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
