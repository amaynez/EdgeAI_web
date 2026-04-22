import Image from 'next/image';

export default function Expertise({ dictionary }: { dictionary: any }) {
  const e = dictionary.expertise;

  return (
    <section className="expertise-section">
      <div className="expertise-inner">
        <div className="expertise-copy">
          <h2 className="expertise-heading">{e.heading}</h2>
          <p className="expertise-body">{e.body}</p>
          <div className="expertise-stats">
            <div>
              <p className="expertise-stat-value font-serif">{e.stat1Value}</p>
              <p className="expertise-stat-label">{e.stat1Label}</p>
            </div>
            <div>
              <p className="expertise-stat-value font-serif">{e.stat2Value}</p>
              <p className="expertise-stat-label">{e.stat2Label}</p>
            </div>
            <div>
              <p className="expertise-stat-value font-serif">{e.stat3Value}</p>
              <p className="expertise-stat-label">{e.stat3Label}</p>
            </div>
          </div>
        </div>

        <div className="expertise-photo-wrap">
          <Image
            src="/founder.jpg"
            alt={e.imageAlt || "Founder portrait"}
            width={480}
            height={600}
            className="expertise-photo"
            style={{ objectPosition: 'top center' }}
          />
          <div className="expertise-quote">
            <p className="expertise-quote-text">{e.quote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
