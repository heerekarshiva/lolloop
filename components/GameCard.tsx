import Link from 'next/link';
import GameArt3D from '@/components/GameArt3D';
import type { GameInfo } from '@/lib/games';

export default function GameCard({ g }: { g: GameInfo }) {
  return (
    <Link
      href={`/games/${g.slug}`}
      className="group block rounded-3xl border border-[rgba(25,27,31,0.06)] bg-white p-5 transition hover:shadow-[0_12px_28px_-6px_rgba(25,27,31,0.12)] hover:-translate-y-1 duration-200"
    >
      <div className="relative mb-4 h-48 overflow-hidden rounded-[1.25rem] bg-ink">
        <GameArt3D game={g} />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-marigold text-ink text-[11px] font-black uppercase tracking-wider shadow-sm">
            3D
          </span>
          {g.isMultiplayer && (
            <span className="px-2.5 py-1 rounded-full bg-cyan-400 text-ink text-[11px] font-black tracking-wider shadow-sm">
              MULTIPLAYER
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-extrabold tracking-tight text-ink group-hover:text-marigold transition-colors">
          {g.name}
        </h3>
        <span className="text-xs font-bold text-ink/60">{g.playerCount}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-ink/70 line-clamp-2">{g.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="inline-block rounded-full bg-chip px-3 py-1 text-xs font-bold text-ink">
          {g.difficulty}
        </span>
        <span className="text-xs font-extrabold text-marigold uppercase tracking-wider">
          Play 3D →
        </span>
      </div>
    </Link>
  );
}
