import Image from 'next/image';
import { getDictionary } from '@/i18n';
import Hero from '@/components/Hero';
import ProblemSolution from '@/components/ProblemSolution';
import DynamicCTA from '@/components/DynamicCTA';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div className="home-container">
      <Hero dictionary={dictionary} locale={locale} />
      <ProblemSolution dictionary={dictionary} />
      <DynamicCTA ctaText={dictionary.hero.cta} locale={locale} />

      <footer className="page-footer-logo">
        <Image
          src="/favicon_io/android-chrome-512x512.png"
          alt={dictionary.siteTitle}
          width={48}
          height={48}
          loading="lazy"
        />
        <span className="page-footer-copy">
          © {new Date().getFullYear()} {dictionary.siteTitle}. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
