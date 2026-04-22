import { getDictionary } from '@/i18n';
import Hero from '@/components/Hero';
import TheAlgorithm from '@/components/TheAlgorithm';
import IACeroFuga from '@/components/IACeroFuga';
import Expertise from '@/components/Expertise';
import CtaPanel from '@/components/CtaPanel';
import Proof from '@/components/Proof';
import SiteFooter from '@/components/Footer';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div className="home-container">
      <Hero dictionary={dictionary} />
      <TheAlgorithm dictionary={dictionary} />
      <IACeroFuga dictionary={dictionary} />
      <Expertise dictionary={dictionary} />
      <CtaPanel dictionary={dictionary} locale={locale} />
      <Proof dictionary={dictionary} />
      <SiteFooter dictionary={dictionary} />
    </div>
  );
}
