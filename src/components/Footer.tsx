export default function SiteFooter({ dictionary }: { dictionary: any }) {
  const f = dictionary.footer;
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <p className="footer-wordmark">Zero Leak.</p>
            <p className="footer-tagline">{f.tagline}</p>
          </div>
          <div>
            <p className="footer-col-title">{f.col1Title}</p>
            <div className="footer-links">
              <a href="#" className="footer-link">{f.link1}</a>
              <a href="#insights" className="footer-link">{f.link2}</a>
              <a href="#consultation" className="footer-link">{f.link3}</a>
            </div>
          </div>
          <div>
            <p className="footer-col-title">{f.col2Title}</p>
            <div className="footer-links">
              <a href="#" className="footer-link">{f.link4}</a>
              <a href="#" className="footer-link">{f.link5}</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© {year} {f.copyright}</p>
          <div className="footer-socials">
            <span className="footer-social-icon" title="Share">↗</span>
            <span className="footer-social-icon" title="Email">✉</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
