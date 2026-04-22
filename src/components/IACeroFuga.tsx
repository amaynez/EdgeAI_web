import Image from 'next/image';

export default function IACeroFuga({ dictionary }: { dictionary: any }) {
  const s = dictionary.solution;

  const features = [
    { title: s.feature1Title, body: s.feature1Body },
    { title: s.feature2Title, body: s.feature2Body },
    { title: s.feature3Title, body: s.feature3Body },
  ];

  return (
    <section className="solution-section">
      <div className="solution-inner">
        <div className="solution-grid">
          {/* Dark image panel */}
          <div className="solution-img-panel">
            <Image
              src="/analytics-dashboard.jpg"
              alt="IA Cero Fuga secure infrastructure"
              fill
              style={{ objectFit: 'cover' }}
            />
            <div className="solution-img-overlay">
              <div>
                <p className="solution-img-badge">{s.badge}</p>
                <h3 className="solution-img-title font-serif">IA Cero Fuga</h3>
                <div className="solution-img-divider" />
                <p className="solution-img-body">
                  Proprietary air-gapped intelligence for high-stakes financial auditing.
                </p>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="solution-copy">
            <h2 className="solution-heading">{s.heading}</h2>
            <p className="solution-body">{s.body}</p>
            <ul className="solution-features">
              {features.map((f, i) => (
                <li className="solution-feature" key={i}>
                  <span className="solution-feature-check">✓</span>
                  <div>
                    <p className="solution-feature-title">{f.title}</p>
                    <p className="solution-feature-body">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
