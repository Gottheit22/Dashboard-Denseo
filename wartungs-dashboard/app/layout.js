import './globals.css';

export const metadata = {
  title: 'Technik-Dashboard',
  description: 'Wartung, Installation, Protokolle und Notizen',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
