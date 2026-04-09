import '../globals.css';

export const metadata = {
  title: 'Lead HQ',
};

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}>
        {children}
      </body>
    </html>
  );
}
