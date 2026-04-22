'use client';
import { useState } from 'react';
import AuditLeadForm from './AuditLeadForm';

export default function CtaPanel({ cta, formCopy, locale }: { cta: any; formCopy: any; locale: string }) {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const c = cta;

  const features = [
    { title: c.feature1Title, body: c.feature1Body },
    { title: c.feature2Title, body: c.feature2Body },
    { title: c.feature3Title, body: c.feature3Body },
  ];

  return (
    <section className="cta-section" id="consultation">
      <div className="cta-inner">
        <div className="cta-panel">
          {/* Grid background SVG */}
          <svg className="cta-panel-bg" fill="none" viewBox="0 0 400 400" aria-hidden="true">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <div className="cta-panel-inner">
            <div style={{ flex: 1 }}>
              <span className="cta-panel-badge">{c.badge}</span>
              <h2 className="cta-panel-heading font-serif">{c.heading}</h2>
              <p className="cta-panel-body">{c.body}</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <button
                  id="cta-panel-audit"
                  className="cta-panel-btn"
                  onClick={() => setOpen(true)}
                >
                  {c.ctaPrimary}
                  <span className="btn-arrow">→</span>
                </button>
                {successMessage && (
                  <p className="cta-message cta-success" aria-live="polite" aria-atomic="true" role="status">{successMessage}</p>
                )}
              </div>
            </div>

            <div className="cta-panel-features">
              {features.map((f, i) => (
                <div key={i}>
                  <h4 className="cta-feature-title font-serif">{f.title}</h4>
                  <p className="cta-feature-body">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {open && (
        <AuditLeadForm
          formCopy={formCopy}
          onClose={() => setOpen(false)}
          onSuccess={(msg) => { setSuccessMessage(msg); setOpen(false); }}
        />
      )}
    </section>
  );
}
