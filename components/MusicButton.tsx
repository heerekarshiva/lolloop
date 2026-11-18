'use client';
import { useEffect, useState } from 'react';
import type { Theme } from '@/lib/games';
import { musicLabel, playMusic, setVolume, stopMusic } from '@/lib/music';
/** Add Music: suggests the theme's track, mute + volume. Switches automatically when `theme` changes. */
export default function MusicButton({ theme, dark = false }: { theme: Theme; dark?: boolean }) {
  const [on, setOn] = useState(false), [vol, setVol] = useState(0.5), [open, setOpen] = useState(false);
  useEffect(() => { if (on) playMusic(theme); }, [theme, on]);
  useEffect(() => () => stopMusic(), []);
  const toggle = () => { if (on) { stopMusic(); setOn(false); } else { setOn(true); playMusic(theme); } };
  const c = `rounded-full px-4 py-2 text-sm font-bold ${dark ? 'bg-white/90 text-ink' : 'bg-chip'}`;
  return (
    <div className="relative">
      <button className={c} onClick={() => (on ? setOpen(!open) : toggle())} aria-label="Music">{on ? '🎵 Music on' : `🎵 Add music`}</button>
      {open && <div className="absolute bottom-full right-0 mb-2 w-56 space-y-2 rounded-3xl bg-white p-4 text-ink shadow-[0_8px_24px_-4px_rgba(25,27,31,0.15)]">
        <p className="text-xs font-bold">Now playing: {musicLabel(theme)}</p>
        <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => { setVol(+e.target.value); setVolume(+e.target.value); }} className="w-full accent-[#FFB800]" />
        <div className="flex gap-2"><button className="flex-1 rounded-full bg-chip py-2 text-xs font-bold" onClick={() => setVolume(vol ? 0 : 0.5)}>Mute</button><button className="flex-1 rounded-full bg-ink py-2 text-xs font-bold text-white" onClick={() => { toggle(); setOpen(false); }}>Turn off</button></div>
      </div>}
    </div>
  );
}
