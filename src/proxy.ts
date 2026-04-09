import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, Locale } from './i18n';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Detect the best locale for a user using a priority cascade:
 *
 * 1. Explicit cookie  – the user (or a previous visit) already chose a locale.
 * 2. Accept-Language  – browser / OS language preferences sent by the client.
 * 3. Default locale   – safe fallback when nothing else matches.
 */
function detectLocale(request: NextRequest): Locale {
  // 1. Honour a previously persisted preference cookie.
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  // 2. Parse the Accept-Language header sent by the browser / OS.
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  if (acceptLanguage) {
    // Parse entries like: "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7"
    const preferred = acceptLanguage
      .split(',')
      .map((entry) => {
        const [tag, qRaw] = entry.trim().split(';q=');
        const q = qRaw !== undefined ? parseFloat(qRaw) : 1.0;
        return { tag: tag.trim().toLowerCase(), q };
      })
      .sort((a, b) => b.q - a.q); // highest quality first

    for (const { tag } of preferred) {
      // Match full tag first (e.g. "es-mx" → "es"), then two-letter prefix.
      const base = tag.split('-')[0];
      const match = (locales as readonly string[]).find(
        (loc) => loc === tag || loc === base
      );
      if (match) return match as Locale;
    }
  }

  // 3. Fall back to the application default.
  return defaultLocale as Locale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the URL already contains a valid locale segment, pass through.
  const pathnameHasLocale = (locales as readonly string[]).some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Detect the right locale and redirect.
  const locale = detectLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(request.nextUrl);

  // Persist the detected locale so future visits skip detection.
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}

export const config = {
  matcher: [
    // Skip _next, api, leads, and any path with a file extension (static assets)
    '/((?!_next|api|favicon.ico|leads|.*\\..*).*)',
  ],
};
