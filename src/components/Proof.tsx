export default function Proof({ dictionary }: { dictionary: any }) {
  const p = dictionary.proof;

  return (
    <section className="proof-section" id="proof">
      <div className="proof-inner">
        <div className="proof-card">
          <div className="proof-copy">
            <h2 className="proof-heading font-serif">{p.heading}</h2>
            <p className="proof-body">{p.body}</p>
            <div className="proof-stat-box">
              <p className="proof-stat-value font-serif">{p.statValue}</p>
              <p className="proof-stat-label">{p.statLabel}</p>
            </div>
          </div>

          <div className="proof-bars">
            <div>
              <div className="bar-label-row">
                <span className="bar-label">{p.bar1Label}</span>
                <span className="bar-value font-serif">{p.bar1Value}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill-red" style={{ width: p.bar1Value.includes('%') ? p.bar1Value : '85%' }} />
              </div>
            </div>
            <div>
              <div className="bar-label-row">
                <span className="bar-label">{p.bar2Label}</span>
                <span className="bar-value-green">{p.bar2Value}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill-green" style={{ width: p.bar2Value.includes('%') ? p.bar2Value : '98%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
