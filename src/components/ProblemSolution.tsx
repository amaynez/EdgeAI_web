export default function ProblemSolution({ dictionary }: { dictionary: any }) {
  return (
    <section className="problem-solution-section">
      <div className="section-block problem-block">
        <h2 className="brutalist-h2">{dictionary.problem.title}</h2>
        <p className="brutalist-p">{dictionary.problem.desc}</p>
      </div>

      <div className="section-block separator-block">
        <div className="separator-line"></div>
      </div>

      <div className="section-block solution-block">
        <h2 className="brutalist-h2">{dictionary.solution.h2}</h2>
        <p className="brutalist-p">{dictionary.solution.desc}</p>
      </div>
    </section>
  );
}
