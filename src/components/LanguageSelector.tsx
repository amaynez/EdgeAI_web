'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/lib/locales';

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
      {SUPPORTED_LOCALES.map((locale, index) => (
        <React.Fragment key={locale}>
          {index > 0 && <span className="lang-divider">|</span>}
          <button
            className={`lang-btn ${currentLocale === locale ? 'active' : ''}`}
            onClick={() => switchLocale(locale)}
          >
            {locale.toUpperCase()}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
