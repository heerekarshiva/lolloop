'use client';
import { useEffect, useRef, useState } from 'react';
import { card } from '@/components/multiplayer/ui';

export function Reaction({ onDone }: { onDone: (score: number) => void }) {
  const [s, setS] = useState<'wait' | 'go' | 'early'>('wait'); const t0 = useRef(0); const to = useRef<ReturnType<typeof setTimeout>>();
  const arm = () => { setS('wait'); to.current = setTimeout(() => { t0.current = performance.now(); setS('go'); }, 1500 + Math.random() * 3000); };
  useEffect(() => { arm(); return () => clearTimeout(to.current); }, []);
  const hit = () => {
    if (s === 'go') return onDone(Math.max(0, Math.round(1000 - (performance.now() - t0.current))));
    clearTimeout(to.current); setS('early');
  };
  return (
    <button onPointerDown={hit} className={`grid h-72 w-full place-items-center rounded-3xl text-2xl font-extrabold ${s === 'go' ? 'bg-[#22C55E] text-white' : s === 'early' ? 'bg-[#EF4444] text-white' : 'bg-ink text-white'}`}>
      {s === 'early' ? <span onPointerDown={(e) => { e.stopPropagation(); arm(); }}>Too early! Tap to retry</span> : s === 'go' ? 'NOW!' : 'Wait for green…'}
    </button>
  );
}

const FACES = ['🍕', '🚀', '🐸', '🎈', '🦄', '🍩', '🎸', '🌵'];
export function Memory({ onDone, faces = FACES }: { onDone: (score: number) => void; faces?: string[] }) {
  const [deck] = useState(() => [...faces, ...faces].sort(() => Math.random() - 0.5));
  const [open, setOpen] = useState<number[]>([]); const [found, setFound] = useState<number[]>([]); const [moves, setMoves] = useState(0); const t0 = useRef(Date.now());
  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || found.includes(i)) return;
    const o = [...open, i]; setOpen(o);
    if (o.length < 2) return;
    setMoves((m) => m + 1);
    setTimeout(() => {
      if (deck[o[0]] === deck[o[1]]) { const f = [...found, ...o]; setFound(f); if (f.length === 16) onDone(Math.max(0, Math.round(1000 - (moves + 1) * 25 - (Date.now() - t0.current) / 1000 * 5))); }
      setOpen([]);
    }, 650);
  };
  return (
    <div className={card}><p className="mb-3 text-sm font-bold">Moves: {moves}</p>
      <div className="grid grid-cols-4 gap-2">{deck.map((f, i) => { const up = open.includes(i) || found.includes(i); return <button key={i} onClick={() => flip(i)} aria-label={up ? f : 'Hidden card'} className={`aspect-square rounded-2xl text-3xl transition ${up ? 'bg-cream' : 'bg-ink'} ${found.includes(i) ? 'opacity-50' : ''}`}>{up ? f : ''}</button>; })}</div></div>
  );
}
