'use client';
import React, { useState } from 'react';

type AuditLeadFormProps = {
  locale: string;
  dictionary: any;
  onClose?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

export default function AuditLeadForm({ locale, dictionary, onClose, onSuccess, onError }: AuditLeadFormProps) {
  const dict = dictionary.form;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', role: '',
    q1: '', q2: '', q3: '', linkedin: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.company || !formData.role) {
      setError(dict.requiredError);
      return false;
    }
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(formData.email)) {
      setError(dict.invalidEmailError);
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      const emailDomain = formData.email.split('@')[1]?.toLowerCase();
      if (emailDomain && GENERIC_DOMAINS.includes(emailDomain)) {
        if (!formData.linkedin) setFormData({ ...formData, linkedin: 'https://www.linkedin.com/in/' });
        setStep(3);
      } else {
        setStep(2);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit form');
      const successMsg = locale === 'es'
        ? '¡Solicitud de Auditoría Enviada con éxito!'
        : 'Audit Request Successfully Submitted!';
      if (onSuccess) onSuccess(successMsg);
      else { alert(successMsg); if (onClose) onClose(); }
    } catch (err: any) {
      const errMsg = err.message || (locale === 'es' ? 'Error al procesar la solicitud' : 'Error processing request');
      setError(errMsg);
      if (onError) onError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="audit-modal-overlay">
      <div className="audit-modal-content">
        <button className="audit-modal-close" onClick={onClose}>&times;</button>
        <div className="audit-header">
          <h2 className="audit-title">{step === 3 ? dict.fallbackTitle : dict.title}</h2>
          {step !== 3 && <span className="audit-step-indicator">{step === 1 ? dict.step1 : dict.step2}</span>}
        </div>

        {error && <div className="audit-error">{error}</div>}

        <form onSubmit={handleSubmit} className="audit-form">
          {step === 1 && (
            <div className="audit-step">
              <div className="audit-field">
                <label htmlFor="name">{dict.name}</label>
                <input id="name" type="text" name="name" value={formData.name} onChange={handleInputChange} className="audit-input" />
              </div>
              <div className="audit-field">
                <label htmlFor="email">{dict.email}</label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} className="audit-input" />
              </div>
              <div className="audit-field">
                <label htmlFor="company">{dict.company}</label>
                <input id="company" type="text" name="company" value={formData.company} onChange={handleInputChange} className="audit-input" />
              </div>
              <div className="audit-field">
                <label htmlFor="role">{dict.role}</label>
                <input id="role" type="text" name="role" value={formData.role} onChange={handleInputChange} className="audit-input" />
              </div>
              <button type="button" onClick={handleNext} className="btn-primary audit-button">
                {dict.next}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="audit-step">
              <div className="audit-field">
                <label htmlFor="q1" className="audit-question">{dict.q1}</label>
                <select id="q1" name="q1" value={formData.q1} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>—</option>
                  {dict.q1opts.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q2" className="audit-question">{dict.q2}</label>
                <select id="q2" name="q2" value={formData.q2} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>—</option>
                  {dict.q2opts.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q3" className="audit-question">{dict.q3}</label>
                <select id="q3" name="q3" value={formData.q3} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>—</option>
                  {dict.q3opts.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary audit-button" disabled={isSubmitting}>
                {isSubmitting ? (locale === 'es' ? 'Enviando...' : 'Sending...') : dict.submit}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="audit-step" style={{ textAlign: 'center', padding: '1rem 0' }}>
              <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {dict.fallbackMsg}
              </p>
              <div className="audit-field" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label htmlFor="linkedin">{dict.linkedin}</label>
                <input id="linkedin" type="url" name="linkedin" placeholder={dict.linkedinPlaceholder} value={formData.linkedin} onChange={handleInputChange} className="audit-input" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button type="button" onClick={() => {
                  const trimmed = formData.linkedin.trim();
                  if (!trimmed) { setError(dict.requiredError); return; }
                  const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
                  if (!LINKEDIN_REGEX.test(trimmed)) { setError(dict.invalidLinkedinError); return; }
                  setError(''); setStep(2);
                }} className="btn-primary audit-button">
                  {dict.submitAnyway}
                </button>
                <button type="button" onClick={onClose} className="btn-secondary audit-button">
                  {dict.close}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="audit-disclaimer">{dict.disclaimer}</p>
      </div>
    </div>
  );
}
