'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

// 4x4 Mini Sudoku sprint for rapid, highly engaging mobile & desktop puzzle play
const PUZZLE_START = [
  [1, 0, 0, 4],
  [0, 4, 1, 0],
  [0, 1, 4, 0],
  [4, 0, 0, 1],
];

const PUZZLE_SOLUTION = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1],
];

export default function SudokuSprint3D({ onDone }: Props) {
  const [board, setBoard] = useState<number[][]>(() => PUZZLE_START.map((r) => [...r]));
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>([0, 1]);
  const [score, setScore] = useState(1000);
  const [gameWon, setGameWon] = useState(false);

  const stateRef = useRef({
    scene: null as THREE.Scene | null,
    cubes: [] as { r: number; c: number; mesh: THREE.Mesh }[],
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0xfaf9f6);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const dir = new THREE.DirectionalLight(0xffb800, 1.1);
    dir.position.set(6, 12, 8);
    dir.castShadow = true;
    scene.add(ambient, dir);

    // Board Base
    const baseGeo = new THREE.BoxGeometry(6, 0.4, 6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.2;
    base.receiveShadow = true;
    scene.add(base);

    // 4x4 Cell Pedestals
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = (c - 1.5) * 1.3;
        const z = (r - 1.5) * 1.3;

        const cellGeo = new THREE.BoxGeometry(1.15, 0.25, 1.15);
        const cellMat = new THREE.MeshStandardMaterial({
          color: (Math.floor(r / 2) + Math.floor(c / 2)) % 2 === 0 ? 0xffffff : 0xf1f5f9,
          roughness: 0.3,
        });
        const cell = new THREE.Mesh(cellGeo, cellMat);
        cell.position.set(x, 0, z);
        scene.add(cell);
      }
    }
  };

  const placeNumber = (num: number) => {
    if (!selectedCell || gameWon) return;
    const [r, c] = selectedCell;
    if (PUZZLE_START[r][c] !== 0) return; // Cannot edit locked starter clues

    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = num;
    setBoard(newBoard);

    if (num === PUZZLE_SOLUTION[r][c]) {
      sound.playScore();
      if (stateRef.current.scene) {
        stateRef.current.particles.push(
          createParticleBurst(
            stateRef.current.scene,
            new THREE.Vector3((c - 1.5) * 1.3, 0.5, (r - 1.5) * 1.3),
            0x00e676,
            12
          )
        );
      }
    } else {
      sound.playHit();
      setScore((s) => Math.max(100, s - 50));
    }

    // Check complete solution
    const isComplete = newBoard.every((row, ri) =>
      row.every((val, ci) => val === PUZZLE_SOLUTION[ri][ci])
    );

    if (isComplete) {
      setGameWon(true);
      sound.playWin();
      onDone(score);
    }
  };

  // Timer decays score
  useEffect(() => {
    if (gameWon) return;
    const interval = setInterval(() => {
      setScore((s) => Math.max(100, s - 5));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameWon]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setBoard(PUZZLE_START.map((r) => [...r]));
    setSelectedCell([0, 1]);
    setScore(1000);
    setGameWon(false);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-canvas select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 7.5, 5]}
        cameraLookAt={[0, 0, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-ink/10 text-ink font-extrabold text-base shadow-sm">
          Sprint Bonus: <span className="text-marigold">{score} pts</span>
        </div>
        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-ink/10 text-ink font-extrabold text-sm shadow-sm">
          4x4 Mini Sudoku
        </div>
      </div>

      {/* 3D Sudoku Interactive Overlay Board */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="grid grid-cols-4 gap-2.5 p-3 rounded-2xl bg-white/70 backdrop-blur border border-ink/10 shadow-xl pointer-events-auto">
          {board.map((row, r) =>
            row.map((val, c) => {
              const isLocked = PUZZLE_START[r][c] !== 0;
              const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
              const isCorrect = val === PUZZLE_SOLUTION[r][c];

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSelectedCell([r, c])}
                  className={`w-14 h-14 rounded-xl font-black text-2xl flex items-center justify-center transition ${
                    isSelected
                      ? 'ring-4 ring-marigold bg-cream text-ink scale-105'
                      : isLocked
                      ? 'bg-field text-ink/90 cursor-default'
                      : val !== 0
                      ? isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                      : 'bg-white hover:bg-slate-50 text-ink'
                  }`}
                >
                  {val !== 0 ? val : ''}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Number Selector Bar */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center gap-3 pointer-events-auto">
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            onClick={() => placeNumber(num)}
            className="w-14 h-14 rounded-2xl bg-ink text-white font-black text-2xl shadow-lg active:scale-95 transition"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Win Modal */}
      {gameWon && (
        <div className="absolute inset-0 bg-ink/80 backdrop-blur flex flex-col items-center justify-center text-white z-20">
          <div className="text-5xl mb-2">🎉🔢</div>
          <h2 className="text-3xl font-extrabold">Sprint Solved!</h2>
          <p className="text-xl font-bold mt-2">
            Score: <span className="text-marigold">{score} pts</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Solve Another
          </button>
        </div>
      )}
    </div>
  );
}
