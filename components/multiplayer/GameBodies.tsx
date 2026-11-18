'use client';
import { useEffect, useRef, useState } from 'react';
import type { RoomApi } from '@/hooks/useRoom';
import { BTN_MS, Q_MS, REVEAL_MS, TAP_MS } from '@/lib/multiplayer/engine';
import { QUESTIONS } from '@/lib/multiplayer/questions';
import { Scoreboard, TimeBar, card, useTicker } from './ui';

/* ---------- TAP LIKE CRAZY ---------- */
export function TapGame({ room }: { room: RoomApi }) {
  useTicker(50);
  const s = room.state!;
  const count = useRef(0);
  const sent = useRef(0);
  const [shown, setShown] = useState(0);
  const left = s.endsAt - room.now();

  useEffect(() => {
    const t = setInterval(() => {
      if (count.current !== sent.current) { sent.current = count.current; room.send({ type: 'tap', count: count.current }); }
    }, 150);
    return () => clearInterval(t);
  }, [room.send]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = () => { if (room.now() >= s.endsAt) return; count.current += 1; setShown(count.current); };

  return (
    <div className="space-y-6 text-center">
      <TimeBar left={left} total={TAP_MS} />
      <button
        onPointerDown={tap}
        onContextMenu={(e) => e.preventDefault()}
        disabled={left <= 0}
        aria-label="Tap"
        className="mx-auto grid h-56 w-56 select-none place-items-center rounded-full bg-[#FFB800] text-6xl font-extrabold tracking-tight text-[#191B1F] shadow-[0_8px_24px_-4px_rgba(25,27,31,0.08)] transition active:translate-y-px active:scale-95 disabled:opacity-50"
        style={{ touchAction: 'manipulation' }}
      >
        {shown}
      </button>
      <Scoreboard players={room.players} state={{ ...s, scores: { ...s.scores, [room.me.id]: Math.max(shown, s.scores[room.me.id] ?? 0) } }} me={room.me.id} />
    </div>
  );
}

/* ---------- DON'T PRESS THE BUTTON ---------- */
const MESSAGES = [
  'Whatever you do, do not press it.',
  "It's just a button. Totally harmless.",
  'It looks so pressable, right?',
  'Your finger is twitching.',
  'Others are already caving. Not you though.',
  'Almost there. Stay strong.',
];

export function ButtonGame({ room }: { room: RoomApi }) {
  useTicker(100);
  const s = room.state!;
  const elapsed = Math.max(0, room.now() - s.startsAt);
  const out = s.out[room.me.id] !== undefined;
  const msg = MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(elapsed / 5000))];
  const holding = room.players.filter((p) => s.out[p.id] === undefined).length;

  return (
    <div className="space-y-6 text-center">
      <TimeBar left={BTN_MS - elapsed} total={BTN_MS} />
      <p className="min-h-[3rem] text-xl font-extrabold tracking-tight">{out ? `You caved at ${((s.out[room.me.id]) / 1000).toFixed(1)}s.` : msg}</p>
      <button
        onClick={() => !out && room.send({ type: 'press' })}
        disabled={out}
        className="mx-auto rounded-full bg-[#191B1F] px-10 py-6 text-2xl font-extrabold text-white shadow-[0_8px_24px_-4px_rgba(25,27,31,0.08)] transition hover:ring-2 hover:ring-[#FFB800] active:translate-y-px disabled:opacity-30"
        style={{ transform: out ? undefined : `scale(${1 + Math.min(elapsed / BTN_MS, 1) * 0.25})` }}
      >
        {out ? 'Pressed' : elapsed > 20000 ? 'PRESS ME' : "Don't press"}
      </button>
      <p className="text-sm font-semibold opacity-70">{holding} of {room.players.length} still holding</p>
      <ul className="space-y-2 text-left">
        {room.players.map((p) => (
          <li key={p.id} className="flex justify-between rounded-full bg-[#F5F3EF] px-5 py-2.5 font-bold">
            <span>{p.name}</span>
            <span className={s.out[p.id] === undefined ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
              {s.out[p.id] === undefined ? 'holding' : `out at ${(s.out[p.id] / 1000).toFixed(1)}s`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- THE WRONG ANSWER WINS ---------- */
export function QuizGame({ room }: { room: RoomApi }) {
  useTicker(100);
  const s = room.state!;
  const q = QUESTIONS[s.order[s.qi]];
  const reveal = s.phase === 'reveal';
  const mine = s.answers[room.me.id]?.choice;
  const left = s.endsAt - room.now();
  if (!q) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm font-bold">
        <span>Question {s.qi + 1} of {s.order.length}</span>
        <span className="tabular-nums">{Math.max(0, Math.ceil(left / 1000))}s</span>
      </div>
      <TimeBar left={left} total={reveal ? REVEAL_MS : Q_MS} />
      <h2 className="text-2xl font-extrabold leading-8 tracking-tight">{q.q}</h2>
      <div className="grid gap-3">
        {q.choices.map((c, i) => {
          const picked = mine === i;
          const style = reveal
            ? i === q.correct ? 'bg-[#22C55E] text-white' : picked ? 'bg-[#EF4444] text-white' : 'bg-[#F5F3EF] opacity-60'
            : picked ? 'bg-[#191B1F] text-white' : 'bg-[#F5F3EF] hover:bg-[#FFF5D6]';
          return (
            <button key={i} disabled={reveal || mine !== undefined}
              onClick={() => room.send({ type: 'answer', qi: s.qi, choice: i })}
              className={`rounded-full px-6 py-3.5 text-left font-bold transition active:translate-y-px ${style}`}>
              {c}
            </button>
          );
        })}
      </div>
      {!reveal && mine !== undefined && <p className="text-sm font-semibold opacity-70">Locked in. Waiting for the others…</p>}
      {reveal && <p className={`${card} text-sm font-semibold`}>{q.explain}</p>}
      <Scoreboard players={room.players} state={s} me={room.me.id} />
    </div>
  );
}

/* ---------- TIC TAC TOE BATTLE ---------- */
export function TicTacToe({ room }: { room: RoomApi }) {
  const s = room.state!;
  const mine = s.turn === room.me.id, isP = s.p.includes(room.me.id);
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Player';
  return (
    <div className="space-y-5 text-center">
      <p className="text-xl font-extrabold">{!isP ? 'Spectating' : mine ? 'Your move' : `${name(s.turn)} is thinking…`}</p>
      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {s.board.map((c, i) => (
          <button key={i} disabled={!mine || !!c || s.phase !== 'playing'} onClick={() => room.send({ type: 'move', cell: i })} aria-label={`Cell ${i + 1}`}
            className={`aspect-square rounded-2xl text-5xl font-extrabold transition ${c ? 'bg-cream' : 'bg-field hover:bg-cream'}`}>{c ? (c === s.p[0] ? '✕' : '○') : ''}</button>
        ))}
      </div>
      <p className="text-sm font-semibold opacity-70">{name(s.p[0])} (✕) vs {name(s.p[1] ?? '')} (○)</p>
    </div>
  );
}
