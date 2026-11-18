import type { Metadata } from 'next';
import Link from 'next/link';
import { dailyGame } from '@/lib/games';
export const metadata: Metadata = { title: 'Daily challenge', description: "Today's LOLLOOP challenge. Come back tomorrow for a new one.", alternates: { canonical: '/daily-challenge' } };
export const dynamic = 'force-dynamic';
export default function Daily() {
  const g = dailyGame();
  return <main className="mx-auto max-w-xl px-4 py-8"><h1 className="text-4xl font-extrabold tracking-tight">Daily challenge</h1>
    <div className="mt-6 rounded-3xl bg-cream p-6 text-center"><p className="text-6xl" aria-hidden>{g.emoji}</p><p className="mt-3 text-2xl font-extrabold">{g.name}</p><p className="mt-2">{g.description}</p><Link href={`/games/${g.slug}`} className="mt-5 inline-block rounded-full bg-marigold px-7 py-3.5 font-bold">Play today's challenge</Link></div>
    <p className="mt-4 text-sm font-semibold opacity-70">A new game every day (UTC). Saved scores keep your daily streak.</p></main>;
}
