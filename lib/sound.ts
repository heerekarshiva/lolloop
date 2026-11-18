// LOLLOOP Web Audio Procedural Sound Engine & Synthesizer
// Zero external audio files required - works completely offline, 100% royalty free with zero latency.

export type SoundTheme = 'arcade' | 'puzzle' | 'racing' | 'adventure' | 'multiplayer' | 'funny';

interface ThemeMusicConfig {
  bpm: number;
  scale: number[];
  bassWave: OscillatorType;
  leadWave: OscillatorType;
  rootFreq: number;
  hasKick: boolean;
  hasHihat: boolean;
  patternLength: number;
  label: string;
}

const THEME_CONFIGS: Record<SoundTheme, ThemeMusicConfig> = {
  arcade: {
    bpm: 136,
    scale: [0, 3, 5, 7, 10, 12, 15],
    bassWave: 'sawtooth',
    leadWave: 'square',
    rootFreq: 164.81, // E3
    hasKick: true,
    hasHihat: true,
    patternLength: 16,
    label: 'Energetic Arcade Electronic',
  },
  racing: {
    bpm: 165,
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    bassWave: 'sawtooth',
    leadWave: 'sawtooth',
    rootFreq: 146.83, // D3
    hasKick: true,
    hasHihat: true,
    patternLength: 16,
    label: 'High-Octane Turbo Beats',
  },
  puzzle: {
    bpm: 78,
    scale: [0, 2, 4, 7, 9, 11, 12, 14],
    bassWave: 'triangle',
    leadWave: 'sine',
    rootFreq: 261.63, // C4
    hasKick: false,
    hasHihat: false,
    patternLength: 16,
    label: 'Mellow Ambient Mind Keys',
  },
  adventure: {
    bpm: 98,
    scale: [0, 2, 3, 5, 7, 8, 10, 12],
    bassWave: 'triangle',
    leadWave: 'sine',
    rootFreq: 130.81, // C3
    hasKick: true,
    hasHihat: false,
    patternLength: 16,
    label: 'Cinematic Orchestral Chords',
  },
  multiplayer: {
    bpm: 144,
    scale: [0, 4, 7, 9, 11, 12, 16],
    bassWave: 'square',
    leadWave: 'triangle',
    rootFreq: 220.0, // A3
    hasKick: true,
    hasHihat: true,
    patternLength: 16,
    label: 'Competitive Arena Anthem',
  },
  funny: {
    bpm: 124,
    scale: [0, 4, 7, 11, 12, 14, 17],
    bassWave: 'triangle',
    leadWave: 'sine',
    rootFreq: 293.66, // D4
    hasKick: true,
    hasHihat: true,
    patternLength: 16,
    label: 'Quirky Party Whistle & Bounce',
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private musicInterval: any = null;
  private currentTheme: SoundTheme | null = null;
  private isMusicPlaying = false;
  private musicVolume = 0.45;
  private sfxVolume = 0.65;
  private isMuted = false;
  private step = 0;
  private subscribers = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedMute = localStorage.getItem('lolloop:sound:muted');
        if (savedMute !== null) this.isMuted = savedMute === 'true';
        const savedMusicVol = localStorage.getItem('lolloop:sound:musicVol');
        if (savedMusicVol !== null) this.musicVolume = parseFloat(savedMusicVol);
        const savedSfxVol = localStorage.getItem('lolloop:sound:sfxVol');
        if (savedSfxVol !== null) this.sfxVolume = parseFloat(savedSfxVol);
      } catch {
        // localStorage not available
      }
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.updateGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private updateGains() {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) return;
    this.masterGain.gain.value = this.isMuted ? 0 : 1;
    this.musicGain.gain.value = this.musicVolume * 0.4;
    this.sfxGain.gain.value = this.sfxVolume * 0.7;
    this.notify();
  }

  private notify() {
    this.subscribers.forEach((fn) => fn());
  }

  public subscribe(fn: () => void) {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  public getState() {
    return {
      isMusicPlaying: this.isMusicPlaying,
      currentTheme: this.currentTheme,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
      isMuted: this.isMuted,
    };
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('lolloop:sound:muted', String(muted));
    } catch {}
    this.updateGains();
  }

  public toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('lolloop:sound:musicVol', String(this.musicVolume));
    } catch {}
    this.updateGains();
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('lolloop:sound:sfxVol', String(this.sfxVolume));
    } catch {}
    this.updateGains();
  }

  public playMusic(theme: SoundTheme = 'arcade') {
    this.initContext();
    if (!this.ctx || !this.musicGain) return;

    if (this.isMusicPlaying && this.currentTheme === theme) {
      return;
    }

    this.stopMusic();
    this.currentTheme = theme;
    this.isMusicPlaying = true;
    this.step = 0;

    const cfg = THEME_CONFIGS[theme];
    const beatMs = (60000 / cfg.bpm) / 4; // 16th note timing

    this.musicInterval = setInterval(() => {
      this.playMusicStep(cfg);
    }, beatMs);

    this.notify();
  }

  private playMusicStep(cfg: ThemeMusicConfig) {
    if (!this.ctx || !this.musicGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const s = this.step % cfg.patternLength;

    // Bass note on 1st, 5th, 9th, 13th 16ths (on-beats)
    if (s % 4 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassEnv = this.ctx.createGain();
      bassOsc.type = cfg.bassWave;

      const scaleIndex = (Math.floor(this.step / 8) % cfg.scale.length);
      const semitone = cfg.scale[scaleIndex];
      bassOsc.frequency.setValueAtTime(cfg.rootFreq * Math.pow(2, (semitone - 12) / 12), now);

      bassEnv.gain.setValueAtTime(0.5, now);
      bassEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassEnv);
      bassEnv.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.25);
    }

    // Lead Arpeggio
    if (s % 2 === 0 || cfg.bpm > 140) {
      const leadOsc = this.ctx.createOscillator();
      const leadEnv = this.ctx.createGain();
      leadOsc.type = cfg.leadWave;

      const arpHarmony = (s * 3 + Math.floor(this.step / 16)) % cfg.scale.length;
      const semitone = cfg.scale[arpHarmony];
      leadOsc.frequency.setValueAtTime(cfg.rootFreq * Math.pow(2, semitone / 12), now);

      leadEnv.gain.setValueAtTime(0.25, now);
      leadEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      leadOsc.connect(leadEnv);
      leadEnv.connect(this.musicGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.14);
    }

    // Kick Drum
    if (cfg.hasKick && (s === 0 || s === 8)) {
      const kickOsc = this.ctx.createOscillator();
      const kickEnv = this.ctx.createGain();
      kickOsc.frequency.setValueAtTime(140, now);
      kickOsc.frequency.exponentialRampToValueAtTime(32, now + 0.14);
      kickEnv.gain.setValueAtTime(0.7, now);
      kickEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      kickOsc.connect(kickEnv);
      kickEnv.connect(this.musicGain);
      kickOsc.start(now);
      kickOsc.stop(now + 0.18);
    }

    // Hi-hat
    if (cfg.hasHihat && s % 2 === 1) {
      this.playProceduralNoise(now, 0.04, 0.08);
    }

    this.step++;
  }

  private playProceduralNoise(startTime: number, duration: number, volume: number) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(volume, startTime);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    whiteNoise.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);
    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + duration);
  }

  public stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.isMusicPlaying = false;
    this.notify();
  }

  public toggleMusic(theme: SoundTheme = 'arcade') {
    if (this.isMusicPlaying) {
      this.stopMusic();
    } else {
      this.playMusic(theme);
    }
  }

  // --- Sound Effects (SFX) ---

  public playTap() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playJump() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.18);
    env.gain.setValueAtTime(0.6, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playPop() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
    env.gain.setValueAtTime(0.7, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playScore() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const env = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      env.gain.setValueAtTime(0.35, now + idx * 0.04);
      env.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.14);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.15);
    });
  }

  public playHit() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    env.gain.setValueAtTime(0.8, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playSlice() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.09);
    env.gain.setValueAtTime(0.5, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playWhack() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    env.gain.setValueAtTime(0.9, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playWhoosh() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    env.gain.setValueAtTime(0.4, now);
    env.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playWin() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Victory fanfare notes: C5, E5, G5, C6
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const env = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      env.gain.setValueAtTime(0.4, now + idx * 0.08);
      env.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.45);
    });
  }

  public playLose() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    [392.0, 369.99, 349.23, 311.13].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const env = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      env.gain.setValueAtTime(0.35, now + idx * 0.1);
      env.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      osc.connect(env);
      env.connect(this.sfxGain!);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }
}

export const sound = new SoundEngine();
