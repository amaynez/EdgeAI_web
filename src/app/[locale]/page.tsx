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
      <Hero dictionary={dictionary} />
      <ProblemSolution dictionary={dictionary} />
      <DynamicCTA ctaText={dictionary.cta} />
    </div>
  );
}
