import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import fs from 'fs';
import path from 'path';
import LeadsTable from './LeadsTable';
import './leads.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LeadsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.email !== 'armando.maynez@gmail.com') {
    redirect('/api/auth/signin?callbackUrl=/leads');
  }

  const leadsFilePath = path.join(process.cwd(), 'data', 'leads.json');
  let leads = [];

  try {
    if (fs.existsSync(leadsFilePath)) {
      const fileContent = fs.readFileSync(leadsFilePath, 'utf8');
      leads = JSON.parse(fileContent);
      
      // Sort by urgency from most urgent to least urgent
      leads.sort((a: any, b: any) => {
        const scoreA = a.qualification?.urgencyScore || 0;
        const scoreB = b.qualification?.urgencyScore || 0;
        return scoreB - scoreA; // descending
      });
    }
  } catch (error) {
    console.error("Error reading leads file", error);
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
