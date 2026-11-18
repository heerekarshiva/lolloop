import type { Theme } from './games';
// Original procedural music (Web Audio synth): no samples, so no licensing issues.
const CFG: Record<Theme, { bpm: number; wave: OscillatorType; scale: number[]; root: number; kick: boolean; label: string }> = {
  arcade: { bpm: 140, wave: 'square', scale: [0, 3, 5, 7, 10], root: 220, kick: true, label: 'Energetic electronic' },
  racing: { bpm: 168, wave: 'sawtooth', scale: [0, 2, 3, 7, 8], root: 196, kick: true, label: 'Fast-paced beats' },
  puzzle: { bpm: 80, wave: 'sine', scale: [0, 2, 4, 7, 9], root: 262, kick: false, label: 'Relaxing ambient' },
  adventure: { bpm: 96, wave: 'triangle', scale: [0, 2, 3, 5, 7, 8], root: 147, kick: false, label: 'Cinematic' },
  multiplayer: { bpm: 150, wave: 'square', scale: [0, 4, 7, 9, 12], root: 247, kick: true, label: 'Competitive' },
  funny: { bpm: 120, wave: 'triangle', scale: [0, 4, 7, 12], root: 330, kick: false, label: 'Playful' },
};
export const musicLabel = (t: Theme) => CFG[t].label;
let ctx: AudioContext | null = null, master: GainNode | null = null, timer: ReturnType<typeof setInterval> | undefined, vol = 0.5;
export function setVolume(v: number) { vol = v; if (master) master.gain.value = v * 0.25; }
export function stopMusic() { if (timer) clearInterval(timer); timer = undefined; }
export function playMusic(theme: Theme) {
  stopMusic();
  ctx = ctx ?? new AudioContext(); if (ctx.state === 'suspended') ctx.resume();
  if (!master) { master = ctx.createGain(); master.connect(ctx.destination); }
  master.gain.value = vol * 0.25;
  const c = CFG[theme]; let step = 0;
  timer = setInterval(() => {
    if (!ctx || !master) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const deg = c.scale[(step * 3 + (step >> 2)) % c.scale.length], oct = step % 8 === 7 ? 2 : 1;
    o.type = c.wave; o.frequency.value = c.root * oct * 2 ** (deg / 12);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 60 / c.bpm * 0.9);
    o.connect(g).connect(master); o.start(t); o.stop(t + 60 / c.bpm);
    if (c.kick && step % 2 === 0) { const k = ctx.createOscillator(), kg = ctx.createGain(); k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.12); kg.gain.setValueAtTime(1, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.15); k.connect(kg).connect(master); k.start(t); k.stop(t + 0.16); }
    step++;
  }, 60000 / c.bpm / 1.0);
}
