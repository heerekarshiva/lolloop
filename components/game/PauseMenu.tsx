'use client';

import React, { useEffect } from 'react';

type QualityLevel = 'low' | 'medium' | 'high';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  onQualityChange?: (q: QualityLevel) => void;
  quality?: QualityLevel;
}

export default function PauseMenu({
  onResume,
  onRestart,
  onQuit,
  onQualityChange,
  quality = 'medium',
}: PauseMenuProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResume();
      if (e.key === 'r' || e.key === 'R') onRestart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onResume, onRestart]);

  const levels: QualityLevel[] = ['low', 'medium', 'high'];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm bg-black/60">
      <div className="w-64 rounded-2xl border border-white/10 bg-[#191B1F]/90 p-8">
        <h2 className="mb-6 text-center text-2xl font-black tracking-widest text-[#FFB800]">
          PAUSED
        </h2>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full rounded-xl bg-[#FFB800] py-3 font-bold text-black transition-transform active:scale-95 hover:brightness-110"
          >
            Resume
          </button>
          <button
            onClick={onRestart}
            className="w-full rounded-xl border border-white/20 py-3 font-semibold text-white transition-colors hover:bg-white/5"
          >
            Restart
          </button>
          <button
            onClick={onQuit}
            className="w-full rounded-xl border border-red-500/40 py-3 font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            Quit
          </button>
        </div>

        {onQualityChange && (
          <div className="mt-6">
            <p className="mb-2 text-center text-xs text-white/40">Quality</p>
            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              {levels.map((l) => (
                <button
                  key={l}
                  onClick={() => onQualityChange(l)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-colors ${
                    quality === l
                      ? 'bg-[#FFB800] text-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-xs text-white/20">
          Esc to resume · R to restart
        </p>
      </div>
    </div>
  );
}
