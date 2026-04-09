"use client";

import { useState, useEffect } from 'react';
import { toggleContacted } from './actions';

export default function LeadsTable({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Ticking timer: update "now" every minute
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Only need minute-level precision
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async (id: string, draftEmailHTML: string) => {
    try {
      const plainTextDiv = document.createElement("div");
      plainTextDiv.innerHTML = draftEmailHTML;
      const plainText = plainTextDiv.innerText;

      // Copying as HTML allows pasting with bold/styles preserved in Gmail
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([draftEmailHTML], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        })
      ]);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.error('Failed to copy. Trying fallback to plain text...', err);
      // Fallback for browsers that don't support ClipboardItem (like some versions of Firefox)
      try {
        const plainTextDiv = document.createElement("div");
        plainTextDiv.innerHTML = draftEmailHTML;
        await navigator.clipboard.writeText(plainTextDiv.innerText);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  };

  const handleToggleContacted = async (id: string, currentState: boolean) => {
    const newState = !currentState;
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, contacted: newState } : l));
    
    // Server execution
    const result = await toggleContacted(id, newState);
    if (!result.success) {
      console.error(result.error);
      // Revert if server failed
      setLeads(prev => prev.map(l => l.id === id ? { ...l, contacted: currentState } : l));
    }
  };

  if (leads.length === 0) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No leads found yet.</div>;
  }

  return (
    <div className="leads-grid">
      {leads.map((lead) => {
        const isHighUrgency = lead.qualification?.urgencyScore >= 8;
        const isContacted = !!lead.contacted;
        
        return (
          <div key={lead.id} className={`lead-card ${isHighUrgency ? 'lead-card-high-urgency' : ''}`} data-contacted={isContacted}>
            <div className="lead-info-col">
              <div className="lead-header">
                <h2>{lead.name}</h2>
                <div className="lead-meta">
                  <span className="meta-item">{lead.email}</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-item">{lead.role} at {lead.company}</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-item">Urgency: <strong>{lead.qualification?.urgencyScore}/10</strong></span>
                  <span className="meta-dot">•</span>
                  <span className="meta-item">Potential: <strong>{lead.qualification?.potentialScore}/10</strong></span>
                </div>
              </div>
              
              <div className="timestamp-row">
                <span className="timestamp-date">
                  Captured: <strong>{lead.timestamp ? new Date(lead.timestamp).toLocaleString() : 'Unknown'}</strong>
                </span>
                
                {!isContacted && lead.timestamp && (
                  (() => {
                    const captureTime = new Date(lead.timestamp).getTime();
                    const hoursElapsed = (now - captureTime) / (1000 * 60 * 60);
                    const isOverdue = hoursElapsed >= 24;
                    const hoursOnly = Math.floor(hoursElapsed);
                    const minutesOnly = Math.floor((hoursElapsed - hoursOnly) * 60);
                    
                    return (
                      <span className={`urgency-timer ${isOverdue ? 'timer-bad' : 'timer-good'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Waiting: {hoursOnly}h {minutesOnly}m
                      </span>
                    );
                  })()
                )}
              </div>
              
              <div className="lead-analysis">
                <strong>AI Analysis:</strong>
                {lead.qualification?.analysis}
              </div>

              <div className="lead-q-section">
                <div>
                  <span className="lead-q">Q: Has your company experienced an AI-related data breach?</span> 
                  <span className="lead-a">{lead.q1}</span>
                </div>
                <div>
                  <span className="lead-q">Q: What percentage of employee AI usage is currently visible to IT?</span> 
                  <span className="lead-a">{lead.q2}</span>
                </div>
                <div>
                  <span className="lead-q">Q: Would you be open to a 15-minute diagnostic call?</span> 
                  <span className="lead-a">{lead.q3}</span>
                </div>
              </div>
            </div>

            <div className="lead-email-col">
              <div className="email-actions">
                <label className="contacted-toggle" title="Mark this lead as contacted">
                  <input 
                    type="checkbox" 
                    checked={isContacted}
                    onChange={() => handleToggleContacted(lead.id, isContacted)}
                  />
                  <div className="custom-checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  {isContacted ? "Contacted" : "Mark Contacted"}
                </label>

                <button 
                  className={`copy-btn ${copiedId === lead.id ? 'copied' : ''}`} 
                  onClick={() => handleCopy(lead.id, lead.qualification?.draftEmail)}
                >
                  {copiedId === lead.id ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Copied for Gmail!
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Copy as Rich Text
                    </>
                  )}
                </button>
              </div>
              <div className="email-content" dangerouslySetInnerHTML={{ __html: lead.qualification?.draftEmail || 'No draft generated.' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
