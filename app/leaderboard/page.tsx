import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { GAMES, bySlug, fmt } from '@/lib/games';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top LOLLOOP 3D players. Daily, weekly and all-time scores across all 50 games.',
  alternates: { canonical: '/leaderboard' },
};

export const dynamic = 'force-dynamic';

const PER = 20;
const PERIODS = ['daily', 'weekly', 'all'];

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: { game?: string; period?: string; page?: string };
}) {
  const g = bySlug(searchParams.game ?? '') ?? GAMES[0];
  const period = PERIODS.includes(searchParams.period ?? '') ? searchParams.period! : 'daily';
  const page = Math.max(0, Math.min(500, parseInt(searchParams.page ?? '0') || 0));

  let rows: { rank: number; username: string; score: number }[] = [];
  let ok = true;

  try {
    const { data, error } = await createClient().rpc('leaderboard', {
      game_slug: g.slug,
      period,
      lim: PER,
      off: page * PER,
    });
    if (error) throw error;
    rows = data ?? [];
  } catch {
    ok = false;
  }

  const q = (o: Record<string, string | number>) =>
    `/leaderboard?${new URLSearchParams({
      game: g.slug,
      period,
      page: '0',
      ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])),
    })}`;

  const chip = (on: boolean) =>
    `rounded-full px-4 py-2 text-xs font-extrabold transition ${
      on ? 'bg-ink text-white shadow-sm' : 'bg-field text-ink/75 hover:bg-cream hover:text-ink'
    }`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-ink">Global Leaderboards</h1>
        <p className="mt-1 text-sm font-semibold text-ink/70">
          Compete against players worldwide across all 50 LOLLOOP 3D games.
        </p>
      </div>

      {/* Selected Game Banner */}
      <div className="flex items-center justify-between rounded-3xl bg-cream border border-marigold/30 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{g.emoji}</span>
          <div>
            <h2 className="text-xl font-black text-ink">{g.name}</h2>
            <p className="text-xs font-bold text-ink/60 capitalize">
              {g.category} • Scoring: {g.unit}
            </p>
          </div>
        </div>
        <Link
          href={`/games/${g.slug}`}
          className="px-4 py-2 rounded-full bg-marigold text-ink text-xs font-black hover:bg-amber-400 transition"
        >
          Play 3D 🎮
        </Link>
      </div>

      {/* Game Selector Chips (Horizontal Scrollable or Grid) */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-ink/60">
          Select Game (50 Available):
        </label>
        <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1 rounded-2xl bg-white border border-ink/10">
          {GAMES.map((x) => (
            <Link
              key={x.slug}
              href={q({ game: x.slug })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                x.slug === g.slug
                  ? 'bg-ink text-white'
                  : 'bg-field text-ink/70 hover:bg-cream hover:text-ink'
              }`}
            >
              <span>{x.emoji}</span>
              <span>{x.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Time Period Filter */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link key={p} href={q({ period: p })} className={chip(p === period)}>
            {p === 'all' ? 'All-Time Ranks' : p === 'weekly' ? 'This Week' : 'Today (Daily)'}
          </Link>
        ))}
      </div>

      {/* Leaderboard Table / Rows */}
      <div className="space-y-2">
        {!ok ? (
          <div className="rounded-3xl bg-field p-6 text-center space-y-1">
            <p className="font-extrabold text-sm text-ink">Leaderboard is offline</p>
            <p className="text-xs font-medium text-ink/60">
              Leaderboards require Supabase configuration. Scores are still saved locally!
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl bg-field p-8 text-center space-y-2">
            <span className="text-3xl">🏅</span>
            <p className="font-extrabold text-base text-ink">No scores logged yet</p>
            <p className="text-xs font-medium text-ink/60">
              Be the first to claim the #1 spot in {g.name}!
            </p>
            <Link
              href={`/games/${g.slug}`}
              className="inline-block mt-2 px-5 py-2.5 rounded-full bg-marigold text-ink text-xs font-black"
            >
              Play Now & Set Record
            </Link>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.rank}
                className={`flex items-center justify-between rounded-2xl p-4 font-bold border transition ${
                  r.rank === 1
                    ? 'bg-amber-50 border-amber-200 text-ink shadow-sm'
                    : r.rank === 2
                    ? 'bg-slate-50 border-slate-200 text-ink'
                    : r.rank === 3
                    ? 'bg-orange-50/50 border-orange-200 text-ink'
                    : 'bg-white border-ink/5 text-ink/90'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center font-black text-sm">
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                  </span>
                  <span className="font-extrabold">{r.username}</span>
                </div>
                <span className="font-black text-ink">{fmt(g, r.score)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        {page > 0 ? (
          <Link className={chip(false)} href={q({ page: page - 1 })}>
            ← Previous Page
          </Link>
        ) : <div />}
        {rows.length === PER && (
          <Link className={chip(false)} href={q({ page: page + 1 })}>
            Next Page →
          </Link>
        )}
      </div>

      <p className="text-center text-xs font-semibold text-ink/50 pt-4">
        Play as a guest or sign in to save your personal bests to the global leaderboard.
      </p>
    </main>
  );
}
