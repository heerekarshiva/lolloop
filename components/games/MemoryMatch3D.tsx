'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const ICONS = ['💎', '⭐', '🪙', '🎲', '❤️', '👑', '🔥', '⚡'];

interface CardData {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MemoryMatch3D({ onDone }: Props) {
  const [cards, setCards] = useState<CardData[]>(() => {
    const deck = [...ICONS, ...ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, isFlipped: false, isMatched: false }));
    return deck;
  });

  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x1e1b4b);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(6, 15, 10);
    scene.add(ambient, dir);

    // Decorative floating crystals in 3D background
    const colors = [0x6366f1, 0x8b5cf6, 0xec4899, 0x06b6d4];
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.OctahedronGeometry(0.3 + Math.random() * 0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.2,
        metalness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 12,
        -5 - Math.random() * 10
      );
      scene.add(mesh);
    }
  };

  const flipCard = (index: number) => {
    if (selectedCards.length >= 2 || cards[index].isFlipped || cards[index].isMatched || gameOver) {
      return;
    }

    sound.playTap();
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newSelected;

      if (newCards[first].icon === newCards[second].icon) {
        // Match!
        setTimeout(() => {
          sound.playScore();
          const matchedCards = [...newCards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setSelectedCards([]);
          setMatches((m) => {
            const nextM = m + 1;
            if (nextM === 8) {
              setGameOver(true);
              sound.playWin();
              const finalScore = Math.max(100, 1000 - moves * 25);
              onDone(finalScore);
            }
            return nextM;
          });
        }, 500);
      } else {
        // No match -> flip back
        setTimeout(() => {
          sound.playHit();
          const resetCards = [...newCards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setSelectedCards([]);
        }, 900);
      }
    }
  };

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const deck = [...ICONS, ...ICONS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, isFlipped: false, isMatched: false }));
    setCards(deck);
    setMoves(0);
    setMatches(0);
    setSelectedCards([]);
    setGameOver(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 0, 12]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Matches: <span className="text-marigold">{matches} / 8</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Moves: <span className="text-cyan-400">{moves}</span>
        </div>
      </div>

      {/* 4x4 3D Memory Card Pedestal Matrix */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid grid-cols-4 gap-3 max-w-sm w-full">
          {cards.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => flipCard(idx)}
              className={`h-20 rounded-2xl font-black text-3xl flex items-center justify-center transition-all duration-300 transform perspective-500 shadow-lg ${
                c.isMatched
                  ? 'bg-emerald-500/20 border-2 border-emerald-400 text-white scale-95 opacity-80'
                  : c.isFlipped
                  ? 'bg-white text-ink rotate-y-180 scale-105 shadow-marigold/30'
                  : 'bg-indigo-900/80 border border-indigo-500/30 text-indigo-300 hover:scale-102 hover:bg-indigo-800'
              }`}
            >
              {c.isFlipped || c.isMatched ? c.icon : '❓'}
            </button>
          ))}
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🎉🃏</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Memory Master!</h2>
          <p className="text-xl font-bold mt-2">
            Completed in <span className="text-marigold">{moves} moves</span>
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
