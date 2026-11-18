'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { readScores } from '@/lib/guest';
import { bySlug, fmt, GameInfo } from '@/lib/games';

export default function ContinuePlaying() {
  const [recentGames, setRecentGames] = useState<{ game: GameInfo; score: number }[]>([]);

  useEffect(() => {
    const scores = readScores();
    const seen = new Set<string>();
    const recents: { game: GameInfo; score: number }[] = [];

    // Traverse from newest to oldest
    for (let i = scores.length - 1; i >= 0 && recents.length < 4; i--) {
      const s = scores[i];
      if (!seen.has(s.slug)) {
        seen.add(s.slug);
        const g = bySlug(s.slug);
        if (g) {
          recents.push({ game: g, score: s.score });
        }
      }
    }
    setRecentGames(recents);
  }, []);

  if (recentGames.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h2 className="text-2xl font-black tracking-tight text-ink">Continue Playing</h2>
        </div>
        <span className="text-xs font-bold text-ink/60">Saved on this device</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {recentGames.map(({ game, score }) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="group flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-3.5 shadow-sm hover:border-marigold hover:shadow-md transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl flex-shrink-0">{game.emoji}</span>
              <div className="truncate">
                <p className="font-extrabold text-sm text-ink group-hover:text-amber-600 transition truncate">
                  {game.name}
                </p>
                <p className="text-xs font-semibold text-ink/60">
                  Best: {fmt(game, score)}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-extrabold text-ink flex-shrink-0 group-hover:bg-marigold transition">
              Resume →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
