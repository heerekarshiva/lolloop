'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FullscreenPromptProps {
  onFullscreen: () => void;
  onPlayHere: () => void;
}

export default function FullscreenPrompt({ onFullscreen, onPlayHere }: FullscreenPromptProps) {
  const fsRef = useRef<HTMLButtonElement>(null);
  const [remember, setRemember] = useState(false);

  // Focus the fullscreen button on mount
  useEffect(() => {
    fsRef.current?.focus();
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { handleFullscreen(); }
      if (e.key === 'Escape') { handlePlayHere(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remember]);

  function saveChoice(choice: 'always' | 'never') {
    if (remember) {
      try { localStorage.setItem('lolloop.fullscreen', choice); } catch { /* ignore */ }
    }
  }

  function handleFullscreen() {
    saveChoice('always');
    onFullscreen();
  }

  function handlePlayHere() {
    saveChoice('never');
    onPlayHere();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen preference"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#191B1F] p-8">
        <div className="mb-2 text-center text-3xl">🎮</div>
        <h2 className="mb-1 text-center text-xl font-bold text-white">Play Fullscreen?</h2>
        <p className="mb-6 text-center text-sm text-white/50">Best experience in fullscreen mode</p>

        <div className="flex flex-col gap-3">
          <button
            ref={fsRef}
            onClick={handleFullscreen}
            className="w-full rounded-xl bg-[#FFB800] py-3 font-bold text-black transition-transform active:scale-95 hover:brightness-110"
          >
            Go Fullscreen
          </button>
          <button
            onClick={handlePlayHere}
            className="w-full rounded-xl border border-white/20 py-3 font-semibold text-white transition-colors hover:bg-white/5"
          >
            Play Here
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-sm text-white/40">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="accent-[#FFB800]"
          />
          Remember my choice
        </label>
      </div>
    </div>
  );
}
