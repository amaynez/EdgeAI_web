export default function Hero({ dictionary }: { dictionary: any }) {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="brutalist-h1">{dictionary.hero.h1}</h1>
        <p className="brutalist-subh1">{dictionary.hero.subH1}</p>
      </div>
      <div className="video-placeholder">
        <div className="video-glow"></div>
        <span className="video-text">[ VIDEO PLACEHOLDER ]</span>
      </div>
    </section>
  );
}
