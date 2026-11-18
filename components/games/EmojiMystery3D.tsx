'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const RIDDLES = [
  { emojis: '🧊 ☕', answer: 'Iced Coffee', options: ['Iced Coffee', 'Cold Brew', 'Melting Ice', 'Tea Time'] },
  { emojis: '🚀 🌕', answer: 'Moon Landing', options: ['Alien Invasion', 'Moon Landing', 'Night Launch', 'Solar Flare'] },
  { emojis: '🐱 🐟', answer: 'Catfish', options: ['Aquarium', 'Cat Food', 'Catfish', 'Fish Hook'] },
  { emojis: '🌧️ 🌈', answer: 'Rainbow', options: ['Storm Cloud', 'Rainbow', 'Sun Shower', 'Weather Forecast'] },
];

export default function EmojiMystery3D({ onDone }: Props) {
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const curr = RIDDLES[qIndex];

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x1e1b4b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.4);
    dir.position.set(5, 12, 8);
    scene.add(ambient, dir);

    // Floating crystal pedestal
    const pedGeo = new THREE.CylinderGeometry(2.5, 3.0, 0.6, 24);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.3 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.3;
    scene.add(ped);
  };

  const handlePick = (opt: string) => {
    if (gameWon) return;

    if (opt === curr.answer) {
      sound.playScore();
      sound.playWin();
      setScore((s) => s + 250);

      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 1.5, 0), 0xa855f7, 20)
        );
      }

      if (qIndex + 1 < RIDDLES.length) {
        setQIndex((q) => q + 1);
      } else {
        setGameWon(true);
        onDone(score + 250);
      }
    } else {
      sound.playHit();
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setQIndex(0);
    setScore(0);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 3.5, 6]}
        cameraLookAt={[0, 1.2, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Riddle: <span className="text-purple-400">{qIndex + 1} / {RIDDLES.length}</span>
        </div>
      </div>

      {/* Floating 3D Emojis Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-20">
        <div className="text-7xl mb-2 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] animate-bounce">
          {curr.emojis}
        </div>
        <div className="bg-zinc-900/80 px-6 py-2 rounded-full border border-white/10 text-xs font-bold text-white/80">
          Decipher the emoji puzzle phrase!
        </div>
      </div>

      {/* 4 Choices */}
      <div className="absolute bottom-6 inset-x-6 flex justify-center pointer-events-auto">
        <div className="grid grid-cols-2 gap-3 max-w-md w-full">
          {curr.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handlePick(opt)}
              className="py-3.5 px-4 rounded-2xl bg-white text-ink hover:bg-cream font-black text-sm shadow-lg active:scale-95 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🔮🏆✨</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Emoji Riddle Master!</h2>
          <p className="text-xl font-bold mt-2">
            All rebuses deciphered! Score: <span className="text-marigold">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
