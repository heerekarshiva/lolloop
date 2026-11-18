'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';
import { BotDifficulty, getFourInARowMove } from '@/lib/bots';

interface Props {
  onDone: (score: number) => void;
  botDifficulty?: BotDifficulty;
}

export default function FourInARow3D({ onDone, botDifficulty = 'Medium' }: Props) {
  // 6 rows x 7 cols grid (0 = empty, 1 = Player Yellow, 2 = Bot Red)
  const [grid, setGrid] = useState<number[][]>(() =>
    Array.from({ length: 6 }, () => Array(7).fill(0))
  );
  const [turn, setTurn] = useState<1 | 2>(1);
  const [winner, setWinner] = useState<number | null>(null);

  const stateRef = useRef({
    grid: Array.from({ length: 6 }, () => Array(7).fill(0)),
    discMeshes: [] as THREE.Mesh[],
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const dir = new THREE.DirectionalLight(0xffb800, 1.3);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Blue Standing Grid Frame
    const frameGeo = new THREE.BoxGeometry(7.2, 6.2, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 3.1, 0);
    scene.add(frame);
  };

  const dropDisc = (col: number, player: 1 | 2) => {
    const s = stateRef.current;
    if (winner || s.grid[0][col] !== 0 || !s.scene) return;

    // Find drop row
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (s.grid[r][col] === 0) {
        row = r;
        break;
      }
    }
    if (row === -1) return;

    sound.playTap();
    s.grid[row][col] = player;
    setGrid(s.grid.map((r) => [...r]));

    // Spawn 3D Disc
    const discGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 24);
    const discMat = new THREE.MeshStandardMaterial({
      color: player === 1 ? 0xffb800 : 0xef4444,
      emissive: player === 1 ? 0xd97706 : 0xb91c1c,
      emissiveIntensity: 0.3,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set((col - 3) * 0.95, (5 - row) * 0.95 + 0.7, 0.05);
    s.scene.add(disc);
    s.discMeshes.push(disc);

    // Check winner
    if (checkFourWin(s.grid, row, col, player)) {
      setWinner(player);
      if (player === 1) {
        sound.playWin();
        s.particles.push(
          createParticleBurst(s.scene, disc.position, 0xffb800, 30)
        );
        onDone(1000);
      } else {
        sound.playLose();
      }
      return;
    }

    setTurn(player === 1 ? 2 : 1);
  };

  const checkFourWin = (g: number[][], r: number, c: number, p: number) => {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];
    for (const [dr, dc] of directions) {
      let count = 1;
      for (let s = 1; s <= 3; s++) {
        const nr = r + dr * s, nc = c + dc * s;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && g[nr][nc] === p) count++;
        else break;
      }
      for (let s = 1; s <= 3; s++) {
        const nr = r - dr * s, nc = c - dc * s;
        if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && g[nr][nc] === p) count++;
        else break;
      }
      if (count >= 4) return true;
    }
    return false;
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (turn === 2 && !winner) {
      const timer = setTimeout(() => {
        const botCol = getFourInARowMove(stateRef.current.grid, 2, botDifficulty);
        dropDisc(botCol, 2);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, botDifficulty]);

  const onFrame = (dt: number) => {
    const delta = Math.min(dt, 0.05);
    stateRef.current.particles = stateRef.current.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    const s = stateRef.current;
    if (s.scene) {
      s.discMeshes.forEach((m) => s.scene?.remove(m));
      s.discMeshes = [];
    }
    s.grid = Array.from({ length: 6 }, () => Array(7).fill(0));
    setGrid(Array.from({ length: 6 }, () => Array(7).fill(0)));
    setTurn(1);
    setWinner(null);
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[0, 3.2, 8.5]}
        cameraLookAt={[0, 3.2, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Turn: <span className={turn === 1 ? 'text-marigold' : 'text-red-400'}>{turn === 1 ? 'Your Turn (Yellow)' : `AI Bot (${botDifficulty})`}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-sm">
          Connect 4 in a row to win!
        </div>
      </div>

      {/* Column Drop Buttons */}
      <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-auto">
        <div className="grid grid-cols-7 gap-2 max-w-md w-full px-4">
          {[0, 1, 2, 3, 4, 5, 6].map((col) => (
            <button
              key={col}
              onClick={() => turn === 1 && dropDisc(col, 1)}
              className="py-2 rounded-xl bg-white/20 hover:bg-marigold text-white hover:text-ink font-black text-sm active:scale-90 transition"
            >
              ↓
            </button>
          ))}
        </div>
      </div>

      {/* Game Over Screen */}
      {winner && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">{winner === 1 ? '🏆🟡' : '🥈🤖'}</div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {winner === 1 ? 'Four In A Row! You Won!' : 'AI Bot Connected 4!'}
          </h2>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Play Rematch
          </button>
        </div>
      )}
    </div>
  );
}
