'use client';

import React, { useEffect, useRef, useState } from 'react';

interface HUDProps {
  score: number;
  highScore?: number;
  onPause: () => void;
  onFullscreen: () => void;
  onMute: () => void;
  muted: boolean;
  className?: string;
}

export default function HUD({
  score,
  highScore,
  onPause,
  onFullscreen,
  onMute,
  muted,
  className = '',
}: HUDProps) {
  const [bump, setBump] = useState(false);
  const prevScore = useRef(score);

  // Animate score bump on change
  useEffect(() => {
    if (score !== prevScore.current) {
      prevScore.current = score;
      setBump(true);
      const t = setTimeout(() => setBump(false), 300);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      {/* Score — top left */}
      <div className="pointer-events-none absolute left-4 top-4">
        <div
          className={`text-3xl font-black text-[#FFB800] transition-transform duration-150 ${bump ? 'scale-125' : 'scale-100'}`}
        >
          {score.toLocaleString()}
        </div>
        {highScore !== undefined && highScore > 0 && (
          <div className="text-xs text-white/40">Best: {highScore.toLocaleString()}</div>
        )}
      </div>

      {/* Pause — top right */}
      <button
        onClick={onPause}
        className="pointer-events-auto absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 active:scale-90"
        aria-label="Pause"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect x="4" y="3" width="4" height="14" rx="1.5" />
          <rect x="12" y="3" width="4" height="14" rx="1.5" />
        </svg>
      </button>

      {/* Mute — bottom left */}
      <button
        onClick={onMute}
        className="pointer-events-auto absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 active:scale-90"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
            <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
          </svg>
        )}
      </button>

      {/* Fullscreen — bottom right */}
      <button
        onClick={onFullscreen}
        className="pointer-events-auto absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 active:scale-90"
        aria-label="Toggle fullscreen"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
        </svg>
      </button>
    </div>
  );
}
