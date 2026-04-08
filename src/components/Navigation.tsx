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
        <div className="logo">{siteTitle}</div>
        <LanguageSelector currentLocale={currentLocale} />
      </div>
    </nav>
  );
}
