import Image from "next/image";
import DynamicCTA from "./DynamicCTA";

export default function Hero({ dictionary, locale }: { dictionary: any, locale: string }) {
  return (
    <section className="hero-section">
      <div className="hero-logo-lockup">
        <Image
          src="/logo-zeroleakai.webp"
          alt={dictionary.siteTitle}
          width={320}
          height={320}
          className="hero-logo"
          priority
        />
      </div>

      <div className="hero-content">
        <h1 className="brutalist-h1">{dictionary.hero.h1}</h1>
        <p className="brutalist-subh1">{dictionary.hero.subH1}</p>
        <DynamicCTA ctaText={dictionary.hero.cta} locale={locale} isHero={true} />
      </div>

      <div className="hero-stats">
        <div className="hero-stat">
          <span className="hero-stat-number">100%</span>
          <span className="hero-stat-label">{dictionary.hero.stat1 ?? 'On-Premises'}</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-number">0</span>
          <span className="hero-stat-label">{dictionary.hero.stat2 ?? 'Data Leaks'}</span>
        </div>
        <div className="hero-stat-divider" />
        <div className="hero-stat">
          <span className="hero-stat-number">LFPDPPP</span>
          <span className="hero-stat-label">{dictionary.hero.stat3 ?? 'Compliant by Design'}</span>
        </div>
      </div>
    </section>
  );
}
