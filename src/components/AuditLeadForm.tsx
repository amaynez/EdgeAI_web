'use client';
import React, { useState } from 'react';

type AuditLeadFormProps = {
  locale: string;
  onClose?: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

const dictionaries = {
  en: {
    title: "Request Audit",
    name: "Full Name",
    email: "Corporate Email",
    company: "Company",
    role: "Executive Role",
    next: "Continue to Assessment",
    q1: "Can you name every AI tool (public or private) your employees accessed in the last 30 days?",
    q1opts: ["Yes, we have total control", "No, it's impossible to track", "Not sure"],
    q2: "What percentage of your operational data contains PII or highly confidential IP?",
    q2opts: ["Over 50%", "Under 50%", "Not sure"],
    q3: "If your current tech vendors suffer a cloud AI breach, is your data exposed?",
    q3opts: ["Yes", "No, we are air-gapped", "We haven't audited this"],
    submit: "Execute Audit Request",
    disclaimer: "All submitted information is protected under strict NDA and is 100% LFPDPPP/GDPR compliant. We never share operational data.",
    step1: "1/2",
    step2: "2/2",
    emailError: "Please use a corporate email. Generic domains (gmail, yahoo, etc.) are restricted.",
    requiredError: "All fields are required.",
    invalidEmailError: "Please enter a valid email address.",
    fallbackTitle: "Corporate Email Required",
    fallbackMsg: "Customized AI security audits are reserved for verified corporate identities. Please re-enter your request using a company email address to proceed.",
    close: "Close"
  },
  es: {
    title: "Solicitar Auditoría",
    name: "Nombre Completo",
    email: "Correo Corporativo",
    company: "Empresa",
    role: "Cargo Directivo",
    next: "Continuar a la Evaluación",
    q1: "¿Puede nombrar todas las herramientas de IA (públicas o privadas) que sus empleados usaron en los últimos 30 días?",
    q1opts: ["Sí, tenemos control total", "No, es imposible saberlo", "No estoy seguro"],
    q2: "¿Qué porcentaje de sus datos operativos contiene información regulada por la LFPDPPP o datos confidenciales?",
    q2opts: ["Más del 50%", "Menos del 50%", "No estoy seguro"],
    q3: "Si sus proveedores tecnológicos actuales sufren una brecha de IA en la nube, ¿sus datos están expuestos?",
    q3opts: ["Sí", "No, estamos aislados", "No lo hemos auditado"],
    submit: "Ejecutar Solicitud de Auditoría",
    disclaimer: "Toda la información enviada está protegida bajo un estricto acuerdo de confidencialidad y cumple al 100% con la LFPDPPP. Nunca compartimos datos operativos.",
    step1: "1/2",
    step2: "2/2",
    emailError: "Por favor use un correo corporativo. Dominios genéricos (gmail, yahoo, etc.) no están permitidos.",
    requiredError: "Todos los campos son obligatorios.",
    invalidEmailError: "Por favor ingrese una dirección de correo válida.",
    fallbackTitle: "Correo Corporativo Requerido",
    fallbackMsg: "Las auditorías de seguridad de IA personalizadas están reservadas para identidades corporativas verificadas. Por favor, vuelve a ingresar tu solicitud usando una dirección de correo de tu empresa para continuar.",
    close: "Cerrar"
  }
};

const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

export default function AuditLeadForm({ locale, onClose, onSuccess, onError }: AuditLeadFormProps) {
  const dict = dictionaries[locale as keyof typeof dictionaries] || dictionaries.en;
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', company: '', role: '',
    q1: '', q2: '', q3: ''
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

    // Validate email format before allowing any downstream logic
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
        setError(dict.emailError);
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
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }
      
      const successMsg = locale === 'es' ? "¡Solicitud de Auditoría Enviada con éxito!" : "Audit Request Successfully Submitted!";
      if (onSuccess) {
        onSuccess(successMsg);
      } else {
        alert(successMsg);
        if (onClose) onClose();
      }
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
          <h2 className="brutalist-h2" style={{ marginBottom: 0 }}>{step === 3 ? dict.fallbackTitle : dict.title}</h2>
          {step !== 3 && (
            <span className="audit-step-indicator">{step === 1 ? dict.step1 : dict.step2}</span>
          )}
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
              <button type="button" onClick={handleNext} className="brutalist-button audit-button">
                {dict.next}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="audit-step">
              <div className="audit-field">
                <label htmlFor="q1" className="audit-question">{dict.q1}</label>
                <select id="q1" name="q1" value={formData.q1} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>-</option>
                  {dict.q1opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q2" className="audit-question">{dict.q2}</label>
                <select id="q2" name="q2" value={formData.q2} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>-</option>
                  {dict.q2opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q3" className="audit-question">{dict.q3}</label>
                <select id="q3" name="q3" value={formData.q3} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>-</option>
                  {dict.q3opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
               <button type="submit" className="brutalist-button audit-button" disabled={isSubmitting}>
                {isSubmitting ? (locale === 'es' ? 'Enviando...' : 'Sending...') : dict.submit}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="audit-step" style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "2rem" }}>
                {dict.fallbackMsg}
              </p>
              <button type="button" onClick={onClose} className="brutalist-button audit-button">
                {dict.close}
              </button>
            </div>
          )}
        </form>
        
        <p className="audit-disclaimer">{dict.disclaimer}</p>
      </div>
    </div>
  );
}
