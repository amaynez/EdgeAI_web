'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    const currentPathname = pathname;
    const segments = currentPathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/') || '/');
  };

  return (
    <div className="language-selector">
      <button 
        className={`lang-btn ${currentLocale === 'en' ? 'active' : ''}`} 
        onClick={() => switchLocale('en')}
      >
        EN
      </button>
      <span className="lang-divider">|</span>
      <button 
        className={`lang-btn ${currentLocale === 'es' ? 'active' : ''}`} 
        onClick={() => switchLocale('es')}
      >
        ES
      </button>
    </div>
  );
}
