'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { btnDark, btnGhost, btnPlay, card } from '@/components/multiplayer/ui';
import { addScore, best, readScores, writeScores } from '@/lib/guest';
import { fmt, type GameInfo } from '@/lib/games';
import { configured, createClient } from '@/lib/supabase/client';
import GameRunner3D from '@/components/GameRunner3D';

export default function SoloGame({
  game,
  autoStart = false,
}: {
  game: GameInfo;
  autoStart?: boolean;
}) {
  const [stage, setStage] = useState<'ready' | 'playing' | 'results'>(
    autoStart ? 'playing' : 'ready'
  );
  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  const [pb, setPb] = useState(0);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'login' | 'error'>('idle');

  useEffect(() => {
    setPb(best(game.slug));
  }, [game.slug]);

  const finish = (v: number) => {
    const prev = best(game.slug);
    addScore(game.slug, v);
    setScore(v);
    setPb(Math.max(prev, v));
    setSaved('idle');
    setStage('results');
  };

  const save = async () => {
    setSaved('saving');
    if (!configured) return setSaved('error');
    const { data } = await createClient().auth.getUser();
    if (!data.user) return setSaved('login'); // guest scores stay on device and sync after login
    const list = readScores().filter((x) => !x.synced);
    const r = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: list }),
    });
    if (r.ok) {
      writeScores(readScores().map((x) => ({ ...x, synced: true })));
      setSaved('done');
    } else {
      setSaved('error');
    }
  };

  const share = async () => {
    const text = `I scored ${fmt(game, score)} in ${game.name} on LOLLOOP. Beat me!`;
    const url = `${location.origin}/games/${game.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      /* cancelled */
    }
  };

  if (stage === 'results') {
    return (
      <div className={`${card} space-y-5 text-center p-8 bg-white border border-ink/10 shadow-xl rounded-3xl`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cream text-3xl mb-2">
          🏆
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-ink/50">Match Complete</p>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-ink mt-1">
            {fmt(game, score)}
          </h2>
        </div>

        <p className="font-bold text-sm text-ink/80">
          {score >= pb && score > 0 ? (
            <span className="text-amber-600 font-extrabold flex items-center justify-center gap-1">
              ✨ New personal best! ✨
            </span>
          ) : (
            `Personal best: ${fmt(game, pb)}`
          )}
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            className={btnPlay}
            onClick={() => {
              setRun((n) => n + 1);
              setStage('playing');
            }}
          >
            Play again 🎮
          </button>
          <button className={btnGhost} onClick={share}>
            Share 🔗
          </button>
          <button
            className={btnDark}
            onClick={save}
            disabled={saved === 'saving' || saved === 'done'}
          >
            {saved === 'done' ? '✓ Saved' : 'Save score'}
          </button>
        </div>

        {saved === 'login' && (
          <p role="status" className="text-xs font-semibold text-ink/70">
            Log in to sync your scores to global leaderboards.{' '}
            <Link className="underline font-bold text-ink" href={`/login?next=/games/${game.slug}`}>
              Log in or sign up
            </Link>
            .
          </p>
        )}
        {saved === 'error' && (
          <p role="alert" className="text-xs font-bold text-red-500">
            Could not save to server right now. Score saved locally.
          </p>
        )}

        <div className="pt-2 border-t border-ink/10">
          <Link
            href={`/multiplayer?game=${game.slug}`}
            className="text-xs font-extrabold text-ink/80 hover:text-ink underline"
          >
            Challenge a friend to {game.name} →
          </Link>
        </div>
      </div>
    );
  }

  // Active game or Ready stage handled by GameRunner3D
  return (
    <div className="w-full">
      <GameRunner3D
        key={run}
        game={game}
        onDone={finish}
        autoStart={stage === 'playing'}
      />
    </div>
  );
}
