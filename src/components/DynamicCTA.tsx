export default function DynamicCTA({ ctaText }: { ctaText: string }) {
  return (
    <section className="cta-section">
      <button className="brutalist-button cta-button">
        {ctaText}
      </button>
    </section>
  );
}
