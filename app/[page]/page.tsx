import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
const PAGES: Record<string, { title: string; body: string[] }> = {
  about: { title: 'About us', body: ['LOLLOOP is a free browser gaming platform of quick, funny mini-games. One more game. One more laugh.', 'You can play everything without an account. Create one only if you want your scores saved permanently and shown on leaderboards.'] },
  contact: { title: 'Contact us', body: ['Questions, feedback or game ideas? Email us at hello@lolloop.example (replace with your address before launch).'] },
  privacy: { title: 'Privacy Policy', body: ['Guests: scores and settings are stored only in your browser (localStorage). We do not collect personal data from guests.', 'Accounts: if you register we store your email, a public username and your saved scores. We never show your email publicly.', 'Advertising: if enabled, Google AdSense may use cookies to serve ads. Where required, ads load only after consent. Analytics, if enabled, are privacy-conscious.', 'You can ask us to delete your account and data at any time via the contact page.'] },
  terms: { title: 'Terms and Conditions', body: ['LOLLOOP is provided free of charge and as is. Do not cheat, attack the service or submit abusive usernames. We may remove scores or accounts that break these rules.', 'Multiplayer rooms are for fun. Do not share personal information in names.'] },
};
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(PAGES).map((page) => ({ page }));
export const generateMetadata = ({ params }: { params: { page: string } }): Metadata => ({ title: PAGES[params.page]?.title, alternates: { canonical: `/${params.page}` } });
export default function Info({ params }: { params: { page: string } }) {
  const p = PAGES[params.page]; if (!p) notFound();
  return <main className="mx-auto max-w-2xl space-y-4 px-4 py-8"><h1 className="text-4xl font-extrabold tracking-tight">{p.title}</h1>{p.body.map((t) => <p key={t} className="leading-7">{t}</p>)}</main>;
}
