import { getDictionary, locales } from '@/i18n';
import Navigation from '@/components/Navigation';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { manrope, newsreader } from '../fonts';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} className={`${manrope.variable} ${newsreader.variable}`}>
      <body>
        <Navigation
          siteTitle={dictionary.siteTitle}
          currentLocale={locale}
          nav={dictionary.nav}
          formCopy={dictionary.form}
        />
        <main className="main-content">
          {children}
        </main>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
