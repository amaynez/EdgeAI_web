'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import LanguageSelector from './LanguageSelector';
import AuditLeadForm from './AuditLeadForm';

export default function Navigation({
  siteTitle,
  currentLocale,
  nav,
  formCopy
}: {
  siteTitle: string;
  currentLocale: string;
  nav: any;
  formCopy: any;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          } else {
            // Only unset if the section losing intersection is the currently active one.
            setActiveSection((prev) => (prev === entry.target.id ? null : prev));
          }
        });
      },
      {
        rootMargin: '-50% 0px -50% 0px', // Trigger when section is in the middle of the viewport
      }
    );

    const insightsSection = document.getElementById('insights');
    const consultationSection = document.getElementById('consultation');

    if (insightsSection) observer.observe(insightsSection);
    if (consultationSection) observer.observe(consultationSection);

    return () => {
      if (insightsSection) observer.unobserve(insightsSection);
      if (consultationSection) observer.unobserve(consultationSection);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
        return;
      }
      
      // Simple focus trap
      if (e.key === 'Tab' && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <nav className="main-nav">
        <div className="nav-container">
          <Link href={`/${currentLocale}`} className="nav-wordmark">{siteTitle}</Link>

          <div className="nav-links ">
            <a href="#insights" className={`nav-link ${activeSection === 'insights' ? 'nav-link-active' : ''}`} {...(activeSection === 'insights' ? { 'aria-current': 'location' } : {})}>{nav.insights}</a>
            <a href="#consultation" className={`nav-link ${activeSection === 'consultation' ? 'nav-link-active' : ''}`} {...(activeSection === 'consultation' ? { 'aria-current': 'location' } : {})}>{nav.partnerStrategy}</a>
          </div>

          <div className="nav-right">
            <div className=" items-center gap-6">
              <LanguageSelector currentLocale={currentLocale} />
              <button
                className="nav-cta-btn"
                onClick={() => setFormOpen(true)}
                id="nav-cta-desktop"
              >
                {nav.cta}
              </button>
            </div>
            
            <button
              ref={buttonRef}
              className="nav-hamburger "
              onClick={toggleMenu}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleMenu();
                }
              }}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle mobile menu"
            >
              <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>☰</span>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div 
            id="mobile-menu" 
            ref={menuRef}
            className=" bg-white w-full border-t border-slate-200 p-4 flex flex-col gap-4 absolute top-full left-0 shadow-lg"
          >
            <a href="#insights" className="nav-link" onClick={() => setMenuOpen(false)}>{nav.insights}</a>
            <a href="#consultation" className="nav-link" onClick={() => setMenuOpen(false)}>{nav.partnerStrategy}</a>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
              <LanguageSelector currentLocale={currentLocale} />
              <button
                className="nav-cta-btn w-full text-center"
                onClick={() => { setFormOpen(true); setMenuOpen(false); }}
                id="nav-cta-mobile"
              >
                {nav.cta}
              </button>
            </div>
          </div>
        )}
      </nav>

      {formOpen && (
        <AuditLeadForm
          formCopy={formCopy}
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
        />
      )}
    </>
  );
}
