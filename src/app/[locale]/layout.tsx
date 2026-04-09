import type { Metadata } from 'next';
import { getDictionary, locales } from '@/i18n';
import Navigation from '@/components/Navigation';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Zero Leak AI',
  description: 'Elite B2B AI Consulting - Air-Gapped infrastructure',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
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
