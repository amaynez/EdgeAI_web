'use client';

import { usePathname, useRouter } from 'next/navigation';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export default function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    if (newLocale === currentLocale) return;

    // Persist explicit user choice so future visits land on this locale.
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; max-age=${COOKIE_MAX_AGE}; path=/; samesite=lax`;

    const segments = pathname.split('/');
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
