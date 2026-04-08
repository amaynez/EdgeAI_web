import type { Metadata } from 'next';
import { getDictionary, locales } from '@/i18n';
import Navigation from '@/components/Navigation';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Air-Gapped AI',
  description: 'Elite B2B AI Consulting - Air-Gapped infrastructure',
};

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body>
        <Navigation siteTitle={dictionary.siteTitle} currentLocale={locale} />
        <main className="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
