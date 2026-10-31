"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toggleContacted, fetchLeads } from './actions';
import { sanitizeHtml } from '@/lib/sanitize';

// ⚡ Bolt Optimization:
// We moved the `now` state and timer into the individual `UrgencyTimer` component.
// Previously, this timer lived in the parent `LeadsTable`, causing a cascading re-render
// of the *entire list* of leads every 60 seconds.
// By isolating this state here, only the specific timers re-render, greatly improving performance for large lists.
const UrgencyTimer = ({ timestamp }: { timestamp: string | number | Date }) => {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (now === null) {
    return (
      <span className="urgency-timer" suppressHydrationWarning>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Waiting: --h --m
      </span>
    );
  }

  const captureTime = new Date(timestamp).getTime();
  const hoursElapsed = Math.max(0, (now - captureTime) / (1000 * 60 * 60));
  const isOverdue = hoursElapsed >= 24;
  const hoursOnly = Math.floor(hoursElapsed);
  const minutesOnly = Math.floor((hoursElapsed - hoursOnly) * 60);

  return (
    <span className={`urgency-timer ${isOverdue ? 'timer-bad' : 'timer-good'}`} suppressHydrationWarning>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      Waiting: {hoursOnly}h {minutesOnly}m
    </span>
  );
};

// ⚡ Bolt Optimization:
// Extracted Apollo enrichment data into an isolated `ApolloDataViewer` component.
// Previously, the `isExpanded` state was tracked in the parent `LeadsTable`, causing
// an O(N) re-render of the entire list whenever a single row was toggled.
// Localizing this state eliminates list-wide re-renders, significantly improving
// interaction performance on large lists.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ApolloDataViewer = ({ leadId, apolloData }: { leadId: string, apolloData: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!apolloData) return null;

  return (
    <div className="apollo-data-container">
      <button
        className="apollo-toggle-btn"
        onClick={() => setIsExpanded(prev => !prev)}
        aria-expanded={isExpanded}
        aria-controls={`apollo-data-section-${leadId}`}
      >
        {isExpanded ? (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Hide Enrichment Data</>
        ) : (
          <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> View Enrichment Data (Apollo.io)</>
        )}
      </button>

      {isExpanded && (
        <div className="apollo-data-section" id={`apollo-data-section-${leadId}`}>
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
  );
};

const CopyButton = ({ draftEmailHTML, disabled }: { draftEmailHTML?: string, disabled: boolean }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!draftEmailHTML) return;
    const sanitizedHTML = sanitizeHtml(draftEmailHTML || "");
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      sanitizedHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<\/div>/gi, '\n\n'),
      "text/html"
    );
    const plainText = (doc.body.textContent || "").trim();

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([sanitizedHTML], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy. Trying fallback to plain text...', err);
      try {
        await navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  };

  return (
    <button
      className={`copy-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {copied ? (
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
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LeadsTable({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [showUncontactedOnly, setShowUncontactedOnly] = useState(true);
  // Track in-flight toggle calls to prevent concurrent updates for the same lead.
  const pendingToggles = useRef<Set<string>>(new Set());
  const isPolling = useRef(false);

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
          // Prevent unnecessary re-renders if the fetched leads are identical to current leads
          // The JSON.stringify check is fast enough for the typical number of leads
          if (JSON.stringify(result.leads) !== JSON.stringify(leads)) {
            setLeads(result.leads);
          }
        }
      } catch (err) {
        console.error('Failed to poll leads:', err);
      } finally {
        isPolling.current = false;
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [leads]);

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

  const filteredLeads = useMemo(() => {
    return showUncontactedOnly ? leads.filter(l => !l.contacted) : leads;
  }, [leads, showUncontactedOnly]);

  if (leads.length === 0) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No leads found yet.</div>;
  }

  return (
    <div>
      <div className="view-toggle-container">
        <button type="button" className={`view-toggle-label ${!showUncontactedOnly ? 'active' : ''}`} onClick={() => setShowUncontactedOnly(false)}>All Leads</button>
        <label className="view-toggle-switch">
          <input
            type="checkbox"
            checked={showUncontactedOnly}
            onChange={(e) => setShowUncontactedOnly(e.target.checked)}
            aria-label="Toggle uncontacted leads only"
          />
          <span className="view-toggle-slider"></span>
        </label>
        <button type="button" className={`view-toggle-label ${showUncontactedOnly ? 'active' : ''}`} onClick={() => setShowUncontactedOnly(true)}>Uncontacted Only</button>
      </div>

      {filteredLeads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          No uncontacted leads left. Great job!
        </div>
      ) : (
        <div className="leads-grid">
          {filteredLeads.map((lead) => {
        const isHighUrgency = lead.qualification?.urgencyScore >= 8;
        const isContacted = !!lead.contacted;
        
        const hasApolloData = !!lead.apollo_data?.compressed_data;
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
                  <UrgencyTimer timestamp={lead.timestamp} />
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
                  <span className="lead-q">Q: Which retailers do you currently sell to?</span> 
                  <span className="lead-a">{lead.q1}</span>
                </div>
                <div>
                  <span className="lead-q">Q: Approximately what % of your P&L do you attribute to trade spend and allowances?</span> 
                  <span className="lead-a">{lead.q2}</span>
                </div>
                <div>
                  <span className="lead-q">Q: Have you experienced unexpected deductions or margin erosion from retailer chargebacks in the last 12 months?</span> 
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

                <CopyButton
                  draftEmailHTML={lead.qualification?.draftEmail}
                  disabled={lead.processing_status === 'pending' || !lead.qualification?.draftEmail}
                />
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
              <ApolloDataViewer leadId={lead.id} apolloData={apolloData} />
            )}
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
