import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import SoloGame from '@/components/SoloGame';
import MusicButton from '@/components/MusicButton';
import Ad from '@/components/Ad';
import { GAMES, bySlug, GameCategory } from '@/lib/games';

const CATS: Record<string, string> = {
  arcade: 'Arcade Games',
  puzzle: 'Puzzle & Brain Games',
  multiplayer: 'Multiplayer Games',
  adventure: 'Adventure & Cooperative Games',
  funny: 'Funny & Party Games',
};

export const dynamicParams = false;

export const generateStaticParams = () => {
  const categorySlugs = Object.keys(CATS);
  const gameSlugs = GAMES.map((g) => g.slug);
  return [...categorySlugs, ...gameSlugs].map((slug) => ({ slug }));
};

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = bySlug(params.slug);
  if (g) {
    return {
      title: `${g.name} – 3D Game`,
      description: g.description,
      alternates: { canonical: `/games/${g.slug}` },
      openGraph: {
        title: `${g.name} 3D | LOLLOOP`,
        description: g.description,
      },
    };
  }

  const catTitle = CATS[params.slug];
  if (catTitle) {
    return {
      title: catTitle,
      description: `Play 3D ${catTitle} on LOLLOOP. Free, instant, in your browser.`,
      alternates: { canonical: `/games/${params.slug}` },
    };
  }

  return { title: 'Game Not Found' };
}

export default function Page({ params }: { params: { slug: string } }) {
  const g = bySlug(params.slug);

  if (g) {
    const relatedGames = GAMES.filter(
      (item) => item.category === g.category && item.slug !== g.slug
    ).slice(0, 3);

    return (
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between text-xs font-bold text-ink/60">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span>/</span>
            <Link href="/games" className="hover:text-ink">Games</Link>
            <span>/</span>
            <Link href={`/games/${g.category}`} className="hover:text-ink capitalize">
              {g.category}
            </Link>
            <span>/</span>
            <span className="text-ink">{g.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <MusicButton theme={g.theme} />
          </div>
        </div>

        {/* Game Header */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-marigold text-ink text-xs font-black uppercase tracking-wider">
              3D WebGL
            </span>
            <span className="px-3 py-1 rounded-full bg-field text-ink text-xs font-bold capitalize">
              {g.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-field text-ink text-xs font-bold">
              Difficulty: {g.difficulty}
            </span>
            <span className="px-3 py-1 rounded-full bg-field text-ink text-xs font-bold">
              {g.playerCount}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-ink">
            {g.name}
          </h1>

          <p className="text-base font-medium text-ink/70 max-w-2xl">
            {g.description}
          </p>
        </div>

        {/* 3D Game Viewport */}
        <section className="w-full">
          <SoloGame game={g} />
        </section>

        {/* Instructions & Features Card */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 space-y-2 shadow-sm">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <span>🎮</span> Controls & How to Play
            </h3>
            <p className="text-xs font-semibold text-ink/75 leading-relaxed">
              {g.instructions}
            </p>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-6 space-y-2 shadow-sm">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <span>⚡</span> LOLLOOP 3D Features
            </h3>
            <ul className="text-xs font-semibold text-ink/75 space-y-1">
              <li>• Real-time WebGL rendering with shadow map & lighting</li>
              <li>• Solo AI bot opponents with Easy, Medium, Hard, Expert tiers</li>
              <li>• Instant procedural sound synthesizer</li>
              <li>• Guest score persistence with cloud account sync</li>
            </ul>
          </div>
        </div>

        {/* Related Games in Category */}
        {relatedGames.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-ink/10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-ink">
                More {CATS[g.category] || 'Games'}
              </h2>
              <Link
                href={`/games?category=${g.category}`}
                className="text-xs font-black text-marigold hover:underline"
              >
                View Category →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedGames.map((item) => (
                <GameCard key={item.slug} g={item} />
              ))}
            </div>
          </section>
        )}

        <Ad slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT} />
      </main>
    );
  }

  // Category Landing Page fallback (e.g. /games/arcade)
  if (!CATS[params.slug]) notFound();

  const categoryGames = GAMES.filter((x) => x.category === (params.slug as GameCategory));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 space-y-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-ink">
            {CATS[params.slug]}
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink/70">
            {categoryGames.length} 3D games in this category.
          </p>
        </div>
        <Link
          href="/games"
          className="rounded-full bg-field px-4 py-2 text-xs font-extrabold text-ink hover:bg-cream transition"
        >
          ← All Categories
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categoryGames.map((x) => (
          <GameCard key={x.slug} g={x} />
        ))}
      </div>
    </main>
  );
}
