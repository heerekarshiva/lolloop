'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Memory } from './Mini';
/* eslint-disable @typescript-eslint/no-explicit-any */
type P = Record<string, any>;
type Props = { mech: string; p: P; onDone: (score: number) => void };
const clamp = (n: number) => Math.max(0, Math.min(1000, Math.round(n)));
const rnd = (n: number) => Math.floor(Math.random() * n);
const box = 'relative h-80 w-full touch-none select-none overflow-hidden rounded-3xl bg-cream';
const Hud = ({ a, b }: { a: string; b: string }) => <div className="mb-2 flex justify-between text-sm font-bold"><span>{a}</span><span>{b}</span></div>;
const btn = 'rounded-full bg-field px-5 py-3.5 text-lg font-extrabold active:translate-y-px active:bg-cream';

function useClock(sec: number, onEnd: () => void) {
  const [left, setLeft] = useState(sec); const end = useRef(onEnd); end.current = onEnd;
  useEffect(() => { const t0 = Date.now(); const i = setInterval(() => { const l = sec - (Date.now() - t0) / 1000; if (l <= 0) { clearInterval(i); setLeft(0); end.current(); } else setLeft(l); }, 100); return () => clearInterval(i); }, [sec]);
  return left;
}

function Target({ p, onDone }: Props) {
  const [items, setItems] = useState<{ id: number; x: number; y: number; bad: boolean; exp: number }[]>([]);
  const [score, setScore] = useState(0); const sc = useRef(0); const id = useRef(0);
  const left = useClock(p.t ?? 20, () => onDone(clamp(sc.current)));
  useEffect(() => { const i = setInterval(() => { const n = Date.now(); setItems((l) => [...l.filter((o) => o.exp > n), ...(Math.random() < 100 / (p.rate ?? 650) ? [{ id: id.current++, x: rnd(80) + 5, y: rnd(75) + 5, bad: !!p.bad && Math.random() < 0.25, exp: n + (p.life ?? 1000) }] : [])]); }, 100); return () => clearInterval(i); }, [p.rate, p.life, p.bad]);
  const hit = (o: { id: number; bad: boolean }) => { setItems((l) => l.filter((x) => x.id !== o.id)); sc.current = Math.max(0, sc.current + (o.bad ? -40 : 25)); setScore(sc.current); };
  return <div><Hud a={`Score ${score}`} b={`${Math.ceil(left)}s`} /><div className={box}>{items.map((o) => <button key={o.id} onPointerDown={() => hit(o)} style={{ left: `${o.x}%`, top: `${o.y}%` }} className="absolute text-4xl active:scale-90" aria-label="target">{o.bad ? p.bad : p.e}</button>)}</div>{p.bad && <p className="mt-2 text-xs font-semibold opacity-60">Don't tap {p.bad}.</p>}</div>;
}

function Fall({ p, onDone }: Props) {
  const W = useRef<HTMLDivElement>(null);
  const g = useRef({ x: 50, objs: [] as { x: number; y: number; good: boolean }[], lives: 3, score: 0, t: 0 });
  const [, re] = useState(0);
  useEffect(() => {
    let last = performance.now(), raf = 0;
    const loop = (n: number) => {
      const s = g.current, dt = Math.min(50, n - last) / 1000; last = n; s.t += dt; s.score += dt * 8;
      if (Math.random() < dt * (1.3 + s.t / 25)) s.objs.push({ x: rnd(90) + 5, y: -8, good: !!p.g && Math.random() < 0.35 });
      const v = 32 + s.t * 1.2; s.objs.forEach((o) => (o.y += v * dt));
      s.objs = s.objs.filter((o) => { if (o.y > 80 && o.y < 98 && Math.abs(o.x - s.x) < 10) { if (o.good) s.score += 30; else s.lives--; return false; } return o.y < 105; });
      re((c) => c + 1);
      if (s.lives <= 0 || s.t > 45) { onDone(clamp(s.score)); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') g.current.x = Math.max(5, g.current.x - 8); if (e.key === 'ArrowRight') g.current.x = Math.min(95, g.current.x + 8); };
    addEventListener('keydown', k);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', k); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (e: React.PointerEvent) => { const r = W.current!.getBoundingClientRect(); g.current.x = Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100)); };
  const s = g.current;
  return <div><Hud a={`Score ${Math.round(s.score)}`} b={'❤️'.repeat(Math.max(0, s.lives))} />
    <div ref={W} onPointerMove={move} onPointerDown={move} className={box}>
      {s.objs.map((o, i) => <span key={i} className="absolute -translate-x-1/2 text-3xl" style={{ left: `${o.x}%`, top: `${o.y}%` }}>{o.good ? p.g : p.o}</span>)}
      <span className="absolute bottom-2 -translate-x-1/2 text-4xl" style={{ left: `${s.x}%` }}>{p.e}</span></div>
    <p className="mt-2 text-xs font-semibold opacity-60">Drag or use ← → keys. Avoid {p.o}{p.g ? `, catch ${p.g}` : ''}.</p></div>;
}

function Simon({ p, onDone }: Props) {
  const E: string[] = p.s; const [seq, setSeq] = useState<number[]>([rnd(4)]); const [lit, setLit] = useState(-1); const [pos, setPos] = useState(0); const [show, setShow] = useState(true);
  useEffect(() => { setShow(true); setPos(0); const ts: ReturnType<typeof setTimeout>[] = []; seq.forEach((v, k) => ts.push(setTimeout(() => setLit(v), 500 + k * 650), setTimeout(() => setLit(-1), 500 + k * 650 + 400))); ts.push(setTimeout(() => setShow(false), 500 + seq.length * 650)); return () => ts.forEach(clearTimeout); }, [seq]);
  const tap = (i: number) => { if (show) return; if (i !== seq[pos]) return onDone(clamp((seq.length - 1) * 100)); if (pos + 1 === seq.length) { if (seq.length >= 10) return onDone(1000); setSeq((s) => [...s, rnd(4)]); } else setPos(pos + 1); };
  return <div><Hud a={`Round ${seq.length}`} b={show ? 'Watch…' : 'Your turn'} /><div className="grid grid-cols-2 gap-3">{E.map((e, i) => <button key={i} onClick={() => tap(i)} className={`h-32 rounded-3xl text-5xl transition ${lit === i ? 'bg-marigold scale-95' : 'bg-field'}`} aria-label={`Pad ${i + 1}`}>{e}</button>)}</div></div>;
}

function MathRush({ p, onDone }: Props) {
  const mk = () => { const a = rnd(p.max) + 2, b = rnd(p.max) + 2, op = p.op; const r = op === '+' ? a + b : op === '−' ? Math.abs(a - b) : a * b; const q = op === '−' ? `${Math.max(a, b)} − ${Math.min(a, b)}` : `${a} ${op} ${b}`; const ch = new Set<number>([r]); while (ch.size < 4) ch.add(Math.max(0, r + rnd(11) - 5)); return { q, r, ch: [...ch].sort(() => Math.random() - 0.5) }; };
  const [c, setC] = useState(mk); const sc = useRef(0); const [score, setScore] = useState(0);
  const left = useClock(30, () => onDone(clamp(sc.current)));
  const pick = (v: number) => { sc.current = Math.max(0, sc.current + (v === c.r ? 50 : -25)); setScore(sc.current); setC(mk()); };
  return <div className="space-y-4 text-center"><Hud a={`Score ${score}`} b={`${Math.ceil(left)}s`} /><p className="text-5xl font-extrabold tracking-tight">{c.q}</p><div className="grid grid-cols-2 gap-3">{c.ch.map((v) => <button key={v} className={btn} onClick={() => pick(v)}>{v}</button>)}</div></div>;
}

function Odd({ p, onDone }: Props) {
  const [lvl, setLvl] = useState(0); const n = Math.min(7, 3 + Math.floor(lvl / 3)); const odd = useMemo(() => rnd(n * n), [lvl, n]); const sc = useRef(0);
  const left = useClock(30, () => onDone(clamp(sc.current)));
  const pick = (i: number) => { if (i === odd) { sc.current += 60; setLvl(lvl + 1); } else sc.current = Math.max(0, sc.current - 30); };
  return <div><Hud a={`Found ${lvl}`} b={`${Math.ceil(left)}s`} /><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n},1fr)` }}>{Array.from({ length: n * n }, (_, i) => <button key={`${lvl}-${i}`} onClick={() => pick(i)} className="aspect-square rounded-xl bg-field text-2xl" aria-label="Emoji">{i === odd ? p.b : p.a}</button>)}</div><p className="mt-2 text-xs font-semibold opacity-60">Tap the one that's different.</p></div>;
}

function Timing({ p, onDone }: Props) {
  const [round, setRound] = useState(0); const [pos, setPos] = useState(0); const total = useRef(0); const at = useRef(0); const [msg, setMsg] = useState('Stop it in the yellow zone');
  useEffect(() => { let raf = 0; const t0 = performance.now(); const loop = (n: number) => { const v = ((Math.sin((n - t0) / (420 - round * 55)) + 1) / 2) * 100; at.current = v; setPos(v); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [round]);
  const stop = () => { const d = Math.abs(at.current - 50); total.current += Math.max(0, 200 - d * 5); setMsg(d < 5 ? 'Perfect!' : d < 15 ? 'Nice' : 'Miss'); if (round === 4) return onDone(clamp(total.current)); setRound(round + 1); };
  return <div className="space-y-4 text-center"><Hud a={`Shot ${round + 1} of 5`} b={msg} />
    <div className="relative h-16 rounded-full bg-field"><div className="absolute inset-y-0 left-[42%] w-[16%] rounded-full bg-marigold" /><span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl" style={{ left: `${pos}%` }}>{p.e}</span></div>
    <button onPointerDown={stop} className="w-full rounded-full bg-ink py-5 text-xl font-extrabold text-white active:translate-y-px">Stop!</button></div>;
}

function Runner({ p, onDone }: Props) {
  const g = useRef({ y: 0, vy: 0, obs: [] as number[], t: 0, score: 0 }); const [, re] = useState(0);
  useEffect(() => {
    let last = performance.now(), raf = 0, gap = 0.8;
    const loop = (n: number) => {
      const s = g.current, dt = Math.min(50, n - last) / 1000; last = n; s.t += dt; s.score += dt * (40 + s.t * 2);
      s.vy -= 1900 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0 && s.vy < 0) s.vy = 0;
      gap -= dt; if (gap <= 0) { s.obs.push(100); gap = 0.9 + Math.random() * 0.9 - Math.min(0.4, s.t / 80); }
      const v = 38 + s.t * 1.5; s.obs = s.obs.map((x) => x - v * dt).filter((x) => x > -10);
      re((c) => c + 1);
      if (s.obs.some((x) => x > 8 && x < 18) && s.y < 40) { onDone(clamp(s.score)); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const k = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
    addEventListener('keydown', k);
    return () => { cancelAnimationFrame(raf); removeEventListener('keydown', k); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const jump = () => { if (g.current.y === 0) g.current.vy = 620; };
  const s = g.current;
  return <div><Hud a={`Distance ${Math.round(s.score)}`} b="Tap to jump" /><div className={`${box} cursor-pointer`} onPointerDown={jump}>
    <div className="absolute inset-x-0 bottom-0 h-4 bg-ink" />
    <span className="absolute left-[10%] text-4xl" style={{ bottom: 16 + s.y }}>{p.e}</span>
    {s.obs.map((x, i) => <span key={i} className="absolute text-4xl" style={{ left: `${x}%`, bottom: 16 }}>{p.o}</span>)}</div></div>;
}

export default function Arcade({ mech, p, onDone }: Props) {
  switch (mech) {
    case 'target': return <Target mech={mech} p={p} onDone={onDone} />;
    case 'fall': return <Fall mech={mech} p={p} onDone={onDone} />;
    case 'memory': return <Memory faces={p.s} onDone={onDone} />;
    case 'simon': return <Simon mech={mech} p={p} onDone={onDone} />;
    case 'math': return <MathRush mech={mech} p={p} onDone={onDone} />;
    case 'odd': return <Odd mech={mech} p={p} onDone={onDone} />;
    case 'timing': return <Timing mech={mech} p={p} onDone={onDone} />;
    case 'runner': return <Runner mech={mech} p={p} onDone={onDone} />;
    default: return null;
  }
}
