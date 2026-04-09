import LanguageSelector from './LanguageSelector';

export default function Navigation({
  siteTitle,
  currentLocale
}: {
  siteTitle: string;
  currentLocale: string;
}) {
  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="logo">
          <img src="/favicon_io/android-chrome-192x192.png" alt={siteTitle} height={32} style={{ display: 'block' }} />
        </div>
        <LanguageSelector currentLocale={currentLocale} />
      </div>
    </nav>
  );
}
