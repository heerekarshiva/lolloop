import type { Metadata } from 'next';
import Link from 'next/link';
import Nav from '@/components/Nav';
import SoundController from '@/components/SoundController';
import './globals.css';
const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const metadata: Metadata = {
  metadataBase: new URL(site), title: { default: 'LOLLOOP | One more game. One more laugh.', template: '%s | LOLLOOP' },
  description: 'Free funny browser mini-games, daily challenges and multiplayer rooms. No account needed.',
  openGraph: { siteName: 'LOLLOOP', type: 'website' }, alternates: { canonical: '/' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ads = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  return (
    <html lang="en"><head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
      {ads && <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads}`} crossOrigin="anonymous" />}
    </head>
    <body className="font-sans antialiased">
      <Nav />
      {children}
      <SoundController />
      <footer className="mx-auto mt-16 max-w-6xl px-4 pb-10 text-sm font-semibold">
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[rgba(25,27,31,0.06)] pt-6">
          {['about', 'contact', 'privacy', 'terms'].map((p) => <Link key={p} href={`/${p}`} className="capitalize underline-offset-4 hover:underline">{p === 'terms' ? 'Terms' : p === 'privacy' ? 'Privacy Policy' : p}</Link>)}
          <span className="opacity-60">© {new Date().getFullYear()} LOLLOOP. One more game. One more laugh.</span>
        </div>
      </footer>
    </body></html>
  );
}
