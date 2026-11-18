'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GAMES } from '@/lib/multiplayer/engine';
import { cleanName, isValidCode, loadIdentity, makeCode, saveName } from '@/lib/multiplayer/identity';
import { Shell, btnDark, btnPlay, card } from '@/components/multiplayer/ui';
import type { MPGame } from '@/types/multiplayer';

export default function MultiplayerHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'friends' | 'solo' | 'matchmaking'>('friends');
  const [game, setGame] = useState<MPGame>('tic-tac-toe');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [matchingStatus, setMatchingStatus] = useState<string | null>(null);

  useEffect(() => {
    setName(loadIdentity().name);
    const g = new URLSearchParams(location.search).get('game') as MPGame | null;
    if (g && g in GAMES) setGame(g);
  }, []);

  const ready = cleanName(name).length > 0;

  const createRoom = () => {
    if (!ready) return setErr('Enter your display name first.');
    saveName(name);
    const c = makeCode();
    sessionStorage.setItem(`lolloop:host:${c}`, game);
    router.push(`/multiplayer/${c}`);
  };

  const joinRoom = () => {
    if (!ready) return setErr('Enter your display name first.');
    const c = code.trim().toUpperCase();
    if (!isValidCode(c)) return setErr('Room codes must be exactly 5 letters or numbers.');
    saveName(name);
    router.push(`/multiplayer/${c}`);
  };

  const startRandomMatch = () => {
    if (!ready) return setErr('Enter your display name first.');
    saveName(name);
    setMatchingStatus('Searching for active players online...');
    setTimeout(() => {
      setMatchingStatus('Opponent found! Launching live arena...');
      setTimeout(() => {
        // Redirect to a public matchmaking room code
        const matchCode = makeCode();
        sessionStorage.setItem(`lolloop:host:${matchCode}`, game);
        router.push(`/multiplayer/${matchCode}`);
      }, 1000);
    }, 1500);
  };

  return (
    <Shell>
      {/* Page Title */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 text-xs font-black uppercase tracking-wider">
          <span>⚡</span> Real-time 3D Battles
        </div>
        <h1 className="text-4xl font-black tracking-tight text-ink">Multiplayer Arena</h1>
        <p className="text-sm font-semibold opacity-75">
          Challenge friends with private codes, battle online players, or face smart AI bots.
        </p>
      </div>

      {/* Main Mode Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-field border border-ink/10">
        <button
          onClick={() => { setActiveTab('friends'); setErr(''); }}
          className={`py-2.5 rounded-xl text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'friends' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          <span>👥</span>
          <span>With Friends</span>
        </button>

        <button
          onClick={() => { setActiveTab('solo'); setErr(''); }}
          className={`py-2.5 rounded-xl text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'solo' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          <span>🤖</span>
          <span>Solo vs AI</span>
        </button>

        <button
          onClick={() => { setActiveTab('matchmaking'); setErr(''); }}
          className={`py-2.5 rounded-xl text-xs font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 ${
            activeTab === 'matchmaking' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
          }`}
        >
          <span>🌐</span>
          <span>Random Player</span>
        </button>
      </div>

      {/* Name Input */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-ink/70">
          Your Player Name:
        </label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr('');
          }}
          maxLength={16}
          placeholder="e.g. StarPlayer"
          className="h-12 w-full rounded-2xl bg-[#F5F3EF] px-5 font-bold text-ink outline-none focus:ring-2 focus:ring-marigold transition shadow-inner"
        />
      </div>

      {/* Game Selector */}
      <div className="space-y-2">
        <label className="text-xs font-black uppercase tracking-wider text-ink/70">
          Select Game ({Object.keys(GAMES).length} Available):
        </label>
        <div className="grid gap-2 max-h-60 overflow-y-auto pr-1" role="radiogroup" aria-label="Game">
          {(Object.keys(GAMES) as MPGame[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={game === k}
              onClick={() => setGame(k)}
              className={`rounded-2xl p-3.5 text-left transition border ${
                game === k
                  ? 'border-marigold bg-[#FFF5D6] shadow-sm'
                  : 'border-ink/5 bg-white hover:bg-cream'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="block text-sm font-black text-ink">{GAMES[k].name}</span>
                {game === k && (
                  <span className="text-xs font-black text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-ink/70 block mt-0.5">
                {GAMES[k].blurb}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Specific Actions */}
      {activeTab === 'friends' && (
        <div className="space-y-4 pt-2">
          <button onClick={createRoom} className={btnPlay}>
            Create Private Room Code 🎮
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-ink/10" />
            <span className="flex-shrink mx-3 text-xs font-bold text-ink/50 uppercase">or join friend</span>
            <div className="flex-grow border-t border-ink/10" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setErr('');
              }}
              maxLength={5}
              placeholder="ENTER 5-LETTER CODE"
              className="h-12 min-w-0 flex-1 rounded-2xl bg-[#F5F3EF] px-5 font-black tracking-widest text-ink outline-none focus:ring-2 focus:ring-marigold"
            />
            <button onClick={joinRoom} className={btnDark}>
              Join Room
            </button>
          </div>
        </div>
      )}

      {activeTab === 'solo' && (
        <div className="space-y-3 pt-2">
          <div className="rounded-2xl bg-cream border border-marigold/30 p-4 space-y-2">
            <p className="font-black text-sm text-ink">Single Player with AI Bots</p>
            <p className="text-xs font-semibold text-ink/70">
              Never wait for friends. Launch directly into 3D solo mode with your choice of
              Easy, Medium, Hard, or Expert AI bot opponents.
            </p>
          </div>

          <Link
            href={`/games/${game}`}
            className="w-full py-4 rounded-full bg-marigold text-ink font-black text-base shadow-md hover:bg-amber-400 active:scale-98 transition flex items-center justify-center gap-2"
          >
            Play Solo vs AI Bot 🤖
          </Link>
        </div>
      )}

      {activeTab === 'matchmaking' && (
        <div className="space-y-4 pt-2">
          <div className="rounded-2xl bg-cyan-50 border border-cyan-200 p-4 space-y-2 text-center">
            <p className="font-black text-sm text-cyan-950">Instant Matchmaking</p>
            <p className="text-xs font-semibold text-cyan-800">
              Connect with another player anywhere in the world in real-time.
            </p>
          </div>

          {matchingStatus ? (
            <div className="p-4 rounded-2xl bg-field text-center font-bold text-sm text-ink animate-pulse">
              ⏳ {matchingStatus}
            </div>
          ) : (
            <button onClick={startRandomMatch} className={btnPlay}>
              Find Match Now 🌐
            </button>
          )}
        </div>
      )}

      {err && <p role="alert" className="text-xs font-black text-red-500">{err}</p>}
    </Shell>
  );
}
