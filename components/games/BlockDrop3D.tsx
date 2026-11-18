'use client';

import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import ThreeCanvas from '../3d/ThreeCanvas';
import { createParticleBurst } from '../3d/models';
import { sound } from '@/lib/sound';

interface Props {
  onDone: (score: number) => void;
}

const SHAPES = [
  // I-piece
  [[0, 0], [-1, 0], [1, 0], [2, 0]],
  // O-piece
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  // T-piece
  [[0, 0], [-1, 0], [1, 0], [0, 1]],
  // L-piece
  [[0, 0], [-1, 0], [1, 0], [-1, 1]],
  // S-piece
  [[0, 0], [1, 0], [0, 1], [-1, 1]],
];

const COLORS = [0x00e5ff, 0xffeb3b, 0xd500f9, 0xff9100, 0x00e676];

export default function BlockDrop3D({ onDone }: Props) {
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    score: 0,
    lines: 0,
    gridWidth: 8,
    gridHeight: 14,
    grid: Array.from({ length: 14 }, () => Array(8).fill(0)),
    gridMeshes: Array.from({ length: 14 }, () => Array(8).fill(null)) as (THREE.Mesh | null)[][],
    currentShape: [] as [number, number][],
    currentColor: 0,
    currentX: 3,
    currentY: 12,
    activeMeshes: [] as THREE.Mesh[],
    dropTimer: 0,
    dropInterval: 0.8,
    scene: null as THREE.Scene | null,
    particles: [] as { update: (dt: number) => boolean }[],
  });

  const initGame = ({ scene }: { scene: THREE.Scene }) => {
    stateRef.current.scene = scene;
    scene.background = new THREE.Color(0x0f172a);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffb800, 1.2);
    dir.position.set(5, 12, 10);
    scene.add(ambient, dir);

    // Glass bounding box
    const frameGeo = new THREE.BoxGeometry(8.2, 14.2, 1.2);
    const edges = new THREE.EdgesGeometry(frameGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x334155 }));
    line.position.set(3.5, 6.5, 0);
    scene.add(line);

    spawnNewPiece(scene);
  };

  const spawnNewPiece = (scene: THREE.Scene) => {
    const s = stateRef.current;
    const type = Math.floor(Math.random() * SHAPES.length);
    s.currentShape = SHAPES[type].map(([x, y]) => [x, y]);
    s.currentColor = COLORS[type];
    s.currentX = 3;
    s.currentY = 12;

    // Check game over
    for (const [ox, oy] of s.currentShape) {
      const gx = s.currentX + ox;
      const gy = s.currentY + oy;
      if (gy < s.gridHeight && s.grid[gy][gx]) {
        setGameOver(true);
        sound.playLose();
        onDone(s.score);
        return;
      }
    }

    renderActivePiece(scene);
  };

  const renderActivePiece = (scene: THREE.Scene) => {
    const s = stateRef.current;
    s.activeMeshes.forEach((m) => scene.remove(m));
    s.activeMeshes = [];

    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshStandardMaterial({
      color: s.currentColor,
      roughness: 0.2,
      metalness: 0.3,
    });

    s.currentShape.forEach(([ox, oy]) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.currentX + ox, s.currentY + oy, 0);
      scene.add(mesh);
      s.activeMeshes.push(mesh);
    });
  };

  const movePiece = (dx: number) => {
    const s = stateRef.current;
    if (gameOver) return;

    for (const [ox, oy] of s.currentShape) {
      const nx = s.currentX + ox + dx;
      const ny = s.currentY + oy;
      if (nx < 0 || nx >= s.gridWidth || (ny < s.gridHeight && s.grid[ny][nx])) {
        return; // blocked
      }
    }
    s.currentX += dx;
    sound.playTap();
    if (s.scene) renderActivePiece(s.scene);
  };

  const rotatePiece = () => {
    const s = stateRef.current;
    if (gameOver) return;

    const rotated: [number, number][] = s.currentShape.map(([ox, oy]) => [-oy, ox]);
    for (const [ox, oy] of rotated) {
      const nx = s.currentX + ox;
      const ny = s.currentY + oy;
      if (nx < 0 || nx >= s.gridWidth || ny < 0 || (ny < s.gridHeight && s.grid[ny][nx])) {
        return; // cannot rotate
      }
    }
    s.currentShape = rotated;
    sound.playWhoosh();
    if (s.scene) renderActivePiece(s.scene);
  };

  const lockPiece = () => {
    const s = stateRef.current;
    if (!s.scene) return;

    sound.playHit();
    s.currentShape.forEach(([ox, oy]) => {
      const gx = s.currentX + ox;
      const gy = s.currentY + oy;
      if (gy < s.gridHeight) {
        s.grid[gy][gx] = s.currentColor;

        const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const mat = new THREE.MeshStandardMaterial({
          color: s.currentColor,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(gx, gy, 0);
        s.scene!.add(mesh);
        s.gridMeshes[gy][gx] = mesh;
      }
    });

    // Check full rows
    let cleared = 0;
    for (let r = s.gridHeight - 1; r >= 0; r--) {
      if (s.grid[r].every((cell) => cell !== 0)) {
        cleared++;
        // Remove meshes and trigger particles
        for (let c = 0; c < s.gridWidth; c++) {
          const m = s.gridMeshes[r][c];
          if (m) {
            s.scene.remove(m);
            s.particles.push(
              createParticleBurst(s.scene, new THREE.Vector3(c, r, 0), s.grid[r][c], 10)
            );
          }
        }
        // Shift grid down
        s.grid.splice(r, 1);
        s.grid.push(Array(s.gridWidth).fill(0));
        s.gridMeshes.splice(r, 1);
        s.gridMeshes.push(Array(s.gridWidth).fill(null));

        // Re-adjust mesh positions
        for (let row = r; row < s.gridHeight; row++) {
          for (let col = 0; col < s.gridWidth; col++) {
            const m = s.gridMeshes[row][col];
            if (m) m.position.y = row;
          }
        }
      }
    }

    if (cleared > 0) {
      sound.playScore();
      s.lines += cleared;
      s.score += cleared * 200 * cleared;
      setLines(s.lines);
      setScore(s.score);
    }

    spawnNewPiece(s.scene);
  };

  const dropStep = () => {
    const s = stateRef.current;
    if (gameOver) return;

    for (const [ox, oy] of s.currentShape) {
      const nx = s.currentX + ox;
      const ny = s.currentY + oy - 1;
      if (ny < 0 || s.grid[ny][nx]) {
        lockPiece();
        return;
      }
    }
    s.currentY -= 1;
    if (s.scene) renderActivePiece(s.scene);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') movePiece(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') movePiece(1);
      if (e.key === 'ArrowUp' || e.key === 'w') rotatePiece();
      if (e.key === 'ArrowDown' || e.key === 's') dropStep();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver]);

  const onFrame = (dt: number) => {
    if (gameOver) return;
    const s = stateRef.current;
    const delta = Math.min(dt, 0.05);

    s.dropTimer += delta;
    if (s.dropTimer > s.dropInterval) {
      s.dropTimer = 0;
      dropStep();
    }

    s.particles = s.particles.filter((p) => p.update(delta));
  };

  const restart = () => {
    setScore(0);
    setLines(0);
    setGameOver(false);
    const s = stateRef.current;
    s.score = 0;
    s.lines = 0;

    if (s.scene) {
      s.activeMeshes.forEach((m) => s.scene?.remove(m));
      s.activeMeshes = [];
      for (let r = 0; r < s.gridHeight; r++) {
        for (let c = 0; c < s.gridWidth; c++) {
          if (s.gridMeshes[r][c]) {
            s.scene.remove(s.gridMeshes[r][c]!);
          }
        }
      }
      s.grid = Array.from({ length: 14 }, () => Array(8).fill(0));
      s.gridMeshes = Array.from({ length: 14 }, () => Array(8).fill(null));
      spawnNewPiece(s.scene);
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden bg-ink select-none">
      <ThreeCanvas
        onInit={initGame}
        onFrame={onFrame}
        cameraPos={[3.5, 6.5, 16]}
        cameraLookAt={[3.5, 6.5, 0]}
      />

      {/* Top HUD */}
      <div className="absolute top-4 inset-x-4 flex justify-between items-center pointer-events-none">
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Score: <span className="text-marigold">{score}</span>
        </div>
        <div className="bg-ink/80 backdrop-blur px-4 py-2 rounded-full border border-white/10 text-white font-extrabold text-base">
          Lines: <span className="text-cyan-400">{lines}</span>
        </div>
      </div>

      {/* Controls HUD */}
      <div className="absolute bottom-4 inset-x-6 flex justify-between pointer-events-auto">
        <div className="flex gap-2">
          <button
            onClick={() => movePiece(-1)}
            className="w-13 h-13 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur text-white font-bold active:scale-95"
          >
            ←
          </button>
          <button
            onClick={() => movePiece(1)}
            className="w-13 h-13 px-4 py-2 rounded-2xl bg-white/20 backdrop-blur text-white font-bold active:scale-95"
          >
            →
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={rotatePiece}
            className="px-5 py-2 rounded-2xl bg-marigold text-ink font-bold active:scale-95"
          >
            Rotate ↻
          </button>
          <button
            onClick={dropStep}
            className="px-4 py-2 rounded-2xl bg-white/20 backdrop-blur text-white font-bold active:scale-95"
          >
            Drop ↓
          </button>
        </div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div
          className="absolute inset-0 bg-ink/85 backdrop-blur flex flex-col items-center justify-center text-white z-20 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-5xl mb-2">🧩</div>
          <h2 className="text-3xl font-extrabold tracking-tight">Stack Overfilled!</h2>
          <p className="text-xl font-bold mt-2">
            Lines Cleared: <span className="text-cyan-400">{lines}</span> · Score: <span className="text-marigold">{score}</span>
          </p>
          <button
            onClick={restart}
            className="mt-6 px-8 py-3.5 bg-marigold text-ink rounded-full font-extrabold text-lg hover:scale-105 active:scale-95 transition"
          >
            Drop Again
          </button>
        </div>
      )}
    </div>
  );
}
