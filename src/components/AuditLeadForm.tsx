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
    email: "Professional Email",
    company: "Company",
    role: "Executive Role",
    linkedin: "LinkedIn Profile URL",
    linkedinPlaceholder: "https://linkedin.com/in/yourprofile",
    next: "Continue to Assessment",
    q1: "Can you name every AI tool (public or private) your employees accessed in the last 30 days?",
    q1opts: [
      { value: 'none',     label: "Yes, we have total control" },
      { value: 'multiple', label: "No, it's impossible to track" },
      { value: 'unsure',   label: "Not sure" },
    ],
    q2: "What percentage of your operational data contains PII or highly confidential IP?",
    q2opts: [
      { value: 'yes',    label: "Over 50%" },
      { value: 'no',     label: "Under 50%" },
      { value: 'unsure', label: "Not sure" },
    ],
    q3: "If your current tech vendors suffer a cloud AI breach, is your data exposed?",
    q3opts: [
      { value: 'yes',    label: "Yes" },
      { value: 'no',     label: "No, we are air-gapped" },
      { value: 'unsure', label: "We haven't audited this" },
    ],
    submit: "Execute Audit Request",
    disclaimer: "All submitted information is protected under strict NDA and is 100% LFPDPPP/GDPR compliant. We never share operational data.",
    step1: "1/2",
    step2: "2/2",
    emailError: "Please use a corporate email. Generic domains (gmail, yahoo, etc.) are restricted.",
    requiredError: "All fields are required.",
    invalidEmailError: "Please enter a valid email address.",
    invalidLinkedinError: "Please enter a valid LinkedIn profile URL.",
    fallbackTitle: "Professional Identity Verification",
    fallbackMsg: "We noticed you're using a generic email provider. While we prioritize verified corporate domains, independent professionals may proceed by providing their LinkedIn profile for manual review.",
    submitAnyway: "Verify & Continue",
    close: "Close"
  },
  es: {
    title: "Solicitar Auditoría",
    name: "Nombre Completo",
    email: "Correo Profesional",
    company: "Empresa",
    role: "Cargo Directivo",
    linkedin: "URL del Perfil de LinkedIn",
    linkedinPlaceholder: "https://linkedin.com/in/tuperfil",
    next: "Continuar a la Evaluación",
    q1: "¿Puede nombrar todas las herramientas de IA (públicas o privadas) que sus empleados usaron en los últimos 30 días?",
    q1opts: [
      { value: 'none',     label: "Sí, tenemos control total" },
      { value: 'multiple', label: "No, es imposible saberlo" },
      { value: 'unsure',   label: "No estoy seguro" },
    ],
    q2: "¿Qué porcentaje de sus datos operativos contiene información regulada por la LFPDPPP o datos confidenciales?",
    q2opts: [
      { value: 'yes',    label: "Más del 50%" },
      { value: 'no',     label: "Menos del 50%" },
      { value: 'unsure', label: "No estoy seguro" },
    ],
    q3: "Si sus proveedores tecnológicos actuales sufren una brecha de IA en la nube, ¿sus datos están expuestos?",
    q3opts: [
      { value: 'yes',    label: "Sí" },
      { value: 'no',     label: "No, estamos aislados" },
      { value: 'unsure', label: "No lo hemos auditado" },
    ],
    submit: "Ejecutar Solicitud de Auditoría",
    disclaimer: "Toda la información enviada está protegida bajo un estricto acuerdo de confidencialidad y cumple al 100% con la LFPDPPP. Nunca compartimos datos operativos.",
    step1: "1/2",
    step2: "2/2",
    emailError: "Por favor use un correo corporativo. Dominios genéricos (gmail, yahoo, etc.) no están permitidos.",
    requiredError: "Todos los campos son obligatorios.",
    invalidEmailError: "Por favor ingrese una dirección de correo válida.",
    invalidLinkedinError: "Por favor ingrese una URL válida de perfil de LinkedIn.",
    fallbackTitle: "Verificación de Identidad Profesional",
    fallbackMsg: "Notamos que usas un proveedor de correo genérico. Aunque priorizamos dominios corporativos verificados, los profesionales independientes pueden continuar proporcionando su perfil de LinkedIn para revisión manual.",
    submitAnyway: "Verificar y Continuar",
    close: "Cerrar"
  }
};

const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

export default function AuditLeadForm({ locale, onClose, onSuccess, onError }: AuditLeadFormProps) {
  const dict = dictionaries[locale as keyof typeof dictionaries] || dictionaries.en;
  
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
                  {dict.q1opts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q2" className="audit-question">{dict.q2}</label>
                <select id="q2" name="q2" value={formData.q2} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>-</option>
                  {dict.q2opts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="audit-field">
                <label htmlFor="q3" className="audit-question">{dict.q3}</label>
                <select id="q3" name="q3" value={formData.q3} onChange={handleInputChange} className="audit-input" required>
                  <option value="" disabled>-</option>
                  {dict.q3opts.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
               <button type="submit" className="brutalist-button audit-button" disabled={isSubmitting}>
                {isSubmitting ? (locale === 'es' ? 'Enviando...' : 'Sending...') : dict.submit}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="audit-step" style={{ textAlign: "center", padding: "1rem 0" }}>
              <p style={{ fontSize: "1.0rem", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                {dict.fallbackMsg}
              </p>
              <div className="audit-field" style={{ textAlign: "left", marginBottom: "1.5rem" }}>
                <label htmlFor="linkedin">{dict.linkedin}</label>
                <input id="linkedin" type="url" name="linkedin" placeholder={dict.linkedinPlaceholder} value={formData.linkedin} onChange={handleInputChange} className="audit-input" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                 <button type="button" onClick={() => {
                   const trimmedUrl = formData.linkedin.trim();
                   if (!trimmedUrl) {
                     setError(dict.requiredError);
                     return;
                   }

                   const LINKEDIN_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?$/;
                   if (!LINKEDIN_REGEX.test(trimmedUrl)) {
                     setError(dict.invalidLinkedinError);
                     return;
                   }

                   setError('');
                   setStep(2);
                 }} className="brutalist-button audit-button">
                   {dict.submitAnyway}
                 </button>
                 <button type="button" onClick={onClose} className="brutalist-button audit-button" style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
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
