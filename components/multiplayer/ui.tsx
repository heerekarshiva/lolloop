'use client';
import { useEffect, useState } from 'react';
import type { Player, RoomState } from '@/types/multiplayer';
import { BTN_MS } from '@/lib/multiplayer/engine';

export const card = 'rounded-3xl border border-[rgba(25,27,31,0.06)] bg-white p-5';
export const pill = 'rounded-full px-7 py-3.5 font-bold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB800]';
export const btnDark = `${pill} bg-[#191B1F] text-white hover:ring-2 hover:ring-[#FFB800] disabled:opacity-40`;
export const btnPlay = `${pill} bg-[#FFB800] text-[#191B1F] disabled:opacity-40`;
export const btnGhost = `${pill} border-[1.5px] border-[#191B1F] text-[#191B1F]`;

export function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-[70vh] w-full max-w-xl px-4 py-8 text-[#191B1F]">{children}</main>;
}

export function useTicker(ms = 100) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t); }, [ms]);
}

export function TimeBar({ left, total }: { left: number; total: number }) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[#F0EEE9]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={left}>
      <div className="h-full rounded-full bg-[#FFB800]" style={{ width: `${Math.max(0, Math.min(1, left / total)) * 100}%` }} />
    </div>
  );
}

export function fmtScore(game: RoomState['game'], v: number) {
  if (game === 'tap-like-crazy') return `${v} taps`;
  if (game === 'tic-tac-toe') return v ? 'winner' : '-';
  if (game === 'wrong-answer-wins') return `${v} pts`;
  return v >= BTN_MS ? 'held 30s' : `${(v / 1000).toFixed(1)}s`;
}

export function Scoreboard({ players, state, me }: { players: Player[]; state: RoomState; me: string }) {
  const rows = players
    .map((p) => ({ ...p, v: state.scores[p.id] ?? 0 }))
    .sort((a, b) => b.v - a.v);
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.id} className={`flex items-center justify-between rounded-full px-5 py-3 ${r.id === me ? 'bg-[#FFF5D6]' : 'bg-[#F5F3EF]'}`}>
          <span className="flex items-center gap-3 font-bold">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#191B1F] text-xs text-white">{i + 1}</span>
            {r.name}{r.id === me && <span className="text-xs font-semibold opacity-60">(you)</span>}
          </span>
          <span className="font-bold tabular-nums">
            {fmtScore(state.game, r.v)}
            {state.phase === 'reveal' && state.gained[r.id] ? <span className="ml-2 text-xs text-[#22C55E]">+{state.gained[r.id]}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
