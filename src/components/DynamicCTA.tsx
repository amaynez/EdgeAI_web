'use client';
import { useState } from 'react';
import AuditLeadForm from './AuditLeadForm';

export default function DynamicCTA({ ctaText, locale }: { ctaText: string, locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setIsOpen(false);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
  };

  return (
    <section className="cta-section">
      <button className="brutalist-button cta-button" onClick={() => setIsOpen(true)}>
        {ctaText} <span className="cta-arrow">&gt;</span>
      </button>

      {successMessage && (
        <div style={{ color: '#00ff00', marginTop: '1rem', fontWeight: 'bold' }}>
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div style={{ color: '#ff0000', marginTop: '1rem', fontWeight: 'bold' }}>
          {errorMessage}
        </div>
      )}

      {isOpen && (
        <AuditLeadForm 
          locale={locale} 
          onClose={() => setIsOpen(false)} 
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </section>
  );
}
