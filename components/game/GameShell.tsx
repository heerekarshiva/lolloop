'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Loading from './Loading';
import FullscreenPrompt from './FullscreenPrompt';
import HUD from './HUD';
import PauseMenu from './PauseMenu';

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase =
  | 'loading'
  | 'prompt'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'results';

type QualityLevel = 'low' | 'medium' | 'high';
type FSPref = 'always' | 'never' | 'ask';

export interface GameShellContextValue {
  phase: GamePhase;
  score: number;
  setScore: (n: number) => void;
  endGame: (finalScore: number) => void;
  setLoadingDone: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const GameShellContext = createContext<GameShellContextValue | null>(null);

export function useGameShell(): GameShellContextValue {
  const ctx = useContext(GameShellContext);
  if (!ctx) throw new Error('useGameShell must be used inside <GameShell>');
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFSPref(): FSPref {
  try {
    const v = localStorage.getItem('lolloop.fullscreen');
    if (v === 'always' || v === 'never') return v;
  } catch { /* ignore */ }
  return 'ask';
}

function getSoundMuted(): boolean {
  try { return localStorage.getItem('lolloop.muted') === '1'; } catch { return false; }
}

function setSoundMuted(m: boolean) {
  try { localStorage.setItem('lolloop.muted', m ? '1' : '0'); } catch { /* ignore */ }
}

async function enterFullscreen(el: Element) {
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
    } else {
      // iOS pseudo-fullscreen
      (el as HTMLElement).style.cssText =
        'position:fixed;inset:0;width:100%;height:100dvh;z-index:9999';
      document.body.classList.add('lolloop-fullscreen');
    }
    // Try orientation lock
    try {
      await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.('landscape');
    } catch { /* not supported */ }
  } catch { /* user denied */ }
}

async function exitFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    document.body.classList.remove('lolloop-fullscreen');
    try { (screen.orientation as unknown as { unlock?: () => void })?.unlock?.(); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface GameShellProps {
  children: React.ReactNode;
  gameName?: string;
  onScore?: (score: number) => void;
  onComplete?: (score: number) => void;
}

export default function GameShell({
  children,
  gameName,
  onScore,
  onComplete,
}: GameShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [score, setScoreState] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [countdownN, setCountdownN] = useState(3);
  const [muted, setMuted] = useState(getSoundMuted);
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // ── Loading auto-progress ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'loading') return;
    // Fake loading bar: fill to 90% quickly, hold until setLoadingDone called
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(p + 15, 90);
      setLoadingProgress(p);
      if (p >= 90) clearInterval(id);
    }, 150);
    // Auto-advance after 1.5s max
    const t = setTimeout(() => setLoadingDone(), 1500);
    return () => { clearInterval(id); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'loading']);

  // ── After loading: check fullscreen pref ─────────────────────────────────
  function setLoadingDone() {
    setLoadingProgress(100);
    const pref = getFSPref();
    if (pref === 'always') {
      if (containerRef.current) enterFullscreen(containerRef.current);
      startCountdown();
    } else if (pref === 'never') {
      startCountdown();
    } else {
      setPhase('prompt');
    }
  }

  // ── Countdown ─────────────────────────────────────────────────────────────
  function startCountdown() {
    setPhase('countdown');
    setCountdownN(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setPhase('playing');
      } else {
        setCountdownN(n);
      }
    }, 1000);
  }

  // ── Fullscreen prompt handlers ────────────────────────────────────────────
  function handleGoFullscreen() {
    if (containerRef.current) enterFullscreen(containerRef.current);
    startCountdown();
  }

  function handlePlayHere() {
    startCountdown();
  }

  // ── Pause / resume ────────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p));
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (phase === 'playing' || phase === 'paused')) {
        togglePause();
      }
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) exitFullscreen();
        else if (containerRef.current) enterFullscreen(containerRef.current);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, togglePause]);

  // ── Fullscreen change tracking ────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen — if playing, pause
        setPhase((p) => (p === 'playing' ? 'paused' : p));
        document.body.classList.remove('lolloop-fullscreen');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Context value ─────────────────────────────────────────────────────────
  const setScore = useCallback((n: number) => {
    setScoreState(n);
    onScore?.(n);
  }, [onScore]);

  const endGame = useCallback((s: number) => {
    setFinalScore(s);
    setScoreState(s);
    onComplete?.(s);
    setPhase('gameover');
  }, [onComplete]);

  const ctxValue: GameShellContextValue = {
    phase,
    score,
    setScore,
    endGame,
    setLoadingDone,
  };

  // ── Mute toggle ───────────────────────────────────────────────────────────
  function handleMute() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  }

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  function handleFullscreenToggle() {
    if (document.fullscreenElement) exitFullscreen();
    else if (containerRef.current) enterFullscreen(containerRef.current);
  }

  // ── Restart ───────────────────────────────────────────────────────────────
  function handleRestart() {
    setScoreState(0);
    setFinalScore(0);
    startCountdown();
  }

  // ── Quit ──────────────────────────────────────────────────────────────────
  function handleQuit() {
    exitFullscreen();
    if (typeof window !== 'undefined') window.history.back();
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <GameShellContext.Provider value={ctxValue}>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden bg-[#191B1F]"
        style={{ minHeight: '100dvh' }}
      >
        {/* Game content */}
        <div
          className={`h-full w-full transition-opacity duration-300 ${
            phase === 'loading' || phase === 'prompt' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {children}
        </div>

        {/* Loading overlay */}
        {phase === 'loading' && (
          <Loading progress={loadingProgress} message={gameName ? `Loading ${gameName}…` : undefined} />
        )}

        {/* Fullscreen prompt */}
        {phase === 'prompt' && (
          <FullscreenPrompt onFullscreen={handleGoFullscreen} onPlayHere={handlePlayHere} />
        )}

        {/* Countdown */}
        {phase === 'countdown' && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div
              key={countdownN}
              className="text-9xl font-black text-[#FFB800] drop-shadow-[0_0_30px_rgba(255,184,0,0.8)] animate-ping"
              style={{ animationDuration: '0.9s', animationIterationCount: 1 }}
            >
              {countdownN}
            </div>
          </div>
        )}

        {/* HUD */}
        {(phase === 'playing' || phase === 'paused') && (
          <HUD
            score={score}
            onPause={togglePause}
            onFullscreen={handleFullscreenToggle}
            onMute={handleMute}
            muted={muted}
          />
        )}

        {/* Pause menu */}
        {phase === 'paused' && (
          <PauseMenu
            onResume={togglePause}
            onRestart={handleRestart}
            onQuit={handleQuit}
            quality={quality}
            onQualityChange={setQuality}
          />
        )}

        {/* Game Over */}
        {phase === 'gameover' && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="mb-2 text-6xl">💀</div>
              <h2 className="mb-1 text-4xl font-black text-white">Game Over</h2>
              <p className="mb-2 text-xl text-[#FFB800] font-bold">{finalScore.toLocaleString()} pts</p>
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleRestart}
                  className="rounded-xl bg-[#FFB800] px-8 py-3 font-bold text-black transition-transform hover:brightness-110 active:scale-95"
                >
                  Play Again
                </button>
                <button
                  onClick={handleQuit}
                  className="rounded-xl border border-white/20 px-8 py-3 font-semibold text-white transition-colors hover:bg-white/5"
                >
                  Quit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShellContext.Provider>
  );
}
