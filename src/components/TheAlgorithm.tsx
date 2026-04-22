export default function TheAlgorithm({ dictionary }: { dictionary: any }) {
  const p = dictionary.problem;

  const cards = [
    { icon: '📉', title: p.card1Title, body: p.card1Body, footer: p.card1Footer },
    { icon: '💸', title: p.card2Title, body: p.card2Body, footer: p.card2Footer },
    { icon: '🛡', title: p.card3Title, body: p.card3Body, footer: p.card3Footer },
  ];

  return (
    <section className="problem-section" id="insights">
      <div className="problem-inner">
        <div className="problem-header">
          <h2 className="problem-heading">{p.heading}</h2>
          <p className="problem-body">{p.body}</p>
        </div>
        <div className="stat-cards">
          {cards.map((card, i) => (
            <div className="stat-card" key={i}>
              <div>
                <div className="stat-card-icon">{card.icon}</div>
                <h3 className="stat-card-title">{card.title}</h3>
                <p className="stat-card-body">{card.body}</p>
              </div>
              <div className="stat-card-footer">{card.footer}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
