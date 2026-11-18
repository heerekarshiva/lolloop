'use client';

import React, { useState, useEffect } from 'react';
import { sound, SoundTheme } from '@/lib/sound';

export default function SoundController() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState(() => sound.getState());

  useEffect(() => {
    const unsub = sound.subscribe(() => {
      setState(sound.getState());
    });
    return unsub;
  }, []);

  return (
    <>
      {/* Floating Audio Quick Button in bottom-right corner */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Sound Settings"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur border border-ink/10 shadow-xl hover:bg-cream text-ink text-sm font-extrabold active:scale-95 transition"
      >
        <span>{state.isMuted ? '🔇' : state.isMusicPlaying ? '🎵' : '🔈'}</span>
        <span className="hidden sm:inline">
          {state.isMuted ? 'Muted' : state.isMusicPlaying ? 'Music Playing' : 'Sound'}
        </span>
      </button>

      {/* Audio Controller Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-ink/10 space-y-5 animate-in fade-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎧</span>
                <h3 className="text-xl font-extrabold text-ink">Audio & Music</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-field flex items-center justify-center text-ink/70 hover:text-ink font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Mute Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-extrabold text-sm text-ink">Master Mute</p>
                <p className="text-xs font-semibold text-ink/60">Silence all audio</p>
              </div>
              <button
                onClick={() => sound.toggleMute()}
                className={`px-4 py-1.5 rounded-full font-extrabold text-xs transition ${
                  state.isMuted ? 'bg-red-500 text-white' : 'bg-field text-ink'
                }`}
              >
                {state.isMuted ? 'MUTED' : 'UNMUTED'}
              </button>
            </div>

            {/* Music Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-extrabold text-ink">
                <span>Music Volume</span>
                <span>{Math.round(state.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.musicVolume}
                onChange={(e) => sound.setMusicVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-field rounded-lg appearance-none cursor-pointer accent-marigold"
              />
            </div>

            {/* SFX Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-extrabold text-ink">
                <span>Sound Effects (SFX)</span>
                <span>{Math.round(state.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.sfxVolume}
                onChange={(e) => sound.setSfxVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-field rounded-lg appearance-none cursor-pointer accent-marigold"
              />
            </div>

            {/* Theme Soundtracks Switcher */}
            <div className="space-y-2 pt-2 border-t border-ink/10">
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink/70">
                Procedural Soundtracks
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['arcade', 'puzzle', 'racing', 'adventure', 'multiplayer', 'funny'] as SoundTheme[]).map(
                  (theme) => (
                    <button
                      key={theme}
                      onClick={() => sound.playMusic(theme)}
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold capitalize border transition text-left ${
                        state.isMusicPlaying && state.currentTheme === theme
                          ? 'bg-cream border-ink ring-2 ring-marigold text-ink'
                          : 'bg-field border-ink/10 text-ink/80 hover:bg-white'
                      }`}
                    >
                      {theme}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Stop Music Button */}
            {state.isMusicPlaying && (
              <button
                onClick={() => sound.stopMusic()}
                className="w-full py-2.5 rounded-full bg-field hover:bg-cream text-ink text-xs font-extrabold transition"
              >
                Stop Music ⏹️
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
