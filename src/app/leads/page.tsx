import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { pool, ensureLeadsTable } from '@/lib/db';
import LeadsTable from './LeadsTable';
import './leads.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.email !== 'armando.maynez@gmail.com') {
    redirect('/api/auth/signin?callbackUrl=/leads');
  }

  await ensureLeadsTable();
  let leads: any[] = [];

  try {
    const { rows } = await pool.query(
      `SELECT * FROM leads
       ORDER BY COALESCE((qualification->>'urgencyScore')::int, 0) DESC`
    );
    leads = rows;
  } catch (error) {
    console.error('Error reading leads from DB:', error);
  }

  return (
    <div className="leads-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="brutalist-h1" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', WebkitTextFillColor: 'var(--text-primary)' }}>Lead HQ</h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Authenticated as: <strong style={{ color: 'var(--text-primary)' }}>{session.user.email}</strong>
          </div>
        </div>
      </div>
      
      <LeadsTable initialLeads={leads} />
    </div>
  );
}
