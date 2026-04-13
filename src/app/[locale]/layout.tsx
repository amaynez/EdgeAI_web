import { getDictionary, locales } from '@/i18n';
import Navigation from '@/components/Navigation';

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
    <>
      <Navigation siteTitle={dictionary.siteTitle} currentLocale={locale} />
      <main className="main-content">
        {children}
      </main>
    </>
  );
}
