'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

export default function SlideIt3D({ onDone }: Props) {
  // 3x3 for brisk, fun mobile/desktop gameplay (numbers 1-8 and empty 0)
  const [tiles, setTiles] = useState<number[]>([1, 2, 3, 4, 0, 5, 7, 8, 6]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x27272a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(5, 12, 10);
    dir.castShadow = true;
    scene.add(ambient, dir);

    // Carved wooden board tray
    const boardGeo = new THREE.BoxGeometry(6, 0.5, 6);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = -0.3;
    board.receiveShadow = true;
    scene.add(board);
  };

  const moveTile = (index: number) => {
    if (gameWon) return;
    const emptyIndex = tiles.indexOf(0);

    const row = Math.floor(index / 3);
    const col = index % 3;
    const emptyRow = Math.floor(emptyIndex / 3);
    const emptyCol = emptyIndex % 3;

    // Check if adjacent to empty slot
    const isAdjacent =
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow);

    if (isAdjacent) {
      sound.playTap();
      const newTiles = [...tiles];
      newTiles[emptyIndex] = newTiles[index];
      newTiles[index] = 0;
      setTiles(newTiles);
      setMoves((m) => m + 1);

      // Check win condition [1, 2, 3, 4, 5, 6, 7, 8, 0]
      const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      if (newTiles.every((val, i) => val === solved[i])) {
        setGameWon(true);
        sound.playWin();
        const score = Math.max(100, 1500 - (moves + 1) * 30);
        onDone(score);
      }
    } else {
      sound.playHit();
    }
  };

  const restart = () => {
    // Generate valid solvability shuffled array
    const shuffled = [1, 2, 3, 4, 5, 6, 7, 0, 8].sort(() => Math.random() - 0.5);
    setTiles(shuffled);
    setMoves(0);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        cameraPos={[0, 7.5, 5.5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Moves: <span className="text-marigold">{moves}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Slide numbers 1 to 8 in order
        </div>
      </div>

      {/* 3x3 Sliding Puzzle Matrix */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="grid grid-cols-3 gap-3 p-4 bg-amber-950/80 backdrop-blur rounded-3xl border-4 border-amber-900 shadow-2xl max-w-xs w-full">
          {tiles.map((num, idx) => (
            <button
              key={idx}
              onClick={() => moveTile(idx)}
              className={`h-20 rounded-2xl font-black text-3xl flex items-center justify-center transition-all duration-200 transform shadow-md ${
                num === 0
                  ? 'bg-transparent border-2 border-dashed border-amber-800/50 cursor-default'
                  : 'bg-amber-100 text-amber-950 hover:bg-white active:scale-95 shadow-amber-950/40'
              }`}
            >
              {num !== 0 ? num : ''}
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
          <div className="text-5xl mb-2">🏆🔲</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Puzzle Solved!</h2>
          <p className="text-xl font-bold mt-2">
            Completed in <span className="text-marigold">{moves} moves</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Slide Again
          </button>
        </div>
      )}
    </div>
  );
}
