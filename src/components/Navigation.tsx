import Image from 'next/image';
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
          <Image src="/favicon_io/android-chrome-192x192.png" alt={siteTitle} width={32} height={32} />
        </div>
        <LanguageSelector currentLocale={currentLocale} />
      </div>
    </nav>
  );
}
