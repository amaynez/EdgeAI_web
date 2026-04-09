"use server";

import fs from 'fs';
import path from 'path';

const leadsFilePath = path.join(process.cwd(), 'data', 'leads.json');

export async function toggleContacted(leadId: string, contacted: boolean) {
  try {
    if (!fs.existsSync(leadsFilePath)) {
      return { success: false, error: 'No leads database found' };
    }
    
    const fileContent = fs.readFileSync(leadsFilePath, 'utf8');
    const leads = JSON.parse(fileContent);

    const leadIndex = leads.findIndex((l: any) => l.id === leadId);
    if (leadIndex !== -1) {
      leads[leadIndex].contacted = contacted;
      fs.writeFileSync(leadsFilePath, JSON.stringify(leads, null, 2), 'utf8');
      return { success: true };
    }
    return { success: false, error: 'Lead not found' };
  } catch (error) {
    console.error('Error toggling contacted status:', error);
    return { success: false, error: 'Internal Server Error' };
  }
}
