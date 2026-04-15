"use client";

import React, { useState, useEffect, useRef } from 'react';
import { toggleContacted, fetchLeads } from './actions';

export default function LeadsTable({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLeads, setExpandedLeads] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  // Track in-flight toggle calls to prevent concurrent updates for the same lead.
  const pendingToggles = useRef<Set<string>>(new Set());
  const isPolling = useRef(false);

  useEffect(() => {
    // Ticking timer: update "now" every minute
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // Only need minute-level precision
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Poll for updates if any lead is 'pending'
    const hasPending = leads.some(l => l.processing_status === 'pending');
    if (!hasPending) return;

    const pollInterval = setInterval(async () => {
      if (isPolling.current) return;
      isPolling.current = true;
      try {
        const result = await fetchLeads();
        if (result.success && result.leads) {
          setLeads(result.leads);
        }
      } catch (err) {
        console.error('Failed to poll leads:', err);
      } finally {
        isPolling.current = false;
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [leads]);

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

  const toggleApolloData = (id: string) => {
    setExpandedLeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleContacted = async (id: string, currentState: boolean) => {
    // Prevent concurrent in-flight calls for the same lead.
    if (pendingToggles.current.has(id)) return;
    pendingToggles.current.add(id);

    const newState = !currentState;
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, contacted: newState } : l));
    
    // Server execution
    try {
      const result = await toggleContacted(id, newState);
      if (!result.success) {
        console.error(result.error);
        // Revert if server reported a logical failure
        setLeads(prev => prev.map(l => l.id === id ? { ...l, contacted: currentState } : l));
      }
    } catch (err) {
      // Revert optimistic update on network / server crash
      console.error('toggleContacted failed:', err);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, contacted: currentState } : l));
    } finally {
      pendingToggles.current.delete(id);
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
        
        const hasApolloData = !!lead.apollo_data?.compressed_data;
        const isExpanded = expandedLeads.has(lead.id);
        const apolloData = lead.apollo_data?.compressed_data;

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
                {lead.processing_status === 'pending' ? (
                  <span style={{ color: 'var(--text-muted)' }}>⏳ AI Processing in background...</span>
                ) : lead.processing_status?.startsWith('error') ? (
                  <span style={{ color: '#dc2626' }}>❌ {lead.processing_status}</span>
                ) : (
                  lead.qualification?.analysis || 'AI Analysis Failed or Unavailable.'
                )}
              </div>

              <div className="lead-q-section">
                <div>
                  <span className="lead-q">Q: Can you name every AI tool your employees accessed in the last 30 days?</span> 
                  <span className="lead-a">{lead.q1}</span>
                </div>
                <div>
                  <span className="lead-q">Q: What percentage of your operational data contains PII or highly confidential IP?</span> 
                  <span className="lead-a">{lead.q2}</span>
                </div>
                <div>
                  <span className="lead-q">Q: If your tech vendors suffer a cloud AI breach, is your data exposed?</span> 
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
                  disabled={lead.processing_status === 'pending' || !lead.qualification?.draftEmail}
                  style={{ opacity: (lead.processing_status === 'pending' || !lead.qualification?.draftEmail) ? 0.5 : 1 }}
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
              <div className="email-content">
                {lead.processing_status === 'pending' ? (
                  <>⏳ <em>Draft email is being generated...</em></>
                ) : lead.processing_status?.startsWith('error') ? (
                  <span style={{ color: '#dc2626' }}>Error generating email: {lead.processing_status}</span>
                ) : lead.qualification?.draftEmail ? (
                  <div dangerouslySetInnerHTML={{ __html: lead.qualification.draftEmail }} />
                ) : (
                  'No draft generated.'
                )}
              </div>
            </div>
            {hasApolloData && (
              <div className="apollo-data-container">
                <button
                  className="apollo-toggle-btn"
                  onClick={() => toggleApolloData(lead.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`apollo-data-section-${lead.id}`}
                >
                  {isExpanded ? (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Hide Enrichment Data</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> View Enrichment Data (Apollo.io)</>
                  )}
                </button>

                {isExpanded && apolloData && (
                  <div className="apollo-data-section" id={`apollo-data-section-${lead.id}`}>
                    <div className="apollo-grid">
                      <div className="apollo-field">
                        <span className="apollo-label">Title:</span>
                        <span className="apollo-value">{apolloData.title || 'N/A'}</span>
                      </div>
                      <div className="apollo-field">
                        <span className="apollo-label">Seniority:</span>
                        <span className="apollo-value apollo-badge seniority-badge">{apolloData.seniority || 'N/A'}</span>
                      </div>
                      <div className="apollo-field">
                        <span className="apollo-label">Phone:</span>
                        <span className="apollo-value">{apolloData.primary_phone || 'N/A'}</span>
                      </div>
                      <div className="apollo-field">
                        <span className="apollo-label">Employees:</span>
                        <span className="apollo-value apollo-badge size-badge">{apolloData.estimated_num_employees || 'N/A'}</span>
                      </div>
                      <div className="apollo-field">
                        <span className="apollo-label">Industry:</span>
                        <span className="apollo-value apollo-badge industry-badge">{apolloData.industry || 'N/A'}</span>
                      </div>
                    </div>

                    {apolloData.technology_names && apolloData.technology_names.length > 0 && (
                      <div className="apollo-tech-stack">
                        <span className="apollo-label">Tech Stack:</span>
                        <div className="tech-badges">
                          {apolloData.technology_names.map((tech: string, idx: number) => (
                            <span key={idx} className="apollo-badge tech-badge">{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
