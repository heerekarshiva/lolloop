'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const VALID_WORDS = ['GAME', 'LOOP', 'PLAY', 'GOLD', 'HERO', 'STAR', 'FIRE', 'COOL', 'FAST', 'JUMP'];
const LETTERS_POOL = ['G', 'A', 'M', 'E', 'L', 'O', 'O', 'P', 'S', 'T', 'A', 'R', 'F', 'I', 'R', 'E'];

export default function WordHunter3D({ onDone }: Props) {
  const [currentWord, setCurrentWord] = useState('');
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x111827);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0xffb800, 1.3);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Decorative 3D polyhedra floating
    for (let i = 0; i < 12; i++) {
      const geo = new THREE.IcosahedronGeometry(0.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        -4 - Math.random() * 6
      );
      scene.add(mesh);
    }
  };

  const addLetter = (letter: string) => {
    sound.playTap();
    const next = currentWord + letter;
    setCurrentWord(next);

    // Check if word matches
    if (VALID_WORDS.includes(next) && !foundWords.includes(next)) {
      sound.playScore();
      const updated = [...foundWords, next];
      setFoundWords(updated);
      setScore((s) => s + next.length * 100);
      setCurrentWord('');

      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(stateRef.current.scene, new THREE.Vector3(0, 0, 0), 0xffb800, 20)
        );
      }

      if (updated.length >= 4) {
        setGameWon(true);
        sound.playWin();
        onDone(score + 1000);
      }
    }
  };

  const clearWord = () => {
    sound.playHit();
    setCurrentWord('');
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setCurrentWord('');
    setFoundWords([]);
    setScore(0);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 8]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Words: <span className="text-cyan-400">{foundWords.length} / 4</span>
        </div>
      </div>

      {/* Current Word Display */}
      <div className="absolute top-20 inset-x-0 flex flex-col items-center pointer-events-none">
        <div className="bg-zinc-900/90 text-white px-6 py-3 rounded-2xl border border-white/10 text-center shadow-lg min-w-[200px]">
          <p className="text-xs uppercase font-bold tracking-wider text-white/50">Spelling</p>
          <p className="text-3xl font-black text-cyan-400 min-h-[36px] tracking-widest">
            {currentWord || '___'}
          </p>
        </div>
      </div>

      {/* 4x4 Letter Nodes Grid */}
      <div className="absolute inset-x-0 bottom-20 flex justify-center p-4">
        <div className="grid grid-cols-4 gap-2.5 max-w-xs w-full">
          {LETTERS_POOL.map((char, idx) => (
            <button
              key={idx}
              onClick={() => addLetter(char)}
              className="h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-black text-2xl hover:bg-white hover:text-ink active:scale-95 transition shadow-lg"
            >
              {char}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Button */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center">
        <button
          onClick={clearWord}
          className="px-6 py-2 bg-white/20 text-white text-xs font-bold rounded-full hover:bg-white/30"
        >
          Clear Current Word ✕
        </button>
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">📖🏆</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Word Hunter Master!</h2>
          <p className="text-xl font-bold mt-2">
            Found: {foundWords.join(', ')} · Score: <span className="text-marigold">{score}</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Hunt Again
          </button>
        </div>
      )}
    </div>
  );
}
