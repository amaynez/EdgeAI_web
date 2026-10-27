"use server";

import { pool, ensureLeadsTable } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/config";

async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return false;
  }
  return true;
}

export async function fetchLeads() {
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    return { success: false, error: 'Unauthorized' };
  }

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
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    return { success: false, error: 'Unauthorized' };
  }

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
