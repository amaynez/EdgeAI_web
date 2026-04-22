'use client';
import { useState } from 'react';
import LanguageSelector from './LanguageSelector';
import AuditLeadForm from './AuditLeadForm';

export default function Navigation({
  siteTitle,
  currentLocale,
  dictionary,
}: {
  siteTitle: string;
  currentLocale: string;
  dictionary: any;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const nav = dictionary.nav;

  return (
    <>
      <nav className="main-nav">
        <div className="nav-container">
          <a href="#" className="nav-wordmark">{siteTitle}</a>

          <div className="nav-links">
            <a href="#insights" className="nav-link">{nav.insights}</a>
            <a href="#consultation" className="nav-link nav-link-active">{nav.partnerStrategy}</a>
          </div>

          <div className="nav-right">
            <LanguageSelector currentLocale={currentLocale} />
            <button
              className="nav-cta-btn"
              onClick={() => setFormOpen(true)}
              id="nav-cta"
            >
              {nav.cta}
            </button>
            <div className="nav-hamburger">
              <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>☰</span>
            </div>
          </div>
        </div>
      </nav>

      {formOpen && (
        <AuditLeadForm
          locale={currentLocale}
          dictionary={dictionary}
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
        />
      )}
    </>
  );
}
