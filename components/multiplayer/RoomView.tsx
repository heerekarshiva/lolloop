'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRoom } from '@/hooks/useRoom';
import { GAMES } from '@/lib/multiplayer/engine';
import { loadIdentity, saveName, type Identity } from '@/lib/multiplayer/identity';
import { ButtonGame, QuizGame, TapGame, TicTacToe } from './GameBodies';
import { Scoreboard, Shell, btnDark, btnGhost, btnPlay, card, useTicker } from './ui';

export default function RoomView({ code }: { code: string }) {
  const [me, setMe] = useState<Identity | null>(null);
  const [name, setName] = useState('');
  useEffect(() => { setMe(loadIdentity()); }, []);

  if (!me) return <Shell><p>Loading…</p></Shell>;
  if (!me.name) {
    return (
      <Shell>
        <form className={`${card} space-y-4`} onSubmit={(e) => { e.preventDefault(); if (name.trim()) setMe(saveName(name)); }}>
          <h1 className="text-3xl font-extrabold tracking-tight">Pick a name</h1>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} autoFocus placeholder="Your name"
            className="h-12 w-full rounded-full bg-[#F5F3EF] px-5 font-semibold outline-none focus:ring-2 focus:ring-[#191B1F]" />
          <button className={btnPlay} disabled={!name.trim()}>Join room {code}</button>
        </form>
      </Shell>
    );
  }
  return <Room code={code} me={me} />;
}

function Room({ code, me }: { code: string; me: Identity }) {
  const room = useRoom(code, me);
  const s = room.state;
  const [copied, setCopied] = useState(false);
  useTicker(100);

  const invite = async () => {
    const url = `${location.origin}/multiplayer/${code}`;
    const text = `Join my LOLLOOP room ${code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'LOLLOOP', text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch { /* cancelled */ }
  };

  if (room.status === 'error') return <Shell><div className={card}><h1 className="text-2xl font-extrabold">Can't connect</h1><p className="mt-2">Check your connection and reload. If you run this site, make sure the Supabase env vars are set and redeploy (they are read at build time).</p></div></Shell>;
  if (room.hostGone) return <Shell><div className={`${card} space-y-4`}><h1 className="text-2xl font-extrabold">The host left</h1><p>This room is closed.</p><Link href="/multiplayer" className={btnDark}>Start a new room</Link></div></Shell>;
  if (!s) return <Shell><div className={card}><h1 className="text-2xl font-extrabold">Joining room {code}…</h1><p className="mt-2 text-sm opacity-70">If this takes more than a few seconds, the room code may be wrong or the host closed it.</p></div></Shell>;

  const g = GAMES[s.game];
  return (
    <Shell>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{g.name}</h1>
          <p className="text-sm font-semibold opacity-70">Room {code}</p>
        </div>
        <button onClick={invite} className={btnGhost}>{copied ? 'Link copied' : 'Invite'}</button>
      </header>

      {s.phase === 'lobby' && (
        <div className="space-y-5">
          <p className="font-semibold">{g.blurb}</p>
          <ul className="space-y-2">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-full bg-[#FFF5D6] px-5 py-3 font-bold">
                {p.name}{p.id === me.id && ' (you)'}
                {p.isHost && <span className="rounded-full bg-[#191B1F] px-3 py-1 text-xs text-white">host</span>}
              </li>
            ))}
          </ul>
          {room.isHost
            ? <button onClick={room.start} disabled={room.players.length < 2} className={btnPlay}>{room.players.length < 2 ? 'Waiting for a friend…' : 'Start game'}</button>
            : <p className="font-semibold opacity-70">Waiting for the host to start…</p>}
        </div>
      )}

      {s.phase === 'countdown' && (
        <div className="grid min-h-[40vh] place-items-center text-center">
          <p className="text-[7rem] font-extrabold leading-none tracking-tighter">{Math.max(1, Math.ceil((s.startsAt - room.now()) / 1000))}</p>
        </div>
      )}

      {s.phase === 'playing' && (s.game === 'tic-tac-toe' || s.game === 'four-in-a-row') && <TicTacToe room={room} />}
      {s.phase === 'playing' && (s.game === 'tap-like-crazy' || s.game === 'tap-war' || s.game === 'duo-dash' || s.game === 'pong-rivals' || s.game === 'snake-arena' || s.game === 'mini-battle-arena' || s.game === 'you-and-me' || s.game === 'rock-paper-clash' || s.game === 'draw-guess') && <TapGame room={room} />}
      {s.phase === 'playing' && s.game === 'dont-press-the-button' && <ButtonGame room={room} />}
      {(s.phase === 'playing' || s.phase === 'reveal') && (s.game === 'wrong-answer-wins' || s.game === 'quiz-royale') && <QuizGame room={room} />}

      {s.phase === 'results' && (
        <div className="space-y-5">
          {s.game === 'tic-tac-toe' && <TicTacToe room={room} />}
          <p className="text-2xl font-extrabold tracking-tight">
            {s.game === 'tic-tac-toe' && !Object.values(s.scores).some(Boolean) ? "It's a draw" : winnerLine(room.players, s.scores, me.id)}
          </p>
          <Scoreboard players={room.players} state={s} me={me.id} />
          <div className="flex flex-wrap gap-3">
            {room.isHost
              ? <button onClick={room.backToLobby} className={btnPlay}>Play again</button>
              : <p className="font-semibold opacity-70">Waiting for the host…</p>}
            <Link href="/multiplayer" className={btnGhost}>Leave room</Link>
          </div>
          <p className="text-xs opacity-60">Room games are just for fun and don't count toward the leaderboards.</p>
        </div>
      )}
    </Shell>
  );
}

function winnerLine(players: { id: string; name: string }[], scores: Record<string, number>, meId: string) {
  const top = Math.max(0, ...players.map((p) => scores[p.id] ?? 0));
  const winners = players.filter((p) => (scores[p.id] ?? 0) === top);
  if (winners.length > 1) return `Tie: ${winners.map((w) => w.name).join(' & ')}`;
  return winners[0]?.id === meId ? 'You win!' : `${winners[0]?.name ?? 'Nobody'} wins`;
}
