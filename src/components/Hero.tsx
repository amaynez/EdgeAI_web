'use client';
import { useState } from 'react';
import Image from 'next/image';
import AuditLeadForm from './AuditLeadForm';

export default function Hero({ dictionary }: { dictionary: any }) {
  const [formOpen, setFormOpen] = useState(false);
  const h = dictionary.hero;

  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="hero-badge">{h.badge}</span>
          <h1 className="hero-h1">{h.h1}</h1>
          <p className="hero-sub">{h.subH1}</p>
          <div className="hero-btns">
            <button
              className="btn-primary"
              id="hero-cta"
              onClick={() => setFormOpen(true)}
            >
              {h.ctaPrimary}
              <span>→</span>
            </button>
            <button className="btn-secondary" onClick={() => document.getElementById('proof')?.scrollIntoView({ behavior: 'smooth' })}>{h.ctaSecondary}</button>
          </div>
        </div>

        {/* Right analytics card */}
        <div className="hero-card">
          <div className="hero-card-glow" />
          <Image
            src="/analytics-dashboard.jpg"
            alt="Margin Analysis Dashboard"
            width={480}
            height={270}
            className="hero-card-img"
            style={{ display: 'block' }}
          />
          <div className="hero-card-stats">
            <div>
              <p className="hero-stat-label">{h.statRecoveryLabel}</p>
              <p className="hero-stat-value-green">{h.statRecoveryValue}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="hero-stat-label">{h.statLeakLabel}</p>
              <p className="hero-stat-value-red">{h.statLeakValue}</p>
            </div>
          </div>
        </div>
      </div>

      {formOpen && (
        <AuditLeadForm
          formCopy={dictionary.form}
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
        />
      )}
    </section>
  );
}
